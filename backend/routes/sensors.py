import json
from flask import Blueprint, request
from datetime import datetime, timezone, timedelta

from extensions import db
from models import Sensor, SensorReading, Zone, Incident, SensorAnomaly, AuditEvent, IncidentEvidence
from services.leak_detection import detect_leak_risk
from services.loss_estimator import estimate_loss
from services.priority import calculate_priority
from services.ai_summary import generate_incident_brief
from utils.validators import validate_sensor_reading_payload
from utils.response_helpers import api_response, api_error

sensors_bp = Blueprint("sensors", __name__, url_prefix="/api/sensors")
zones_bp = Blueprint("zones", __name__, url_prefix="/api/zones")


def _create_or_update_incident(zone, anomaly_result, latest_reading):
    """Create a new suspected incident or update an existing open one for the zone."""
    existing = Incident.query.filter(
        Incident.zone_id == zone.id,
        Incident.status.notin_(["VERIFIED_RESOLVED", "NOT_A_LEAK", "DUPLICATE"])
    ).order_by(Incident.created_at.desc()).first()

    excess_lpm = max(0.0, (latest_reading.flow_lpm or 0) - zone.expected_flow_lpm)
    loss_data = estimate_loss(latest_reading.flow_lpm or 0, zone.expected_flow_lpm)
    anomaly_status = anomaly_result.get("status", "NORMAL")

    if existing:
        # Update loss estimates and re-score
        existing.estimated_excess_flow_lpm = excess_lpm
        existing.estimated_loss_24h_liters = loss_data["loss_24h_liters"]
        existing.updated_at = datetime.now(timezone.utc)
        priority_data = calculate_priority(existing, anomaly_result)
        existing.priority_score = priority_data["score"]
        existing.priority_level = priority_data["level"]
        brief_data = generate_incident_brief(existing, anomaly_result, priority_data)
        brief_data.update(priority_data)
        existing.ai_summary = json.dumps(brief_data)
        db.session.commit()
        return existing, False

    # New incident
    incident = Incident(
        zone_id=zone.id,
        latitude=zone.center_lat,
        longitude=zone.center_lng,
        status="SUSPECTED",
        confidence_level="LOW_EVIDENCE",
        estimated_excess_flow_lpm=excess_lpm,
        estimated_loss_24h_liters=loss_data["loss_24h_liters"],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.session.add(incident)
    db.session.flush()

    priority_data = calculate_priority(incident, anomaly_result)
    incident.priority_score = priority_data["score"]
    incident.priority_level = priority_data["level"]
    brief_data = generate_incident_brief(incident, anomaly_result, priority_data)
    brief_data.update(priority_data)
    incident.ai_summary = json.dumps(brief_data)

    # Link sensor anomaly evidence
    ev = IncidentEvidence(
        incident_id=incident.id,
        evidence_type="SENSOR_ANOMALY",
        reference_id=f"SENSOR:{zone.id}",
        linked_at=datetime.now(timezone.utc),
    )
    db.session.add(ev)

    audit = AuditEvent(
        incident_id=incident.id,
        action="INCIDENT_CREATED",
        reason=f"Sensor anomaly in {zone.id}: {anomaly_result.get('explanation', '')}",
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(audit)
    db.session.commit()
    return incident, True


@sensors_bp.route("/readings", methods=["POST"])
def ingest_reading():
    """Ingest a sensor reading (real or simulated)."""
    data = request.get_json(force=True, silent=True) or {}
    ok, err = validate_sensor_reading_payload(data)
    if not ok:
        return api_error(err)

    sensor_id = data["sensor_id"]
    sensor = Sensor.query.get(sensor_id)
    if not sensor:
        return api_error(f"Sensor '{sensor_id}' not found. Check /api/sensors for valid IDs.", 404)

    quality_flag = data.get("quality_flag", "GOOD")
    flow_lpm = data.get("flow_lpm")
    pressure_psi = data.get("pressure_psi")
    scenario_id = data.get("scenario_id", "manual")

    reading = SensorReading(
        sensor_id=sensor_id,
        flow_lpm=flow_lpm,
        pressure_psi=pressure_psi,
        quality_flag=quality_flag,
        scenario_id=scenario_id,
        recorded_at=datetime.now(timezone.utc),
    )
    db.session.add(reading)
    db.session.flush()

    # Evaluate anomaly from last 3 readings for this sensor's zone
    recent_readings = (
        SensorReading.query
        .join(Sensor, SensorReading.sensor_id == Sensor.id)
        .filter(Sensor.zone_id == sensor.zone_id)
        .order_by(SensorReading.recorded_at.desc())
        .limit(5)
        .all()
    )
    recent_readings = list(reversed(recent_readings))

    zone = sensor.zone
    anomaly_result = detect_leak_risk(recent_readings, zone.expected_flow_lpm, zone.expected_pressure_psi)

    incident_created = None
    incident_updated = None
    if anomaly_result["status"] == "HIGH_RISK":
        incident_obj, is_new = _create_or_update_incident(zone, anomaly_result, reading)
        if is_new:
            incident_created = f"INC-{incident_obj.id:03d}"
        else:
            incident_updated = f"INC-{incident_obj.id:03d}"

    db.session.commit()

    return api_response({
        "reading": reading.to_dict(),
        "anomaly": anomaly_result,
        "incident_created": incident_created,
        "incident_updated": incident_updated,
        "is_simulated": data.get("is_simulated", False),
        "note": "All sensor data in this system is simulated for demonstration purposes." if data.get("is_simulated") else None,
    }, status=201)


@sensors_bp.route("", methods=["GET"])
def list_sensors():
    sensors = Sensor.query.all()
    return api_response({"sensors": [s.to_dict() for s in sensors]})


@sensors_bp.route("/<sensor_id>/readings", methods=["GET"])
def get_sensor_readings(sensor_id):
    sensor = Sensor.query.get(sensor_id)
    if not sensor:
        return api_error("Sensor not found", 404)
    limit = min(int(request.args.get("limit", 60)), 500)
    readings = (
        SensorReading.query
        .filter_by(sensor_id=sensor_id)
        .order_by(SensorReading.recorded_at.desc())
        .limit(limit)
        .all()
    )
    return api_response({
        "sensor": sensor.to_dict(),
        "readings": [r.to_dict() for r in reversed(readings)],
        "count": len(readings),
    })


@zones_bp.route("/<zone_id>/readings", methods=["GET"])
def get_zone_readings(zone_id):
    zone = Zone.query.get(zone_id)
    if not zone:
        return api_error("Zone not found", 404)
    limit = min(int(request.args.get("limit", 60)), 500)
    readings = (
        SensorReading.query
        .join(Sensor, SensorReading.sensor_id == Sensor.id)
        .filter(Sensor.zone_id == zone_id)
        .order_by(SensorReading.recorded_at.desc())
        .limit(limit)
        .all()
    )
    return api_response({
        "zone": zone.to_dict(),
        "readings": [r.to_dict() for r in reversed(readings)],
        "count": len(readings),
    })


@zones_bp.route("", methods=["GET"])
def list_zones():
    zones = Zone.query.all()
    return api_response({"zones": [z.to_dict() for z in zones]})

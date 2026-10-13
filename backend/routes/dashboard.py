from flask import Blueprint
from datetime import datetime, timezone

from models import Incident, Report, Task, SensorReading, Sensor, Zone
from utils.response_helpers import api_response

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api")


def _build_zone_And_sensor_status():
    zones = Zone.query.all()
    zone_status = []
    sensor_markers = []

    for zone in zones:
        sensor = Sensor.query.filter_by(zone_id=zone.id).first()
        latest_reading = (
            SensorReading.query
            .join(Sensor)
            .filter(Sensor.zone_id == zone.id)
            .order_by(SensorReading.recorded_at.desc())
            .first()
        )
        active_incident = Incident.query.filter_by(zone_id=zone.id).filter(
            Incident.status.notin_(["VERIFIED_RESOLVED", "NOT_A_LEAK", "DUPLICATE"])
        ).order_by(Incident.priority_score.desc()).first()

        sensor_status = "ONLINE"
        if latest_reading and latest_reading.quality_flag in ("STALE", "MISSING"):
            sensor_status = "OFFLINE"
        elif not latest_reading:
            sensor_status = "NO_DATA"

        latest_flow = latest_reading.flow_lpm if latest_reading else zone.expected_flow_lpm
        latest_press = latest_reading.pressure_psi if latest_reading else zone.expected_pressure_psi

        z_dict = {
            "zone_id": zone.id,
            "zone_name": zone.name,
            "impact_category": zone.impact_category,
            "latitude": zone.center_lat,
            "longitude": zone.center_lng,
            "sensor_id": sensor.id if sensor else f"FLOW-{zone.id}-01",
            "sensor_status": sensor_status,
            "latest_flow_lpm": latest_flow,
            "expected_flow_lpm": zone.expected_flow_lpm,
            "latest_pressure_psi": latest_press,
            "expected_pressure_psi": zone.expected_pressure_psi,
            "last_reading_at": latest_reading.recorded_at.isoformat() if latest_reading else None,
            "active_incident_id": active_incident.id if active_incident else None,
            "active_incident_priority": active_incident.priority_level if active_incident else None,
        }
        zone_status.append(z_dict)

        if sensor:
            sensor_markers.append({
                "sensor_id": sensor.id,
                "zone_id": zone.id,
                "zone_name": zone.name,
                "sensor_type": sensor.sensor_type,
                "latitude": (sensor.latitude or zone.center_lat) + 0.0018,
                "longitude": (sensor.longitude or zone.center_lng) - 0.0018,
                "status": sensor_status,
                "flow_lpm": latest_flow,
                "expected_flow_lpm": zone.expected_flow_lpm,
                "pressure_psi": latest_press,
                "expected_pressure_psi": zone.expected_pressure_psi,
                "quality_flag": latest_reading.quality_flag if latest_reading else "GOOD",
            })

    return zone_status, sensor_markers


@dashboard_bp.route("/dashboard/summary", methods=["GET"])
def get_summary():
    """Return KPIs and map data for the dashboard."""
    from routes.simulation import seed_rich_demo_dataset
    if Incident.query.count() == 0 and Zone.query.count() > 0:
        # Ensure we always have telemetry readings for the map if none exist
        if SensorReading.query.count() == 0:
            seed_rich_demo_dataset()

    total_incidents = Incident.query.filter(
        Incident.status.notin_(["VERIFIED_RESOLVED", "NOT_A_LEAK", "DUPLICATE"])
    ).count()

    critical_incidents = Incident.query.filter_by(priority_level="CRITICAL").filter(
        Incident.status.notin_(["VERIFIED_RESOLVED", "NOT_A_LEAK"])
    ).count()

    high_incidents = Incident.query.filter_by(priority_level="HIGH").filter(
        Incident.status.notin_(["VERIFIED_RESOLVED", "NOT_A_LEAK"])
    ).count()

    unassigned_tasks = Task.query.filter(
        Task.technician_id == None,
        Task.status.notin_(["COMPLETED", "CANCELLED"]),
    ).count()

    field_confirmed = Incident.query.filter(
        Incident.status.in_(["FIELD_CONFIRMED", "REPAIR_IN_PROGRESS", "REPAIR_COMPLETED"])
    ).count()

    # Estimated excess flow — sum across active non-resolved incidents (no double-counting per zone)
    active_by_zone = {}
    active_incidents = Incident.query.filter(
        Incident.status.notin_(["VERIFIED_RESOLVED", "NOT_A_LEAK", "DUPLICATE"])
    ).all()
    for inc in active_incidents:
        if inc.zone_id and inc.estimated_excess_flow_lpm:
            if inc.zone_id not in active_by_zone:
                active_by_zone[inc.zone_id] = inc.estimated_excess_flow_lpm
    total_excess_flow = sum(active_by_zone.values())
    total_loss_24h = total_excess_flow * 1440.0

    map_incidents = Incident.query.filter(
        Incident.status.notin_(["NOT_A_LEAK", "DUPLICATE"])
    ).order_by(Incident.priority_score.desc()).limit(100).all()

    recent_reports = Report.query.order_by(Report.created_at.desc()).limit(20).all()
    zone_status, sensor_markers = _build_zone_And_sensor_status()

    return api_response({
        "kpis": {
            "total_active_incidents": total_incidents,
            "critical_incidents": critical_incidents,
            "high_priority_incidents": high_incidents,
            "unassigned_tasks": unassigned_tasks,
            "field_confirmed_leaks": field_confirmed,
            "total_excess_flow_lpm": round(total_excess_flow, 1),
            "potential_loss_24h_liters": round(total_loss_24h, 0),
            "simulation_mode": True,
        },
        "map_incidents": [i.to_dict() for i in map_incidents],
        "zone_status": zone_status,
        "sensors": sensor_markers,
        "recent_reports": [r.to_dict() for r in recent_reports],
        "simulation_notice": "All sensor data is simulated for demonstration purposes. AI suggestions require human verification.",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    })


@dashboard_bp.route("/map/hotspots", methods=["GET"])
def get_map_hotspots():
    """Dedicated GIS Map & Hotspots API returning incidents, zones, sensors, and citizen reports."""
    map_incidents = Incident.query.order_by(Incident.priority_score.desc()).limit(100).all()
    reports = Report.query.order_by(Report.created_at.desc()).limit(100).all()
    zone_status, sensor_markers = _build_zone_And_sensor_status()

    return api_response({
        "incidents": [i.to_dict() for i in map_incidents],
        "zones": zone_status,
        "sensors": sensor_markers,
        "reports": [r.to_dict() for r in reports],
        "center": {"latitude": 21.2514, "longitude": 81.6412, "zoom": 13},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    })

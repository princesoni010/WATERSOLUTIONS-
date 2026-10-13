import json
from flask import Blueprint, request
from datetime import datetime, timezone, timedelta

from extensions import db
from models import (
    Incident, Report, Task, SensorReading, Sensor, Zone,
    User, AuditEvent, ReportImage, IncidentEvidence, TaskAttachment, SensorAnomaly
)
from services.sensor_simulator import generate_batch
from utils.response_helpers import api_response, api_error

simulation_bp = Blueprint("simulation", __name__, url_prefix="/api/simulation")

SCENARIO_ZONE_MAP = {
    "normal": "ZONE-A",
    "gradual_leak": "ZONE-B",
    "burst": "ZONE-D",
    "demand_spike": "ZONE-C",
    "sensor_offline": "ZONE-E",
    "post_repair_recovery": "ZONE-B",
}

DEMO_USERS = [
    {"name": "Rohit Sharma", "email": "operator@aquaguard.demo", "role": "OPERATOR"},
    {"name": "Priya Sharma", "email": "tech1@aquaguard.demo", "role": "TECHNICIAN"},
    {"name": "Ravi Kumar", "email": "tech2@aquaguard.demo", "role": "TECHNICIAN"},
    {"name": "Vikram Singh", "email": "tech3@aquaguard.demo", "role": "TECHNICIAN"},
    {"name": "Admin User", "email": "admin@aquaguard.demo", "role": "ADMIN"},
]


def _ingest_readings_for_scenario(zone_id, scenario, count=3):
    """Generate and persist simulated readings, returning anomaly result."""
    from services.leak_detection import detect_leak_risk
    from services.loss_estimator import estimate_loss
    from services.priority import calculate_priority
    from services.ai_summary import generate_incident_brief

    zone = Zone.query.get(zone_id)
    if not zone:
        return None, None

    sensor = Sensor.query.filter_by(zone_id=zone_id).first()
    if not sensor:
        return None, None

    readings_data = generate_batch(zone_id, scenario, count)
    persisted = []
    for rd in readings_data:
        reading = SensorReading(
            sensor_id=sensor.id,
            flow_lpm=rd.get("flow_lpm"),
            pressure_psi=rd.get("pressure_psi"),
            quality_flag=rd.get("quality_flag", "GOOD"),
            scenario_id=scenario,
            recorded_at=datetime.now(timezone.utc),
        )
        db.session.add(reading)
        persisted.append(reading)
    db.session.flush()

    # Detect anomaly
    recent = (
        SensorReading.query
        .join(Sensor, SensorReading.sensor_id == Sensor.id)
        .filter(Sensor.zone_id == zone_id)
        .order_by(SensorReading.recorded_at.desc())
        .limit(5).all()
    )
    anomaly_result = detect_leak_risk(list(reversed(recent)), zone.expected_flow_lpm, zone.expected_pressure_psi)

    # Create/update incident if HIGH_RISK
    incident = None
    if anomaly_result["status"] == "HIGH_RISK":
        latest = persisted[-1]
        excess_lpm = max(0.0, (latest.flow_lpm or 0) - zone.expected_flow_lpm)
        loss_data = estimate_loss(latest.flow_lpm or 0, zone.expected_flow_lpm)

        existing = Incident.query.filter(
            Incident.zone_id == zone_id,
            Incident.status.notin_(["VERIFIED_RESOLVED", "NOT_A_LEAK"])
        ).order_by(Incident.created_at.desc()).first()

        if existing:
            existing.estimated_excess_flow_lpm = excess_lpm
            existing.estimated_loss_24h_liters = loss_data["loss_24h_liters"]
            existing.updated_at = datetime.now(timezone.utc)
            priority_data = calculate_priority(existing, anomaly_result)
            existing.priority_score = priority_data["score"]
            existing.priority_level = priority_data["level"]
            brief_data = generate_incident_brief(existing, anomaly_result, priority_data)
            brief_data.update(priority_data)
            existing.ai_summary = json.dumps(brief_data)
            incident = existing
        else:
            incident = Incident(
                zone_id=zone_id,
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

            ev = IncidentEvidence(
                incident_id=incident.id,
                evidence_type="SENSOR_ANOMALY",
                reference_id=f"SIM:{zone_id}:{scenario}",
                linked_at=datetime.now(timezone.utc),
            )
            db.session.add(ev)
            audit = AuditEvent(
                incident_id=incident.id,
                action="INCIDENT_CREATED_BY_SIMULATION",
                reason=f"Scenario '{scenario}' triggered anomaly: {anomaly_result.get('explanation', '')}",
                created_at=datetime.now(timezone.utc),
            )
            db.session.add(audit)

    db.session.commit()
    return anomaly_result, incident


def seed_rich_demo_dataset():
    """Populate realistic multi-zone incidents, reports, sensor history, and tasks for the UI."""
    now = datetime.now(timezone.utc)

    # Ensure demo users exist
    for u in DEMO_USERS:
        if not User.query.filter_by(email=u["email"]).first():
            db.session.add(User(name=u["name"], email=u["email"], role=u["role"]))
    db.session.commit()

    tech1 = User.query.filter_by(role="TECHNICIAN").first()
    tech2 = User.query.filter_by(email="tech2@aquaguard.demo").first() or tech1
    operator = User.query.filter_by(role="OPERATOR").first()

    # Generate 12 historical readings per zone so charts look great immediately
    zones = {z.id: z for z in Zone.query.all()}
    sensors = {s.zone_id: s for s in Sensor.query.all()}

    for zid, z in zones.items():
        s = sensors.get(zid)
        if not s:
            continue
        for step in range(12, 0, -1):
            ts = now - timedelta(minutes=step * 5)
            if zid == "ZONE-B" and step <= 4:
                flow = round(z.expected_flow_lpm * 1.30, 1)
                press = round(z.expected_pressure_psi * 0.78, 1)
                scen = "gradual_leak"
                qflag = "GOOD"
            elif zid == "ZONE-D" and step <= 3:
                flow = round(z.expected_flow_lpm * 1.52, 1)
                press = round(z.expected_pressure_psi * 0.67, 1)
                scen = "burst"
                qflag = "GOOD"
            elif zid == "ZONE-C" and step == 2:
                flow = round(z.expected_flow_lpm * 1.24, 1)
                press = round(z.expected_pressure_psi * 0.94, 1)
                scen = "demand_spike"
                qflag = "GOOD"
            elif zid == "ZONE-E" and step <= 2:
                flow = None
                press = None
                scen = "sensor_offline"
                qflag = "STALE"
            else:
                offset = ((step % 3) - 1) * 1.2
                flow = round(z.expected_flow_lpm + offset, 1)
                press = round(z.expected_pressure_psi - (offset * 0.3), 1)
                scen = "normal"
                qflag = "GOOD"

            db.session.add(SensorReading(
                sensor_id=s.id,
                flow_lpm=flow,
                pressure_psi=press,
                quality_flag=qflag,
                scenario_id=scen,
                recorded_at=ts,
            ))
    db.session.flush()

    if Incident.query.count() == 0:
        # 1. Critical Burst in Zone D
        inc1 = Incident(
            zone_id="ZONE-D",
            latitude=21.2410,
            longitude=81.6650,
            status="INSPECTION_ASSIGNED",
            priority_score=86.0,
            priority_level="CRITICAL",
            confidence_level="CORROBORATED",
            estimated_excess_flow_lpm=57.2,
            estimated_loss_24h_liters=82368.0,
            assigned_engineer_id=tech1.id if tech1 else None,
            created_at=now - timedelta(minutes=95),
            updated_at=now - timedelta(minutes=15),
            ai_summary=json.dumps({
                "title": "Suspected Arterial Leak — Telibandha Hospital Corridor",
                "brief": "Flow is 52.0% above baseline and pressure is 33.0% below expected for 3 consecutive readings. Two citizen reports with surface pooling photos are linked near the hospital main trunk. Suspected leak — field verification required.",
                "priority_explanation": "Persistent excess flow is 52% above baseline. Pressure is 33% below normal. Two independent citizen reports are linked. Located in Critical Infrastructure corridor.",
                "priority_breakdown": {
                    "loss_severity_L": 95.0,
                    "anomaly_severity_A": 88.0,
                    "public_impact_I": 100.0,
                    "citizen_evidence_R": 85.0,
                    "time_unresolved_T": 32.0,
                },
                "recommended_action": "IMMEDIATE_ASSIGNMENT",
            })
        )
        # 2. High Priority Gradual Leak in Zone B
        inc2 = Incident(
            zone_id="ZONE-B",
            latitude=21.2568,
            longitude=81.6412,
            status="UNDER_REVIEW",
            priority_score=74.0,
            priority_level="HIGH",
            confidence_level="CORROBORATED",
            estimated_excess_flow_lpm=30.0,
            estimated_loss_24h_liters=43200.0,
            assigned_engineer_id=tech2.id if tech2 else None,
            created_at=now - timedelta(minutes=110),
            updated_at=now - timedelta(minutes=25),
            ai_summary=json.dumps({
                "title": "Suspected Pipeline Leak — Pandri Bus Stand & Market",
                "brief": "Flow is 30.0% above baseline and pressure is 22.0% below expected for 3 consecutive readings. Citizen photo reports show roadside water pooling near Bus Stand Gate 2. Suspected leak — field verification required.",
                "priority_explanation": "Persistent excess flow is 30% above baseline. Pressure is 22% below normal. Two independent citizen reports are linked. The incident has remained unresolved for 110 minutes.",
                "priority_breakdown": {
                    "loss_severity_L": 72.0,
                    "anomaly_severity_A": 76.0,
                    "public_impact_I": 80.0,
                    "citizen_evidence_R": 80.0,
                    "time_unresolved_T": 45.0,
                },
                "recommended_action": "INSPECT_SAME_DAY",
            })
        )
        # 3. Field Confirmed Leak in Zone A
        inc3 = Incident(
            zone_id="ZONE-A",
            latitude=21.2528,
            longitude=81.6312,
            status="FIELD_CONFIRMED",
            priority_score=68.0,
            priority_level="HIGH",
            confidence_level="FIELD_CONFIRMED",
            estimated_excess_flow_lpm=22.5,
            estimated_loss_24h_liters=32400.0,
            assigned_engineer_id=tech1.id if tech1 else None,
            created_at=now - timedelta(hours=3),
            updated_at=now - timedelta(minutes=40),
            ai_summary=json.dumps({
                "title": "Field-Confirmed Joint Leak — Civil Lines Block 4",
                "brief": "Field engineer confirmed leaking cast-iron collar joint along Civil Lines feeder. Repair crew isolating valve chamber.",
                "priority_explanation": "Field-confirmed physical leak with 22.5 L/min estimated excess flow in government/civic zone.",
                "priority_breakdown": {
                    "loss_severity_L": 55.0,
                    "anomaly_severity_A": 62.0,
                    "public_impact_I": 60.0,
                    "citizen_evidence_R": 100.0,
                    "time_unresolved_T": 50.0,
                },
                "recommended_action": "INSPECT_SAME_DAY",
            })
        )
        # 4. Medium Priority Public Tap Leak in Zone C
        inc4 = Incident(
            zone_id="ZONE-C",
            latitude=21.2487,
            longitude=81.6582,
            status="SUSPECTED",
            priority_score=48.0,
            priority_level="MEDIUM",
            confidence_level="MODERATE_EVIDENCE",
            estimated_excess_flow_lpm=12.0,
            estimated_loss_24h_liters=17280.0,
            assigned_engineer_id=None,
            created_at=now - timedelta(hours=2),
            updated_at=now - timedelta(minutes=50),
            ai_summary=json.dumps({
                "title": "Suspected Public Tap Leak — Shankar Nagar Sector 2",
                "brief": "Citizen report indicates broken public standpost near community park with steady flow into storm drain. Suspected leak — field verification required.",
                "priority_explanation": "Citizen report with photo evidence in residential zone; moderate excess flow deviation.",
                "priority_breakdown": {
                    "loss_severity_L": 36.0,
                    "anomaly_severity_A": 42.0,
                    "public_impact_I": 40.0,
                    "citizen_evidence_R": 65.0,
                    "time_unresolved_T": 40.0,
                },
                "recommended_action": "SCHEDULE_INSPECTION",
            })
        )
        # 5. Verified Resolved Incident in Zone A
        inc5 = Incident(
            zone_id="ZONE-A",
            latitude=21.2498,
            longitude=81.6275,
            status="VERIFIED_RESOLVED",
            priority_score=25.0,
            priority_level="LOW",
            confidence_level="FIELD_CONFIRMED",
            estimated_excess_flow_lpm=0.0,
            estimated_loss_24h_liters=0.0,
            assigned_engineer_id=tech2.id if tech2 else None,
            created_at=now - timedelta(hours=8),
            updated_at=now - timedelta(hours=1),
            ai_summary=json.dumps({
                "title": "Resolved Valve Seal Replacement — Secretariat Road",
                "brief": "Post-repair flow and pressure returned to normal baseline across 5 consecutive intervals. Verified resolved by operator.",
                "priority_explanation": "Repair completed and post-repair sensor recovery verified.",
                "priority_breakdown": {
                    "loss_severity_L": 0.0,
                    "anomaly_severity_A": 10.0,
                    "public_impact_I": 60.0,
                    "citizen_evidence_R": 80.0,
                    "time_unresolved_T": 10.0,
                },
                "recommended_action": "MONITOR",
            })
        )
        db.session.add_all([inc1, inc2, inc3, inc4, inc5])
        db.session.flush()

        # Sample Citizen Reports
        r1 = Report(
            tracking_reference="AG-2026-00101",
            incident_id=inc2.id,
            issue_type="PIPELINE_LEAK",
            description="Water is continuously leaking from the roadside main pipe near Pandri bus stand gate 2.",
            latitude=21.2569,
            longitude=81.6414,
            status="LINKED",
            created_at=now - timedelta(minutes=90),
        )
        r2 = Report(
            tracking_reference="AG-2026-00104",
            incident_id=inc2.id,
            issue_type="WATER_POOLING",
            description="Large water pooling near bus stop pipeline and school crossing; nearby shop water pressure is low.",
            latitude=21.2571,
            longitude=81.6416,
            status="LINKED",
            created_at=now - timedelta(minutes=75),
        )
        r3 = Report(
            tracking_reference="AG-2026-00108",
            incident_id=inc1.id,
            issue_type="PIPELINE_LEAK",
            description="High-pressure water gushing near Telibandha hospital main road junction.",
            latitude=21.2412,
            longitude=81.6652,
            status="LINKED",
            created_at=now - timedelta(minutes=80),
        )
        r4 = Report(
            tracking_reference="AG-2026-00112",
            incident_id=inc4.id,
            issue_type="PUBLIC_TAP_LEAK",
            description="Public standpost tap broken near Shankar Nagar community park, water running into drain.",
            latitude=21.2487,
            longitude=81.6582,
            status="UNDER_REVIEW",
            created_at=now - timedelta(minutes=65),
        )
        db.session.add_all([r1, r2, r3, r4])
        db.session.flush()

        # Sample Tasks
        t1 = Task(
            incident_id=inc1.id,
            technician_id=tech1.id if tech1 else None,
            task_type="INSPECTION",
            status="ASSIGNED",
            findings="Dispatched to Telibandha Hospital arterial main; carrying acoustic leak detector.",
            created_at=now - timedelta(minutes=45),
        )
        t2 = Task(
            incident_id=inc3.id,
            technician_id=tech1.id if tech1 else None,
            task_type="REPAIR",
            status="IN_PROGRESS",
            findings="Leak confirmed near 150mm cast-iron collar joint. Excavating chamber.",
            repair_action="Replacing damaged collar gasket and tightening bolts.",
            created_at=now - timedelta(hours=2),
        )
        t3 = Task(
            incident_id=inc2.id,
            technician_id=tech2.id if tech2 else None,
            task_type="INSPECTION",
            status="ACCEPTED",
            findings="En route to Pandri Bus Stand Gate 2 to inspect roadside pooling.",
            created_at=now - timedelta(minutes=30),
        )
        t4 = Task(
            incident_id=inc5.id,
            technician_id=tech2.id if tech2 else None,
            task_type="REPAIR",
            status="COMPLETED",
            findings="Worn gate-valve gland packing caused steady seepage.",
            repair_action="Replaced gland packing seal and pressure-tested line at 58 PSI.",
            created_at=now - timedelta(hours=6),
            completed_at=now - timedelta(hours=2),
        )
        db.session.add_all([t1, t2, t3, t4])

        # Audit events
        db.session.add_all([
            AuditEvent(
                incident_id=inc1.id,
                actor_id=operator.id if operator else None,
                action="INCIDENT_CREATED",
                reason="Sustained +52% flow surge and -33% pressure drop across 3 consecutive readings.",
                created_at=now - timedelta(minutes=95),
            ),
            AuditEvent(
                incident_id=inc1.id,
                actor_id=operator.id if operator else None,
                action="REPORT_LINKED",
                reason="Citizen report AG-2026-00108 corroborated sensor anomaly within 45m.",
                created_at=now - timedelta(minutes=80),
            ),
            AuditEvent(
                incident_id=inc1.id,
                actor_id=operator.id if operator else None,
                action="ENGINEER_ASSIGNED",
                reason="Assigned Priya Sharma for immediate field inspection.",
                created_at=now - timedelta(minutes=45),
            ),
            AuditEvent(
                incident_id=inc2.id,
                actor_id=operator.id if operator else None,
                action="INCIDENT_CREATED",
                reason="Flow +30% above baseline and pressure -22% below normal for 3 consecutive intervals.",
                created_at=now - timedelta(minutes=110),
            ),
            AuditEvent(
                incident_id=inc2.id,
                actor_id=operator.id if operator else None,
                action="REPORT_LINKED",
                reason="2 citizen reports (AG-2026-00101, AG-2026-00104) fused into INC-002.",
                created_at=now - timedelta(minutes=75),
            ),
        ])
        db.session.commit()


@simulation_bp.route("/scenario", methods=["POST"])
def trigger_scenario():
    """Trigger a named demo scenario."""
    data = request.get_json(force=True, silent=True) or {}
    scenario = data.get("scenario", "normal")
    zone_id = data.get("zone_id") or SCENARIO_ZONE_MAP.get(scenario, "ZONE-A")
    count = int(data.get("readings_count", 3))

    valid_scenarios = list(SCENARIO_ZONE_MAP.keys())
    if scenario not in valid_scenarios:
        return api_error(f"Unknown scenario. Valid options: {valid_scenarios}")

    anomaly_result, incident = _ingest_readings_for_scenario(zone_id, scenario, count)

    return api_response({
        "scenario": scenario,
        "zone_id": zone_id,
        "anomaly": anomaly_result,
        "incident_id": incident.id if incident else None,
        "incident_code": f"INC-{incident.id:03d}" if incident else None,
        "incident_status": incident.status if incident else None,
        "priority_level": incident.priority_level if incident else None,
        "message": (
            f"Scenario '{scenario}' applied to {zone_id}. "
            + (f"Suspected incident INC-{incident.id:03d} created/updated." if incident else "No incident created (anomaly not yet sustained).")
        ),
        "simulation_notice": "All readings are simulated for demonstration purposes.",
    })


@simulation_bp.route("/start", methods=["POST"])
def start_simulation():
    """Run normal readings for all zones and ensure demo dataset is populated."""
    seed_rich_demo_dataset()
    results = []
    for zone_id, scenario in [("ZONE-A", "normal"), ("ZONE-C", "normal"), ("ZONE-D", "normal"), ("ZONE-E", "normal")]:
        anomaly, _ = _ingest_readings_for_scenario(zone_id, scenario, 2)
        results.append({"zone_id": zone_id, "anomaly_status": anomaly["status"] if anomaly else "UNKNOWN"})
    return api_response({"message": "Simulation started with baseline and demo scenarios populated.", "zones": results})


@simulation_bp.route("/seed", methods=["POST"])
def seed_demo():
    """Populate rich demo incidents, reports, tasks, and sensor readings."""
    seed_rich_demo_dataset()
    return api_response({"message": "Rich demo dataset seeded successfully."})


@simulation_bp.route("/reset", methods=["POST"])
def reset_simulation():
    """
    Reset all simulation data back to a clean demo state.
    Clears all sensor readings, incidents, reports, tasks, and audit events.
    Re-seeds demo users and zones. If seed_demo=true is passed, also seeds sample incidents.
    """
    data = request.get_json(force=True, silent=True) or {}
    TaskAttachment.query.delete()
    Task.query.delete()
    AuditEvent.query.delete()
    IncidentEvidence.query.delete()
    ReportImage.query.delete()
    Report.query.delete()
    Incident.query.delete()
    SensorAnomaly.query.delete()
    SensorReading.query.delete()
    db.session.commit()

    for u in DEMO_USERS:
        if not User.query.filter_by(email=u["email"]).first():
            db.session.add(User(name=u["name"], email=u["email"], role=u["role"]))
    db.session.commit()

    if data.get("seed_demo"):
        seed_rich_demo_dataset()

    return api_response({"message": "Demo data reset. Clean simulation state restored.", "simulation_notice": "All data is synthetic."})


@simulation_bp.route("/scenarios", methods=["GET"])
def list_scenarios():
    """List available simulation scenarios."""
    scenarios = [
        {"id": "normal", "name": "Normal Operation", "default_zone": "ZONE-A", "expected_effect": "No incident created"},
        {"id": "gradual_leak", "name": "Gradual Pipeline Leak", "default_zone": "ZONE-B", "expected_effect": "High-Risk incident created"},
        {"id": "burst", "name": "Sudden Pipe Burst", "default_zone": "ZONE-D", "expected_effect": "Critical incident created"},
        {"id": "demand_spike", "name": "Temporary Demand Spike", "default_zone": "ZONE-C", "expected_effect": "Monitor state only"},
        {"id": "sensor_offline", "name": "Sensor Offline", "default_zone": "ZONE-E", "expected_effect": "Stale/offline warning"},
        {"id": "post_repair_recovery", "name": "Post-Repair Recovery", "default_zone": "ZONE-B", "expected_effect": "Recovery recommendation"},
    ]
    return api_response({"scenarios": scenarios})

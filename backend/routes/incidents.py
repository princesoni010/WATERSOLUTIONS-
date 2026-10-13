import json
from flask import Blueprint, request
from datetime import datetime, timezone

from extensions import db
from models import Incident, AuditEvent, Task, User
from services.priority import calculate_priority
from services.ai_summary import generate_incident_brief
from utils.response_helpers import api_response, api_error

incidents_bp = Blueprint("incidents", __name__, url_prefix="/api/incidents")

VALID_STATUSES = [
    "SUSPECTED", "UNDER_REVIEW", "INSPECTION_ASSIGNED", "FIELD_CONFIRMED",
    "REPAIR_IN_PROGRESS", "REPAIR_COMPLETED", "VERIFIED_RESOLVED",
    "NOT_A_LEAK", "DUPLICATE", "REOPENED",
]


@incidents_bp.route("", methods=["GET"])
def list_incidents():
    status_filter = request.args.get("status")
    priority_filter = request.args.get("priority_level")
    zone_filter = request.args.get("zone_id")
    limit = min(int(request.args.get("limit", 50)), 200)
    offset = int(request.args.get("offset", 0))

    q = Incident.query
    if status_filter:
        statuses = [s.strip().upper() for s in status_filter.split(",")]
        q = q.filter(Incident.status.in_(statuses))
    if priority_filter:
        q = q.filter(Incident.priority_level == priority_filter.upper())
    if zone_filter:
        q = q.filter(Incident.zone_id == zone_filter.upper())

    total = q.count()
    incidents = q.order_by(Incident.priority_score.desc(), Incident.created_at.desc()).offset(offset).limit(limit).all()
    return api_response({
        "incidents": [i.to_dict() for i in incidents],
        "total": total,
        "limit": limit,
        "offset": offset,
    })


@incidents_bp.route("/<int:incident_id>", methods=["GET"])
def get_incident(incident_id):
    inc = Incident.query.get(incident_id)
    if not inc:
        return api_error("Incident not found", 404)
    return api_response({"incident": inc.to_dict(include_details=True)})


@incidents_bp.route("/<int:incident_id>", methods=["PATCH"])
def update_incident(incident_id):
    inc = Incident.query.get(incident_id)
    if not inc:
        return api_error("Incident not found", 404)

    data = request.get_json(force=True, silent=True) or {}
    actor_id = data.get("actor_id")
    changes = []

    if "status" in data:
        new_status = data["status"].upper()
        if new_status not in VALID_STATUSES:
            return api_error(f"Invalid status: {new_status}")
        old_status = inc.status
        inc.status = new_status
        changes.append(f"Status changed: {old_status} → {new_status}")

        # Auto-update confidence if field-confirmed
        if new_status == "FIELD_CONFIRMED":
            inc.confidence_level = "FIELD_CONFIRMED"

    inc.updated_at = datetime.now(timezone.utc)
    db.session.flush()

    if changes:
        audit = AuditEvent(
            incident_id=inc.id,
            action="STATUS_UPDATED",
            reason="; ".join(changes) + (f" — {data.get('reason', '')}" if data.get("reason") else ""),
            actor_id=actor_id,
            created_at=datetime.now(timezone.utc),
        )
        db.session.add(audit)

    db.session.commit()
    return api_response({"incident": inc.to_dict()})


@incidents_bp.route("/<int:incident_id>/assign", methods=["POST"])
def assign_engineer(incident_id):
    inc = Incident.query.get(incident_id)
    if not inc:
        return api_error("Incident not found", 404)

    data = request.get_json(force=True, silent=True) or {}
    engineer_id = data.get("engineer_id")
    if not engineer_id:
        return api_error("engineer_id is required")

    engineer = User.query.get(engineer_id)
    if not engineer or engineer.role not in ("TECHNICIAN", "ADMIN"):
        return api_error("Engineer not found or does not have TECHNICIAN role", 404)

    inc.assigned_engineer_id = engineer_id
    if inc.status == "SUSPECTED":
        inc.status = "INSPECTION_ASSIGNED"
    inc.updated_at = datetime.now(timezone.utc)

    audit = AuditEvent(
        incident_id=inc.id,
        action="ENGINEER_ASSIGNED",
        reason=f"Assigned to {engineer.name} ({engineer.role})",
        actor_id=data.get("actor_id"),
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(audit)

    # Create an inspection task automatically
    task = Task(
        incident_id=inc.id,
        technician_id=engineer_id,
        task_type="INSPECTION",
        status="ASSIGNED",
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(task)
    db.session.commit()
    return api_response({"incident": inc.to_dict(), "task": task.to_dict()})


@incidents_bp.route("/<int:incident_id>/override-priority", methods=["POST"])
def override_priority(incident_id):
    inc = Incident.query.get(incident_id)
    if not inc:
        return api_error("Incident not found", 404)

    data = request.get_json(force=True, silent=True) or {}
    new_score = data.get("priority_score")
    new_level = data.get("priority_level")
    reason = data.get("reason", "")

    if new_score is not None:
        inc.priority_score = float(new_score)
    if new_level and new_level.upper() in ("LOW", "MEDIUM", "HIGH", "CRITICAL"):
        inc.priority_level = new_level.upper()
    inc.updated_at = datetime.now(timezone.utc)

    audit = AuditEvent(
        incident_id=inc.id,
        action="PRIORITY_OVERRIDDEN",
        reason=f"Manual override: score={new_score}, level={new_level}. Reason: {reason}",
        actor_id=data.get("actor_id"),
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(audit)
    db.session.commit()
    return api_response({"incident": inc.to_dict()})


@incidents_bp.route("/<int:incident_id>/merge-report", methods=["POST"])
def merge_report(incident_id):
    inc = Incident.query.get(incident_id)
    if not inc:
        return api_error("Incident not found", 404)

    from models import Report
    data = request.get_json(force=True, silent=True) or {}
    tracking_ref = data.get("tracking_reference")
    if not tracking_ref:
        return api_error("tracking_reference is required")

    report = Report.query.filter_by(tracking_reference=tracking_ref).first()
    if not report:
        return api_error(f"Report '{tracking_ref}' not found", 404)

    from services.incident_fusion import link_report_to_incident
    confidence = link_report_to_incident(report, inc, db)

    audit = AuditEvent(
        incident_id=inc.id,
        action="REPORT_MANUALLY_LINKED",
        reason=f"Report {tracking_ref} manually linked by operator.",
        actor_id=data.get("actor_id"),
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(audit)
    db.session.commit()
    return api_response({"incident": inc.to_dict(include_details=True), "new_confidence": confidence})


@incidents_bp.route("/<int:incident_id>/verify", methods=["POST"])
def verify_resolution(incident_id):
    inc = Incident.query.get(incident_id)
    if not inc:
        return api_error("Incident not found", 404)

    data = request.get_json(force=True, silent=True) or {}
    action = data.get("action", "VERIFY").upper()

    if action == "VERIFY":
        inc.status = "VERIFIED_RESOLVED"
        audit_action = "RESOLUTION_VERIFIED"
        msg = "Incident marked as verified resolved."
    elif action == "REOPEN":
        inc.status = "REOPENED"
        audit_action = "INCIDENT_REOPENED"
        msg = "Incident reopened for further investigation."
    else:
        return api_error("action must be VERIFY or REOPEN")

    inc.updated_at = datetime.now(timezone.utc)
    audit = AuditEvent(
        incident_id=inc.id,
        action=audit_action,
        reason=data.get("reason", ""),
        actor_id=data.get("actor_id"),
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(audit)
    db.session.commit()
    return api_response({"incident": inc.to_dict(), "message": msg})

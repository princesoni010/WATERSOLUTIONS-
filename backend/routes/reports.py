import os
import json
from flask import Blueprint, request
from datetime import datetime, timezone

from extensions import db
from models import Report, ReportImage, Incident, AuditEvent, IncidentEvidence
from services.image_analysis import analyze_image, tags_to_json
from services.incident_fusion import find_related_incident, link_report_to_incident
from services.priority import calculate_priority
from services.ai_summary import generate_incident_brief
from utils.validators import validate_coordinates, validate_image_file
from utils.response_helpers import api_response, api_error
from config import Config

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")

VALID_ISSUE_TYPES = {
    "PIPELINE_LEAK", "PUBLIC_TAP_LEAK", "TANK_OVERFLOW",
    "VALVE_JOINT_LEAK", "ROADSIDE_WATER", "WATER_POOLING", "OTHER"
}


def _next_tracking_ref():
    total = Report.query.count()
    seq = total + 1
    while True:
        candidate = f"AG-2026-{seq:05d}"
        if not Report.query.filter_by(tracking_reference=candidate).first():
            return candidate
        seq += 1


@reports_bp.route("", methods=["POST"])
def create_report():
    """Create a new citizen report (multipart/form-data) and link or create an operational incident."""
    issue_type = (request.form.get("issue_type") or "OTHER").upper()
    description = request.form.get("description", "").strip()
    lat_raw = request.form.get("latitude")
    lng_raw = request.form.get("longitude")

    if issue_type not in VALID_ISSUE_TYPES:
        return api_error(f"Invalid issue_type. Must be one of: {', '.join(VALID_ISSUE_TYPES)}")

    ok, err, lat, lng = validate_coordinates(lat_raw, lng_raw)
    if not ok:
        return api_error(err)

    # Image validation
    image_file = request.files.get("image")
    img_ok, img_err = validate_image_file(image_file)
    if not img_ok:
        return api_error(img_err)

    tracking_ref = _next_tracking_ref()

    report = Report(
        tracking_reference=tracking_ref,
        issue_type=issue_type,
        description=description,
        latitude=lat,
        longitude=lng,
        status="SUBMITTED",
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(report)
    db.session.flush()

    # Save and analyse image
    ai_tags = {}
    image_url = None
    if image_file and image_file.filename:
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        safe_name = f"{tracking_ref}_{image_file.filename}"
        save_path = os.path.join(Config.UPLOAD_FOLDER, safe_name)
        image_file.save(save_path)
        image_url = f"/uploads/report_images/{safe_name}"

        ai_tags = analyze_image(save_path, issue_type)
        img_rec = ReportImage(
            report_id=report.id,
            image_url=image_url,
            ai_tags_json=tags_to_json(ai_tags),
            created_at=datetime.now(timezone.utc),
        )
        db.session.add(img_rec)
        db.session.flush()

    # Find nearest zone
    from utils.geo_utils import find_nearest_zone
    zone = find_nearest_zone(lat, lng)
    zone_id = zone.id if zone else "ZONE-B"

    # Try to link to existing open incident within 100m, or create a new incident
    target_incident = find_related_incident(lat, lng, zone_id, issue_type)
    created_new = False

    if target_incident:
        link_report_to_incident(report, target_incident, db)
        priority_data = calculate_priority(target_incident)
        target_incident.priority_score = priority_data["score"]
        target_incident.priority_level = priority_data["level"]
        brief_data = generate_incident_brief(target_incident, priority_data=priority_data)
        brief_data.update(priority_data)
        target_incident.ai_summary = json.dumps(brief_data)
        target_incident.updated_at = datetime.now(timezone.utc)

        ev = IncidentEvidence(
            incident_id=target_incident.id,
            evidence_type="CITIZEN_REPORT",
            reference_id=tracking_ref,
            linked_at=datetime.now(timezone.utc),
        )
        db.session.add(ev)

        audit = AuditEvent(
            incident_id=target_incident.id,
            action="REPORT_LINKED",
            reason=f"Citizen report {tracking_ref} ({issue_type}) linked via proximity match.",
            created_at=datetime.now(timezone.utc),
        )
        db.session.add(audit)
    else:
        created_new = True
        default_excess = 18.0 if issue_type in ("PIPELINE_LEAK", "TANK_OVERFLOW") else 10.5
        target_incident = Incident(
            zone_id=zone_id,
            latitude=lat,
            longitude=lng,
            status="SUSPECTED",
            confidence_level="MODERATE_EVIDENCE" if image_url else "LOW_EVIDENCE",
            estimated_excess_flow_lpm=default_excess,
            estimated_loss_24h_liters=default_excess * 1440.0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.session.add(target_incident)
        db.session.flush()

        report.incident_id = target_incident.id
        report.status = "UNDER_REVIEW"

        priority_data = calculate_priority(target_incident)
        target_incident.priority_score = priority_data["score"]
        target_incident.priority_level = priority_data["level"]
        brief_data = generate_incident_brief(target_incident, priority_data=priority_data)
        brief_data["title"] = f"Citizen Reported {issue_type.replace('_', ' ').title()} — {zone.name if zone else zone_id}"
        brief_data["brief"] = (
            f"Citizen report {tracking_ref} submitted for {issue_type.replace('_', ' ').lower()}: "
            f"\"{description or 'Visible water leakage reported.'}\" Suspected leak — field verification required."
        )
        brief_data.update(priority_data)
        target_incident.ai_summary = json.dumps(brief_data)

        ev = IncidentEvidence(
            incident_id=target_incident.id,
            evidence_type="CITIZEN_REPORT",
            reference_id=tracking_ref,
            linked_at=datetime.now(timezone.utc),
        )
        db.session.add(ev)

        audit = AuditEvent(
            incident_id=target_incident.id,
            action="INCIDENT_CREATED_FROM_CITIZEN_REPORT",
            reason=f"Created from citizen report {tracking_ref}: {description or issue_type}",
            created_at=datetime.now(timezone.utc),
        )
        db.session.add(audit)

    db.session.commit()

    return api_response({
        "report": report.to_dict(),
        "tracking_reference": tracking_ref,
        "linked_incident_id": target_incident.id,
        "linked_incident_code": f"INC-2026-{target_incident.id + 1050}",
        "created_new_incident": created_new,
        "message": (
            f"Report submitted. Tracking reference: {tracking_ref}. "
            + (
                f"New incident INC-2026-{target_incident.id + 1050} created for operator review."
                if created_new
                else f"Linked to existing incident INC-2026-{target_incident.id + 1050}."
            )
        ),
    }, status=201)


@reports_bp.route("/<tracking_reference>", methods=["GET"])
def get_report_status(tracking_reference):
    """Public: view status of a report by tracking reference. No PII exposed."""
    report = Report.query.filter_by(tracking_reference=tracking_reference).first()
    if not report:
        return api_error("Report not found", 404)
    return api_response({"report": report.to_dict()})


@reports_bp.route("", methods=["GET"])
def list_reports():
    """Admin/operator: list all reports with optional filters."""
    status_filter = request.args.get("status")
    limit = min(int(request.args.get("limit", 50)), 200)
    offset = int(request.args.get("offset", 0))

    q = Report.query
    if status_filter:
        q = q.filter_by(status=status_filter.upper())
    reports = q.order_by(Report.created_at.desc()).offset(offset).limit(limit).all()
    return api_response({
        "reports": [r.to_dict() for r in reports],
        "total": q.count(),
        "limit": limit,
        "offset": offset,
    })

"""
services/incident_fusion.py
Links citizen reports and sensor anomalies to existing incidents.
Merges by: same zone, within 100m, similar issue type, time window.
"""

from datetime import datetime, timedelta, timezone
from models import Incident, Report
from utils.geo_utils import haversine_meters

MERGE_DISTANCE_M = 100.0          # meters
MERGE_TIME_WINDOW_HOURS = 6       # hours

ISSUE_TYPE_GROUPS = {
    "PIPELINE_LEAK":   {"PIPELINE_LEAK", "WATER_POOLING", "VALVE_JOINT_LEAK"},
    "WATER_POOLING":   {"PIPELINE_LEAK", "WATER_POOLING", "VALVE_JOINT_LEAK"},
    "VALVE_JOINT_LEAK":{"PIPELINE_LEAK", "WATER_POOLING", "VALVE_JOINT_LEAK"},
    "PUBLIC_TAP_LEAK": {"PUBLIC_TAP_LEAK", "WATER_POOLING"},
    "TANK_OVERFLOW":   {"TANK_OVERFLOW"},
    "ROADSIDE_WATER":  {"ROADSIDE_WATER", "WATER_POOLING", "PIPELINE_LEAK"},
    "OTHER":           set(),
}


def _issue_types_compatible(type_a, type_b):
    if type_a == type_b:
        return True
    group_a = ISSUE_TYPE_GROUPS.get(type_a, set())
    return type_b in group_a


def find_related_incident(latitude, longitude, zone_id, issue_type):
    """
    Find an existing open incident within 100m near the given location.

    Returns:
        Incident object if found within 100m, else None
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=MERGE_TIME_WINDOW_HOURS)

    candidates = Incident.query.filter(
        Incident.status.notin_(["VERIFIED_RESOLVED", "NOT_A_LEAK"]),
        Incident.created_at >= cutoff,
    ).all()

    best = None
    best_dist = float("inf")

    for inc in candidates:
        dist = haversine_meters(latitude, longitude, inc.latitude, inc.longitude)
        inc_issue = None
        if inc.reports:
            inc_issue = inc.reports[0].issue_type

        compatible = _issue_types_compatible(issue_type, inc_issue) if inc_issue else True

        if dist <= MERGE_DISTANCE_M and compatible:
            if dist < best_dist:
                best_dist = dist
                best = inc

    return best


def link_report_to_incident(report, incident, db):
    """Associate a Report with an Incident and update evidence confidence."""
    report.incident_id = incident.id
    report.status = "LINKED"

    report_count = Report.query.filter_by(incident_id=incident.id).count()
    has_images = any(len(r.images) > 0 for r in incident.reports)

    if incident.status in ("FIELD_CONFIRMED", "REPAIR_IN_PROGRESS", "REPAIR_COMPLETED"):
        new_confidence = "FIELD_CONFIRMED"
    elif report_count >= 2 and has_images:
        new_confidence = "CORROBORATED"
    elif report_count >= 2 or has_images or len(incident.evidences) >= 1:
        new_confidence = "CORROBORATED" if report_count >= 1 and len(incident.evidences) >= 1 else "MODERATE_EVIDENCE"
    else:
        new_confidence = "LOW_EVIDENCE"

    incident.confidence_level = new_confidence
    db.session.commit()
    return new_confidence

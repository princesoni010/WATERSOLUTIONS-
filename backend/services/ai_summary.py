"""
services/ai_summary.py
Generates explainable operator briefings from stored incident data.
Never invents values or claims field confirmation without technician status.
All AI outputs are labelled as AI-generated summaries.
"""

from datetime import datetime, timezone


CONFIDENCE_LABELS = {
    "LOW_EVIDENCE": "Low — sensor anomaly only, no citizen report",
    "MODERATE_EVIDENCE": "Moderate — sensor anomaly plus one citizen report",
    "CORROBORATED": "Corroborated — multiple independent reports with sensor evidence",
    "FIELD_CONFIRMED": "High — field engineer has confirmed physical leak",
}

ACTION_LABELS = {
    "CRITICAL": "Immediate assignment — assign field team now.",
    "HIGH": "High urgency — inspect or repair same day.",
    "MEDIUM": "Schedule inspection within next available shift.",
    "LOW": "Monitor — add to inspection queue.",
}


def generate_incident_brief(incident, anomaly_data=None, priority_data=None):
    """
    Build an operator-facing AI brief for an incident.

    Args:
        incident: Incident model object
        anomaly_data: dict from leak_detection service (optional)
        priority_data: dict from priority service (optional)

    Returns:
        dict: title, brief, priority_explanation, recommended_action,
              evidence_confidence_label, is_ai_generated
    """
    zone_name = incident.zone.name if incident.zone else (incident.zone_id or "Unknown Zone")
    report_count = len(incident.reports) if incident.reports else 0
    excess_flow = incident.estimated_excess_flow_lpm or 0.0
    loss_24h = incident.estimated_loss_24h_liters or 0.0

    anomaly_status = "UNKNOWN"
    metrics = {}
    if anomaly_data:
        anomaly_status = anomaly_data.get("status", "UNKNOWN")
        metrics = anomaly_data.get("metrics", {})

    fi_pct = metrics.get("flow_increase_pct", 0.0)
    pd_pct = metrics.get("pressure_drop_pct", 0.0)

    title = f"Suspected Leak — {zone_name}"
    if incident.status == "FIELD_CONFIRMED":
        title = f"Field-Confirmed Leak — {zone_name}"
    elif incident.status in ("REPAIR_IN_PROGRESS", "REPAIR_COMPLETED"):
        title = f"Repair In Progress — {zone_name}"
    elif incident.status == "VERIFIED_RESOLVED":
        title = f"Resolved — {zone_name}"

    # Build brief text from ONLY stored incident data
    parts = [f"**{title}** (INC-{incident.id:03d})"]

    if fi_pct > 0 or pd_pct > 0:
        parts.append(
            f"Flow is {fi_pct:.1f}% above baseline. "
            f"Pressure is {pd_pct:.1f}% below expected."
        )

    if excess_flow > 0:
        parts.append(
            f"Estimated excess flow: {excess_flow:.1f} L/min. "
            f"Projected potential loss in 24 hours: {loss_24h:,.0f} litres (simulated — field verification required)."
        )

    if report_count > 0:
        parts.append(f"{report_count} citizen report(s) linked to this incident.")

    confidence_label = CONFIDENCE_LABELS.get(
        incident.confidence_level, incident.confidence_level
    )
    parts.append(f"Evidence confidence: {confidence_label}.")

    if incident.status not in ("FIELD_CONFIRMED", "REPAIR_IN_PROGRESS", "REPAIR_COMPLETED", "VERIFIED_RESOLVED"):
        parts.append(
            "Status: Suspected leak — field inspection required. "
            "This assessment is based on simulated sensor data and citizen reports. "
            "AI recommends; operators decide; field engineers confirm."
        )

    brief = " ".join(parts)

    priority_level = incident.priority_level or "LOW"
    priority_explanation = ""
    if priority_data:
        priority_explanation = priority_data.get("explanation", "")
        breakdown = priority_data.get("priority_breakdown", {})
        if breakdown:
            priority_explanation += (
                f" Score breakdown — Loss: {breakdown.get('loss_severity_L', 0):.0f}/100, "
                f"Anomaly: {breakdown.get('anomaly_severity_A', 0):.0f}/100, "
                f"Impact: {breakdown.get('public_impact_I', 0):.0f}/100, "
                f"Evidence: {breakdown.get('citizen_evidence_R', 0):.0f}/100, "
                f"Age: {breakdown.get('time_unresolved_T', 0):.0f}/100."
            )

    return {
        "title": title,
        "brief": brief,
        "priority_explanation": priority_explanation,
        "recommended_action": ACTION_LABELS.get(priority_level, "Monitor — add to inspection queue."),
        "evidence_confidence_label": confidence_label,
        "anomaly_status": anomaly_status,
        "is_ai_generated": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

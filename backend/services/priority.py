"""
services/priority.py
Priority scoring engine per TRD Section 7.8.

Formula: Priority = 0.30*L + 0.25*A + 0.20*I + 0.15*R + 0.10*T
  L = Water-loss severity (0-100)
  A = Anomaly severity (0-100)
  I = Public impact (0-100)
  R = Citizen evidence (0-100)
  T = Time unresolved (0-100)
"""

from datetime import datetime, timezone

IMPACT_SCORES = {
    "CRITICAL_INFRASTRUCTURE": 100,  # Hospital, fire station
    "HIGH_PUBLIC_IMPACT": 80,         # School, bus stand, market
    "GOVERNMENT_CIVIC": 60,
    "RESIDENTIAL": 40,
    "STANDARD": 20,
}

PRIORITY_BANDS = [
    (80, "CRITICAL"),
    (60, "HIGH"),
    (40, "MEDIUM"),
    (0,  "LOW"),
]


def _loss_score(excess_flow_lpm):
    """Map excess flow L/min to 0-100."""
    if not excess_flow_lpm or excess_flow_lpm <= 0:
        return 0.0
    # 0 lpm → 0, 50+ lpm → 100
    return min(100.0, (excess_flow_lpm / 50.0) * 100.0)


def _anomaly_score_from_pct(flow_increase_pct, pressure_drop_pct, consecutive_readings):
    """Map deviation percentages + persistence to 0-100."""
    fi_score = min(100.0, (flow_increase_pct / 60.0) * 100.0) if flow_increase_pct else 0.0
    pd_score = min(100.0, (pressure_drop_pct / 40.0) * 100.0) if pressure_drop_pct else 0.0
    base = (fi_score * 0.6 + pd_score * 0.4)
    persistence_bonus = min(20.0, consecutive_readings * 6.0)
    return min(100.0, base + persistence_bonus)


def _evidence_score(report_count, has_images, field_confirmed):
    """Map citizen evidence to 0-100."""
    if field_confirmed:
        return 100.0
    score = min(60.0, report_count * 20.0)  # up to 3 reports = 60
    if has_images:
        score += 25.0
    return min(100.0, score)


def _time_score(created_at):
    """Map unresolved age to 0-100. 0 mins = 0, 24+ hours = 100."""
    if not created_at:
        return 0.0
    if not created_at.tzinfo:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_minutes = (datetime.now(timezone.utc) - created_at).total_seconds() / 60.0
    return min(100.0, (age_minutes / (24 * 60)) * 100.0)


def priority_level_from_score(score):
    for threshold, label in PRIORITY_BANDS:
        if score >= threshold:
            return label
    return "LOW"


def calculate_priority(incident, anomaly_data=None):
    """
    Calculate priority score and return explanation.

    Args:
        incident: Incident model object
        anomaly_data: Optional dict from leak_detection service with metrics

    Returns:
        dict: score, level, explanation, priority_breakdown, recommended_action
    """
    zone = incident.zone
    impact_cat = zone.impact_category if zone else "STANDARD"
    impact_score_raw = IMPACT_SCORES.get(impact_cat, 20)

    # L: Loss severity
    excess_flow = incident.estimated_excess_flow_lpm or 0.0
    L = _loss_score(excess_flow)

    # A: Anomaly severity
    fi_pct = 0.0
    pd_pct = 0.0
    consecutive = 0
    if anomaly_data and isinstance(anomaly_data, dict):
        metrics = anomaly_data.get("metrics", {})
        fi_pct = metrics.get("flow_increase_pct", 0.0)
        pd_pct = metrics.get("pressure_drop_pct", 0.0)
        consecutive = anomaly_data.get("consecutive_anomalous", 0)
    A = _anomaly_score_from_pct(fi_pct, pd_pct, consecutive)

    # I: Public impact
    I = float(impact_score_raw)

    # R: Citizen evidence
    report_count = len(incident.reports) if incident.reports else 0
    has_images = any(len(r.images) > 0 for r in (incident.reports or []))
    field_confirmed = incident.status == "FIELD_CONFIRMED"
    R = _evidence_score(report_count, has_images, field_confirmed)

    # T: Time unresolved
    T = _time_score(incident.created_at)

    # Weighted formula
    score = (0.30 * L + 0.25 * A + 0.20 * I + 0.15 * R + 0.10 * T)
    score = round(min(100.0, score), 1)
    level = priority_level_from_score(score)

    # Build explanation
    action_map = {
        "CRITICAL": "IMMEDIATE_ASSIGNMENT",
        "HIGH": "INSPECT_SAME_DAY",
        "MEDIUM": "SCHEDULE_INSPECTION",
        "LOW": "MONITOR",
    }

    explanation_parts = []
    if fi_pct >= 25:
        explanation_parts.append(f"Persistent excess flow is {fi_pct:.1f}% above baseline.")
    if pd_pct >= 15:
        explanation_parts.append(f"Pressure is {pd_pct:.1f}% below normal.")
    if report_count > 0:
        explanation_parts.append(f"{report_count} independent citizen report(s) are linked.")
    if incident.created_at:
        age_min = int((datetime.now(timezone.utc) - (incident.created_at.replace(tzinfo=timezone.utc) if not incident.created_at.tzinfo else incident.created_at)).total_seconds() / 60)
        if age_min > 0:
            explanation_parts.append(f"The incident has remained unresolved for {age_min} minutes.")
    if impact_cat in ("CRITICAL_INFRASTRUCTURE", "HIGH_PUBLIC_IMPACT"):
        explanation_parts.append(f"Zone impact category: {impact_cat.replace('_', ' ').title()}.")

    explanation = " ".join(explanation_parts) if explanation_parts else "Suspected leak — field verification required."

    return {
        "score": score,
        "level": level,
        "explanation": explanation,
        "recommended_action": action_map.get(level, "MONITOR"),
        "priority_breakdown": {
            "loss_severity_L": round(L, 1),
            "anomaly_severity_A": round(A, 1),
            "public_impact_I": round(I, 1),
            "citizen_evidence_R": round(R, 1),
            "time_unresolved_T": round(T, 1),
        },
    }

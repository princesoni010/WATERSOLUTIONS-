"""
services/leak_detection.py
Evaluates sensor readings for sustained anomalies.
Returns: NORMAL / MONITOR / SUSPICIOUS / HIGH_RISK
"""

FLOW_INCREASE_THRESHOLD = 25.0   # % above expected to flag
PRESSURE_DROP_THRESHOLD = 15.0   # % below expected to flag
PERSISTENCE_READINGS = 3          # must sustain anomaly for this many consecutive readings
RECOVERY_READINGS = 5             # must sustain normal for this many readings to mark recovered


def _flow_increase_pct(observed, expected):
    if not expected or expected == 0:
        return 0.0
    return ((observed - expected) / expected) * 100.0


def _pressure_drop_pct(observed, expected):
    if not expected or expected == 0:
        return 0.0
    return ((expected - observed) / expected) * 100.0


def classify_single_reading(flow_lpm, expected_flow, pressure_psi, expected_pressure):
    """Classify a single reading into an anomaly label (no persistence check here)."""
    if flow_lpm is None and pressure_psi is None:
        return "UNKNOWN", 0.0, {}

    fi = _flow_increase_pct(flow_lpm or 0, expected_flow) if flow_lpm is not None else 0.0
    pd = _pressure_drop_pct(pressure_psi or 0, expected_pressure) if pressure_psi is not None else 0.0

    metrics = {
        "flow_increase_pct": round(fi, 1),
        "pressure_drop_pct": round(pd, 1),
    }

    if fi >= FLOW_INCREASE_THRESHOLD and pd >= PRESSURE_DROP_THRESHOLD:
        severity = min(1.0, (fi / 50.0 * 0.5) + (pd / 30.0 * 0.5))
        return "HIGH_RISK", round(severity, 2), metrics
    elif fi >= FLOW_INCREASE_THRESHOLD or pd >= PRESSURE_DROP_THRESHOLD:
        severity = min(0.75, max(fi / 50.0, pd / 30.0) * 0.75)
        return "SUSPICIOUS", round(severity, 2), metrics
    elif fi >= 10.0 or pd >= 8.0:
        severity = max(fi / 50.0, pd / 30.0) * 0.4
        return "MONITOR", round(severity, 2), metrics
    else:
        return "NORMAL", 0.0, metrics


def detect_leak_risk(readings, expected_flow, expected_pressure):
    """
    Evaluate a list of recent SensorReading objects for a sustained anomaly.

    Args:
        readings: list of SensorReading objects (newest last preferred)
        expected_flow: baseline flow in L/min
        expected_pressure: baseline pressure in PSI

    Returns:
        dict with keys: status, anomaly_score, consecutive_anomalous,
                        consecutive_normal, metrics, explanation, recommended_action
    """
    if not readings:
        return {
            "status": "UNKNOWN",
            "anomaly_score": 0.0,
            "consecutive_anomalous": 0,
            "consecutive_normal": 0,
            "metrics": {},
            "explanation": "No readings available for evaluation.",
            "recommended_action": "COLLECT_MORE_DATA",
        }

    recent = readings[-PERSISTENCE_READINGS:] if len(readings) >= PERSISTENCE_READINGS else readings
    statuses = []
    scores = []
    metrics_list = []

    for r in recent:
        label, score, m = classify_single_reading(
            r.flow_lpm, expected_flow, r.pressure_psi, expected_pressure
        )
        if r.quality_flag in ("STALE", "MISSING", "INVALID"):
            label = "UNKNOWN"
            score = 0.0
        statuses.append(label)
        scores.append(score)
        metrics_list.append(m)

    # Count consecutive anomalous from the end
    consecutive_anomalous = 0
    for s in reversed(statuses):
        if s in ("HIGH_RISK", "SUSPICIOUS"):
            consecutive_anomalous += 1
        else:
            break

    # Count consecutive normal from the end
    consecutive_normal = 0
    for s in reversed(statuses):
        if s == "NORMAL":
            consecutive_normal += 1
        else:
            break

    avg_score = sum(scores) / len(scores) if scores else 0.0
    latest_metrics = metrics_list[-1] if metrics_list else {}
    latest_status = statuses[-1] if statuses else "UNKNOWN"

    # Persistence rule: sustained anomaly for >= PERSISTENCE_READINGS
    if consecutive_anomalous >= PERSISTENCE_READINGS:
        fi = latest_metrics.get("flow_increase_pct", 0)
        pd = latest_metrics.get("pressure_drop_pct", 0)
        explanation = (
            f"Flow is {fi:.1f}% above baseline and pressure is {pd:.1f}% below expected "
            f"for {consecutive_anomalous} consecutive readings. "
            "Suspected leak — field inspection required."
        )
        return {
            "status": "HIGH_RISK",
            "anomaly_score": round(min(avg_score * 1.2, 1.0), 2),
            "consecutive_anomalous": consecutive_anomalous,
            "consecutive_normal": consecutive_normal,
            "metrics": latest_metrics,
            "explanation": explanation,
            "recommended_action": "INSPECT_WITHIN_2_HOURS",
        }

    # Recovery rule
    if consecutive_normal >= RECOVERY_READINGS:
        return {
            "status": "RECOVERED",
            "anomaly_score": 0.0,
            "consecutive_anomalous": 0,
            "consecutive_normal": consecutive_normal,
            "metrics": latest_metrics,
            "explanation": f"Readings have returned to normal for {consecutive_normal} consecutive intervals.",
            "recommended_action": "VERIFY_RESOLUTION",
        }

    # Single reading anomaly — only monitor
    if latest_status in ("HIGH_RISK", "SUSPICIOUS") and consecutive_anomalous < PERSISTENCE_READINGS:
        fi = latest_metrics.get("flow_increase_pct", 0)
        pd = latest_metrics.get("pressure_drop_pct", 0)
        return {
            "status": "MONITOR",
            "anomaly_score": round(avg_score * 0.6, 2),
            "consecutive_anomalous": consecutive_anomalous,
            "consecutive_normal": consecutive_normal,
            "metrics": latest_metrics,
            "explanation": (
                f"Deviation detected (flow +{fi:.1f}%, pressure -{pd:.1f}%) but not yet sustained. "
                "Monitoring — no incident created yet. "
                "Note: demand variation or sensor noise may produce similar readings."
            ),
            "recommended_action": "COLLECT_MORE_DATA",
        }

    return {
        "status": "NORMAL",
        "anomaly_score": 0.0,
        "consecutive_anomalous": 0,
        "consecutive_normal": consecutive_normal,
        "metrics": latest_metrics,
        "explanation": "Flow and pressure are within expected ranges.",
        "recommended_action": "NO_ACTION",
    }

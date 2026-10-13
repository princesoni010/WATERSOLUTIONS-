"""
services/loss_estimator.py
Estimates potential water loss from flow deviation.
All estimates are labelled as simulated/modelled — not physically measured.
"""


def estimate_loss(observed_flow_lpm, expected_flow_lpm, duration_minutes=60.0):
    """
    Calculate excess flow and potential volume loss.

    Args:
        observed_flow_lpm:  Observed flow in litres per minute
        expected_flow_lpm:  Baseline expected flow in litres per minute
        duration_minutes:   Duration in minutes (default 60)

    Returns:
        dict with excess_flow_lpm, loss_volume_liters, loss_1h_liters,
              loss_24h_liters, basis, status
    """
    if observed_flow_lpm is None or expected_flow_lpm is None:
        return {
            "excess_flow_lpm": 0.0,
            "loss_volume_liters": 0.0,
            "loss_1h_liters": 0.0,
            "loss_24h_liters": 0.0,
            "basis": "Simulated zone-level flow deviation",
            "status": "Field verification required",
            "note": "Insufficient data to estimate.",
        }

    excess = max(0.0, float(observed_flow_lpm) - float(expected_flow_lpm))
    loss_volume = excess * float(duration_minutes)
    loss_1h = excess * 60.0
    loss_24h = excess * 1440.0

    return {
        "excess_flow_lpm": round(excess, 1),
        "loss_volume_liters": round(loss_volume, 1),
        "loss_1h_liters": round(loss_1h, 1),
        "loss_24h_liters": round(loss_24h, 1),
        "basis": "Simulated zone-level flow deviation",
        "status": "Field verification required",
        "note": (
            "Estimated excess flow is based on simulated sensor data. "
            "Actual loss requires field measurement. "
            "Zone-level excess flow is not added across linked incidents to avoid double-counting."
        ),
    }

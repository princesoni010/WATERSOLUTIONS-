"""
services/sensor_simulator.py
Generates simulated sensor readings for the 5 demo zones and 6 scenarios.
All output is labelled as SIMULATED — never presented as real hardware data.
"""

import random
from datetime import datetime, timezone


ZONE_BASELINES = {
    "ZONE-A": {"expected_flow_lpm": 90.0,  "expected_pressure_psi": 58.0, "sensor_id": "FLOW-ZONE-A-01"},
    "ZONE-B": {"expected_flow_lpm": 100.0, "expected_pressure_psi": 60.0, "sensor_id": "FLOW-ZONE-B-01"},
    "ZONE-C": {"expected_flow_lpm": 80.0,  "expected_pressure_psi": 55.0, "sensor_id": "FLOW-ZONE-C-01"},
    "ZONE-D": {"expected_flow_lpm": 110.0, "expected_pressure_psi": 62.0, "sensor_id": "FLOW-ZONE-D-01"},
    "ZONE-E": {"expected_flow_lpm": 70.0,  "expected_pressure_psi": 52.0, "sensor_id": "FLOW-ZONE-E-01"},
}

SCENARIO_PARAMS = {
    "normal":             {"flow_mult": 1.00, "pressure_mult": 1.00, "quality": "GOOD", "noise": 0.02},
    "gradual_leak":       {"flow_mult": 1.30, "pressure_mult": 0.78, "quality": "GOOD", "noise": 0.02},
    "burst":              {"flow_mult": 1.55, "pressure_mult": 0.66, "quality": "GOOD", "noise": 0.01},
    "demand_spike":       {"flow_mult": 1.26, "pressure_mult": 0.93, "quality": "GOOD", "noise": 0.03},
    "sensor_offline":     {"flow_mult": None, "pressure_mult": None, "quality": "STALE", "noise": 0.0},
    "post_repair_recovery": {"flow_mult": 1.01, "pressure_mult": 0.99, "quality": "GOOD", "noise": 0.015},
}


def generate_sensor_reading(zone_id, scenario="normal"):
    """
    Generate one simulated sensor reading payload for a zone.

    Returns:
        dict with keys: sensor_id, zone_id, timestamp, flow_lpm,
                        expected_flow_lpm, pressure_psi, expected_pressure_psi,
                        quality_flag, scenario_id, is_simulated
    """
    baseline = ZONE_BASELINES.get(zone_id)
    if not baseline:
        return None

    params = SCENARIO_PARAMS.get(scenario, SCENARIO_PARAMS["normal"])
    ef = baseline["expected_flow_lpm"]
    ep = baseline["expected_pressure_psi"]

    if params["quality"] in ("STALE", "MISSING"):
        return {
            "sensor_id": baseline["sensor_id"],
            "zone_id": zone_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "flow_lpm": None,
            "expected_flow_lpm": ef,
            "pressure_psi": None,
            "expected_pressure_psi": ep,
            "quality_flag": params["quality"],
            "scenario_id": scenario,
            "is_simulated": True,
        }

    noise_f = 1.0 + random.uniform(-params["noise"], params["noise"])
    noise_p = 1.0 + random.uniform(-params["noise"], params["noise"])

    flow = round(ef * params["flow_mult"] * noise_f, 2)
    pressure = round(ep * params["pressure_mult"] * noise_p, 2)

    return {
        "sensor_id": baseline["sensor_id"],
        "zone_id": zone_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "flow_lpm": flow,
        "expected_flow_lpm": ef,
        "pressure_psi": pressure,
        "expected_pressure_psi": ep,
        "quality_flag": params["quality"],
        "scenario_id": scenario,
        "is_simulated": True,
    }


def generate_batch(zone_id, scenario="normal", count=3):
    """Generate multiple readings for a zone in one scenario pass."""
    return [r for r in [generate_sensor_reading(zone_id, scenario) for _ in range(count)] if r]

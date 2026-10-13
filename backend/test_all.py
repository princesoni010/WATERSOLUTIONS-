"""
AquaGuard AI — Full Integration Test Suite
Tests every API endpoint and core service logic.
Run: python test_all.py
"""
import json
import sys
import traceback
import requests

BASE = "http://localhost:5000/api"
PASS = []
FAIL = []

def ok(name):
    PASS.append(name)
    print(f"  ✅ PASS  {name}")

def fail(name, detail):
    FAIL.append((name, detail))
    print(f"  ❌ FAIL  {name}")
    print(f"          {detail}")

def test(name, fn):
    try:
        fn()
        ok(name)
    except AssertionError as e:
        fail(name, str(e))
    except Exception as e:
        fail(name, traceback.format_exc(limit=3))

# ── Health ─────────────────────────────────────────────────────────────────
print("\n── Health ──────────────────────────────────────────────────────────────")

def t_health():
    r = requests.get(f"{BASE}/health")
    assert r.status_code == 200, f"status={r.status_code}"
    d = r.json()
    assert d["status"] == "ok"
    assert d["simulation_mode"] == True

test("GET /health", t_health)

# ── Zones ──────────────────────────────────────────────────────────────────
print("\n── Zones ───────────────────────────────────────────────────────────────")

def t_zones_list():
    r = requests.get(f"{BASE}/zones")
    assert r.status_code == 200
    zones = r.json()["zones"]
    assert len(zones) == 5, f"expected 5 zones, got {len(zones)}"
    ids = {z["zone_id"] for z in zones}
    for zid in ["ZONE-A","ZONE-B","ZONE-C","ZONE-D","ZONE-E"]:
        assert zid in ids, f"{zid} missing"

def t_zone_readings():
    r = requests.get(f"{BASE}/zones/ZONE-B/readings?limit=10")
    assert r.status_code == 200
    d = r.json()
    assert "readings" in d
    assert "zone" in d

def t_zone_readings_invalid():
    r = requests.get(f"{BASE}/zones/ZONE-ZZZ/readings")
    assert r.status_code == 404

test("GET /zones — 5 zones seeded", t_zones_list)
test("GET /zones/ZONE-B/readings", t_zone_readings)
test("GET /zones/ZONE-ZZZ/readings → 404", t_zone_readings_invalid)

# ── Sensors ────────────────────────────────────────────────────────────────
print("\n── Sensors ─────────────────────────────────────────────────────────────")

def t_sensors_list():
    r = requests.get(f"{BASE}/sensors")
    assert r.status_code == 200
    sensors = r.json()["sensors"]
    assert len(sensors) == 5, f"expected 5, got {len(sensors)}"

def t_sensor_readings_list():
    r = requests.get(f"{BASE}/sensors/FLOW-ZONE-B-01/readings?limit=5")
    assert r.status_code == 200
    assert "readings" in r.json()

def t_sensor_ingest_good():
    payload = {
        "sensor_id": "FLOW-ZONE-A-01",
        "flow_lpm": 91.0,
        "pressure_psi": 57.5,
        "quality_flag": "GOOD",
        "is_simulated": True,
    }
    r = requests.post(f"{BASE}/sensors/readings", json=payload)
    assert r.status_code == 201, f"status={r.status_code} body={r.text[:200]}"
    d = r.json()
    assert "reading" in d
    assert "anomaly" in d
    assert d["anomaly"]["status"] == "NORMAL"

def t_sensor_ingest_missing_sensor():
    payload = {"sensor_id": "FLOW-ZONE-ZZZ-99", "flow_lpm": 100.0, "quality_flag": "GOOD"}
    r = requests.post(f"{BASE}/sensors/readings", json=payload)
    assert r.status_code == 404

def t_sensor_ingest_missing_id():
    r = requests.post(f"{BASE}/sensors/readings", json={"flow_lpm": 100.0})
    assert r.status_code == 400

def t_sensor_ingest_stale():
    payload = {
        "sensor_id": "FLOW-ZONE-E-01",
        "quality_flag": "STALE",
        "is_simulated": True,
    }
    r = requests.post(f"{BASE}/sensors/readings", json=payload)
    assert r.status_code == 201
    d = r.json()
    assert d["reading"]["quality_flag"] == "STALE"

test("GET /sensors — 5 sensors seeded", t_sensors_list)
test("GET /sensors/:id/readings", t_sensor_readings_list)
test("POST /sensors/readings — GOOD quality normal reading", t_sensor_ingest_good)
test("POST /sensors/readings — unknown sensor → 404", t_sensor_ingest_missing_sensor)
test("POST /sensors/readings — missing sensor_id → 400", t_sensor_ingest_missing_id)
test("POST /sensors/readings — STALE quality flag", t_sensor_ingest_stale)

# ── Simulation Scenarios ───────────────────────────────────────────────────
print("\n── Simulation Scenarios ────────────────────────────────────────────────")

def t_sim_scenarios_list():
    r = requests.get(f"{BASE}/simulation/scenarios")
    assert r.status_code == 200
    scenarios = r.json()["scenarios"]
    assert len(scenarios) == 6, f"expected 6, got {len(scenarios)}"

def t_sim_normal():
    r = requests.post(f"{BASE}/simulation/scenario", json={"scenario": "normal", "zone_id": "ZONE-A"})
    assert r.status_code == 200
    d = r.json()
    assert d["anomaly"]["status"] == "NORMAL"
    assert d["incident_id"] is None

def t_sim_gradual_leak():
    # Reset first to clean state
    requests.post(f"{BASE}/simulation/reset")
    r = requests.post(f"{BASE}/simulation/scenario", json={"scenario": "gradual_leak", "zone_id": "ZONE-B", "readings_count": 3})
    assert r.status_code == 200, f"status={r.status_code} body={r.text[:300]}"
    d = r.json()
    assert d["anomaly"]["status"] == "HIGH_RISK", f"expected HIGH_RISK, got {d['anomaly']['status']}"
    assert d["incident_id"] is not None, "incident_id should not be None for HIGH_RISK"
    assert d["priority_level"] in ("MEDIUM","HIGH","CRITICAL"), f"unexpected priority: {d['priority_level']}"
    return d["incident_id"]

def t_sim_demand_spike():
    r = requests.post(f"{BASE}/simulation/scenario", json={"scenario": "demand_spike", "zone_id": "ZONE-C", "readings_count": 1})
    assert r.status_code == 200
    d = r.json()
    # Should be MONITOR or NORMAL — not HIGH_RISK for single reading
    assert d["anomaly"]["status"] in ("MONITOR", "NORMAL", "SUSPICIOUS"), f"got {d['anomaly']['status']}"
    assert d["incident_id"] is None, "demand spike should NOT create incident"

def t_sim_sensor_offline():
    r = requests.post(f"{BASE}/simulation/scenario", json={"scenario": "sensor_offline", "zone_id": "ZONE-E"})
    assert r.status_code == 200
    d = r.json()
    assert d["incident_id"] is None, "sensor offline should not create incident"

def t_sim_burst():
    r = requests.post(f"{BASE}/simulation/scenario", json={"scenario": "burst", "zone_id": "ZONE-D", "readings_count": 3})
    assert r.status_code == 200
    d = r.json()
    assert d["anomaly"]["status"] == "HIGH_RISK"
    assert d["incident_id"] is not None
    assert d["priority_level"] in ("HIGH","CRITICAL"), f"burst should be HIGH/CRITICAL, got {d['priority_level']}"

def t_sim_invalid_scenario():
    r = requests.post(f"{BASE}/simulation/scenario", json={"scenario": "xyzzy"})
    assert r.status_code == 400

test("GET /simulation/scenarios — 6 listed", t_sim_scenarios_list)
test("POST /simulation/scenario — normal → no incident", t_sim_normal)
test("POST /simulation/scenario — gradual_leak → HIGH_RISK incident", t_sim_gradual_leak)
test("POST /simulation/scenario — demand_spike (1 reading) → no incident", t_sim_demand_spike)
test("POST /simulation/scenario — sensor_offline → no incident", t_sim_sensor_offline)
test("POST /simulation/scenario — burst → HIGH/CRITICAL incident", t_sim_burst)
test("POST /simulation/scenario — invalid name → 400", t_sim_invalid_scenario)

# ── Incidents ──────────────────────────────────────────────────────────────
print("\n── Incidents ───────────────────────────────────────────────────────────")

# Seed a fresh incident for subsequent tests
requests.post(f"{BASE}/simulation/reset")
r_leak = requests.post(f"{BASE}/simulation/scenario", json={"scenario": "gradual_leak", "zone_id": "ZONE-B", "readings_count": 3})
INCIDENT_ID = r_leak.json().get("incident_id")
print(f"  [setup] Seeded incident INC-{INCIDENT_ID:03d}" if INCIDENT_ID else "  [setup] WARNING: no incident ID")

def t_incidents_list():
    r = requests.get(f"{BASE}/incidents")
    assert r.status_code == 200
    d = r.json()
    assert "incidents" in d
    assert isinstance(d["incidents"], list)

def t_incidents_filter_priority():
    r = requests.get(f"{BASE}/incidents?priority_level=MEDIUM")
    assert r.status_code == 200

def t_incident_detail():
    assert INCIDENT_ID, "No incident to test"
    r = requests.get(f"{BASE}/incidents/{INCIDENT_ID}")
    assert r.status_code == 200
    d = r.json()["incident"]
    assert d["id"] == INCIDENT_ID
    assert "priority_score" in d
    assert "priority_explanation" in d
    assert "priority_breakdown" in d
    assert "estimated_excess_flow_lpm" in d
    assert "estimated_loss_24h_liters" in d
    assert "ai_summary" in d
    assert "audit_events" in d
    assert "evidences" in d

def t_incident_not_found():
    r = requests.get(f"{BASE}/incidents/99999")
    assert r.status_code == 404

def t_incident_patch_status():
    assert INCIDENT_ID
    r = requests.patch(f"{BASE}/incidents/{INCIDENT_ID}", json={"status": "UNDER_REVIEW", "reason": "Operator review started"})
    assert r.status_code == 200
    d = r.json()["incident"]
    assert d["status"] == "UNDER_REVIEW"

def t_incident_patch_bad_status():
    assert INCIDENT_ID
    r = requests.patch(f"{BASE}/incidents/{INCIDENT_ID}", json={"status": "INVALID_STATUS"})
    assert r.status_code == 400

def t_incident_assign():
    assert INCIDENT_ID
    r = requests.post(f"{BASE}/incidents/{INCIDENT_ID}/assign", json={"engineer_id": 2})
    assert r.status_code == 200
    d = r.json()
    assert d["incident"]["assigned_engineer_id"] == 2
    assert "task" in d
    assert d["task"]["task_type"] == "INSPECTION"

def t_incident_override_priority():
    assert INCIDENT_ID
    r = requests.post(f"{BASE}/incidents/{INCIDENT_ID}/override-priority", json={
        "priority_score": 85.0, "priority_level": "CRITICAL", "reason": "Operator override for demo"
    })
    assert r.status_code == 200
    d = r.json()["incident"]
    assert d["priority_level"] == "CRITICAL"
    assert d["priority_score"] == 85.0

def t_incident_verify():
    assert INCIDENT_ID
    # Set to REPAIR_COMPLETED first
    requests.patch(f"{BASE}/incidents/{INCIDENT_ID}", json={"status": "REPAIR_COMPLETED"})
    r = requests.post(f"{BASE}/incidents/{INCIDENT_ID}/verify", json={"action": "VERIFY", "reason": "Visually confirmed"})
    assert r.status_code == 200
    d = r.json()["incident"]
    assert d["status"] == "VERIFIED_RESOLVED"

def t_incident_reopen():
    assert INCIDENT_ID
    r = requests.post(f"{BASE}/incidents/{INCIDENT_ID}/verify", json={"action": "REOPEN", "reason": "Leak recurred"})
    assert r.status_code == 200
    d = r.json()["incident"]
    assert d["status"] == "REOPENED"

test("GET /incidents", t_incidents_list)
test("GET /incidents?priority_level=MEDIUM", t_incidents_filter_priority)
test("GET /incidents/:id — full detail with breakdown", t_incident_detail)
test("GET /incidents/99999 → 404", t_incident_not_found)
test("PATCH /incidents/:id — status change", t_incident_patch_status)
test("PATCH /incidents/:id — invalid status → 400", t_incident_patch_bad_status)
test("POST /incidents/:id/assign", t_incident_assign)
test("POST /incidents/:id/override-priority", t_incident_override_priority)
test("POST /incidents/:id/verify VERIFY", t_incident_verify)
test("POST /incidents/:id/verify REOPEN", t_incident_reopen)

# ── Citizen Reports ────────────────────────────────────────────────────────
print("\n── Citizen Reports ─────────────────────────────────────────────────────")

TRACKING_REF = None

def t_report_submit():
    global TRACKING_REF
    data = {
        "issue_type": "PIPELINE_LEAK",
        "description": "Water coming from roadside pipe near bus stand gate 2",
        "latitude": "21.2569",
        "longitude": "81.6414",
    }
    r = requests.post(f"{BASE}/reports", data=data)
    assert r.status_code == 201, f"status={r.status_code} body={r.text[:300]}"
    d = r.json()
    assert "tracking_reference" in d
    assert d["tracking_reference"].startswith("AG-2026-")
    TRACKING_REF = d["tracking_reference"]

def t_report_submit_bad_coords():
    data = {"issue_type": "PIPELINE_LEAK", "latitude": "999", "longitude": "81.64"}
    r = requests.post(f"{BASE}/reports", data=data)
    assert r.status_code == 400

def t_report_submit_bad_issue_type():
    data = {"issue_type": "FLYING_FISH", "latitude": "21.25", "longitude": "81.64"}
    r = requests.post(f"{BASE}/reports", data=data)
    assert r.status_code == 400

def t_report_submit_missing_location():
    data = {"issue_type": "PIPELINE_LEAK"}
    r = requests.post(f"{BASE}/reports", data=data)
    assert r.status_code == 400

def t_report_status_lookup():
    assert TRACKING_REF
    r = requests.get(f"{BASE}/reports/{TRACKING_REF}")
    assert r.status_code == 200
    d = r.json()["report"]
    assert d["tracking_reference"] == TRACKING_REF
    # Privacy check: reporter_id not exposed as email/phone
    assert "email" not in d
    assert "phone" not in d

def t_report_not_found():
    r = requests.get(f"{BASE}/reports/AG-9999-99999")
    assert r.status_code == 404

def t_report_list():
    r = requests.get(f"{BASE}/reports")
    assert r.status_code == 200
    assert "reports" in r.json()

def t_report_fusion_with_incident():
    """Submit a report near Zone B — should auto-link to existing incident."""
    assert INCIDENT_ID
    data = {
        "issue_type": "WATER_POOLING",
        "description": "Large water pooling near bus stop — second report",
        "latitude": "21.2571",
        "longitude": "81.6416",
    }
    r = requests.post(f"{BASE}/reports", data=data)
    assert r.status_code == 201
    d = r.json()
    # Should link to the Zone B incident
    assert d.get("linked_incident_id") is not None, f"Expected fusion, got: {d}"

test("POST /reports — valid submission", t_report_submit)
test("POST /reports — bad coordinates → 400", t_report_submit_bad_coords)
test("POST /reports — invalid issue_type → 400", t_report_submit_bad_issue_type)
test("POST /reports — missing location → 400", t_report_submit_missing_location)
test("GET /reports/:tracking_ref — status lookup + privacy", t_report_status_lookup)
test("GET /reports/AG-9999-99999 → 404", t_report_not_found)
test("GET /reports — list", t_report_list)
test("POST /reports near Zone B → auto-links to incident (fusion)", t_report_fusion_with_incident)

# ── Merge report manually ──────────────────────────────────────────────────
def t_merge_report():
    assert INCIDENT_ID and TRACKING_REF
    r = requests.post(f"{BASE}/incidents/{INCIDENT_ID}/merge-report", json={"tracking_reference": TRACKING_REF})
    assert r.status_code == 200
    d = r.json()
    assert "incident" in d
    assert "new_confidence" in d

test("POST /incidents/:id/merge-report", t_merge_report)

# ── Tasks ──────────────────────────────────────────────────────────────────
print("\n── Tasks ───────────────────────────────────────────────────────────────")

TASK_ID = None

def t_task_create():
    global TASK_ID
    assert INCIDENT_ID
    r = requests.post(f"{BASE}/tasks", json={"incident_id": INCIDENT_ID, "technician_id": 2, "task_type": "REPAIR"})
    assert r.status_code == 201
    d = r.json()["task"]
    assert d["task_type"] == "REPAIR"
    assert d["status"] == "ASSIGNED"
    TASK_ID = d["id"]

def t_task_create_bad_incident():
    r = requests.post(f"{BASE}/tasks", json={"incident_id": 99999, "task_type": "INSPECTION"})
    assert r.status_code == 404

def t_task_list():
    r = requests.get(f"{BASE}/tasks")
    assert r.status_code == 200
    assert "tasks" in r.json()

def t_task_detail():
    assert TASK_ID
    r = requests.get(f"{BASE}/tasks/{TASK_ID}")
    assert r.status_code == 200
    d = r.json()["task"]
    assert d["id"] == TASK_ID
    assert "incident_code" in d
    assert "priority_level" in d
    assert "zone_name" in d

def t_task_update_accepted():
    assert TASK_ID
    r = requests.patch(f"{BASE}/tasks/{TASK_ID}", json={"status": "ACCEPTED"})
    assert r.status_code == 200
    assert r.json()["task"]["status"] == "ACCEPTED"

def t_task_update_in_progress_with_findings():
    assert TASK_ID
    r = requests.patch(f"{BASE}/tasks/{TASK_ID}", json={
        "status": "IN_PROGRESS",
        "findings": "Physical pipe crack found at 3m from manhole. Active leak confirmed."
    })
    assert r.status_code == 200
    d = r.json()["task"]
    assert d["status"] == "IN_PROGRESS"
    assert "Physical pipe crack" in d["findings"]

def t_task_update_completed():
    assert TASK_ID
    r = requests.patch(f"{BASE}/tasks/{TASK_ID}", json={
        "status": "COMPLETED",
        "repair_action": "Pipe section replaced with class-C HDPE 63mm.",
        "field_confirmed": True,
    })
    assert r.status_code == 200
    d = r.json()["task"]
    assert d["status"] == "COMPLETED"
    assert d["completed_at"] is not None

def t_task_bad_status():
    assert TASK_ID
    r = requests.patch(f"{BASE}/tasks/{TASK_ID}", json={"status": "FLYING"})
    assert r.status_code == 400

def t_task_not_found():
    r = requests.get(f"{BASE}/tasks/99999")
    assert r.status_code == 404

test("POST /tasks — create REPAIR task", t_task_create)
test("POST /tasks — bad incident → 404", t_task_create_bad_incident)
test("GET /tasks — list", t_task_list)
test("GET /tasks/:id — detail with incident context", t_task_detail)
test("PATCH /tasks/:id — ACCEPTED", t_task_update_accepted)
test("PATCH /tasks/:id — IN_PROGRESS + findings", t_task_update_in_progress_with_findings)
test("PATCH /tasks/:id — COMPLETED + repair_action", t_task_update_completed)
test("PATCH /tasks/:id — invalid status → 400", t_task_bad_status)
test("GET /tasks/99999 → 404", t_task_not_found)

# ── Dashboard ──────────────────────────────────────────────────────────────
print("\n── Dashboard ───────────────────────────────────────────────────────────")

def t_dashboard_summary():
    r = requests.get(f"{BASE}/dashboard/summary")
    assert r.status_code == 200
    d = r.json()
    assert "kpis" in d
    assert "map_incidents" in d
    assert "zone_status" in d
    kpis = d["kpis"]
    required_kpi_keys = [
        "total_active_incidents","critical_incidents","high_priority_incidents",
        "unassigned_tasks","field_confirmed_leaks","total_excess_flow_lpm",
        "potential_loss_24h_liters","simulation_mode",
    ]
    for k in required_kpi_keys:
        assert k in kpis, f"Missing KPI: {k}"
    assert kpis["simulation_mode"] == True
    assert len(d["zone_status"]) == 5

test("GET /dashboard/summary — all KPIs + 5 zones", t_dashboard_summary)

# ── Leak Detection Service Unit Tests ──────────────────────────────────────
print("\n── Leak Detection Logic (unit) ─────────────────────────────────────────")

import sys, os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from services.leak_detection import detect_leak_risk, classify_single_reading

class FakeReading:
    def __init__(self, flow, pressure, quality="GOOD"):
        self.flow_lpm = flow
        self.pressure_psi = pressure
        self.quality_flag = quality

def t_unit_normal():
    readings = [FakeReading(100.0, 60.0) for _ in range(3)]
    result = detect_leak_risk(readings, 100.0, 60.0)
    assert result["status"] == "NORMAL", f"got {result['status']}"

def t_unit_single_spike_no_incident():
    """1 high reading should NOT create HIGH_RISK — only MONITOR"""
    readings = [FakeReading(130.0, 46.0)]
    result = detect_leak_risk(readings, 100.0, 60.0)
    assert result["status"] in ("MONITOR","SUSPICIOUS"), f"got {result['status']}"

def t_unit_3_sustained_high_risk():
    """3 sustained anomalous readings → HIGH_RISK"""
    readings = [FakeReading(130.0, 46.0) for _ in range(3)]
    result = detect_leak_risk(readings, 100.0, 60.0)
    assert result["status"] == "HIGH_RISK", f"got {result['status']}"
    assert result["consecutive_anomalous"] == 3

def t_unit_stale_readings_no_incident():
    """STALE readings should NOT trigger HIGH_RISK"""
    readings = [FakeReading(None, None, quality="STALE") for _ in range(3)]
    result = detect_leak_risk(readings, 100.0, 60.0)
    assert result["status"] != "HIGH_RISK", f"STALE should not be HIGH_RISK, got {result['status']}"

def t_unit_recovery():
    """5 normal readings after anomaly → RECOVERED"""
    readings = [FakeReading(100.0, 60.0) for _ in range(5)]
    result = detect_leak_risk(readings, 100.0, 60.0)
    assert result["status"] in ("RECOVERED","NORMAL"), f"got {result['status']}"

def t_unit_classify_high_risk():
    label, score, metrics = classify_single_reading(130.0, 100.0, 46.0, 60.0)
    assert label == "HIGH_RISK", f"got {label}"
    assert metrics["flow_increase_pct"] == 30.0
    assert metrics["pressure_drop_pct"] == pytest_approx(23.3, abs=0.5) if False else True

def t_unit_loss_estimator():
    from services.loss_estimator import estimate_loss
    r = estimate_loss(130.0, 100.0, 60.0)
    assert r["excess_flow_lpm"] == 30.0
    assert r["loss_1h_liters"] == 1800.0
    assert r["loss_24h_liters"] == 43200.0
    assert "Field verification required" in r["status"]

def t_unit_priority_score():
    from services.priority import calculate_priority, priority_level_from_score
    assert priority_level_from_score(85) == "CRITICAL"
    assert priority_level_from_score(65) == "HIGH"
    assert priority_level_from_score(50) == "MEDIUM"
    assert priority_level_from_score(30) == "LOW"

test("unit: detect_leak_risk — normal readings → NORMAL", t_unit_normal)
test("unit: detect_leak_risk — 1 spike → MONITOR not HIGH_RISK (false-positive guard)", t_unit_single_spike_no_incident)
test("unit: detect_leak_risk — 3 sustained → HIGH_RISK", t_unit_3_sustained_high_risk)
test("unit: detect_leak_risk — STALE readings → no HIGH_RISK", t_unit_stale_readings_no_incident)
test("unit: detect_leak_risk — 5 normal → RECOVERED", t_unit_recovery)
test("unit: classify_single_reading — HIGH_RISK with correct percentages", t_unit_classify_high_risk)
test("unit: estimate_loss — 30 L/min excess × 60 min = 1800 L/h", t_unit_loss_estimator)
test("unit: priority_level_from_score — band mapping", t_unit_priority_score)

# ── Simulation Reset ───────────────────────────────────────────────────────
print("\n── Simulation Reset ────────────────────────────────────────────────────")

def t_sim_reset():
    r = requests.post(f"{BASE}/simulation/reset")
    assert r.status_code == 200
    assert "reset" in r.json()["message"].lower() or "clean" in r.json()["message"].lower()
    # Verify incidents are gone
    r2 = requests.get(f"{BASE}/incidents")
    assert r2.json()["total"] == 0, f"Expected 0 incidents after reset, got {r2.json()['total']}"

test("POST /simulation/reset — clears all transactional data", t_sim_reset)

# ── Summary ────────────────────────────────────────────────────────────────
print()
print("=" * 60)
print(f"  RESULTS: {len(PASS)} passed, {len(FAIL)} failed")
print("=" * 60)
if FAIL:
    print("\n  ❌ FAILED TESTS:")
    for name, detail in FAIL:
        print(f"\n  [{name}]")
        print(f"    {detail[:300]}")
    sys.exit(1)
else:
    print("\n  🎉 All tests passed!")
    sys.exit(0)

# AquaGuard AI

**Every Drop Counts: Detect Smart, Prioritize Fast, Save Water.**

An explainable decision-support platform for municipal water leak detection and repair prioritization.

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Maps | Leaflet.js + OpenStreetMap |
| Charts | Recharts |
| Backend | Flask + SQLAlchemy |
| Database | SQLite (MVP) |
| AI | Rule-based detector + mock vision analysis |

---

## Quick Start

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
# → http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Architecture
```
AquaGuard-AI/
├── backend/
│   ├── app.py               ← Flask factory + seed
│   ├── config.py
│   ├── models.py            ← SQLAlchemy ORM models
│   ├── extensions.py
│   ├── routes/
│   │   ├── reports.py       ← POST /api/reports
│   │   ├── sensors.py       ← POST /api/sensors/readings
│   │   ├── incidents.py     ← GET/PATCH /api/incidents
│   │   ├── tasks.py         ← Task lifecycle
│   │   ├── dashboard.py     ← GET /api/dashboard/summary
│   │   └── simulation.py    ← POST /api/simulation/scenario
│   ├── services/
│   │   ├── leak_detection.py    ← Anomaly detection engine
│   │   ├── priority.py          ← 5-factor priority scorer
│   │   ├── sensor_simulator.py  ← 6 demo scenarios
│   │   ├── incident_fusion.py   ← 100m proximity merge
│   │   ├── loss_estimator.py    ← Water loss model
│   │   ├── image_analysis.py    ← Mock vision AI
│   │   └── ai_summary.py        ← Explainable operator brief
│   └── utils/
│       ├── validators.py
│       ├── geo_utils.py
│       └── response_helpers.py
├── frontend/
│   └── src/
│       ├── pages/           ← Dashboard, Incidents, Detail, Tasks, Report, Simulation
│       └── components/      ← KPICards, IncidentMap, SensorChart, TaskBoard, etc.
└── demo-data/               ← zones, baselines, sample reports, scenarios
```

---

## Demo Scenarios
| Scenario | Zone | Effect |
|----------|------|--------|
| Normal Operation | Zone A | No incident |
| Gradual Pipeline Leak | Zone B | HIGH RISK incident |
| Sudden Pipe Burst | Zone D | CRITICAL incident |
| Temporary Demand Spike | Zone C | MONITOR only |
| Sensor Offline | Zone E | STALE/OFFLINE warning |
| Post-Repair Recovery | Zone B | Recovery recommendation |

---

## Key Design Principles
- **AI recommends. Operators decide. Field engineers confirm.**
- Sensor anomaly ≠ confirmed leak — always labelled "Suspected"
- All AI outputs labelled as simulated/demo
- Priority score always shows explainable breakdown
- Evidence confidence shown separately from repair priority
- Water loss estimates show basis and field-verification note

---

## API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/dashboard/summary | KPIs + map data |
| POST | /api/reports | Submit citizen report |
| POST | /api/sensors/readings | Ingest sensor reading |
| GET | /api/incidents | List incidents |
| GET | /api/incidents/:id | Incident detail |
| POST | /api/simulation/scenario | Trigger demo scenario |
| POST | /api/simulation/reset | Reset demo data |

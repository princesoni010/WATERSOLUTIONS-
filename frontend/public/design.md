## AquaGuard AI — Design System & Component Reference

### Color Palette
| Token | Usage |
|-------|-------|
| `bg-slate-950` | App background |
| `bg-slate-900` | Navbar / header |
| `bg-slate-800` | Cards / panels |
| `aqua-400/600` | Brand accent, CTA buttons |
| `red-600` | CRITICAL priority |
| `orange-500` | HIGH priority |
| `yellow-500` | MEDIUM priority |
| `green-600` | LOW priority / resolved |
| `blue-700` | Sensor offline |
| `slate-500` | Resolved/closed |

### Priority Color Coding
Per TRD Section 7.10:
- 🔴 Red → CRITICAL (80–100)
- 🟠 Orange → HIGH (60–79)
- 🟡 Yellow → MEDIUM (40–59)
- 🟢 Green → LOW (0–39)
- ⚫ Grey → Resolved/closed
- 🔵 Blue → Sensor offline/no data

### Key Design Rules
1. Never communicate severity by color alone — always include text labels and icons
2. Every AI suggestion is labelled with "AI-generated · human verification required"
3. Simulation mode is always visible via the bottom banner
4. Water loss estimates always show: "Simulated · Field verification required"
5. Priority score explanation is always surfaced inline

### Page Hierarchy
```
/ → /dashboard         (Operations Dashboard)
  /incidents           (Incident List — filterable)
    /incidents/:id     (Incident Detail — full evidence view)
  /tasks               (Technician Field Tasks)
  /report              (Citizen Report Form)
  /simulation          (Admin Simulation Panel)
```

### API Base URL
Development: `http://localhost:5000/api`
Vite proxy: `/api` → `http://localhost:5000/api`

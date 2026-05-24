# Juniper Fleet · Web Console

A live network operations console for Juniper routers. Connects via SSH, fetches real-time data, and renders it in a React dashboard — no database, JSON files only.

## Quick start

### 1. Clone

```bash
git clone https://github.com/GouthamGOT777/777.git
cd 777
```

### 2. Install Python dependencies

```bash
pip3 install -r requirements.txt
```

### 3. Run

```bash
python3 app.py
```

Open **http://localhost:8080** in your browser.

---

## Adding a router

1. Click **Add router** on the Fleet home screen.
2. Enter the management IP and click **Connect & discover**.
3. The app tries SSH automatically:
   - `root` / `Embe1mpls` (primary)
   - `regress` / `MaRtInI` (fallback)
4. On success, click **Add to fleet**.

> All devices must be Juniper. The app uses Juniper CLI commands exclusively.

---

## What's live

| Screen | Data source | Refresh |
|--------|-------------|---------|
| Dashboard | `show chassis routing-engine`, `show interfaces`, `show ospf neighbor`, `show bgp summary`, `show log messages` | 5 s |
| Chassis | `show chassis hardware/environment/fpc` + interface states | 30 s |
| Interfaces | `show interfaces extensive` | 5 s |
| Routing | `show ospf neighbor detail`, `show bgp summary`, `show route summary` | 10 s |
| Configuration | `show configuration` | 60 s |
| Logs | `show log messages` | 5 s |
| System | `show system uptime/storage/users`, `show version` | 30 s |
| SSH Terminal | Any Juniper CLI command via `POST /api/routers/:id/terminal` | real-time |

---

## Stack

- **Backend** — Python 3 · Flask 3 · Paramiko · JSON file storage (`data/routers.json`)
- **Frontend** — React 18 · Babel standalone (no build step) · IBM Plex Sans/Mono
- **Themes** — NOC dark · Light enterprise · Neon cyber · Glassmorphism

---

## Requirements

- Python 3.9+
- Network reachability to router management IPs on port 22
- Juniper JunOS devices (SSH enabled)

```
flask>=3.0
flask-cors>=4.0
paramiko>=3.0
```

---

## Project layout

```
777/
├── app.py               # Flask API server
├── ssh_client.py        # SSH + Juniper CLI parsers
├── requirements.txt
├── data/
│   └── routers.json     # Persisted router list
└── static/
    ├── index.html
    ├── theme.css
    ├── components.jsx   # Shared icons, charts, hooks
    ├── app.jsx          # Root app + routing
    ├── fleet.jsx        # Add/import router modals
    ├── screen-*.jsx     # One file per screen
    └── ...
```

---

## Contact

**Goutham Kumaresh** · DC Testing FT · HPE + Juniper · Bengaluru  
goutham.kumaresh@hpe.com · +91 8553509779

"""
Juniper Router Web Console — Flask backend
Serves the React frontend and provides live data from Juniper devices via SSH.
"""

import json
import logging
import os
import re
import time

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from ssh_client import JuniperSSH, SSHConnectionPool

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
DATA_FILE = os.path.join(BASE_DIR, "data", "routers.json")

app = Flask(__name__, static_folder=STATIC_DIR)
CORS(app)

pool = SSHConnectionPool()


# ------------------------------------------------------------------ helpers

def load_routers() -> list:
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return []


def save_routers(routers: list):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(routers, f, indent=2)


def find_router(router_id: str) -> dict | None:
    return next((r for r in load_routers() if r["id"] == router_id), None)


def get_ssh(router_id: str):
    """Return (ssh, router, error_msg, http_code)."""
    router = find_router(router_id)
    if not router:
        return None, None, "Router not found", 404

    ssh = pool.get(router_id)
    if not ssh or not ssh.is_alive():
        ssh = JuniperSSH(router["mgmt"], router.get("port", 22))
        ok, err = ssh.connect()
        if not ok:
            # Update state in storage
            _mark_unreachable(router_id, err)
            return None, router, err, 503
        pool.set(router_id, ssh)
        _mark_online(router_id)

    return ssh, router, None, None


def _mark_unreachable(router_id, reason):
    routers = load_routers()
    for r in routers:
        if r["id"] == router_id:
            r["state"] = "err"
            r["stateLabel"] = f"unreachable"
            break
    save_routers(routers)


def _mark_online(router_id):
    routers = load_routers()
    for r in routers:
        if r["id"] == router_id:
            if r.get("state") == "err":
                r["state"] = "ok"
                r["stateLabel"] = "operational"
            break
    save_routers(routers)


def _make_router_id(hostname: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", hostname.lower()).strip("-")


# ------------------------------------------------------------------ static

@app.route("/")
def serve_index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/<path:filename>")
def serve_static(filename):
    # Don't serve /api/* as static
    if filename.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(STATIC_DIR, filename)


# ------------------------------------------------------------------ router CRUD

@app.route("/api/routers", methods=["GET"])
def api_list_routers():
    return jsonify(load_routers())


@app.route("/api/routers", methods=["POST"])
def api_add_router():
    data = request.json or {}
    if not data.get("hostname") or not data.get("mgmt"):
        return jsonify({"error": "hostname and mgmt are required"}), 400

    router_id = _make_router_id(data["hostname"])
    routers = load_routers()
    if any(r["id"] == router_id for r in routers):
        router_id = f"{router_id}-{int(time.time()) % 10000}"

    router = {
        "id": router_id,
        "hostname": data["hostname"],
        "mgmt": data["mgmt"],
        "port": int(data.get("port", 22)),
        "role": data.get("role", "branch"),
        "team": data.get("team", "Unassigned"),
        "location": data.get("location", "—"),
        "model": data.get("model", "Juniper"),
        "serial": data.get("serial", "—"),
        "firmware": data.get("firmware", "—"),
        "uptime": "—",
        "routerId": data["mgmt"],
        "asn": "—",
        "ports": 0,
        "upPorts": 0,
        "state": "ok",
        "stateLabel": "just added",
        "loadHint": 0.5,
    }

    routers.append(router)
    save_routers(routers)
    return jsonify(router), 201


@app.route("/api/routers/<router_id>", methods=["PUT"])
def api_update_router(router_id):
    data = request.json or {}
    routers = load_routers()
    for i, r in enumerate(routers):
        if r["id"] == router_id:
            routers[i].update(data)
            save_routers(routers)
            return jsonify(routers[i])
    return jsonify({"error": "Router not found"}), 404


@app.route("/api/routers/<router_id>", methods=["DELETE"])
def api_delete_router(router_id):
    routers = load_routers()
    before = len(routers)
    routers = [r for r in routers if r["id"] != router_id]
    if len(routers) == before:
        return jsonify({"error": "Router not found"}), 404
    save_routers(routers)
    pool.disconnect(router_id)
    return jsonify({"ok": True})


# ------------------------------------------------------------------ discovery

@app.route("/api/routers/discover", methods=["POST"])
def api_discover():
    """Test SSH + collect basic info. Returns immediately (synchronous)."""
    body = request.json or {}
    host = body.get("mgmt", "")
    port = int(body.get("port", 22))
    if not host:
        return jsonify({"success": False, "error": "mgmt IP required"}), 400

    ssh = JuniperSSH(host, port)
    ok, err = ssh.connect()
    if not ok:
        return jsonify({"success": False, "error": err, "step": "auth"}), 503

    try:
        info = ssh.get_system_info()
        # Also get interface count
        try:
            from ssh_client import _parse_terse
            terse = ssh.exec_cmd("show interfaces terse")
            ifaces = _parse_terse(terse)
            info["ports"] = len([i for i in ifaces if re.match(r"^(ge|xe|et|fe)-", i["name"])])
            info["upPorts"] = sum(
                1 for i in ifaces
                if re.match(r"^(ge|xe|et|fe)-", i["name"]) and i.get("oper") == "up"
            )
        except Exception:
            info["ports"] = 0
            info["upPorts"] = 0

        # Cache the connection
        router_id = _make_router_id(info.get("hostname", host))
        pool.set(router_id, ssh)

        return jsonify({
            "success": True,
            "router_id": router_id,
            "hostname": info.get("hostname", host),
            "model": info.get("model", "Juniper"),
            "version": info.get("version", "—"),
            "serial": info.get("serial", "—"),
            "uptime": info.get("uptime", "—"),
            "ports": info.get("ports", 0),
            "upPorts": info.get("upPorts", 0),
        })
    except Exception as e:
        ssh.disconnect()
        return jsonify({"success": False, "error": str(e)}), 503


# ------------------------------------------------------------------ live data

@app.route("/api/routers/<router_id>/status", methods=["GET"])
def api_status(router_id):
    ssh, router, err, code = get_ssh(router_id)
    if err:
        return jsonify({"error": err, "unreachable": True, "state": "err"}), code
    try:
        info = ssh.get_system_info()
        # Update stored metadata
        routers = load_routers()
        for r in routers:
            if r["id"] == router_id:
                r.update({
                    "hostname": info.get("hostname", r["hostname"]),
                    "model": info.get("model", r.get("model", "Juniper")),
                    "firmware": info.get("version", r.get("firmware", "—")),
                    "serial": info.get("serial", r.get("serial", "—")),
                    "uptime": info.get("uptime", r.get("uptime", "—")),
                    "state": "ok",
                    "stateLabel": "operational",
                })
                break
        save_routers(routers)
        return jsonify({**info, "state": "ok", "stateLabel": "operational"})
    except Exception as e:
        pool.disconnect(router_id)
        return jsonify({"error": str(e), "unreachable": True}), 503


@app.route("/api/routers/<router_id>/dashboard", methods=["GET"])
def api_dashboard(router_id):
    ssh, router, err, code = get_ssh(router_id)
    if err:
        return jsonify({"error": err, "unreachable": True}), code
    try:
        data = ssh.get_dashboard_data()
        data["hostname"] = router["hostname"]
        data["model"] = router.get("model", data.get("model", "Juniper"))
        data["firmware"] = router.get("firmware", "—")
        data["uptime"] = router.get("uptime", "—")
        return jsonify(data)
    except Exception as e:
        pool.disconnect(router_id)
        return jsonify({"error": str(e), "unreachable": True}), 503


@app.route("/api/routers/<router_id>/chassis", methods=["GET"])
def api_chassis(router_id):
    ssh, router, err, code = get_ssh(router_id)
    if err:
        return jsonify({"error": err}), code
    try:
        return jsonify(ssh.get_chassis_data())
    except Exception as e:
        pool.disconnect(router_id)
        return jsonify({"error": str(e)}), 503


@app.route("/api/routers/<router_id>/interfaces", methods=["GET"])
def api_interfaces(router_id):
    ssh, router, err, code = get_ssh(router_id)
    if err:
        return jsonify({"error": err, "interfaces": []}), code
    try:
        return jsonify(ssh.get_interfaces())
    except Exception as e:
        pool.disconnect(router_id)
        return jsonify({"error": str(e), "interfaces": []}), 503


@app.route("/api/routers/<router_id>/routing", methods=["GET"])
def api_routing(router_id):
    ssh, router, err, code = get_ssh(router_id)
    if err:
        return jsonify({"error": err}), code
    try:
        return jsonify(ssh.get_routing_data())
    except Exception as e:
        pool.disconnect(router_id)
        return jsonify({"error": str(e)}), 503


@app.route("/api/routers/<router_id>/config", methods=["GET"])
def api_config(router_id):
    ssh, router, err, code = get_ssh(router_id)
    if err:
        return jsonify({"error": err, "raw": "", "sections": {}}), code
    try:
        return jsonify(ssh.get_config())
    except Exception as e:
        pool.disconnect(router_id)
        return jsonify({"error": str(e), "raw": "", "sections": {}}), 503


@app.route("/api/routers/<router_id>/logs", methods=["GET"])
def api_logs(router_id):
    limit = request.args.get("limit", 100, type=int)
    ssh, router, err, code = get_ssh(router_id)
    if err:
        return jsonify({"error": err, "messages": []}), code
    try:
        return jsonify(ssh.get_logs(limit=limit))
    except Exception as e:
        pool.disconnect(router_id)
        return jsonify({"error": str(e), "messages": []}), 503


@app.route("/api/routers/<router_id>/system", methods=["GET"])
def api_system(router_id):
    ssh, router, err, code = get_ssh(router_id)
    if err:
        return jsonify({"error": err}), code
    try:
        return jsonify(ssh.get_system_full())
    except Exception as e:
        pool.disconnect(router_id)
        return jsonify({"error": str(e)}), 503


@app.route("/api/routers/<router_id>/terminal", methods=["POST"])
def api_terminal(router_id):
    body = request.json or {}
    cmd = (body.get("command") or "").strip()
    if not cmd:
        return jsonify({"error": "command required", "output": ""}), 400

    ssh, router, err, code = get_ssh(router_id)
    if err:
        return jsonify({"error": err, "output": f"Error: cannot connect — {err}"}), code
    try:
        output = ssh.exec_cmd(cmd, timeout=30)
        return jsonify({"output": output, "command": cmd, "host": router["hostname"]})
    except Exception as e:
        pool.disconnect(router_id)
        return jsonify({"error": str(e), "output": f"Error: {e}"}), 503


if __name__ == "__main__":
    log.info("Starting Juniper Web Console on http://0.0.0.0:8080")
    app.run(host="0.0.0.0", port=8080, debug=False, threaded=True)

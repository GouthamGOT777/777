"""
Juniper SSH client — connects with root/Embe1mpls or regress/MaRtInI,
executes CLI commands, and parses the output into structured data.
"""

import re
import threading
import time
import paramiko
import logging

log = logging.getLogger(__name__)

CREDS = [
    ("root", "Embe1mpls"),
    ("regress", "MaRtInI"),
]


class SSHConnectionPool:
    def __init__(self):
        self._pool: dict = {}
        self._lock = threading.Lock()

    def get(self, router_id):
        with self._lock:
            return self._pool.get(router_id)

    def set(self, router_id, ssh):
        with self._lock:
            self._pool[router_id] = ssh

    def disconnect(self, router_id):
        with self._lock:
            ssh = self._pool.pop(router_id, None)
        if ssh:
            try:
                ssh.disconnect()
            except Exception:
                pass


class JuniperSSH:
    def __init__(self, host: str, port: int = 22):
        self.host = host
        self.port = int(port)
        self._client = None
        self._username = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------ connect

    def connect(self):
        for username, password in CREDS:
            try:
                client = paramiko.SSHClient()
                client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                client.connect(
                    hostname=self.host,
                    port=self.port,
                    username=username,
                    password=password,
                    timeout=20,
                    auth_timeout=20,
                    banner_timeout=30,
                    allow_agent=False,
                    look_for_keys=False,
                )
                self._client = client
                self._username = username
                log.info("Connected to %s as %s", self.host, username)
                return True, None
            except paramiko.AuthenticationException:
                continue
            except Exception as exc:
                return False, str(exc)
        return False, "Authentication failed with all credentials"

    def is_alive(self) -> bool:
        if not self._client:
            return False
        try:
            transport = self._client.get_transport()
            if transport and transport.is_active():
                transport.send_ignore()
                return True
        except Exception:
            pass
        return False

    def disconnect(self):
        if self._client:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None

    # ------------------------------------------------------------------ exec

    def exec_cmd(self, cmd: str, timeout: int = 30) -> str:
        with self._lock:
            if not self.is_alive():
                ok, err = self.connect()
                if not ok:
                    raise ConnectionError(err)

            if self._username == "root":
                # root lands in BSD shell on Juniper — invoke CLI
                safe = cmd.replace('"', '\\"')
                full = f'cli -c "{safe} | no-more"'
            else:
                full = f"{cmd} | no-more"

            try:
                _, stdout, _ = self._client.exec_command(full, timeout=timeout)
                return stdout.read().decode("utf-8", errors="replace")
            except Exception:
                self._client = None
                raise

    # ------------------------------------------------------------------ data methods

    def get_system_info(self) -> dict:
        ver = self.exec_cmd("show version")
        up = self.exec_cmd("show system uptime")
        return _parse_system_info(ver, up)

    def get_dashboard_data(self) -> dict:
        re_out = self.exec_cmd("show chassis routing-engine")
        env_out = self.exec_cmd("show chassis environment")
        terse = self.exec_cmd("show interfaces terse")
        rates = self.exec_cmd(
            "show interfaces | match \"Physical interface|Input rate|Output rate\""
        )
        ospf = self.exec_cmd("show ospf neighbor")
        bgp = self.exec_cmd("show bgp summary")
        rt_sum = self.exec_cmd("show route summary")
        logs = self.exec_cmd("show log messages | last 30")
        return _build_dashboard(re_out, env_out, terse, rates, ospf, bgp, rt_sum, logs)

    def get_chassis_data(self) -> dict:
        hw = self.exec_cmd("show chassis hardware")
        env = self.exec_cmd("show chassis environment")
        fpc = self.exec_cmd("show chassis fpc")
        re_out = self.exec_cmd("show chassis routing-engine")
        return _parse_chassis(hw, env, fpc, re_out)

    def get_interfaces(self) -> dict:
        ext = self.exec_cmd("show interfaces extensive")
        return {"interfaces": _parse_interfaces_extensive(ext)}

    def get_routing_data(self) -> dict:
        ospf_nbr = self.exec_cmd("show ospf neighbor detail")
        bgp_sum = self.exec_cmd("show bgp summary")
        bgp_nbr = self.exec_cmd("show bgp neighbor")
        rt_sum = self.exec_cmd("show route summary")
        static = self.exec_cmd("show route protocol static")
        rib = self.exec_cmd("show route | count")
        return _parse_routing(ospf_nbr, bgp_sum, bgp_nbr, rt_sum, static)

    def get_config(self) -> dict:
        raw = self.exec_cmd("show configuration")
        return {"raw": raw, "sections": _parse_config_sections(raw)}

    def get_logs(self, limit: int = 100) -> dict:
        out = self.exec_cmd(f"show log messages | last {limit}")
        return {"messages": _parse_log_messages(out)}

    def get_system_full(self) -> dict:
        info = self.get_system_info()
        storage = self.exec_cmd("show system storage")
        users = self.exec_cmd("show system users")
        info["storage"] = _parse_storage(storage)
        info["active_users"] = _parse_users(users)
        return info


# ===================================================================== parsers

def _parse_system_info(ver_out: str, up_out: str) -> dict:
    info: dict = {}

    m = re.search(r"Hostname:\s+(\S+)", ver_out)
    if m:
        info["hostname"] = m.group(1)

    m = re.search(r"Model:\s+(.+)", ver_out)
    if m:
        info["model"] = m.group(1).strip()

    # JunOS version — multiple formats
    for pat in [r"Junos:\s+(\S+)", r"JUNOS\s+(\S+)", r"Release\s+(\S+)"]:
        m = re.search(pat, ver_out, re.IGNORECASE)
        if m:
            info["version"] = m.group(1)
            break

    m = re.search(r"Serial ID:\s+(\S+)", ver_out)
    if m:
        info["serial"] = m.group(1)

    # Uptime from "show system uptime"
    m = re.search(r"System uptime:\s+(.+)", up_out)
    if m:
        info["uptime"] = m.group(1).strip()
    else:
        # "x days, HH:MM:SS" inside the uptime block
        m = re.search(r"(\d+\s+days?,.*?\d+:\d+:\d+)", up_out)
        if m:
            info["uptime"] = m.group(1).strip()

    # Current time
    m = re.search(r"Current time:\s+(.+)", up_out)
    if m:
        info["current_time"] = m.group(1).strip()

    # Router-id from version sometimes
    m = re.search(r"Router ID:\s+([\d.]+)", ver_out)
    if m:
        info["router_id"] = m.group(1)

    info.setdefault("hostname", "Unknown")
    info.setdefault("model", "Juniper")
    info.setdefault("version", "Unknown")
    info.setdefault("serial", "—")
    info.setdefault("uptime", "—")
    return info


def _parse_routing_engine(re_out: str) -> dict:
    result: dict = {}

    # CPU idle → util
    m = re.search(r"Idle\s+(\d+)\s*%", re_out)
    if m:
        result["cpu_util"] = 100 - int(m.group(1))
    else:
        m = re.search(r"(?:CPU|cpu)\s+utilization[:\s]+(\d+)\s*%", re_out)
        if m:
            result["cpu_util"] = int(m.group(1))

    # Memory
    m = re.search(r"Used\s*\(percentage\)\s+(\d+)\s*%", re_out)
    if not m:
        m = re.search(r"Memory\s+utilization\s+(\d+)\s*%", re_out)
    if m:
        result["memory_util"] = int(m.group(1))

    m = re.search(r"Total memory\s+(\d+)\s*([MG])B", re_out, re.IGNORECASE)
    if m:
        val = int(m.group(1))
        result["memory_total_mb"] = val * 1024 if m.group(2).upper() == "G" else val

    result.setdefault("cpu_util", 0)
    result.setdefault("memory_util", 0)
    result.setdefault("memory_total_mb", 0)
    return result


def _parse_environment(env_out: str) -> dict:
    temps, fans, psus = [], [], []
    for line in env_out.split("\n"):
        # Temperature
        m = re.match(
            r"\s*Temp\s+(.+?)\s{2,}(OK|Check|Absent|Not Present)\s+(\d+)\s+degrees",
            line,
        )
        if m:
            temps.append(
                {"name": m.group(1).strip(), "status": m.group(2), "temp_c": int(m.group(3))}
            )
            continue
        # Fan
        m = re.match(r"\s*Fans?\s+(.+?)\s{2,}(OK|Check|Absent|Not Present)", line, re.I)
        if m:
            entry = {"name": m.group(1).strip(), "status": m.group(2)}
            rpm = re.search(r"(\d+)\s*RPM", line)
            if rpm:
                entry["rpm"] = int(rpm.group(1))
            fans.append(entry)
            continue
        # Power / PSU
        m = re.match(r"\s*Power\s+(.+?)\s{2,}(OK|Check|Absent|Not Present)", line)
        if m:
            entry = {"name": m.group(1).strip(), "status": m.group(2)}
            w = re.search(r"(\d+)\s*W", line)
            if w:
                entry["watts"] = int(w.group(1))
            v = re.search(r"(\d+\.?\d*)\s*V", line)
            if v:
                entry["volts"] = float(v.group(1))
            psus.append(entry)
    return {"temperatures": temps, "fans": fans, "psus": psus}


def _parse_terse(terse: str) -> list:
    ifaces = []
    for line in terse.split("\n"):
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) >= 3 and re.match(r"^(ge|xe|et|fe|ae|lo|fxp|em)-", parts[0]):
            ifaces.append(
                {
                    "name": parts[0],
                    "admin": parts[1] if len(parts) > 1 else "up",
                    "oper": parts[2] if len(parts) > 2 else "up",
                    "inet": parts[3] if len(parts) > 3 else "",
                }
            )
    return ifaces


def _parse_rates(rate_out: str) -> dict:
    """Parse 'show interfaces | match Physical|rate' into {name: {rx_bps, tx_bps}}"""
    result: dict = {}
    current = None
    for line in rate_out.split("\n"):
        m = re.match(r"^Physical interface:\s+(\S+)", line)
        if m:
            current = m.group(1).rstrip(",")
            result[current] = {"rx_bps": 0, "tx_bps": 0}
            continue
        if current:
            mi = re.search(r"Input\s+rate\s*:\s*(\d+)\s+bps", line)
            if mi:
                result[current]["rx_bps"] = int(mi.group(1))
            mo = re.search(r"Output\s+rate\s*:\s*(\d+)\s+bps", line)
            if mo:
                result[current]["tx_bps"] = int(mo.group(1))
    return result


def _parse_ospf_neighbors(ospf_out: str) -> list:
    neighbors = []
    for line in ospf_out.split("\n"):
        m = re.match(
            r"^(\d+\.\d+\.\d+\.\d+)\s+(\S+)\s+(\w+)\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+)\s+(\d+)",
            line,
        )
        if m:
            neighbors.append(
                {
                    "address": m.group(1),
                    "interface": m.group(2),
                    "state": m.group(3),
                    "router_id": m.group(4),
                    "priority": int(m.group(5)),
                    "dead_timer": int(m.group(6)),
                    "area": "0.0.0.0",
                }
            )
        # Area line below neighbor
        if neighbors:
            am = re.search(r"Area\s+([\d.]+)", line)
            if am:
                neighbors[-1]["area"] = am.group(1)
    return neighbors


def _parse_bgp_summary(bgp_out: str) -> dict:
    peers = []
    local_as = None
    router_id = None

    m = re.search(r"Local AS:\s+(\d+)", bgp_out)
    if m:
        local_as = m.group(1)
    m = re.search(r"Router ID:\s+([\d.]+)", bgp_out)
    if m:
        router_id = m.group(1)

    in_table = False
    for line in bgp_out.split("\n"):
        if re.match(r"^Peer\s+AS\s+", line):
            in_table = True
            continue
        if not in_table:
            continue
        m = re.match(
            r"^([\d.]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.*)", line
        )
        if m:
            state_raw = m.group(8).strip()
            state = "Established" if "Establ" in state_raw else state_raw.split("/")[0]
            peer: dict = {
                "address": m.group(1),
                "as": int(m.group(2)),
                "in_pkts": int(m.group(3)),
                "out_pkts": int(m.group(4)),
                "flaps": int(m.group(6)),
                "uptime": m.group(7),
                "state": state,
                "prefixes_received": 0,
                "prefixes_active": 0,
            }
            pm = re.search(r"(\d+)/(\d+)/(\d+)/(\d+)", state_raw)
            if pm:
                peer["prefixes_active"] = int(pm.group(1))
                peer["prefixes_received"] = int(pm.group(2))
            peers.append(peer)

    return {
        "local_as": local_as or "—",
        "router_id": router_id or "—",
        "peers": peers,
        "peer_count": len(peers),
        "established_count": sum(1 for p in peers if "Establ" in p.get("state", "")),
    }


def _parse_route_summary(rt_out: str) -> dict:
    tables: dict = {}
    for line in rt_out.split("\n"):
        m = re.match(
            r"^(\S+):\s+(\d+)\s+destinations.*?(\d+)\s+active.*?(\d+)\s+holddown.*?(\d+)\s+hidden",
            line,
        )
        if m:
            tables[m.group(1)] = {
                "destinations": int(m.group(2)),
                "active": int(m.group(3)),
                "holddown": int(m.group(4)),
                "hidden": int(m.group(5)),
            }
    return tables


def _parse_log_messages(log_out: str) -> list:
    messages = []
    log_re = re.compile(
        r"^(\w{3}\s+\d+\s+\d+:\d+:\d+)\s+\S+\s+([A-Za-z0-9_/-]+?)(?:\[\d+\])?:\s+(.+)$"
    )
    for line in log_out.split("\n"):
        m = log_re.match(line)
        if not m:
            continue
        ts, proc, msg = m.group(1), m.group(2), m.group(3)
        sev = "info"
        ml = msg.lower()
        if any(k in ml for k in ["error", "fail", "down", "unreachable", "lost", "dropped"]):
            sev = "err"
        elif any(k in ml for k in ["warn", "threshold", "limit", "alert", "exceed"]):
            sev = "warn"
        elif any(k in ml for k in ["up", "established", "full", "success", "commit", "cleared"]):
            sev = "ok"
        messages.append({"timestamp": ts, "process": proc, "severity": sev, "message": msg.strip()})
    return messages


def _build_dashboard(re_out, env_out, terse, rates, ospf, bgp, rt_sum, logs) -> dict:
    re_data = _parse_routing_engine(re_out)
    env_data = _parse_environment(env_out)
    ifaces = _parse_terse(terse)
    phys = [i for i in ifaces if re.match(r"^(ge|xe|et|fe)-", i["name"])]
    total = len(phys)
    up = sum(1 for i in phys if i["oper"] == "up")

    rate_map = _parse_rates(rates)
    rx_total = sum(v["rx_bps"] for v in rate_map.values())
    tx_total = sum(v["tx_bps"] for v in rate_map.values())

    # Top interfaces by rx
    top = sorted(rate_map.items(), key=lambda x: x[1]["rx_bps"], reverse=True)[:6]
    top_ifaces = []
    for name, r in top:
        iface_info = next((i for i in ifaces if i["name"] == name), {})
        rx_bps = r["rx_bps"]
        tx_bps = r["tx_bps"]
        # rough utilisation based on 1G default
        speed = 1_000_000_000
        util = min(99, int((rx_bps / speed) * 100))
        state = "ok"
        state_label = "up"
        if iface_info.get("admin") == "down" or iface_info.get("oper") == "down":
            state = "warn"
            state_label = "down"
        top_ifaces.append({
            "name": name,
            "desc": iface_info.get("inet", ""),
            "util": util,
            "rate": _fmt_bps(rx_bps),
            "state": state,
            "stateLabel": state_label,
            "rx_bps": rx_bps,
            "tx_bps": tx_bps,
        })

    ospf_nbrs = _parse_ospf_neighbors(ospf)
    bgp_data = _parse_bgp_summary(bgp)
    rt_tables = _parse_route_summary(rt_sum)
    inet0 = rt_tables.get("inet.0", {})

    temps = env_data.get("temperatures", [])
    re_temp = next((t["temp_c"] for t in temps if "Routing Engine" in t["name"]), 0)
    fans = env_data.get("fans", [])
    fan_rpm = fans[0]["rpm"] if fans and "rpm" in fans[0] else 0
    fan_pct = min(100, int(fan_rpm / 12000 * 100)) if fan_rpm else 0

    log_msgs = _parse_log_messages(logs)

    return {
        "cpu_util": re_data["cpu_util"],
        "memory_util": re_data["memory_util"],
        "memory_total_mb": re_data["memory_total_mb"],
        "temperature_re": re_temp,
        "temperatures": temps,
        "fans": fans,
        "fan_pct": fan_pct,
        "psus": env_data.get("psus", []),
        "interfaces_up": up,
        "interfaces_total": total,
        "rx_bps": rx_total,
        "tx_bps": tx_total,
        "pps": int((rx_total + tx_total) / 1500) if (rx_total + tx_total) else 0,
        "ospf_neighbors": len(ospf_nbrs),
        "ospf_full": sum(1 for n in ospf_nbrs if n.get("state") == "Full"),
        "bgp_peers": bgp_data["peer_count"],
        "bgp_established": bgp_data["established_count"],
        "bgp_local_as": bgp_data["local_as"],
        "rib_active": inet0.get("active", 0),
        "rib_holddown": inet0.get("holddown", 0),
        "top_interfaces": top_ifaces,
        "recent_events": list(reversed(log_msgs))[:20],
    }


def _parse_interfaces_extensive(ext_out: str) -> list:
    ifaces = []
    cur: dict = {}

    for line in ext_out.split("\n"):
        m = re.match(
            r"^Physical interface:\s+(\S+?),?\s+(\w+),?\s+Physical link is (\w+)", line
        )
        if m:
            if cur:
                ifaces.append(cur)
            cur = {
                "name": m.group(1).rstrip(","),
                "admin_status": m.group(2).lower(),
                "oper_status": m.group(3).lower(),
                "description": "",
                "speed": "",
                "mtu": 1514,
                "mac": "",
                "rx_bps": 0, "tx_bps": 0,
                "rx_pps": 0, "tx_pps": 0,
                "rx_packets": 0, "tx_packets": 0,
                "rx_bytes": 0, "tx_bytes": 0,
                "rx_errors": 0, "tx_errors": 0,
                "last_flap": "—",
                "optic": None,
            }
            continue

        if not cur:
            continue

        if re.match(r"\s+Description:\s+", line):
            cur["description"] = line.split(":", 1)[1].strip()
        elif "Speed:" in line:
            m2 = re.search(r"Speed:\s+(\S+)", line)
            if m2:
                cur["speed"] = m2.group(1)
        elif "MTU:" in line:
            m2 = re.search(r"MTU:\s+(\d+)", line)
            if m2:
                cur["mtu"] = int(m2.group(1))
        elif "Hardware address:" in line:
            m2 = re.search(r"Hardware address:\s+([\da-f:]+)", line, re.I)
            if m2:
                cur["mac"] = m2.group(1)
        elif "Input  rate" in line or "Input rate" in line:
            m2 = re.search(r"(\d+)\s+bps.*?(\d+)\s+pps", line)
            if m2:
                cur["rx_bps"] = int(m2.group(1))
                cur["rx_pps"] = int(m2.group(2))
        elif "Output rate" in line:
            m2 = re.search(r"(\d+)\s+bps.*?(\d+)\s+pps", line)
            if m2:
                cur["tx_bps"] = int(m2.group(1))
                cur["tx_pps"] = int(m2.group(2))
        elif "Input  bytes" in line or "Input bytes" in line:
            m2 = re.search(r"(\d+)", line)
            if m2:
                cur["rx_bytes"] = int(m2.group(1))
        elif "Output bytes" in line:
            m2 = re.search(r"(\d+)", line)
            if m2:
                cur["tx_bytes"] = int(m2.group(1))
        elif "Input  packets" in line or "Input packets" in line:
            m2 = re.search(r"(\d+)", line)
            if m2:
                cur["rx_packets"] = int(m2.group(1))
        elif "Output packets" in line:
            m2 = re.search(r"(\d+)", line)
            if m2:
                cur["tx_packets"] = int(m2.group(1))
        elif "Input  errors" in line or "Input errors" in line:
            m2 = re.search(r"(\d+)", line)
            if m2:
                cur["rx_errors"] = int(m2.group(1))
        elif "Output errors" in line:
            m2 = re.search(r"(\d+)", line)
            if m2:
                cur["tx_errors"] = int(m2.group(1))
        elif "Last flapped" in line:
            m2 = re.search(r"Last flapped\s*:\s*(.+)", line)
            if m2:
                cur["last_flap"] = m2.group(1).strip()
        # Optic DOM
        elif "Laser tx power" in line:
            if not cur["optic"]:
                cur["optic"] = {}
            m2 = re.search(r"([-\d.]+)\s+dBm", line)
            if m2:
                cur["optic"]["tx_dbm"] = float(m2.group(1))
        elif "Laser rx power" in line:
            if not cur["optic"]:
                cur["optic"] = {}
            m2 = re.search(r"([-\d.]+)\s+dBm", line)
            if m2:
                cur["optic"]["rx_dbm"] = float(m2.group(1))
        elif "Laser tx bias" in line:
            if not cur["optic"]:
                cur["optic"] = {}
            m2 = re.search(r"([\d.]+)\s+mA", line)
            if m2:
                cur["optic"]["tx_bias_ma"] = float(m2.group(1))
        elif "Module temperature" in line:
            if not cur["optic"]:
                cur["optic"] = {}
            m2 = re.search(r"([\d.]+)\s+degrees", line)
            if m2:
                cur["optic"]["temp_c"] = float(m2.group(1))

    if cur:
        ifaces.append(cur)
    return ifaces


def _parse_chassis(hw_out, env_out, fpc_out, re_out) -> dict:
    # Hardware inventory
    hw_items = []
    for line in hw_out.split("\n"):
        m = re.match(
            r"^(\S+)\s+(.+?)\s{2,}(\S+)\s+(\S+)\s+(\S+)\s+(.*)$", line
        )
        if m:
            hw_items.append({
                "cls": m.group(1),
                "item": m.group(2).strip(),
                "version": m.group(3),
                "part": m.group(4),
                "serial": m.group(5),
                "description": m.group(6).strip(),
            })

    # FPC
    fpcs = []
    for line in fpc_out.split("\n"):
        m = re.match(r"\s*(\d+)\s+(Online|Offline|Empty)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)", line)
        if m:
            fpcs.append({
                "slot": int(m.group(1)),
                "state": m.group(2),
                "temp_c": int(m.group(3)),
                "cpu_total": int(m.group(4)),
                "cpu_interrupt": int(m.group(5)),
                "heap_util": int(m.group(6)),
            })

    return {
        "hardware": hw_items,
        "environment": _parse_environment(env_out),
        "fpcs": fpcs,
        "routing_engine": _parse_routing_engine(re_out),
    }


def _parse_routing(ospf_nbr, bgp_sum, bgp_nbr, rt_sum, static_rt) -> dict:
    nbrs = _parse_ospf_neighbors(ospf_nbr)
    bgp = _parse_bgp_summary(bgp_sum)
    tables = _parse_route_summary(rt_sum)
    inet0 = tables.get("inet.0", {})

    static_routes = []
    for line in (static_rt or "").split("\n"):
        m = re.match(r"^(\d+\.\d+\.\d+\.\d+/\d+)\s+\*\[Static", line)
        if m:
            static_routes.append({"prefix": m.group(1), "protocol": "Static"})

    return {
        "ospf": {
            "neighbors": nbrs,
            "neighbor_count": len(nbrs),
            "full_count": sum(1 for n in nbrs if n.get("state") == "Full"),
        },
        "bgp": bgp,
        "static_routes": static_routes,
        "rib": {"inet_0": inet0, "tables": tables},
    }


def _parse_config_sections(raw: str) -> dict:
    sections: dict = {}
    cur_name = None
    cur_lines: list = []
    depth = 0

    for line in raw.split("\n"):
        if not cur_name:
            m = re.match(r"^([a-z][\w-]*)\s*\{", line)
            if m:
                cur_name = m.group(1)
                cur_lines = [line]
                depth = 1
        else:
            cur_lines.append(line)
            depth += line.count("{") - line.count("}")
            if depth <= 0:
                sections[cur_name] = "\n".join(cur_lines)
                cur_name = None
                cur_lines = []
                depth = 0

    return sections


def _parse_storage(storage_out: str) -> list:
    vols = []
    for line in storage_out.split("\n"):
        m = re.match(r"(\S+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)%\s+(\S+)", line)
        if m:
            vols.append({
                "filesystem": m.group(1),
                "size_kb": int(m.group(2)),
                "used_kb": int(m.group(3)),
                "avail_kb": int(m.group(4)),
                "use_pct": int(m.group(5)),
                "mount": m.group(6),
            })
    return vols


def _parse_users(users_out: str) -> list:
    users = []
    for line in users_out.split("\n"):
        m = re.match(r"^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)", line)
        if m and m.group(1) not in ("USER", ""):
            users.append({
                "user": m.group(1),
                "tty": m.group(2),
                "from": m.group(3),
                "login_time": m.group(4),
                "idle": m.group(5).strip(),
            })
    return users


def _fmt_bps(bps: int) -> str:
    if bps >= 1e9:
        return f"{bps/1e9:.2f} Gbps"
    if bps >= 1e6:
        return f"{bps/1e6:.1f} Mbps"
    if bps >= 1e3:
        return f"{bps/1e3:.0f} kbps"
    return f"{bps} bps"

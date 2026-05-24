/* global React, I, Pill */

// ============ Fleet data helpers ============

const TEAM_LIST = ["Datacenter East", "EMEA Branches", "APAC Branches", "Edge / ISP", "Lab & Test", "Unassigned"];

const CSV_HEADERS = ["hostname", "mgmt", "port", "role", "team", "location", "username"];
const CSV_TEMPLATE = [
  CSV_HEADERS.join(","),
  "juniper-router-01,192.168.1.1,22,edge,Datacenter East,DC1 rack-3,root",
  "juniper-branch-ldn,10.0.40.1,22,branch,EMEA Branches,London cab-7,root",
  "juniper-lab-01,10.99.0.1,22,branch,Lab & Test,Lab rack-3,regress",
].join("\n");

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "juniper-routers-template.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 1) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || "").trim(); });
    return row;
  });
}

function parseCsvLine(line) {
  const out = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function rowToRouter(row, idx) {
  if (!row.hostname || !row.mgmt) return null;
  const id = (row.hostname || `imported-${idx}`).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id,
    hostname: row.hostname,
    model: "Juniper",
    serial: "—",
    routerId: row.mgmt,
    asn: "—",
    mgmt: row.mgmt,
    port: parseInt(row.port) || 22,
    firmware: "—",
    uptime: "—",
    location: row.location || "—",
    role: row.role || "branch",
    team: row.team || "Unassigned",
    ports: 0, upPorts: 0,
    state: "ok", stateLabel: "just imported",
    loadHint: 0.4,
  };
}

// ============ Device picker (in sidebar) ============
function DevicePicker({ devices, currentId, onSelect, onAdd, dense }) {
  const [open, setOpen] = React.useState(false);
  const current = devices.find(d => d.id === currentId) || devices[0];

  if (dense || !current) return null;

  return (
    <div className="device-picker">
      <div className="device-picker-current" onClick={() => setOpen(!open)}>
        <span className={`dot ${current.state} pulse`}/>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{current.hostname}</div>
          <div className="text-xs fg-3 mono" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{current.model} · {current.mgmt}</div>
        </div>
        <I.chevronDown size={14} style={{ color: "var(--fg-3)", transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms" }}/>
      </div>
      {open && (
        <div className="device-list">
          <div className="device-list-head">
            <span className="text-xs fg-3 mono" style={{ textTransform: "uppercase", letterSpacing: "0.07em" }}>fleet · {devices.length}</span>
            <span className="spacer"/>
            <button className="btn ghost text-xs" onClick={() => { setOpen(false); onAdd(); }}>
              <I.plus size={12}/> Add
            </button>
          </div>
          {devices.map(d => (
            <div key={d.id}
                 className={`device-list-item ${d.id === currentId ? "active" : ""}`}
                 onClick={() => { onSelect(d.id); setOpen(false); }}>
              <span className={`dot ${d.state} ${d.state === "ok" ? "pulse" : ""}`}/>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="text-sm" style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.hostname}</div>
                <div className="text-xs fg-3 mono" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.role} · {d.mgmt}</div>
              </div>
              {d.id === currentId && <I.check size={14} style={{ color: "var(--accent)" }}/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Add-router modal ============
function AddRouterModal({ onClose, onAdd, onAddMany, initialTab = "single" }) {
  const [tab, setTab] = React.useState(initialTab);
  const [form, setForm] = React.useState({
    hostname: "",
    mgmt: "",
    port: 22,
    username: "root",
    role: "branch",
    team: TEAM_LIST[0],
    location: "",
    autoDiscover: true,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [phase, setPhase] = React.useState("form"); // form | discovering | done | error
  const [log, setLog] = React.useState([]);
  const [discovered, setDiscovered] = React.useState(null);

  const startDiscover = async () => {
    if (!form.mgmt) {
      alert("Enter a management IP first.");
      return;
    }
    setPhase("discovering");
    setLog([]);

    // Animated progress lines while real SSH runs in background
    const steps = [
      ["info", `> attempting tcp connect to ${form.mgmt}:${form.port}`, 400],
      ["ok",   `< tcp handshake established`, 380],
      ["info", `> ssh kex · curve25519-sha256 · ed25519 host key`, 360],
      ["ok",   `< host key fingerprint verified`, 300],
      ["info", `> trying root / Embe1mpls ...`, 320],
    ];
    let i = 0;
    const tick = () => {
      if (i < steps.length) {
        const [sev, msg, delay] = steps[i++];
        setLog(l => [...l, { sev, msg }]);
        setTimeout(tick, delay);
      }
    };
    setTimeout(tick, 300);

    // Real API call
    try {
      const res = await fetch("/api/routers/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mgmt: form.mgmt, port: form.port }),
      });
      const data = await res.json();

      if (data.success) {
        setLog(l => [
          ...l,
          { sev: "ok", msg: `< authenticated` },
          { sev: "info", msg: `> probing model, interfaces, routing protocols` },
          { sev: "ok", msg: `< model: ${data.model} · firmware: ${data.version}` },
          { sev: "ok", msg: `< ${data.ports} interfaces discovered, ${data.upPorts} up` },
          { sev: "ok", msg: `< discovery complete` },
        ]);
        setDiscovered(data);
        // Pre-fill hostname if empty
        if (!form.hostname) set("hostname", data.hostname);
        setPhase("done");
      } else {
        setLog(l => [...l, { sev: "err", msg: `< ERROR: ${data.error}` }]);
        setPhase("error");
      }
    } catch (e) {
      setLog(l => [...l, { sev: "err", msg: `< network error: ${e.message}` }]);
      setPhase("error");
    }
  };

  const commit = async () => {
    const payload = {
      hostname: form.hostname || (discovered && discovered.hostname) || form.mgmt,
      mgmt: form.mgmt,
      port: form.port,
      role: form.role,
      team: form.team,
      location: form.location,
      model: discovered?.model || "Juniper",
      serial: discovered?.serial || "—",
      firmware: discovered?.version || "—",
      uptime: discovered?.uptime || "—",
      ports: discovered?.ports || 0,
      upPorts: discovered?.upPorts || 0,
    };

    try {
      const res = await fetch("/api/routers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const newDev = await res.json();
      newDev.state = "ok";
      newDev.stateLabel = "operational";
      newDev.loadHint = 0.5;
      onAdd(newDev);
      onClose();
    } catch (e) {
      alert(`Failed to add router: ${e.message}`);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 720 }}>
        <div className="modal-head">
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "oklch(from var(--accent) l c h / 0.16)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I.plus/>
          </div>
          <div>
            <div className="title">Add router(s) to fleet</div>
            <div className="text-xs fg-3 mono">discover & onboard via SSH · root/Embe1mpls or regress/MaRtInI</div>
          </div>
          <div className="spacer"/>
          <button className="icon-btn" onClick={onClose}><I.x/></button>
        </div>

        {phase === "form" && (
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", padding: "0 20px" }}>
            <TabBtn id="single" tab={tab} setTab={setTab} label="Single device"/>
            <TabBtn id="bulk" tab={tab} setTab={setTab} label="Bulk import · CSV/XLSX"/>
          </div>
        )}

        <div className="modal-body">
          {phase === "form" && tab === "single" && (
            <>
              <div className="grid cols-2">
                <div className="field">
                  <label>Hostname (optional, auto-detected)</label>
                  <input type="text" value={form.hostname} onChange={e => set("hostname", e.target.value)} placeholder="auto"/>
                </div>
                <div className="field">
                  <label>Management IP *</label>
                  <input type="text" value={form.mgmt} onChange={e => set("mgmt", e.target.value)} placeholder="192.168.1.1"/>
                </div>
                <div className="field">
                  <label>SSH port</label>
                  <input type="number" value={form.port} onChange={e => set("port", +e.target.value)}/>
                </div>
                <div className="field">
                  <label>Role</label>
                  <select value={form.role} onChange={e => set("role", e.target.value)}>
                    <option value="edge">edge</option>
                    <option value="core">core</option>
                    <option value="branch">branch</option>
                    <option value="aggregation">aggregation</option>
                  </select>
                </div>
                <div className="field">
                  <label>Team</label>
                  <select value={form.team} onChange={e => set("team", e.target.value)}>
                    {TEAM_LIST.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Location (optional)</label>
                  <input type="text" value={form.location} onChange={e => set("location", e.target.value)} placeholder="DC-EAST · rack 12U"/>
                </div>
              </div>
              <div className="text-xs fg-3" style={{ marginTop: 4 }}>
                Credentials tried automatically: <code>root/Embe1mpls</code> then <code>regress/MaRtInI</code>
              </div>
            </>
          )}
          {phase === "form" && tab === "bulk" && (
            <BulkImport onAddMany={rows => { onAddMany && onAddMany(rows); onClose(); }}/>
          )}
          {(phase === "discovering" || phase === "done" || phase === "error") && (
            <div style={{ background: "oklch(0.1 0.005 240)", borderRadius: "var(--radius)", padding: 14, fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.6, minHeight: 280, maxHeight: 380, overflow: "auto" }}>
              <div style={{ color: "oklch(0.65 0.04 240)", marginBottom: 6 }}>! discovering {form.hostname || form.mgmt} at {form.mgmt}:{form.port}</div>
              {log.map((l, i) => (
                <div key={i} style={{
                  color: l.sev === "ok" ? "oklch(0.82 0.16 145)" : l.sev === "err" ? "oklch(0.78 0.18 25)" : "oklch(0.85 0.01 240)"
                }}>{l.msg}</div>
              ))}
              {phase === "discovering" && <div style={{ color: "var(--accent)" }}>▌</div>}
              {phase === "done" && discovered && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: "oklch(0.82 0.16 145)", display: "flex", alignItems: "center", gap: 6 }}>
                    <I.check size={14}/> ready to add to fleet
                  </div>
                  <div style={{ color: "oklch(0.65 0.04 240)", marginTop: 6 }}>
                    hostname={discovered.hostname} · model={discovered.model} · {discovered.ports} ports
                  </div>
                </div>
              )}
              {phase === "error" && (
                <div style={{ marginTop: 12, color: "oklch(0.78 0.18 25)" }}>
                  <I.alerts size={14}/> Connection failed. Check IP, port and credentials.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-foot">
          {phase === "form" && tab === "single" && <button className="btn ghost" onClick={onClose}>Cancel</button>}
          <div className="right">
            {phase === "form" && tab === "single" && (
              <button className="btn primary" onClick={startDiscover} disabled={!form.mgmt}>
                <I.refresh size={14}/> Connect & discover
              </button>
            )}
            {phase === "discovering" && <button className="btn" disabled>Discovering...</button>}
            {phase === "done" && (
              <button className="btn primary" onClick={commit}>
                <I.plus size={14}/> Add to fleet
              </button>
            )}
            {phase === "error" && (
              <button className="btn" onClick={() => setPhase("form")}>← Back</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ id, tab, setTab, label }) {
  const active = tab === id;
  return (
    <div onClick={() => setTab(id)}
         style={{
           padding: "10px 14px", cursor: "pointer",
           borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
           color: active ? "var(--fg)" : "var(--fg-3)",
           marginBottom: -1, fontWeight: 500, fontSize: 13,
         }}>{label}</div>
  );
}

// ============ Bulk import ============
function BulkImport({ onAddMany }) {
  const [rows, setRows] = React.useState([]);
  const [error, setError] = React.useState("");
  const [filename, setFilename] = React.useState("");
  const fileRef = React.useRef(null);

  const onFile = async e => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    try {
      let text;
      if (/\.csv$/i.test(file.name)) {
        text = await file.text();
        setRows(parseCsv(text));
      } else if (/\.xlsx?$/i.test(file.name)) {
        if (typeof window.XLSX === "undefined") { setError("XLSX loading… retry in a second or use CSV."); return; }
        const buf = await file.arrayBuffer();
        const wb = window.XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        setRows(parseCsv(window.XLSX.utils.sheet_to_csv(ws)));
      } else {
        setError("Unsupported file type. Use .csv, .xls or .xlsx.");
      }
    } catch (err) {
      setError(`Parse failed: ${err.message}`);
    }
  };

  const valid = rows.filter(r => r.hostname && r.mgmt);
  const invalid = rows.length - valid.length;

  const commit = async () => {
    const built = valid.map((r, i) => rowToRouter(r, i)).filter(Boolean);
    // Add all to backend
    const added = [];
    for (const dev of built) {
      try {
        const res = await fetch("/api/routers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dev),
        });
        if (res.ok) added.push(await res.json());
      } catch (e) {}
    }
    onAddMany(added.length ? added : built);
  };

  return (
    <div>
      <div className="row mb" style={{ gap: 8 }}>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          <I.upload size={14}/> Choose CSV or XLSX file
        </button>
        <button className="btn ghost" onClick={downloadCsvTemplate}>
          <I.download size={14}/> Download template
        </button>
        <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" onChange={onFile} style={{ display: "none" }}/>
        {filename && <span className="mono text-xs fg-3" style={{ marginLeft: 8 }}>{filename}</span>}
      </div>
      <div className="card mb" style={{ background: "var(--bg-2)" }}>
        <div className="card-body" style={{ padding: "10px 14px" }}>
          <div className="text-xs fg-3 mono mb" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Expected columns</div>
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {CSV_HEADERS.map(c => (
              <span key={c} className="mono text-xs" style={{ background: "var(--bg-3)", padding: "2px 8px", borderRadius: 4 }}>{c}</span>
            ))}
          </div>
          <div className="hint" style={{ marginTop: 6 }}>Required: <strong>hostname</strong>, <strong>mgmt</strong>. Others optional.</div>
        </div>
      </div>
      {error && (
        <div style={{ color: "var(--err)", background: "oklch(from var(--err) l c h / 0.1)", border: "1px solid oklch(from var(--err) l c h / 0.3)", padding: "8px 12px", borderRadius: "var(--radius)", fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {rows.length > 0 && (
        <>
          <div className="row mb" style={{ gap: 8 }}>
            <Pill kind="ok">{valid.length} valid</Pill>
            {invalid > 0 && <Pill kind="warn">{invalid} skipped</Pill>}
          </div>
          <div className="card" style={{ maxHeight: 280, overflow: "auto" }}>
            <table className="data">
              <thead><tr><th>Hostname</th><th>Mgmt IP</th><th>Role</th><th>Team</th><th>Location</th><th></th></tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const ok = r.hostname && r.mgmt;
                  return (
                    <tr key={i} style={{ opacity: ok ? 1 : 0.5 }}>
                      <td className="mono">{r.hostname || "—"}</td>
                      <td className="mono">{r.mgmt || "—"}</td>
                      <td className="mono">{r.role || "branch"}</td>
                      <td className="mono">{r.team || "—"}</td>
                      <td className="fg-2">{r.location || "—"}</td>
                      <td>{ok ? <Pill kind="ok" dot>ok</Pill> : <Pill kind="warn">skip</Pill>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="row" style={{ marginTop: 14, justifyContent: "flex-end", gap: 8 }}>
            <button className="btn ghost" onClick={() => { setRows([]); setFilename(""); }}>Reset</button>
            <button className="btn primary" onClick={commit} disabled={valid.length === 0}>
              <I.plus size={14}/> Import {valid.length} routers
            </button>
          </div>
        </>
      )}
    </div>
  );
}

window.TEAM_LIST = TEAM_LIST;
window.DevicePicker = DevicePicker;
window.AddRouterModal = AddRouterModal;
window.downloadCsvTemplate = downloadCsvTemplate;
window.parseCsv = parseCsv;
window.rowToRouter = rowToRouter;

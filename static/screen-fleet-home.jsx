/* global React, I, Pill, Sparkline, downloadCsvTemplate */

// ============ Fleet home — router list grouped by team ============
function FleetHome({ devices, currentId, onSelect, onAdd, onImport, onDelete, onDeleteTeam }) {
  const [query, setQuery] = React.useState("");
  const [view, setView] = React.useState("teams"); // teams | all
  const [collapsed, setCollapsed] = React.useState({});
  const [confirm, setConfirm] = React.useState(null); // { kind: "router"|"team", target, label }
  const toggle = (k) => setCollapsed((c) => ({ ...c, [k]: !c[k] }));

  const sparks = React.useMemo(() => devices.map((d) => {
    const arr = []; let v = (d.loadHint || 0.5) * 100;
    for (let i = 0; i < 40; i++) { v = Math.max(0, Math.min(100, v + (Math.random() - 0.5) * 12)); arr.push(v); }
    return arr;
  }), [devices.length]);

  const sparkById = React.useMemo(() => Object.fromEntries(devices.map((d, i) => [d.id, sparks[i]])), [devices, sparks]);

  // filter by query
  const filtered = devices.filter((d) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return d.hostname.toLowerCase().includes(q)
        || d.mgmt.toLowerCase().includes(q)
        || (d.team || "").toLowerCase().includes(q)
        || (d.role || "").toLowerCase().includes(q)
        || (d.location || "").toLowerCase().includes(q);
  });

  // group by team
  const teams = React.useMemo(() => {
    const m = new Map();
    filtered.forEach((d) => {
      const t = d.team || "Unassigned";
      if (!m.has(t)) m.set(t, []);
      m.get(t).push(d);
    });
    return Array.from(m.entries());
  }, [filtered]);

  const counts = {
    total: devices.length,
    ok: devices.filter((d) => d.state === "ok").length,
    warn: devices.filter((d) => d.state === "warn").length,
    err: devices.filter((d) => d.state === "err").length,
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Fleet</h1>
          <div className="sub mono">{counts.total} routers · {counts.ok} healthy · {counts.warn} warning · {counts.err} unreachable · {teams.length} teams</div>
        </div>
        <div className="actions">
          <div className="row" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 2 }}>
            <button className={`btn ${view === "teams" ? "" : "ghost"} text-sm`} style={{ border: "none", padding: "4px 12px" }} onClick={() => setView("teams")}>By team</button>
            <button className={`btn ${view === "all" ? "" : "ghost"} text-sm`} style={{ border: "none", padding: "4px 12px" }} onClick={() => setView("all")}>All routers</button>
          </div>
          <div className="row" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0 8px", height: 32 }}>
            <I.search size={14}/>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                   placeholder="filter routers..."
                   style={{ background: "transparent", border: "none", padding: "0 6px", height: 30, width: 200 }}/>
          </div>
          <button className="btn ghost" onClick={downloadCsvTemplate}><I.download size={14}/> Template</button>
          <button className="btn" onClick={onImport}><I.upload size={14}/> Import CSV/XLSX</button>
          <button className="btn primary" onClick={onAdd}><I.plus size={14}/> Add router</button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid cols-4 mb">
        <FleetTile lbl="Total devices" val={counts.total} kind="info"/>
        <FleetTile lbl="Healthy" val={counts.ok} kind="ok"/>
        <FleetTile lbl="Warning" val={counts.warn} kind="warn"/>
        <FleetTile lbl="Unreachable" val={counts.err} kind="err"/>
      </div>

      {/* Teams or All */}
      {view === "all" && filtered.length > 0 && (
        <>
          <div className="team-head" style={{ cursor: "default" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--accent)" }}/>
            <span style={{ fontWeight: 600 }}>All routers</span>
            <span className="text-xs fg-3 mono">{filtered.length}</span>
            <span className="spacer"/>
            <span className="text-xs fg-3 mono">{teams.length} teams</span>
          </div>
          <div className="grid cols-3" style={{ marginBottom: 18 }}>
            {filtered.map((d) => (
              <RouterCard key={d.id} device={d}
                          active={d.id === currentId}
                          spark={sparkById[d.id]}
                          showTeam
                          onClick={() => onSelect(d.id)}
                          onDelete={() => setConfirm({ kind: "router", target: d.id, label: d.hostname })}/>
            ))}
          </div>
        </>
      )}

      {view === "teams" && teams.length === 0 && (
        <div className="card">
          <div className="card-body" style={{ textAlign: "center", padding: 40, color: "var(--fg-3)" }}>
            <I.search size={32}/>
            <div style={{ marginTop: 12 }}>No routers match "{query}"</div>
          </div>
        </div>
      )}

      {view === "teams" && teams.map(([team, list]) => {
        const isCollapsed = collapsed[team];
        const ok = list.filter((d) => d.state === "ok").length;
        const warn = list.filter((d) => d.state === "warn").length;
        const err = list.filter((d) => d.state === "err").length;
        return (
          <div className="team-section" key={team}>
            <div className="team-head" onClick={() => toggle(team)}>
              <I.chevron size={14} style={{ transform: isCollapsed ? "none" : "rotate(90deg)", transition: "transform 160ms", color: "var(--fg-3)" }}/>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: teamColor(team) }}/>
              <span style={{ fontWeight: 600 }}>{team}</span>
              <span className="text-xs fg-3 mono">{list.length}</span>
              <span className="spacer"/>
              <span className="row" style={{ gap: 8, fontSize: 11, fontFamily: "var(--font-mono)" }}>
                {ok > 0 &&   <span style={{ color: "var(--ok)" }}><span className="dot ok" style={{ marginRight: 4 }}/>{ok}</span>}
                {warn > 0 && <span style={{ color: "var(--warn)" }}><span className="dot warn" style={{ marginRight: 4 }}/>{warn}</span>}
                {err > 0 &&  <span style={{ color: "var(--err)" }}><span className="dot err" style={{ marginRight: 4 }}/>{err}</span>}
              </span>
              <button className="btn ghost text-xs" onClick={(e) => { e.stopPropagation(); onAdd(team); }}>
                <I.plus size={12}/> Add to team
              </button>
              <button className="icon-btn" data-tip="Delete team" onClick={(e) => { e.stopPropagation(); setConfirm({ kind: "team", target: team, label: team, count: list.length }); }}>
                <I.trash size={14}/>
              </button>
            </div>
            {!isCollapsed && (
              <div className="grid cols-3" style={{ marginBottom: 18 }}>
                {list.map((d) => (
                  <RouterCard key={d.id} device={d}
                              active={d.id === currentId}
                              spark={sparkById[d.id]}
                              onClick={() => onSelect(d.id)}
                              onDelete={() => setConfirm({ kind: "router", target: d.id, label: d.hostname })}/>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {teams.length > 0 && view === "teams" && (
        <div className="grid cols-3" style={{ marginTop: 8 }}>
          <AddCard onClick={onAdd}/>
        </div>
      )}

      {confirm && (
        <ConfirmDelete
          confirm={confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.kind === "router") onDelete(confirm.target);
            else onDeleteTeam(confirm.target);
            setConfirm(null);
          }}/>
      )}
    </div>
  );
}

function ConfirmDelete({ confirm, onCancel, onConfirm }) {
  const isTeam = confirm.kind === "team";
  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal" style={{ width: 460 }}>
        <div className="modal-head">
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "oklch(from var(--err) l c h / 0.18)", color: "var(--err)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I.trash/>
          </div>
          <div>
            <div className="title">Delete {isTeam ? "team" : "router"}?</div>
            <div className="text-xs fg-3 mono">this action cannot be undone</div>
          </div>
          <div className="spacer"/>
          <button className="icon-btn" onClick={onCancel}><I.x/></button>
        </div>
        <div className="modal-body">
          {isTeam ? (
            <div>
              <p style={{ marginTop: 0 }}>
                Delete team <strong style={{ fontFamily: "var(--font-mono)" }}>{confirm.label}</strong> and all <strong>{confirm.count}</strong> routers in it?
              </p>
              <div style={{ background: "oklch(from var(--warn) l c h / 0.1)", border: "1px solid oklch(from var(--warn) l c h / 0.35)", color: "var(--warn)", padding: "10px 12px", borderRadius: "var(--radius)", fontSize: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <I.alerts size={14}/>
                <span>All routers assigned to this team will be removed from the fleet. Configuration on the physical devices is not affected.</span>
              </div>
            </div>
          ) : (
            <p style={{ marginTop: 0 }}>
              Remove router <strong style={{ fontFamily: "var(--font-mono)" }}>{confirm.label}</strong> from the fleet? It will no longer appear in the console; the physical device is not touched.
            </p>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <div className="right">
            <button className="btn danger" onClick={onConfirm}>
              <I.trash size={14}/> {isTeam ? `Delete team & ${confirm.count} routers` : "Delete router"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function teamColor(name) {
  // Stable hash → hue
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `oklch(0.72 0.16 ${h})`;
}

function FleetTile({ lbl, val, kind }) {
  return (
    <div className="card">
      <div className="stat">
        <div className="label">{lbl}</div>
        <div className="value" style={{ color: kind && kind !== "info" ? `var(--${kind === "ok" ? "ok" : kind})` : "" }}>{val}</div>
      </div>
    </div>
  );
}

function RouterCard({ device, active, spark, onClick, showTeam, onDelete }) {
  const color = device.state === "err" ? "var(--err)"
              : device.state === "warn" ? "var(--warn)"
              : "var(--chart-2)";
  return (
    <div className="card router-card" onClick={onClick} style={{ cursor: "pointer", outline: active ? "2px solid var(--accent)" : "none", position: "relative" }}>
      {onDelete && (
        <button className="icon-btn router-card-del"
                data-tip="Delete router"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <I.trash size={14}/>
        </button>
      )}
      <div className="card-head" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className={`dot ${device.state} ${device.state === "ok" ? "pulse" : ""}`}/>
        <div>
          <div style={{ fontWeight: 600 }}>{device.hostname}</div>
          <div className="text-xs fg-3 mono">{device.role}{showTeam && device.team ? ` · ${device.team}` : ""}</div>
        </div>
        <div className="spacer"/>
        <Pill kind={device.state} dot>{device.stateLabel}</Pill>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="kv-list">
          <div className="k">model</div><div className="v">{device.model}</div>
          <div className="k">mgmt</div><div className="v">{device.mgmt}</div>
          <div className="k">firmware</div><div className="v">{device.firmware}</div>
          <div className="k">location</div><div className="v">{device.location}</div>
          <div className="k">uptime</div><div className="v">{device.uptime}</div>
          <div className="k">ports</div><div className="v">{device.upPorts} / {device.ports} up</div>
        </div>
        <div>
          <div className="row" style={{ marginBottom: 4 }}>
            <span className="text-xs fg-3 mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>traffic · 40s</span>
            <span className="spacer"/>
            <span className="mono text-xs fg-2">{device.state === "err" ? "—" : `${Math.round(spark[spark.length-1])}%`}</span>
          </div>
          <Sparkline data={spark} color={color} height={36}/>
        </div>
        <div className="row" style={{ marginTop: 4 }}>
          <button className="btn ghost text-sm" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            Open <I.chevron size={12}/>
          </button>
          <span className="spacer"/>
          <button className="icon-btn" data-tip="SSH" onClick={(e) => e.stopPropagation()}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600 }}>SSH</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCard({ onClick }) {
  return (
    <div className="card add-card" onClick={onClick}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: "oklch(from var(--accent) l c h / 0.14)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <I.plus size={28}/>
      </div>
      <div style={{ fontWeight: 600, fontSize: 15 }}>Add router</div>
      <div className="fg-3 text-sm" style={{ marginTop: 4 }}>Discover & onboard a new device</div>
    </div>
  );
}

window.FleetHome = FleetHome;

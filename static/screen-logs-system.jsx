/* global React, I, Pill, useRouterPoll */

function Logs({ device }) {
  const [filter, setFilter] = React.useState("all");
  const [paused, setPaused] = React.useState(false);
  const [events, setEvents] = React.useState([]);
  const [grep, setGrep] = React.useState("");

  const { data } = useRouterPoll(device?.id, "logs", 5000);

  // Merge live data into events list (append new ones at top)
  React.useEffect(() => {
    if (!data?.messages || paused) return;
    setEvents(prev => {
      const existing = new Set(prev.map(e => `${e.timestamp}|${e.message}`));
      const newOnes = data.messages.filter(m => !existing.has(`${m.timestamp}|${m.message}`));
      return [...newOnes, ...prev].slice(0, 500);
    });
  }, [data, paused]);

  const shown = events.filter(e => {
    if (filter !== "all" && e.severity !== filter) return false;
    if (grep && !e.message?.toLowerCase().includes(grep.toLowerCase()) &&
        !e.process?.toLowerCase().includes(grep.toLowerCase())) return false;
    return true;
  });

  const counts = {
    info: events.filter(e => e.severity === "info").length,
    ok:   events.filter(e => e.severity === "ok").length,
    warn: events.filter(e => e.severity === "warn").length,
    err:  events.filter(e => e.severity === "err").length,
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Logs &amp; Events</h1>
          <div className="sub mono">live stream from {device?.hostname || "—"} syslog · 5s refresh</div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setPaused(!paused)}>
            {paused ? <><I.play size={14}/> Resume</> : <><I.pause size={14}/> Pause</>}
          </button>
          <Pill kind={paused ? "warn" : "ok"} dot>{paused ? "paused" : "live"}</Pill>
          <button className="btn ghost" onClick={() => {
            const txt = events.map(e => `${e.timestamp} [${e.severity}] ${e.process}: ${e.message}`).join("\n");
            const blob = new Blob([txt], { type: "text/plain" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
            a.download = "syslog.txt"; a.click();
          }}><I.download size={14}/> Export</button>
        </div>
      </div>

      <div className="grid cols-4 mb">
        {[
          { lbl: "info",       c: counts.info, k: "info" },
          { lbl: "ok / notice",c: counts.ok,   k: "ok"   },
          { lbl: "warn",       c: counts.warn,  k: "warn" },
          { lbl: "error",      c: counts.err,   k: "err"  },
        ].map(s => (
          <div className="card" key={s.lbl}
               onClick={() => setFilter(s.k === filter ? "all" : s.k)}
               style={{ cursor: "pointer", borderColor: filter === s.k ? `var(--${s.k === "ok" ? "ok" : s.k})` : "" }}>
            <div className="stat">
              <div className="label">{s.lbl}</div>
              <div className="value" style={{ color: `var(--${s.k === "ok" ? "ok" : s.k})` }}>{s.c}</div>
              <div className="meta">total</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="title">Event stream</div>
          <div className="sub mono">{shown.length} of {events.length} events{paused ? " · paused" : ""}</div>
          <div className="actions">
            <input type="text" placeholder="grep logs…" value={grep}
                   onChange={e => setGrep(e.target.value)}
                   style={{ width: 280 }}/>
          </div>
        </div>
        <div className="card-body tight" style={{ maxHeight: 540, overflow: "auto" }}>
          {shown.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--fg-3)" }}>
              {events.length === 0 ? "No log data yet — waiting for connection…" : "No events match filter"}
            </div>
          ) : (
            shown.map((e, i) => (
              <div className="log-row" key={i}>
                <span className="ts">{e.timestamp}</span>
                <span className={`sev ${e.severity}`}>{(e.severity || "info").toUpperCase()}</span>
                <span className="src">{e.process}</span>
                <span className="fg-2">{e.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function System({ device }) {
  const { data, loading, error } = useRouterPoll(device?.id, "system", 30000);
  const { data: dashData } = useRouterPoll(device?.id, "dashboard", 5000);

  const cpu  = dashData?.cpu_util    ?? 0;
  const mem  = dashData?.memory_util ?? 0;
  const temp = dashData?.temperature_re ?? 0;

  const users   = data?.active_users || [];
  const storage = data?.storage || [];

  const hostname  = data?.hostname  || device?.hostname  || "—";
  const model     = data?.model     || device?.model     || "Juniper";
  const serial    = data?.serial    || device?.serial    || "—";
  const version   = data?.version   || device?.firmware  || "—";
  const uptime    = data?.uptime    || device?.uptime    || "—";
  const routerId  = data?.router_id || device?.routerId  || "—";
  const currTime  = data?.current_time || "—";

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>System</h1>
          <div className="sub mono">{model} · {version} · live 30s</div>
        </div>
        <div className="actions">
          <Pill kind="ok" dot>live</Pill>
          <button className="btn ghost"><I.upload size={14}/> Upload firmware</button>
          <button className="btn"><I.power size={14}/> Reload</button>
        </div>
      </div>

      {loading && !data && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--fg-3)" }}>
          <I.refresh size={32}/><div style={{ marginTop: 12 }}>Loading system info…</div>
        </div>
      )}

      <div className="grid cols-12">
        {/* Identity */}
        <div className="card col-6">
          <div className="card-head"><div className="title">Device identity</div></div>
          <div className="card-body">
            <div className="kv-list">
              <div className="k">hostname</div><div className="v">{hostname}</div>
              <div className="k">model</div><div className="v">{model}</div>
              <div className="k">serial</div><div className="v">{serial}</div>
              <div className="k">router-id</div><div className="v">{routerId}</div>
              <div className="k">mgmt-ip</div><div className="v">{device?.mgmt || "—"}</div>
              <div className="k">firmware</div><div className="v">{version}</div>
              <div className="k">uptime</div><div className="v">{uptime}</div>
              <div className="k">current time</div><div className="v">{currTime}</div>
            </div>
          </div>
        </div>

        {/* Live health */}
        <div className="card col-6">
          <div className="card-head"><div className="title">Live health</div><div className="sub mono">from dashboard · 5s</div></div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <HealthBar label="CPU"         value={cpu}  unit="%" max={100} warn={70} err={85}/>
            <HealthBar label="Memory"      value={mem}  unit="%" max={100} warn={70} err={85}/>
            <HealthBar label="Temperature" value={temp} unit="°C" max={80} warn={65} err={75}/>
          </div>
        </div>

        {/* Active users */}
        <div className="card col-6">
          <div className="card-head"><div className="title">Active users &amp; sessions</div></div>
          <div className="card-body tight">
            {users.length === 0 ? (
              <div style={{ padding: 14, color: "var(--fg-3)" }}>
                No session data (try SSH terminal to run "show system users")
              </div>
            ) : (
              <table className="data">
                <thead><tr><th>User</th><th>TTY</th><th>From</th><th>Login</th><th>Idle</th></tr></thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={i}>
                      <td>{u.user}</td>
                      <td className="mono">{u.tty}</td>
                      <td className="mono">{u.from}</td>
                      <td className="mono">{u.login_time}</td>
                      <td className="mono">{u.idle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Storage */}
        <div className="card col-6">
          <div className="card-head"><div className="title">Storage</div></div>
          <div className="card-body">
            {storage.length === 0 ? (
              <div style={{ color: "var(--fg-3)" }}>No storage data</div>
            ) : (
              storage.map((vol, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div className="row" style={{ marginBottom: 6 }}>
                    <span className="mono">{vol.mount}</span>
                    <span className="spacer"/>
                    <span className="mono text-sm fg-2">{vol.use_pct}% used</span>
                  </div>
                  <div style={{ height: 8, background: "var(--bg-3)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${vol.use_pct}%`, height: "100%", background: vol.use_pct > 80 ? "var(--err)" : vol.use_pct > 60 ? "var(--warn)" : "var(--ok)" }}/>
                  </div>
                  <div className="text-xs fg-3 mono" style={{ marginTop: 4 }}>
                    {Math.round(vol.used_kb/1024)} MB / {Math.round(vol.size_kb/1024)} MB · {vol.filesystem}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthBar({ label, value, unit, max = 100, warn = 70, err = 85 }) {
  const pct = Math.min(100, (value / max) * 100);
  const kind = value >= err ? "err" : value >= warn ? "warn" : "ok";
  return (
    <div>
      <div className="row" style={{ marginBottom: 4 }}>
        <span className="fg-2 text-sm">{label}</span>
        <span className="spacer"/>
        <span className="mono text-sm" style={{ fontWeight: 500 }}>{value}{unit}</span>
      </div>
      <div style={{ height: 6, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: `var(--${kind === "ok" ? "ok" : kind})`, transition: "width 600ms ease" }}/>
      </div>
    </div>
  );
}

window.Logs = Logs;
window.System = System;

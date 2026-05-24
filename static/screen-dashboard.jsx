/* global React, I, Pill, Sparkline, AreaChart, formatNum, formatBps,
          useRouterPoll, useRollingHistory */

function Dashboard({ device, setRoute }) {
  const { data, loading, error } = useRouterPoll(device.id, "dashboard", 5000);

  // Rolling 60-point histories updated on each poll tick
  const rxSeries  = useRollingHistory(data?.rx_bps,      60);
  const txSeries  = useRollingHistory(data?.tx_bps,      60);
  const cpuSeries = useRollingHistory(data?.cpu_util,    60);
  const memSeries = useRollingHistory(data?.memory_util, 60);
  const ppsSeries = useRollingHistory(data?.pps,         60);

  const cpu  = data?.cpu_util    ?? 0;
  const mem  = data?.memory_util ?? 0;
  const temp = data?.temperature_re ?? 0;
  const fanPct = data?.fan_pct ?? 0;
  const rxBps = data?.rx_bps ?? 0;
  const txBps = data?.tx_bps ?? 0;
  const pps   = data?.pps    ?? 0;

  const topLinks = data?.top_interfaces ?? [];
  const recentEvents = data?.recent_events ?? [];
  const psus = data?.psus ?? [];
  const ospfNbrs = data?.ospf_neighbors ?? 0;
  const ospfFull = data?.ospf_full ?? 0;
  const bgpPeers = data?.bgp_peers ?? 0;
  const bgpEst   = data?.bgp_established ?? 0;
  const bgpAs    = data?.bgp_local_as ?? "—";
  const ribActive = data?.rib_active ?? 0;

  const stats = [
    { label: "Throughput in",    value: formatBps(rxBps),         delta: "", data: rxSeries,  color: "var(--chart-1)" },
    { label: "Throughput out",   value: formatBps(txBps),         delta: "", data: txSeries,  color: "var(--chart-2)" },
    { label: "Packets / sec",    value: formatNum(pps),           delta: "", data: ppsSeries, color: "var(--chart-3)" },
    { label: "CPU utilization",  value: `${cpu}%`,                delta: "", data: cpuSeries, color: "var(--chart-4)" },
  ];

  if (loading && !data) {
    return (
      <div className="page">
        <div className="page-head"><div><h1>Dashboard</h1><div className="sub mono">Loading live data from {device.hostname}…</div></div></div>
        <div style={{ padding: 60, textAlign: "center", color: "var(--fg-3)" }}>
          <I.refresh size={32}/>
          <div style={{ marginTop: 12 }}>Connecting to {device.mgmt} via SSH…</div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="page">
        <div className="page-head"><div><h1>Dashboard</h1></div></div>
        <div className="card" style={{ margin: 20 }}>
          <div className="card-body" style={{ textAlign: "center", padding: 40 }}>
            <I.alerts size={32} style={{ color: "var(--err)" }}/>
            <div style={{ marginTop: 12, color: "var(--err)", fontWeight: 600 }}>Cannot reach {device.hostname}</div>
            <div className="fg-3 text-sm" style={{ marginTop: 6 }}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <div className="sub mono">{device.hostname} · {device.model || "Juniper"} · {device.firmware || "—"}</div>
        </div>
        <div className="actions">
          <button className="btn ghost"><I.download size={14}/> Export</button>
          <Pill kind="ok" dot>live · 5s</Pill>
          <button className="btn primary" onClick={() => setRoute("config")}><I.plus size={14}/> New Config</button>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid cols-4 mb">
        {stats.map((s, i) => (
          <div className="card" key={i}>
            <div className="stat">
              <div className="label">{s.label}</div>
              <div className="value">{s.value}</div>
            </div>
            <div style={{ padding: "0 8px 8px" }}>
              <Sparkline data={s.data} color={s.color} height={42}/>
            </div>
          </div>
        ))}
      </div>

      {/* Traffic chart + health */}
      <div className="grid cols-12 mb">
        <div className="card col-8">
          <div className="card-head">
            <div className="title">Aggregate traffic</div>
            <div className="sub">live · 5s resolution · last 5 min</div>
          </div>
          <div className="card-body">
            <AreaChart
              series={[
                { name: "ingress", data: rxSeries, color: "var(--chart-1)" },
                { name: "egress",  data: txSeries, color: "var(--chart-2)" },
              ]}
              height={240} yUnit="bps"
            />
          </div>
        </div>
        <div className="card col-4">
          <div className="card-head">
            <div className="title">Health</div>
            <div className="sub">live</div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <HealthBar label="CPU"         value={cpu}  unit="%" icon={I.cpu}   warn={70} err={85}/>
            <HealthBar label="Memory"      value={mem}  unit="%" icon={I.cpu}   warn={70} err={85}/>
            <HealthBar label="Temperature" value={temp} unit="°C" icon={I.thermo} max={80} warn={65} err={75}/>
            <HealthBar label="Fan"         value={fanPct} unit="%" icon={I.fan}  warn={90}/>
            <div className="divider"/>
            {psus.length > 0 ? psus.slice(0,2).map((p, i) => (
              <div key={i} className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
                <span className="fg-2">{p.name}</span>
                <Pill kind={p.status === "OK" ? "ok" : "err"} dot>
                  {p.watts ? `${p.watts}W` : p.status}
                  {p.volts ? ` · ${p.volts}V` : ""}
                </Pill>
              </div>
            )) : (
              <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
                <span className="fg-2">PSU</span><Pill kind="ok" dot>OK</Pill>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top links + routing */}
      <div className="grid cols-12 mb">
        <div className="card col-7">
          <div className="card-head">
            <div className="title">Top links by utilization</div>
            <div className="sub">{data?.interfaces_up ?? "—"} of {data?.interfaces_total ?? "—"} active · live</div>
            <div className="actions"><button className="btn ghost" onClick={() => setRoute("interfaces")}>View all <I.chevron size={12}/></button></div>
          </div>
          <div className="card-body tight">
            {topLinks.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--fg-3)" }}>No interface data yet</div>
            ) : (
              <table className="data">
                <thead>
                  <tr><th>Interface</th><th>IP / Info</th><th>Util</th><th>Rate (RX)</th><th>State</th></tr>
                </thead>
                <tbody>
                  {topLinks.map(l => (
                    <tr key={l.name}>
                      <td className="mono">{l.name}</td>
                      <td className="fg-2">{l.desc || "—"}</td>
                      <td><UtilBar pct={l.util}/></td>
                      <td className="mono">{l.rate}</td>
                      <td><Pill kind={l.state} dot>{l.stateLabel}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card col-5">
          <div className="card-head">
            <div className="title">Routing protocols</div>
            <div className="actions"><button className="btn ghost" onClick={() => setRoute("routing")}>Manage <I.chevron size={12}/></button></div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <ProtoRow icon={I.ospf} name="OSPF"
              sub={`${ospfNbrs} neighbor${ospfNbrs !== 1 ? "s" : ""} · ${ospfFull} full`}
              right={<Pill kind={ospfFull > 0 ? "ok" : "warn"} dot>{ospfFull > 0 ? `full · adj ${ospfFull}/${ospfNbrs}` : "no neighbors"}</Pill>}/>
            <ProtoRow icon={I.bgp} name="BGP"
              sub={`AS ${bgpAs} · ${bgpPeers} peer${bgpPeers !== 1 ? "s" : ""}`}
              right={<Pill kind={bgpEst > 0 ? "ok" : "warn"} dot>{bgpEst > 0 ? "established" : "no peers"}</Pill>}/>
            <ProtoRow icon={I.routing} name="Static"
              sub="static routes"
              right={<Pill>—</Pill>}/>
            <div className="divider"/>
            <div className="kv-list">
              <div className="k">RIB entries</div><div className="v">{ribActive.toLocaleString()}</div>
              <div className="k">interfaces up</div><div className="v">{data?.interfaces_up ?? "—"} / {data?.interfaces_total ?? "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent events */}
      <div className="grid cols-12">
        <div className="card col-12">
          <div className="card-head">
            <div className="title">Recent events</div>
            <div className="sub">live · from syslog</div>
            <div className="actions"><button className="btn ghost" onClick={() => setRoute("logs")}>Open Logs <I.chevron size={12}/></button></div>
          </div>
          <div className="card-body tight">
            {recentEvents.length === 0 ? (
              <div style={{ padding: 14, color: "var(--fg-3)", textAlign: "center" }}>No recent events</div>
            ) : (
              recentEvents.slice(0, 8).map((e, i) => (
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
    </div>
  );
}

function HealthBar({ label, value, unit, icon: Ic, max = 100, warn = 70, err = 85 }) {
  const pct = Math.min(100, (value / max) * 100);
  const kind = value >= err ? "err" : value >= warn ? "warn" : "ok";
  const color = `var(--${kind === "ok" ? "ok" : kind})`;
  return (
    <div>
      <div className="row" style={{ marginBottom: 4 }}>
        <Ic size={14}/><span className="fg-2 text-sm">{label}</span>
        <span className="spacer"/>
        <span className="mono text-sm" style={{ fontWeight: 500 }}>{value}{unit}</span>
      </div>
      <div style={{ height: 6, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 600ms ease, background 200ms" }}/>
      </div>
    </div>
  );
}

function UtilBar({ pct }) {
  const kind = pct > 80 ? "err" : pct > 60 ? "warn" : "ok";
  const color = `var(--${kind === "ok" ? "ok" : kind})`;
  return (
    <div className="row" style={{ gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 4, background: "var(--bg-3)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }}/>
      </div>
      <span className="mono text-xs" style={{ width: 32, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function ProtoRow({ icon: Ic, name, sub, right }) {
  return (
    <div className="row" style={{ padding: "6px 0" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
        <Ic size={16}/>
      </div>
      <div><div style={{ fontWeight: 500 }}>{name}</div><div className="fg-3 text-xs mono">{sub}</div></div>
      <div style={{ marginLeft: "auto" }}>{right}</div>
    </div>
  );
}

window.Dashboard = Dashboard;

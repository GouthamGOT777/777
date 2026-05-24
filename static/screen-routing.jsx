/* global React, I, Pill, useRouterPoll */

function Routing({ device, openWizard }) {
  const [tab, setTab] = React.useState("ospf");
  const { data, loading, error } = useRouterPoll(device.id, "routing", 10000);

  const ospf     = data?.ospf    || { neighbors: [], neighbor_count: 0, full_count: 0 };
  const bgp      = data?.bgp     || { local_as: "—", router_id: "—", peers: [], peer_count: 0, established_count: 0 };
  const rib      = data?.rib     || { inet_0: {}, tables: {} };
  const staticRt = data?.static_routes || [];
  const inet0    = rib.inet_0 || {};

  if (loading && !data) {
    return (
      <div className="page">
        <div className="page-head"><div><h1>Routing</h1></div></div>
        <div style={{ padding: 60, textAlign: "center", color: "var(--fg-3)" }}>
          <I.refresh size={32}/><div style={{ marginTop: 12 }}>Loading routing data…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Routing</h1>
          <div className="sub mono">router-id {bgp.router_id} · AS {bgp.local_as} · live 10s</div>
        </div>
        <div className="actions">
          <button className="btn ghost"><I.download size={14}/> Export RIB</button>
          <Pill kind="ok" dot>live</Pill>
          <button className="btn primary" onClick={() => openWizard("ospf")}><I.plus size={14}/> Add protocol</button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid cols-4 mb">
        <SummaryTile icon={I.ospf} name="OSPF" state={ospf.full_count > 0 ? "ok" : "warn"} lines={[
          ["neighbors", `${ospf.neighbor_count}`],
          ["full adj",  `${ospf.full_count} / ${ospf.neighbor_count}`],
        ]}/>
        <SummaryTile icon={I.bgp} name="BGP" state={bgp.established_count > 0 ? "ok" : "warn"} lines={[
          ["local AS", bgp.local_as],
          ["peers",    `${bgp.peer_count} (${bgp.established_count} est.)`],
        ]}/>
        <SummaryTile icon={I.routing} name="Static" state="ok" lines={[
          ["routes", `${staticRt.length} active`],
        ]}/>
        <SummaryTile icon={I.globe} name="RIB / FIB" state="ok" lines={[
          ["inet.0", `${(inet0.active || 0).toLocaleString()} active`],
          ["holddown", `${inet0.holddown || 0}`],
          ["hidden",   `${inet0.hidden || 0}`],
        ]}/>
      </div>

      {/* Tabs */}
      <div className="row mb" style={{ borderBottom: "1px solid var(--border)" }}>
        {[["ospf","OSPF"],["bgp","BGP"],["static","Static routes"],["rib","RIB / FIB"]].map(([id, lbl]) => (
          <div key={id} onClick={() => setTab(id)}
               style={{
                 padding: "10px 14px", cursor: "pointer",
                 borderBottom: tab === id ? "2px solid var(--accent)" : "2px solid transparent",
                 color: tab === id ? "var(--fg)" : "var(--fg-3)",
                 marginBottom: -1, fontWeight: 500,
               }}>{lbl}</div>
        ))}
      </div>

      {/* OSPF tab */}
      {tab === "ospf" && (
        <div className="card">
          <div className="card-head">
            <div className="title">OSPF neighbors</div>
            <div className="sub mono">{ospf.neighbor_count} total · {ospf.full_count} full adjacency · live from router</div>
          </div>
          <div className="card-body tight">
            {ospf.neighbors.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--fg-3)" }}>
                No OSPF neighbors — check protocol configuration
              </div>
            ) : (
              <table className="data">
                <thead><tr><th>Neighbor IP</th><th>Interface</th><th>State</th><th>Router ID</th><th>Area</th><th>Priority</th><th>Dead Timer</th></tr></thead>
                <tbody>
                  {ospf.neighbors.map((n, i) => (
                    <tr key={i}>
                      <td className="mono">{n.address}</td>
                      <td className="mono">{n.interface}</td>
                      <td><Pill kind={n.state === "Full" ? "ok" : "warn"} dot>{n.state}</Pill></td>
                      <td className="mono">{n.router_id}</td>
                      <td className="mono">{n.area}</td>
                      <td className="mono">{n.priority}</td>
                      <td className="mono">{n.dead_timer}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* BGP tab */}
      {tab === "bgp" && (
        <div className="card">
          <div className="card-head">
            <div className="title">BGP peers</div>
            <div className="sub mono">AS {bgp.local_as} · router-id {bgp.router_id} · live from router</div>
          </div>
          <div className="card-body tight">
            {bgp.peers.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--fg-3)" }}>No BGP peers configured</div>
            ) : (
              <table className="data">
                <thead><tr><th>Peer IP</th><th>AS</th><th>State</th><th>Uptime</th><th>Flaps</th><th>Prefixes Rcvd</th><th>Active</th></tr></thead>
                <tbody>
                  {bgp.peers.map((p, i) => (
                    <tr key={i}>
                      <td className="mono">{p.address}</td>
                      <td className="mono">{p.as}</td>
                      <td><Pill kind={"Establ" in (p.state||"") || p.state?.includes("Establ") ? "ok" : "warn"} dot>{p.state}</Pill></td>
                      <td className="mono">{p.uptime}</td>
                      <td className="mono">{p.flaps}</td>
                      <td className="mono">{(p.prefixes_received||0).toLocaleString()}</td>
                      <td className="mono">{(p.prefixes_active||0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Static routes tab */}
      {tab === "static" && (
        <div className="card">
          <div className="card-head">
            <div className="title">Static routes</div>
            <div className="sub mono">{staticRt.length} entries · live</div>
          </div>
          <div className="card-body tight">
            {staticRt.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--fg-3)" }}>No static routes</div>
            ) : (
              <table className="data">
                <thead><tr><th>Prefix</th><th>Protocol</th></tr></thead>
                <tbody>
                  {staticRt.map((r, i) => (
                    <tr key={i}>
                      <td className="mono">{r.prefix}</td>
                      <td><Pill>{r.protocol}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* RIB tab */}
      {tab === "rib" && (
        <div className="card">
          <div className="card-head">
            <div className="title">Routing tables</div>
            <div className="sub mono">from show route summary · live 10s</div>
          </div>
          <div className="card-body tight">
            {Object.keys(rib.tables || {}).length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--fg-3)" }}>No routing table data</div>
            ) : (
              <table className="data">
                <thead><tr><th>Table</th><th>Destinations</th><th>Active</th><th>Holddown</th><th>Hidden</th></tr></thead>
                <tbody>
                  {Object.entries(rib.tables).map(([name, t]) => (
                    <tr key={name}>
                      <td className="mono">{name}</td>
                      <td className="mono">{(t.destinations||0).toLocaleString()}</td>
                      <td className="mono">{(t.active||0).toLocaleString()}</td>
                      <td className="mono">{t.holddown||0}</td>
                      <td className="mono">{t.hidden||0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTile({ icon: Ic, name, state, lines }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="row" style={{ marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
            <Ic size={16}/>
          </div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div className="spacer"/>
          <Pill kind={state} dot>{state}</Pill>
        </div>
        <div className="kv-list">
          {lines.map(([k, v], i) => (
            <React.Fragment key={i}>
              <div className="k">{k}</div><div className="v">{v}</div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

window.Routing = Routing;

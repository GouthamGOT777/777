/* global React, I, Pill, Sparkline, AreaChart, formatBps,
          useRouterPoll, useRollingHistory */

function Interfaces({ device }) {
  const [filter, setFilter] = React.useState("all");
  const [selected, setSelected] = React.useState(null);
  const { data, loading, error } = useRouterPoll(device.id, "interfaces", 5000);

  const ifaces = data?.interfaces || [];

  // Store per-interface rolling histories (keyed by name)
  const [histories, setHistories] = React.useState({});
  React.useEffect(() => {
    if (!ifaces.length) return;
    setHistories(prev => {
      const next = { ...prev };
      ifaces.forEach(i => {
        if (!next[i.name]) {
          next[i.name] = { rx: new Array(30).fill(0), tx: new Array(30).fill(0) };
        }
        next[i.name] = {
          rx: [...next[i.name].rx.slice(-29), i.rx_bps || 0],
          tx: [...next[i.name].tx.slice(-29), i.tx_bps || 0],
        };
      });
      return next;
    });
    // Auto-select first interface
    if (!selected && ifaces.length > 0) setSelected(ifaces[0].name);
  }, [ifaces]);

  const filtered = ifaces.filter(it => {
    if (filter === "up")   return it.oper_status === "up";
    if (filter === "down") return it.oper_status !== "up";
    if (filter === "sfp")  return /^(xe|et)-/.test(it.name);
    return true;
  });

  const sel = ifaces.find(i => i.name === selected);
  const upCount   = ifaces.filter(i => i.oper_status === "up").length;
  const downCount = ifaces.filter(i => i.oper_status !== "up").length;

  function stateKind(iface) {
    if (iface.oper_status === "up") return "ok";
    if (iface.admin_status === "down") return "warn";
    return "err";
  }

  function stateLabel(iface) {
    if (iface.oper_status === "up") return "up";
    if (iface.admin_status === "down") return "admin-down";
    return "down";
  }

  if (loading && !data) {
    return (
      <div className="page">
        <div className="page-head"><div><h1>Interfaces</h1></div></div>
        <div style={{ padding: 60, textAlign: "center", color: "var(--fg-3)" }}>
          <I.refresh size={32}/><div style={{ marginTop: 12 }}>Loading interface data…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Interfaces</h1>
          <div className="sub mono">{ifaces.length} ports · {upCount} up · {downCount} down · live 5s</div>
        </div>
        <div className="actions">
          <div className="row" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 2 }}>
            {[["all","All"],["up","Up"],["down","Down"],["sfp","SFP+"]].map(([id, lbl]) => (
              <button key={id} className={`btn ${filter === id ? "" : "ghost"} text-sm`}
                      style={{ border: "none", padding: "4px 10px" }}
                      onClick={() => setFilter(id)}>{lbl}</button>
            ))}
          </div>
          <Pill kind="ok" dot>live · 5s</Pill>
        </div>
      </div>

      {error && !data && (
        <div className="card mb" style={{ borderColor: "var(--err)" }}>
          <div className="card-body" style={{ color: "var(--err)" }}>Cannot load interfaces: {error}</div>
        </div>
      )}

      <div className="grid cols-12">
        <div className="card col-7">
          <div className="card-head">
            <div className="title">All interfaces</div>
            <div className="sub mono">live · from show interfaces extensive</div>
          </div>
          <div className="card-body tight" style={{ maxHeight: 580, overflow: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--fg-3)" }}>No interfaces match filter</div>
            ) : (
              <table className="data">
                <thead>
                  <tr><th>Name</th><th>Type</th><th>Description</th><th>State</th><th>RX / TX</th><th>Trend</th></tr>
                </thead>
                <tbody>
                  {filtered.map(it => {
                    const hist = histories[it.name] || { rx: new Array(30).fill(0) };
                    const kind = stateKind(it);
                    return (
                      <tr key={it.name}
                          onClick={() => setSelected(it.name)}
                          style={{ cursor: "pointer", background: selected === it.name ? "oklch(from var(--accent) l c h / 0.08)" : "" }}>
                        <td className="mono" style={{ fontWeight: 500 }}>{it.name}</td>
                        <td className="fg-2 text-xs">{/^(xe|et)-/.test(it.name) ? "SFP+" : "1GE-T"}</td>
                        <td className="fg-2">{it.description || "—"}</td>
                        <td><Pill kind={kind} dot>{stateLabel(it)}</Pill></td>
                        <td className="mono text-xs">
                          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                            <span>↓ {formatBps(it.rx_bps)}</span>
                            <span className="fg-3">↑ {formatBps(it.tx_bps)}</span>
                          </div>
                        </td>
                        <td style={{ width: 110 }}>
                          <Sparkline data={hist.rx}
                                     color={it.rx_bps > 8e9 ? "var(--err)" : it.rx_bps > 5e9 ? "var(--warn)" : "var(--chart-1)"}
                                     height={24}/>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card col-5" style={{ alignSelf: "flex-start", position: "sticky", top: 20 }}>
          <div className="card-head">
            <div className="title mono">{sel ? sel.name : "—"}</div>
            <div className="sub">{sel ? (sel.description || "no description") : "select an interface"}</div>
            {sel && (
              <div className="actions">
                <button className="icon-btn" data-tip="Reset counters"><I.refresh/></button>
                <button className="icon-btn" data-tip="Edit"><I.edit/></button>
              </div>
            )}
          </div>
          <div className="card-body">
            {sel ? <IfaceDetail iface={sel} hist={histories[sel.name] || { rx: new Array(60).fill(0), tx: new Array(60).fill(0) }}/> : (
              <div style={{ textAlign: "center", padding: 40, color: "var(--fg-3)" }}>
                <I.ports size={32}/><div style={{ marginTop: 12 }}>Click an interface to see live stats</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IfaceDetail({ iface, hist }) {
  const [editing, setEditing] = React.useState(false);

  const kind = iface.oper_status === "up" ? "ok" : iface.admin_status === "down" ? "warn" : "err";
  const label = iface.oper_status === "up" ? "up" : iface.admin_status === "down" ? "admin-down" : "down";

  return (
    <div>
      <div className="grid cols-3" style={{ marginBottom: 14 }}>
        <KV label="STATE" value={<Pill kind={kind} dot>{label}</Pill>}/>
        <KV label="SPEED" value={iface.speed || "—"}/>
        <KV label="MTU"   value={iface.mtu}/>
        <KV label="MAC"   value={iface.mac || "—"}/>
        <KV label="ADMIN" value={iface.admin_status}/>
        <KV label="OPER"  value={iface.oper_status}/>
      </div>

      <button className={`btn ${editing ? "primary" : ""}`}
              style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}
              onClick={() => setEditing(!editing)}>
        <I.edit size={14}/> {editing ? "Close editor" : "Edit settings"}
      </button>
      {editing && <IfaceEditor iface={iface} onClose={() => setEditing(false)}/>}

      <div className="text-xs fg-3 mono mb" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Throughput · live</div>
      <AreaChart series={[
        { name: "rx", data: hist.rx, color: "var(--chart-1)" },
        { name: "tx", data: hist.tx, color: "var(--chart-2)" },
      ]} height={140} yUnit="bps"/>

      <div className="divider"/>
      <div className="text-xs fg-3 mono mb" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Counters</div>
      <div className="kv-list">
        <div className="k">rx bps</div><div className="v">{formatBps(iface.rx_bps)}</div>
        <div className="k">tx bps</div><div className="v">{formatBps(iface.tx_bps)}</div>
        <div className="k">rx packets</div><div className="v">{(iface.rx_packets||0).toLocaleString()}</div>
        <div className="k">tx packets</div><div className="v">{(iface.tx_packets||0).toLocaleString()}</div>
        <div className="k">rx bytes</div><div className="v">{(iface.rx_bytes||0).toLocaleString()}</div>
        <div className="k">tx bytes</div><div className="v">{(iface.tx_bytes||0).toLocaleString()}</div>
        <div className="k">rx errors</div>
        <div className="v" style={{ color: iface.rx_errors ? "var(--err)" : "" }}>{iface.rx_errors || 0}</div>
        <div className="k">tx errors</div>
        <div className="v" style={{ color: iface.tx_errors ? "var(--err)" : "" }}>{iface.tx_errors || 0}</div>
        <div className="k">last flap</div><div className="v">{iface.last_flap || "—"}</div>
      </div>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div>
      <div className="text-xs fg-3 mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>{value}</div>
    </div>
  );
}

function IfaceEditor({ iface, onClose }) {
  const isSfp = /^(xe|et)-/.test(iface.name);
  const speedOpts = isSfp
    ? [
        { v: "auto",       l: "auto-negotiate" },
        { v: "1g-full",    l: "1 Gb/s · full" },
        { v: "10g-full",   l: "10 Gb/s · full (default)" },
      ]
    : [
        { v: "auto",       l: "auto-negotiate (default)" },
        { v: "10-half",    l: "10 Mb/s · half" },
        { v: "10-full",    l: "10 Mb/s · full" },
        { v: "100-half",   l: "100 Mb/s · half" },
        { v: "100-full",   l: "100 Mb/s · full" },
        { v: "1000-full",  l: "1 Gb/s · full" },
      ];

  const initial = React.useMemo(() => ({
    description: iface.description || "",
    adminUp: iface.admin_status !== "down",
    speed: "auto",
    mtu: String(iface.mtu || 1500),
    flowControl: "off",
  }), [iface.name]);

  const [form, setForm] = React.useState(initial);
  React.useEffect(() => setForm(initial), [initial]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const dirty = Object.keys(form).some(k => form[k] !== initial[k]);

  // Juniper CLI diff
  const cli = React.useMemo(() => {
    const lines = [];
    const ifPart = iface.name.replace("-", " unit ").replace(/(\.\d+)$/, "");
    lines.push(`set interfaces ${iface.name}`);
    if (form.description !== initial.description)
      lines.push(`+ set interfaces ${iface.name} description "${form.description}"`);
    if (!form.adminUp && initial.adminUp)
      lines.push(`+ set interfaces ${iface.name} disable`);
    if (form.adminUp && !initial.adminUp)
      lines.push(`+ delete interfaces ${iface.name} disable`);
    if (form.speed !== initial.speed) {
      if (!isSfp) lines.push(`+ set interfaces ${iface.name} ether-options speed ${form.speed.split("-")[0]}`);
    }
    if (form.mtu !== initial.mtu)
      lines.push(`+ set interfaces ${iface.name} mtu ${form.mtu}`);
    if (lines.length <= 1) return [];
    lines.push(`commit comment "edit ${iface.name}"`);
    return lines;
  }, [form, initial, iface.name, isSfp]);

  return (
    <div className="card" style={{ background: "var(--bg-2)", marginBottom: 14, borderColor: "var(--accent)" }}>
      <div className="card-body">
        <div className="field">
          <label>Description</label>
          <input type="text" value={form.description} onChange={e => set("description", e.target.value)}/>
        </div>
        <div className="field">
          <label>Speed &amp; duplex</label>
          <select value={form.speed} onChange={e => set("speed", e.target.value)}>
            {speedOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
        <div className="grid cols-2">
          <div className="field">
            <label>MTU (bytes)</label>
            <input type="number" value={form.mtu} onChange={e => set("mtu", e.target.value)} min="64" max="9216"/>
          </div>
          <div className="field">
            <label>Flow control</label>
            <select value={form.flowControl} onChange={e => set("flowControl", e.target.value)}>
              <option value="off">off</option>
              <option value="on">on (rx + tx)</option>
            </select>
          </div>
        </div>
        <label className="row" style={{ gap: 6, cursor: "pointer", fontSize: 12, marginBottom: 12 }}>
          <input type="checkbox" checked={form.adminUp} onChange={e => set("adminUp", e.target.checked)}/>
          <span>Admin up (no shutdown)</span>
        </label>
        <div className="text-xs fg-3 mono mb" style={{ textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
          <I.terminal size={12}/> Juniper CLI diff {dirty && <Pill kind="info">{cli.length} lines</Pill>}
        </div>
        <div style={{ background: "oklch(0.1 0.005 240)", color: "oklch(0.85 0.01 240)", padding: 10, borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.55, minHeight: 48 }}>
          {cli.length === 0
            ? <div style={{ color: "oklch(0.55 0.04 240)" }}>! no changes — modify a field above</div>
            : cli.map((l, i) => (
                <div key={i} style={{ color: l.startsWith("+") ? "oklch(0.78 0.16 155)" : l.startsWith("!") ? "oklch(0.55 0.04 240)" : "oklch(0.85 0.01 240)" }}>{l}</div>
              ))
          }
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn ghost" onClick={() => setForm(initial)} disabled={!dirty}>Reset</button>
          <span className="spacer"/>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!dirty}><I.save size={14}/> Apply</button>
        </div>
      </div>
    </div>
  );
}

window.Interfaces = Interfaces;

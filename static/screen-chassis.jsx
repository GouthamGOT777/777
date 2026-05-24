/* global React, I, Pill, Sparkline, AreaChart, useLiveSeries, formatBps,
          useRouterPoll, useRollingHistory */

function Chassis({ device, setRoute }) {
  const [selectedPort, setSelected] = React.useState(null);
  const { data, loading, error } = useRouterPoll(device.id, "chassis", 30000);
  const { data: ifaceData } = useRouterPoll(device.id, "interfaces", 5000);

  // Build port map from live interface data
  const ports = React.useMemo(() => {
    const ifaces = ifaceData?.interfaces || [];
    const copper = ifaces
      .filter(i => /^(ge|fe)-/.test(i.name))
      .map((iface, idx) => {
        const state = iface.oper_status === "up" ? "ok" : iface.admin_status === "down" ? "warn" : "err";
        return {
          name: iface.name,
          num: idx + 1,
          state,
          speed: iface.speed || "—",
          duplex: "full",
          mac: iface.mac || "—",
          vlan: "—",
          util: iface.rx_bps > 0 ? Math.min(99, Math.round((iface.rx_bps / 1e9) * 100)) : 0,
          errs: iface.rx_errors || 0,
          description: iface.description || "",
          rx_bps: iface.rx_bps || 0,
          tx_bps: iface.tx_bps || 0,
          rx_packets: iface.rx_packets || 0,
          tx_packets: iface.tx_packets || 0,
          last_flap: iface.last_flap || "—",
          mtu: String(iface.mtu || 1514),
        };
      });
    const sfp = ifaces
      .filter(i => /^(xe|et)-/.test(i.name))
      .map((iface, idx) => {
        const state = iface.oper_status === "up" ? "ok" : iface.admin_status === "down" ? "warn" : "err";
        return {
          name: iface.name,
          num: `${iface.name}`,
          state,
          speed: iface.speed || "—",
          duplex: "full",
          mac: iface.mac || "—",
          vlan: "trunk",
          util: iface.rx_bps > 0 ? Math.min(99, Math.round((iface.rx_bps / 10e9) * 100)) : 0,
          errs: iface.rx_errors || 0,
          description: iface.description || "",
          rx_bps: iface.rx_bps || 0,
          tx_bps: iface.tx_bps || 0,
          rx_packets: iface.rx_packets || 0,
          tx_packets: iface.tx_packets || 0,
          last_flap: iface.last_flap || "—",
          mtu: String(iface.mtu || 9214),
          optic: iface.optic ? {
            model: "SFP+",
            tx: iface.optic.tx_dbm !== undefined ? `${iface.optic.tx_dbm} dBm` : "—",
            rx: iface.optic.rx_dbm !== undefined ? `${iface.optic.rx_dbm} dBm` : "—",
            temp: iface.optic.temp_c !== undefined ? `${iface.optic.temp_c} °C` : "—",
          } : null,
        };
      });
    return { copper, sfp };
  }, [ifaceData]);

  // Hardware from chassis API
  const hardware = React.useMemo(() => {
    const hw = data?.hardware || [];
    if (hw.length) {
      return hw.slice(0, 8).map(h => ({
        slot: h.cls || "—",
        name: h.description || h.item,
        state: "ok",
        stateLabel: "present",
        part: h.part || "—",
        serial: h.serial || "—",
        rev: h.version || "—",
      }));
    }
    // Fallback from FPC
    const fpcs = data?.fpcs || [];
    return fpcs.map((f, i) => ({
      slot: `FPC-${f.slot}`,
      name: `Line card (slot ${f.slot})`,
      state: f.state === "Online" ? "ok" : "err",
      stateLabel: f.state,
      part: "—", serial: "—", rev: "—",
    }));
  }, [data]);

  const allPorts = [...(ports.copper || []), ...(ports.sfp || [])];
  const selPort = allPorts.find(p => p.name === selectedPort);

  // System LED states
  const temps = data?.environment?.temperatures || [];
  const fans  = data?.environment?.fans || [];
  const psus  = data?.environment?.psus || [];
  const tempOk = temps.every(t => t.status === "OK");
  const fanOk  = fans.every(f => f.status === "OK");
  const psuOk  = psus.every(p => p.status === "OK");

  if (loading && !data && !ifaceData) {
    return (
      <div className="page">
        <div className="page-head"><div><h1>Chassis</h1></div></div>
        <div style={{ padding: 60, textAlign: "center", color: "var(--fg-3)" }}>
          <I.refresh size={32}/><div style={{ marginTop: 12 }}>Loading chassis data…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Chassis</h1>
          <div className="sub mono">{device.model || "Juniper"} · S/N {device.serial || "—"} · {device.location || "—"}</div>
        </div>
        <div className="actions">
          <Pill kind="ok" dot>live · 30s</Pill>
          <button className="btn"><I.refresh size={14}/> Diagnostics</button>
        </div>
      </div>

      {/* Chassis face */}
      <div className="card mb">
        <div className="card-head">
          <div className="title">Front panel</div>
          <div className="sub">click any port for live detail · {allPorts.filter(p=>p.state==="ok").length}/{allPorts.length} up</div>
          <div className="actions">
            <div className="row" style={{ gap: 10, fontSize: 11, color: "var(--fg-3)" }}>
              <span className="row"><span className="dot ok"/> up</span>
              <span className="row"><span className="dot warn"/> admin-down</span>
              <span className="row"><span className="dot err"/> err</span>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="chassis">
            <div className="chassis-head">
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>
                  {device.model?.toUpperCase() || "JUNIPER ROUTER"}
                </div>
                <div className="model">{device.firmware || "—"}</div>
              </div>
              <div className="chassis-leds">
                <div className="row" style={{ gap: 12 }}>
                  {[
                    ["SYS",  true ],
                    ["RPS",  psuOk],
                    ["TEMP", tempOk],
                    ["FAN",  fanOk ],
                    ["BOOT", false ],
                  ].map(([t, on]) => (
                    <div className="chassis-led" key={t}>
                      <div className={`l ${on ? "" : "off"}`}></div>
                      <div className="t">{t}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Copper ports — two rows */}
            {ports.copper && ports.copper.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div className="port-grid">
                  {ports.copper.slice(0, Math.ceil(ports.copper.length / 2)).map(p => (
                    <Port key={p.name} p={p} selected={selectedPort === p.name} onClick={() => setSelected(p.name)}/>
                  ))}
                </div>
                <div className="port-grid">
                  {ports.copper.slice(Math.ceil(ports.copper.length / 2)).map(p => (
                    <Port key={p.name} p={p} selected={selectedPort === p.name} onClick={() => setSelected(p.name)}/>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: "20px 0", color: "var(--fg-3)", fontSize: 12 }}>
                No copper interfaces detected — connect to router to load live port data
              </div>
            )}

            {/* SFP+ ports */}
            {ports.sfp && ports.sfp.length > 0 && (
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <div style={{ flex: "0 0 auto", fontSize: 10, color: "oklch(0.7 0.01 240)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>SFP+</div>
                <div className="port-grid sfp" style={{ flex: 1, maxWidth: 360 }}>
                  {ports.sfp.map(p => (
                    <Port key={p.name} p={p} sfp selected={selectedPort === p.name} onClick={() => setSelected(p.name)}/>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail + hardware */}
      <div className="grid cols-12">
        <div className="card col-7">
          <div className="card-head">
            <div className="title">{selectedPort ? `Port ${selectedPort}` : "Select a port"}</div>
            {selectedPort && <div className="sub">live interface metrics</div>}
            {selectedPort && (
              <div className="actions">
                <button className="btn ghost" onClick={() => setRoute("interfaces")}>Open interface <I.chevron size={12}/></button>
              </div>
            )}
          </div>
          <div className="card-body">
            {selPort ? <PortDetail port={selPort} routerId={device.id}/> : <PortHint/>}
          </div>
        </div>

        <div className="card col-5">
          <div className="card-head">
            <div className="title">Hardware modules</div>
            <div className="sub">from chassis hardware · live 30s</div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {hardware.length === 0 ? (
              <div style={{ color: "var(--fg-3)", padding: 20, textAlign: "center" }}>No hardware data</div>
            ) : (
              hardware.map((h, idx) => (
                <div key={idx} className="config-block">
                  <div className="config-block-head">
                    <span style={{ width: 60, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{h.slot}</span>
                    <span className="name">{h.name}</span>
                    <span className="spacer"/>
                    <Pill kind={h.state} dot>{h.stateLabel}</Pill>
                  </div>
                  <div className="config-block-body">
                    <div className="kv-list">
                      <div className="k">part-no</div><div className="v">{h.part}</div>
                      <div className="k">serial</div><div className="v">{h.serial}</div>
                      <div className="k">rev</div><div className="v">{h.rev}</div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Environment summary */}
            {temps.length > 0 && (
              <>
                <div className="divider"/>
                <div className="text-xs fg-3 mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Environment</div>
                {temps.map((t, i) => (
                  <div key={i} className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
                    <span className="fg-2">{t.name}</span>
                    <Pill kind={t.status === "OK" ? "ok" : "err"} dot>{t.temp_c}°C</Pill>
                  </div>
                ))}
                {fans.map((f, i) => (
                  <div key={i} className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
                    <span className="fg-2">{f.name}</span>
                    <Pill kind={f.status === "OK" ? "ok" : "err"} dot>
                      {f.rpm ? `${f.rpm} RPM` : f.status}
                    </Pill>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Port({ p, selected, onClick, sfp }) {
  return (
    <div className={`port ${sfp ? "sfp" : ""} ${selected ? "selected" : ""}`}
         onClick={onClick} data-tip={`${p.name} · ${p.state}`}>
      <div className={`led ${p.state}`}/>
      <div className="jack"/>
      <div className="num">{typeof p.num === "number" ? p.num : p.name.split("/").pop()}</div>
    </div>
  );
}

function PortHint() {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--fg-3)" }}>
      <I.ports size={40}/>
      <div style={{ marginTop: 12 }}>Click any port on the front panel to see live PHY, optic and counter data.</div>
    </div>
  );
}

function PortDetail({ port, routerId }) {
  // Build rolling traffic history from the port's live rates
  const rxSeries = useRollingHistory(port.rx_bps, 60);
  const txSeries = useRollingHistory(port.tx_bps, 60);

  return (
    <div>
      <div className="grid cols-3" style={{ marginBottom: 14 }}>
        <KV label="STATE" value={<Pill kind={port.state} dot>{port.state}</Pill>}/>
        <KV label="SPEED" value={port.speed}/>
        <KV label="MTU"   value={port.mtu}/>
        <KV label="MAC"   value={port.mac}/>
        <KV label="DESC"  value={port.description || "—"}/>
        <KV label="LAST FLAP" value={port.last_flap}/>
      </div>
      <div className="grid cols-2">
        <div>
          <div className="text-xs fg-3 mono mb" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Throughput · live</div>
          <AreaChart
            series={[
              { name: "rx", data: rxSeries, color: "var(--chart-1)" },
              { name: "tx", data: txSeries, color: "var(--chart-2)" },
            ]}
            height={140} yUnit="bps"
          />
        </div>
        <div>
          <div className="text-xs fg-3 mono mb" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Counters</div>
          <div className="kv-list">
            <div className="k">rx packets</div><div className="v">{port.rx_packets.toLocaleString()}</div>
            <div className="k">tx packets</div><div className="v">{port.tx_packets.toLocaleString()}</div>
            <div className="k">rx bps</div><div className="v">{formatBps(port.rx_bps)}</div>
            <div className="k">tx bps</div><div className="v">{formatBps(port.tx_bps)}</div>
            <div className="k">rx errors</div>
            <div className="v" style={{ color: port.errs ? "var(--err)" : "" }}>{port.errs}</div>
          </div>
          {port.optic && (
            <>
              <div className="divider"/>
              <div className="text-xs fg-3 mono mb" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Optic (DOM)</div>
              <div className="kv-list">
                <div className="k">model</div><div className="v">{port.optic.model}</div>
                <div className="k">tx power</div><div className="v">{port.optic.tx}</div>
                <div className="k">rx power</div><div className="v">{port.optic.rx}</div>
                <div className="k">temp</div><div className="v">{port.optic.temp}</div>
              </div>
            </>
          )}
        </div>
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

window.Chassis = Chassis;

/* global React, I, Pill */

// ============ OSPF / Add-config wizard ============
function Wizard({ kind, onClose, onCommit }) {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({
    process: "1",
    routerId: "10.0.0.1",
    refBw: 100000,
    networks: [
      { net: "10.0.0.0/30", area: "0.0.0.0" },
      { net: "10.0.1.0/30", area: "0.0.0.1" },
    ],
    interfaces: ["Te1/0", "Te1/1"],
    auth: "md5",
    authKey: "",
    hello: 10,
    dead: 40,
    logAdj: true,
  });
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const steps = ["Process", "Areas & networks", "Interfaces & auth", "Review & commit"];

  // generate live CLI preview
  const cli = React.useMemo(() => generateOspfCli(data), [data]);

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "oklch(from var(--accent) l c h / 0.16)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I.ospf/>
          </div>
          <div>
            <div className="title">Add OSPF configuration</div>
            <div className="text-xs fg-3 mono">guided wizard · generates CLI in background</div>
          </div>
          <div className="spacer"/>
          <button className="icon-btn" onClick={onClose}><I.x/></button>
        </div>

        <div className="modal-body" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 18, padding: 0 }}>
          <div style={{ padding: "18px 20px", borderRight: "1px solid var(--border)", minWidth: 0 }}>
            <div className="steps mb">
              {steps.map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`step ${i === step ? "active" : i < step ? "done" : ""}`}>
                    <span className="n">{i < step ? "✓" : i + 1}</span>
                    <span>{s}</span>
                  </div>
                  {i < steps.length - 1 && <div className="step-sep"/>}
                </React.Fragment>
              ))}
            </div>

            {step === 0 && <StepProcess data={data} set={set}/>}
            {step === 1 && <StepNetworks data={data} set={set}/>}
            {step === 2 && <StepInterfaces data={data} set={set}/>}
            {step === 3 && <StepReview data={data} cli={cli}/>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", background: "oklch(0.1 0.005 240)", color: "oklch(0.85 0.01 240)", minWidth: 0 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid oklch(0.25 0.015 240)", color: "oklch(0.75 0.01 240)", fontFamily: "var(--font-mono)", fontSize: 11, display: "flex", alignItems: "center", gap: 8 }}>
              <I.terminal size={12}/> generated config — live
              <span className="spacer"/>
              <span style={{ color: "oklch(0.78 0.16 155)" }}>{cli.length} lines</span>
            </div>
            <div style={{ padding: "12px 14px", overflow: "auto", flex: 1, fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.55 }}>
              {cli.map((l, i) => (
                <div key={i} style={{
                  color: l.startsWith("!") ? "oklch(0.55 0.04 240)" :
                         l.startsWith("+") ? "oklch(0.78 0.16 155)" :
                         l.startsWith("-") ? "oklch(0.7 0.21 25)" :
                         "oklch(0.85 0.01 240)"
                }}>{l || "\u00a0"}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <div className="right">
            {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>Back</button>}
            {step < steps.length - 1 && <button className="btn primary" onClick={() => setStep(step + 1)}>Next</button>}
            {step === steps.length - 1 && <button className="btn primary" onClick={() => { onCommit(cli); onClose(); }}><I.save size={14}/> Commit configuration</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepProcess({ data, set }) {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Process settings</h3>
      <div className="grid cols-2">
        <div className="field">
          <label>Process ID</label>
          <input type="text" value={data.process} onChange={(e) => set("process", e.target.value)}/>
          <div className="hint">A numeric tag (1–65535) that identifies this OSPF instance on the device.</div>
        </div>
        <div className="field">
          <label>Router ID</label>
          <input type="text" value={data.routerId} onChange={(e) => set("routerId", e.target.value)}/>
          <div className="hint">Defaults to highest loopback. Use a stable IP.</div>
        </div>
        <div className="field">
          <label>Reference bandwidth (Mbps)</label>
          <input type="number" value={data.refBw} onChange={(e) => set("refBw", +e.target.value)}/>
          <div className="hint">Used to auto-compute interface cost. 100000 = 100G reference.</div>
        </div>
        <div className="field">
          <label>Log adjacency changes</label>
          <select value={data.logAdj ? "yes" : "no"} onChange={(e) => set("logAdj", e.target.value === "yes")}>
            <option value="yes">Yes — detail</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function StepNetworks({ data, set }) {
  const update = (i, k, v) => set("networks", data.networks.map((n, ni) => ni === i ? { ...n, [k]: v } : n));
  const remove = (i) => set("networks", data.networks.filter((_, ni) => ni !== i));
  const add = () => set("networks", [...data.networks, { net: "0.0.0.0/0", area: "0.0.0.0" }]);
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Areas & networks</h3>
      <div className="hint mb">Which prefixes participate in OSPF, and which area each belongs to.</div>
      {data.networks.map((n, i) => (
        <div key={i} className="row mb" style={{ gap: 8 }}>
          <input type="text" value={n.net} onChange={(e) => update(i, "net", e.target.value)} placeholder="10.0.0.0/24" style={{ flex: 1 }}/>
          <span className="fg-3 mono">→ area</span>
          <input type="text" value={n.area} onChange={(e) => update(i, "area", e.target.value)} style={{ width: 130 }}/>
          <button className="icon-btn" onClick={() => remove(i)}><I.trash/></button>
        </div>
      ))}
      <button className="btn" onClick={add}><I.plus size={14}/> Add network</button>
    </div>
  );
}

function StepInterfaces({ data, set }) {
  const toggle = (n) => set("interfaces", data.interfaces.includes(n) ? data.interfaces.filter(x => x !== n) : [...data.interfaces, n]);
  const avail = ["Lo0","Te1/0","Te1/1","Te1/2","Te1/3","Gi0/1","Gi0/2","Gi0/3","Gi0/4","Gi0/5","Gi0/6"];
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Interfaces & authentication</h3>

      <div className="text-xs fg-3 mono mb" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>participating interfaces</div>
      <div className="row mb" style={{ flexWrap: "wrap", gap: 6 }}>
        {avail.map((n) => (
          <button key={n} className={`btn ${data.interfaces.includes(n) ? "primary" : ""} mono text-sm`} onClick={() => toggle(n)}>
            {data.interfaces.includes(n) ? <I.check size={12}/> : <I.plus size={12}/>}
            {n}
          </button>
        ))}
      </div>

      <div className="divider"/>

      <div className="grid cols-2">
        <div className="field">
          <label>Authentication</label>
          <select value={data.auth} onChange={(e) => { const v = e.target.value; set("auth", v); }}>
            <option value="none">None</option>
            <option value="text">Plain-text</option>
            <option value="md5">MD5 (recommended)</option>
            <option value="sha">HMAC-SHA-256</option>
          </select>
        </div>
        {data.auth !== "none" && (
          <div className="field">
            <label>Key</label>
            <input type="text" value={data.authKey} onChange={(e) => set("authKey", e.target.value)} placeholder="shared-secret"/>
          </div>
        )}
        <div className="field">
          <label>Hello interval (s)</label>
          <input type="number" value={data.hello} onChange={(e) => set("hello", +e.target.value)}/>
        </div>
        <div className="field">
          <label>Dead interval (s)</label>
          <input type="number" value={data.dead} onChange={(e) => set("dead", +e.target.value)}/>
        </div>
      </div>
    </div>
  );
}

function StepReview({ data, cli }) {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Review & commit</h3>
      <div className="hint mb">Below is a summary of what will change. The actual CLI is shown live on the right.</div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-body">
          <div className="kv-list">
            <div className="k">process</div><div className="v">{data.process}</div>
            <div className="k">router-id</div><div className="v">{data.routerId}</div>
            <div className="k">reference-bw</div><div className="v">{data.refBw} Mbps</div>
            <div className="k">log adj changes</div><div className="v">{data.logAdj ? "detail" : "no"}</div>
            <div className="k">authentication</div><div className="v">{data.auth}{data.auth !== "none" && data.authKey ? " · key set" : ""}</div>
            <div className="k">timers</div><div className="v">hello {data.hello}s · dead {data.dead}s</div>
            <div className="k">networks</div><div className="v">{data.networks.length}</div>
            <div className="k">interfaces</div><div className="v">{data.interfaces.join(", ") || "—"}</div>
          </div>
        </div>
      </div>

      <div className="row" style={{ background: "oklch(from var(--info) l c h / 0.1)", border: "1px solid oklch(from var(--info) l c h / 0.3)", color: "var(--info)", padding: "10px 12px", borderRadius: "var(--radius)", fontSize: 12 }}>
        <I.alerts size={14}/>
        <span>Commit will generate {cli.length} CLI lines and apply atomically. Rollback is available for 10 minutes after commit.</span>
      </div>
    </div>
  );
}

function generateOspfCli(d) {
  const out = [];
  out.push(`! Add OSPF process ${d.process}`);
  out.push(`router ospf ${d.process}`);
  out.push(`+ router-id ${d.routerId}`);
  out.push(`+ auto-cost reference-bandwidth ${d.refBw}`);
  if (d.logAdj) out.push(`+ log-adjacency-changes detail`);
  d.networks.forEach((n) => {
    const [base, mask] = n.net.split("/");
    const wc = maskToWildcard(parseInt(mask));
    out.push(`+ network ${base} ${wc} area ${n.area}`);
  });
  out.push(`exit`);
  out.push("");
  out.push(`! Per-interface configuration`);
  d.interfaces.forEach((i) => {
    out.push(`interface ${i}`);
    out.push(`+ ip ospf hello-interval ${d.hello}`);
    out.push(`+ ip ospf dead-interval ${d.dead}`);
    if (d.auth === "md5") {
      out.push(`+ ip ospf authentication message-digest`);
      out.push(`+ ip ospf message-digest-key 1 md5 ${d.authKey || "<key>"}`);
    } else if (d.auth === "text") {
      out.push(`+ ip ospf authentication`);
      out.push(`+ ip ospf authentication-key ${d.authKey || "<key>"}`);
    } else if (d.auth === "sha") {
      out.push(`+ ip ospf authentication key-chain OSPF-SHA256`);
    }
    out.push(`exit`);
  });
  out.push("");
  out.push(`! Apply atomically`);
  out.push(`commit comment "wizard: add ospf ${d.process}"`);
  return out;
}

function maskToWildcard(prefix) {
  const m = (0xffffffff << (32 - prefix)) >>> 0;
  const w = (~m) >>> 0;
  return [w >>> 24, (w >>> 16) & 0xff, (w >>> 8) & 0xff, w & 0xff].join(".");
}

window.Wizard = Wizard;

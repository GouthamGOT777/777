/* global React, I, Pill, useRouterPoll */

function Config({ openWizard, generatedCli }) {
  // Config screen doesn't know which device — get it from window context
  // We use a global event approach since Config doesn't receive device prop
  const [routerId, setRouterId] = React.useState(null);
  React.useEffect(() => {
    const handler = e => setRouterId(e.detail);
    window.addEventListener("__router_selected", handler);
    // Read current from global
    if (window.__currentRouterId) setRouterId(window.__currentRouterId);
    return () => window.removeEventListener("__router_selected", handler);
  }, []);

  const { data, loading, error } = useRouterPoll(routerId, "config", 60000);

  const raw = data?.raw || "";
  const sections = data?.sections || {};

  const [activeSection, setActiveSection] = React.useState(null);
  const [collapsed, setCollapsed] = React.useState({});
  const toggle = k => setCollapsed(c => ({ ...c, [k]: !c[k] }));
  const [sshOpen, setSshOpen] = React.useState(false);

  const sectionNames = Object.keys(sections);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Configuration</h1>
          <div className="sub mono">running config · live from router · 60s refresh</div>
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={() => openWizard("ospf")}><I.plus size={14}/> Add OSPF</button>
          <Pill kind="ok" dot>live · 60s</Pill>
        </div>
      </div>

      {loading && !data && (
        <div style={{ padding: 60, textAlign: "center", color: "var(--fg-3)" }}>
          <I.refresh size={32}/><div style={{ marginTop: 12 }}>Loading configuration…</div>
        </div>
      )}
      {error && !data && (
        <div className="card" style={{ margin: "0 0 16px", borderColor: "var(--err)" }}>
          <div className="card-body" style={{ color: "var(--err)" }}>Error: {error}</div>
        </div>
      )}

      {/* Generated CLI banner */}
      {generatedCli && generatedCli.length > 0 && (
        <div className="card mb" style={{ borderColor: "var(--ok)" }}>
          <div className="card-head">
            <I.terminal size={14}/><div className="title">Pending changes</div>
            <Pill kind="ok">{generatedCli.length} lines</Pill>
          </div>
          <div className="card-body" style={{ background: "oklch(0.1 0.005 240)", padding: 12, fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.6 }}>
            {generatedCli.map((l, i) => (
              <div key={i} style={{ color: l.startsWith("+") ? "oklch(0.78 0.16 155)" : l.startsWith("!") ? "oklch(0.55 0.04 240)" : "oklch(0.85 0.01 240)" }}>{l}</div>
            ))}
          </div>
        </div>
      )}

      <div className="grid cols-12">
        {/* Config sections */}
        <div className="col-7">
          {sectionNames.length === 0 && !loading ? (
            <div className="card">
              <div className="card-body" style={{ textAlign: "center", padding: 40, color: "var(--fg-3)" }}>
                {error ? "Cannot load config" : "No configuration data"}
              </div>
            </div>
          ) : (
            sectionNames.map(name => (
              <div key={name} className="card mb">
                <div className="config-block-head" style={{ cursor: "pointer", padding: "12px 16px" }} onClick={() => toggle(name)}>
                  <I.chevron size={14} style={{ transform: collapsed[name] ? "none" : "rotate(90deg)", transition: "transform 160ms", color: "var(--fg-3)" }}/>
                  <span className="name" style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{name} {"{"}</span>
                  <span className="spacer"/>
                  <Pill kind="ok">active</Pill>
                </div>
                {!collapsed[name] && (
                  <div style={{
                    background: "oklch(0.1 0.005 240)",
                    padding: "8px 16px 16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    lineHeight: 1.65,
                    borderTop: "1px solid var(--border)",
                    maxHeight: 400,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    color: "oklch(0.82 0.01 240)",
                  }}>
                    {sections[name]}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Raw config panel */}
        <div className="card col-5" style={{ alignSelf: "flex-start", position: "sticky", top: 20 }}>
          <div className="card-head">
            <div className="title">Raw configuration</div>
            <div className="sub mono">show configuration · live</div>
            <div className="actions">
              <button className="icon-btn" onClick={() => {
                const blob = new Blob([raw], { type: "text/plain" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                a.download = "running-config.txt"; a.click();
              }} data-tip="Download"><I.download size={14}/></button>
              <button className="icon-btn" onClick={() => navigator.clipboard?.writeText(raw)} data-tip="Copy"><I.copy size={14}/></button>
            </div>
          </div>
          <div style={{
            background: "oklch(0.1 0.005 240)",
            padding: "12px 14px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            lineHeight: 1.6,
            maxHeight: 500,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            color: "oklch(0.82 0.01 240)",
            borderTop: "1px solid var(--border)",
          }}>
            {raw
              ? raw.split("\n").map((l, i) => (
                  <div key={i} style={{
                    color: l.trim().startsWith("/*") || l.trim().startsWith("#") ? "oklch(0.55 0.04 240)" : "oklch(0.82 0.01 240)"
                  }}>{l || " "}</div>
                ))
              : <div style={{ color: "var(--fg-3)" }}>No config data yet</div>
            }
          </div>
        </div>
      </div>

      {/* SSH terminal panel */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head" style={{ cursor: "pointer" }} onClick={() => setSshOpen(o => !o)}>
          <I.terminal size={15}/>
          <div className="title">SSH Terminal</div>
          <div className="sub">run commands directly on {routerId}</div>
          <div className="spacer"/>
          <I.chevron size={14} style={{ transform: sshOpen ? "rotate(90deg)" : "none", transition: "200ms" }}/>
        </div>
        {sshOpen && <SshPanel routerId={routerId}/>}
      </div>
    </div>
  );
}

function SshPanel({ routerId }) {
  const [cmd, setCmd] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [history, setHistory] = React.useState([]);
  const [hIdx, setHIdx] = React.useState(-1);
  const outRef = React.useRef(null);

  const run = () => {
    if (!cmd.trim() || running) return;
    const c = cmd.trim();
    setHistory(h => [c, ...h.slice(0, 49)]);
    setHIdx(-1);
    setRunning(true);
    setOutput(o => o + `\n$ ${c}\n`);
    setCmd("");
    fetch(`/api/routers/${routerId}/terminal`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: c })
    })
      .then(r => r.json())
      .then(d => { setOutput(o => o + (d.output || d.error || "")); setRunning(false); })
      .catch(e => { setOutput(o => o + "Error: " + e.message + "\n"); setRunning(false); })
      .finally(() => { setTimeout(() => { if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight; }, 50); });
  };

  const onKey = e => {
    if (e.key === "Enter") { e.preventDefault(); run(); }
    if (e.key === "ArrowUp") { e.preventDefault(); const i = Math.min(hIdx + 1, history.length - 1); setHIdx(i); setCmd(history[i] || ""); }
    if (e.key === "ArrowDown") { e.preventDefault(); const i = Math.max(hIdx - 1, -1); setHIdx(i); setCmd(i === -1 ? "" : history[i]); }
  };

  return (
    <div className="card-body" style={{ padding: 0 }}>
      <div ref={outRef} style={{ background: "oklch(0.08 0.005 240)", color: "oklch(0.85 0.01 240)", fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.6, padding: "12px 14px", minHeight: 180, maxHeight: 320, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {output || <span style={{ color: "oklch(0.45 0.04 240)" }}>$ type a command and press Enter…</span>}
        {running && <span style={{ color: "oklch(0.7 0.15 155)" }}> ▋</span>}
      </div>
      <div style={{ display: "flex", gap: 8, padding: "8px 12px", borderTop: "1px solid var(--border)", background: "var(--bg-2)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-3)", alignSelf: "center" }}>$</span>
        <input value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={onKey}
          placeholder="show version, show interfaces terse…"
          style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 13, background: "transparent", border: "none", outline: "none", color: "var(--fg-1)" }}/>
        <button className="btn primary" onClick={run} disabled={running || !cmd.trim()}>Run</button>
        <button className="btn ghost" onClick={() => setOutput("")}>Clear</button>
      </div>
    </div>
  );
}

window.Config = Config;

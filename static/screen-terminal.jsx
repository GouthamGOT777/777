/* global React, I, Pill */

// SSH terminal — real commands via /api/routers/:id/terminal
function Terminal({ open, onClose, onCommitLines, device }) {
  const host = device?.hostname || "router";
  const mgmt = device?.mgmt || "—";

  const [history, setHistory] = React.useState(() => [
    { kind: "sys", text: `Connecting to ${mgmt} (${host}) port 22 …` },
    { kind: "sys", text: `Credentials: root/Embe1mpls or regress/MaRtInI` },
    { kind: "sys", text: `Type a command and press Enter. Use ↑/↓ for history.` },
  ]);
  const [input, setInput] = React.useState("");
  const [cmdHistory, setCmdHistory] = React.useState([]);
  const [histIdx, setHistIdx] = React.useState(-1);
  const [busy, setBusy] = React.useState(false);
  const [height, setHeight] = React.useState(320);
  const scrollRef = React.useRef(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  React.useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, open]);

  const push = lines => {
    const arr = Array.isArray(lines) ? lines : [lines];
    setHistory(h => [...h, ...arr]);
  };

  const submit = async () => {
    const raw = input.trim();
    if (!raw) return;

    push({ kind: "cmd", text: `${host}> ${raw}` });
    setInput("");
    setCmdHistory(h => [raw, ...h]);
    setHistIdx(-1);

    if (!device?.id) {
      push({ kind: "err", text: "No router selected." });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/routers/${device.id}/terminal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: raw }),
      });
      const data = await res.json();

      if (res.ok) {
        const lines = (data.output || "").split("\n");
        push(lines.map(l => ({ kind: "out", text: l })));
        // Collect config lines for CLI drawer
        if (raw.startsWith("set ") || raw.startsWith("delete ") || raw === "commit") {
          onCommitLines?.([raw]);
        }
      } else {
        push({ kind: "err", text: `Error: ${data.error || data.output || "SSH failed"}` });
      }
    } catch (e) {
      push({ kind: "err", text: `Network error: ${e.message}` });
    }
    setBusy(false);
  };

  const onKey = e => {
    if (e.key === "Enter") { submit(); return; }
    if (e.key === "ArrowUp") {
      const idx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(idx);
      setInput(cmdHistory[idx] || "");
      e.preventDefault();
    }
    if (e.key === "ArrowDown") {
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? "" : cmdHistory[idx]);
      e.preventDefault();
    }
    if (e.ctrlKey && e.key === "c") { setInput(""); e.preventDefault(); }
  };

  // Drag to resize
  const dragRef = React.useRef(null);
  const onDragStart = e => {
    const startY = e.clientY;
    const startH = height;
    const onMove = ev => setHeight(Math.max(180, Math.min(600, startH + startY - ev.clientY)));
    const onUp   = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  if (!open) return null;

  return (
    <div className="ssh-panel" style={{ height }}>
      {/* Drag handle */}
      <div style={{ height: 4, cursor: "row-resize", background: "var(--border)", flexShrink: 0 }}
           onMouseDown={onDragStart}/>

      <div className="ssh-head">
        <I.terminal size={14}/>
        <span style={{ fontWeight: 600 }}>SSH · {host}</span>
        <Pill kind="ok" dot>{device?.id ? "connected" : "no device"}</Pill>
        <span style={{ marginLeft: 4, color: "var(--fg-3)", fontSize: 11, fontFamily: "var(--font-mono)" }}>{mgmt}</span>
        <span className="spacer"/>
        <button className="icon-btn" onClick={() => {
          const txt = history.map(l => l.text).join("\n");
          navigator.clipboard?.writeText(txt);
        }} data-tip="Copy session"><I.copy size={14}/></button>
        <button className="icon-btn" onClick={onClose} data-tip="Close"><I.x size={14}/></button>
      </div>

      <div className="ssh-body" ref={scrollRef}>
        {history.map((line, i) => (
          <div key={i} className={`ssh-line ${line.kind}`}>
            {line.text}
          </div>
        ))}
        {busy && <div className="ssh-line sys">▌ waiting…</div>}
      </div>

      <div className="ssh-input-row">
        <span className="ssh-prompt">{host}&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={busy}
          placeholder={busy ? "waiting for response…" : "show version | no-more"}
          spellCheck={false}
          autoComplete="off"
        />
        {busy && <span style={{ color: "var(--accent)", fontSize: 12, marginLeft: 8 }}>⋯</span>}
      </div>
    </div>
  );
}

window.Terminal = Terminal;

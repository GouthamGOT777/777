/* global React, I, Pill */

// ============ Router search palette ============
// Cmd/Ctrl-K style global search. Filters routers by hostname / IP / role /
// team / location and lets you jump to one or to a specific screen on it.

function RouterSearch({ open, onClose, devices, onSelect }) {
  const [query, setQuery] = React.useState("");
  const [idx, setIdx] = React.useState(0);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard shortcut: Cmd/Ctrl+K toggles
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) onClose(); else window.dispatchEvent(new CustomEvent("__open_search"));
      }
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Scoring
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const scored = devices.map((d) => {
      const haystack = `${d.hostname} ${d.mgmt} ${d.role} ${d.team || ""} ${d.location} ${d.model}`.toLowerCase();
      let score = 0;
      if (!q) score = 1;
      else if (d.hostname.toLowerCase().startsWith(q)) score = 100;
      else if (d.hostname.toLowerCase().includes(q)) score = 80;
      else if (d.mgmt.toLowerCase().startsWith(q)) score = 70;
      else if (haystack.includes(q)) score = 40;
      return { d, score };
    }).filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.d);
    return scored;
  }, [devices, query]);

  const safeIdx = Math.min(idx, Math.max(results.length - 1, 0));
  React.useEffect(() => setIdx(0), [query]);

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter")   { e.preventDefault(); if (results[safeIdx]) { onSelect(results[safeIdx].id); onClose(); } }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="search-palette">
        <div className="search-input-row">
          <I.search size={16}/>
          <input ref={inputRef}
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 onKeyDown={onKey}
                 placeholder="Search routers · hostname · IP · team · location..."
                 className="search-input"/>
          <span className="kbd-hint mono">esc</span>
        </div>
        <div className="search-results">
          {results.length === 0 && (
            <div style={{ padding: 28, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
              No routers match "{query}"
            </div>
          )}
          {results.map((d, i) => (
            <div key={d.id}
                 className={`search-row ${i === safeIdx ? "active" : ""}`}
                 onMouseEnter={() => setIdx(i)}
                 onClick={() => { onSelect(d.id); onClose(); }}>
              <span className={`dot ${d.state} ${d.state === "ok" ? "pulse" : ""}`}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row">
                  <span style={{ fontWeight: 500 }}>{d.hostname}</span>
                  <Pill>{d.team || "—"}</Pill>
                </div>
                <div className="text-xs fg-3 mono">{d.role} · {d.mgmt} · {d.location}</div>
              </div>
              <span className="mono text-xs fg-3">{d.model}</span>
              {i === safeIdx && <span className="kbd-hint mono">↵</span>}
            </div>
          ))}
        </div>
        <div className="search-foot mono text-xs fg-3">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
          <span className="spacer"/>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
}

window.RouterSearch = RouterSearch;

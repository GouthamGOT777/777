/* global React */
// ============ Icons (lucide-style stroke, original) ============
const Icon = ({ d, size = 16, fill = "none", strokeWidth = 1.6, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {children || <path d={d} />}
  </svg>
);

const I = {
  dashboard: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></Icon>,
  chassis: (p) => <Icon {...p}><rect x="2" y="7" width="20" height="10" rx="1.5"/><line x1="6" y1="11" x2="6" y2="13"/><line x1="10" y1="11" x2="10" y2="13"/><line x1="14" y1="11" x2="14" y2="13"/><line x1="18" y1="11" x2="18" y2="13"/></Icon>,
  ports: (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="7" y1="10" x2="7" y2="14"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="17" y1="10" x2="17" y2="14"/></Icon>,
  routing: (p) => <Icon {...p}><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6.5 7.5l4 9M17.5 7.5l-4 9M7 6h10"/></Icon>,
  config: (p) => <Icon {...p}><path d="M4 6h16M4 12h10M4 18h16"/><circle cx="18" cy="12" r="2"/></Icon>,
  logs: (p) => <Icon {...p}><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 13h6M9 17h6M9 9h2"/></Icon>,
  system: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></Icon>,
  alerts: (p) => <Icon {...p}><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/></Icon>,
  search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></Icon>,
  terminal: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M7 9l3 3-3 3M12 15h5"/></Icon>,
  plus: (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  save: (p) => <Icon {...p}><path d="M5 4h11l4 4v12H5z"/><path d="M8 4v5h8V4M8 20v-6h8v6"/></Icon>,
  refresh: (p) => <Icon {...p}><path d="M3 12a9 9 0 0115.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.3L3 16M3 21v-5h5"/></Icon>,
  user: (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></Icon>,
  download: (p) => <Icon {...p}><path d="M12 4v12M6 11l6 6 6-6M4 21h16"/></Icon>,
  upload: (p) => <Icon {...p}><path d="M12 20V8M6 13l6-6 6 6M4 4h16"/></Icon>,
  power: (p) => <Icon {...p}><path d="M12 3v9"/><path d="M5.6 7.6a8 8 0 1012.8 0"/></Icon>,
  cpu: (p) => <Icon {...p}><rect x="5" y="5" width="14" height="14" rx="1.5"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></Icon>,
  fan: (p) => <Icon {...p}><circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 2-6 2-6s-1 2-1 4 1 2 1 2zM14 12c4 0 6 2 6 2s-2-1-4-1-2 1-2 1zM12 14c0 4-2 6-2 6s1-2 1-4-1-2-1-2zM10 12c-4 0-6-2-6-2s2 1 4 1 2-1 2-1z"/></Icon>,
  thermo: (p) => <Icon {...p}><path d="M12 14V4a2 2 0 014 0v10a4 4 0 11-4 0z"/></Icon>,
  bgp: (p) => <Icon {...p}><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M6 8v8M18 8v8M8 6h8M8 18h8"/></Icon>,
  ospf: (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><circle cx="4" cy="4" r="1.5"/><circle cx="20" cy="4" r="1.5"/><circle cx="4" cy="20" r="1.5"/><circle cx="20" cy="20" r="1.5"/><path d="M6 6l4 4M18 6l-4 4M6 18l4-4M18 18l-4-4"/></Icon>,
  chevron: (p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>,
  chevronDown: (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>,
  x: (p) => <Icon {...p}><path d="M6 6l12 12M18 6l-12 12"/></Icon>,
  check: (p) => <Icon {...p}><path d="M5 12l5 5L20 7"/></Icon>,
  copy: (p) => <Icon {...p}><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5h10"/></Icon>,
  edit: (p) => <Icon {...p}><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M14 6l4 4"/></Icon>,
  trash: (p) => <Icon {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></Icon>,
  filter: (p) => <Icon {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></Icon>,
  more: (p) => <Icon {...p}><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></Icon>,
  globe: (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></Icon>,
  help: (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5M12 17v.5"/></Icon>,
  link: (p) => <Icon {...p}><path d="M10 14a4 4 0 010-5.6L14 4.4a4 4 0 015.6 5.6L18 12"/><path d="M14 10a4 4 0 010 5.6L10 19.6a4 4 0 01-5.6-5.6L6 12"/></Icon>,
  pause: (p) => <Icon {...p}><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></Icon>,
  play: (p) => <Icon {...p}><path d="M7 5l12 7-12 7z"/></Icon>,
  sun: (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></Icon>,
  moon: (p) => <Icon {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></Icon>,
};

// ============ Status pill ============
const Pill = ({ kind = "", children, dot }) => (
  <span className={`pill ${kind}`}>
    {dot && <span className={`dot ${kind} pulse`}></span>}
    {children}
  </span>
);

// ============ Sparkline (animated random-walk SVG) ============
function Sparkline({ data, color = "var(--chart-1)", fill = true, height = 36, area = true }) {
  const w = 200, h = height;
  if (!data || data.length === 0) return <svg className="spark" />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const step = w / (data.length - 1 || 1);
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * (h - 6) - 3).toFixed(1)}`);
  const path = `M${points.join(" L")}`;
  const areaPath = `${path} L${w},${h} L0,${h} Z`;
  const id = React.useId();
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {area && fill && <path d={areaPath} fill={`url(#sg-${id})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ============ Larger area chart with axes ============
function AreaChart({ series, height = 200, max, yUnit = "", showLegend = true }) {
  const w = 800, h = height;
  const pad = { l: 44, r: 12, t: 14, b: 22 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const allValues = series.flatMap((s) => s.data);
  const dMax = max || Math.max(...allValues, 1) * 1.1;
  const len = Math.max(...series.map((s) => s.data.length));
  const step = innerW / Math.max(len - 1, 1);
  const yTicks = 4;
  const id = React.useId();
  return (
    <div className="chart-wrap" style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
        {/* grid */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const y = pad.t + (innerH * i) / yTicks;
          const v = dMax - (dMax * i) / yTicks;
          return (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--grid)" strokeDasharray="2 4" />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--fg-3)" fontFamily="var(--font-mono)">
                {formatNum(v)}{yUnit}
              </text>
            </g>
          );
        })}
        {/* series */}
        {series.map((s, si) => {
          const points = s.data.map((v, i) => `${(pad.l + i * step).toFixed(1)},${(pad.t + innerH - (v / dMax) * innerH).toFixed(1)}`);
          const path = `M${points.join(" L")}`;
          const areaPath = `${path} L${pad.l + (s.data.length - 1) * step},${pad.t + innerH} L${pad.l},${pad.t + innerH} Z`;
          return (
            <g key={si}>
              <defs>
                <linearGradient id={`ag-${id}-${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.3"/>
                  <stop offset="100%" stopColor={s.color} stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#ag-${id}-${si})`} />
              <path d={path} fill="none" stroke={s.color} strokeWidth="1.6"/>
            </g>
          );
        })}
        {/* x ticks */}
        {Array.from({ length: 6 }, (_, i) => {
          const x = pad.l + (innerW * i) / 5;
          const minsAgo = Math.round((5 - i) * 12);
          return (
            <text key={i} x={x} y={h - 6} textAnchor="middle" fontSize="10" fill="var(--fg-3)" fontFamily="var(--font-mono)">
              {minsAgo === 0 ? "now" : `-${minsAgo}m`}
            </text>
          );
        })}
      </svg>
      {showLegend && (
        <div style={{ position: "absolute", top: 6, right: 12, display: "flex", gap: 12, fontSize: 11, fontFamily: "var(--font-mono)" }}>
          {series.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{ color: "var(--fg-2)" }}>{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatNum(v) {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "G";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "k";
  return v.toFixed(0);
}

function formatBps(v) {
  if (v >= 1e9) return (v / 1e9).toFixed(2) + " Gbps";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + " Mbps";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + " kbps";
  return v.toFixed(0) + " bps";
}

// ============ Live data hook (random-walk series) ============
function useLiveSeries(seed = 5e8, span = 60, volatility = 0.08, floor = 1e7) {
  const [data, setData] = React.useState(() => {
    const arr = [];
    let v = seed;
    for (let i = 0; i < span; i++) {
      v = Math.max(floor, v * (1 + (Math.random() - 0.5) * volatility));
      arr.push(v);
    }
    return arr;
  });
  React.useEffect(() => {
    const t = setInterval(() => {
      setData((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.max(floor, last * (1 + (Math.random() - 0.48) * volatility));
        return [...prev.slice(1), next];
      });
    }, 1200);
    return () => clearInterval(t);
  }, [volatility, floor]);
  return data;
}

// ============ Sidebar nav ============
function Sidebar({ route, setRoute, dense, device, devices, currentId, onSelectDevice, onAddDevice }) {
  // Home view only shows the Home link. Drilling into a router reveals the
  // per-device navigation.
  const items = route === "fleet" ? [
    { group: "Fleet", items: [
      { id: "fleet", label: "Home", icon: I.globe, count: String(devices.length) },
    ]},
  ] : [
    { group: "Fleet", items: [
      { id: "fleet", label: "← Back to Home", icon: I.globe, count: String(devices.length) },
    ]},
    { group: device.hostname, items: [
      { id: "dashboard", label: "Dashboard", icon: I.dashboard },
      { id: "chassis", label: "Chassis", icon: I.chassis },
      { id: "interfaces", label: "Interfaces", icon: I.ports, count: String(device.ports) },
      { id: "routing", label: "Routing", icon: I.routing, count: "3" },
    ]},
    { group: "Manage", items: [
      { id: "config", label: "Configuration", icon: I.config },
      { id: "logs", label: "Logs & Events", icon: I.logs, count: "12" },
      { id: "system", label: "System", icon: I.system },
    ]},
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" />
        <div className="brand-text">
          <div className="n">Helix</div>
          <div className="s">Fleet console</div>
        </div>
      </div>
      <DevicePicker devices={devices} currentId={currentId}
                    onSelect={onSelectDevice} onAdd={onAddDevice}
                    dense={dense}/>
      <nav className="nav">
        {items.map((g) => (
          <div className="nav-group" key={g.group}>
            <div className="nav-label">{g.group}</div>
            {g.items.map((it) => (
              <div key={it.id}
                   className={`nav-item ${route === it.id ? "active" : ""}`}
                   onClick={() => setRoute(it.id)}>
                <span className="ico"><it.icon /></span>
                <span className="lbl">{it.label}</span>
                {it.count && <span className="count">{it.count}</span>}
              </div>
            ))}
          </div>
        ))}
      </nav>
      {route !== "fleet" && (
        <div className="device-card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className={`dot ${device.state} pulse`} />
            <span className="text-xs fg-2 mono">{device.stateLabel.toUpperCase()}</span>
          </div>
          <div className="divider" style={{ margin: "4px 0" }} />
          <div className="row"><span className="k">role</span><span className="v" style={{ marginLeft: "auto" }}>{device.role}</span></div>
          <div className="row"><span className="k">mgmt</span><span className="v" style={{ marginLeft: "auto" }}>{device.mgmt}</span></div>
          <div className="row"><span className="k">up</span><span className="v" style={{ marginLeft: "auto" }}>{device.uptime}</span></div>
        </div>
      )}
    </aside>
  );
}

// ============ Topbar ============
function Topbar({ route, onToggleCli, cliOpen, onToggleSsh, sshOpen, onToggleDark, isDark, onOpenHelp, onOpenSearch, onToggleTweaks, theme, device }) {
  const labels = {
    fleet: "Fleet · Home",
    dashboard: "Dashboard",
    chassis: "Chassis",
    interfaces: "Interfaces",
    routing: "Routing",
    config: "Configuration",
    logs: "Logs & Events",
    system: "System",
  };
  return (
    <header className="topbar">
      <div className="crumbs">
        {route === "fleet" ? (
          <>
            <div className="brand-lockup">
              <div className="hpe-block">
                <div className="hpe-box">
                  <span className="hpe-box-glow"></span>
                  <span className="hpe-box-scan"></span>
                </div>
                <div className="brand-text-hpe">
                  <span className="brand-word w1">Hewlett</span>{" "}
                  <span className="brand-word w2">Packard</span><br/>
                  <span className="brand-word w3">Enterprise</span>
                </div>
              </div>
              <div className="brand-divider"></div>
              <div className="brand-text-juniper">
                {"Juniper Networks".split("").map((c, i) => (
                  <span key={i} className="jun-letter" style={{ animationDelay: `${0.95 + i * 0.035}s` }}>
                    {c === " " ? "\u00a0" : c}
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <span className="crumb mono">{device.hostname}</span>
            <span className="crumb-sep"><I.chevron size={12}/></span>
            <span className="crumb current">{labels[route]}</span>
          </>
        )}
      </div>
      <div className="top-actions">
        {route !== "fleet" && <div className="pill ok"><span className="dot ok pulse" /> All systems nominal</div>}
        <button className="icon-btn" onClick={onOpenSearch} title="Search routers" data-tip="Search (⌘K)"><I.search/></button>
        <button className="icon-btn" title="Refresh" data-tip="Refresh"><I.refresh/></button>
        <button className="icon-btn" onClick={onToggleDark} data-tip={isDark ? "Switch to light mode" : "Switch to dark mode"}>
          {isDark ? <I.sun/> : <I.moon/>}
        </button>
        <button className="icon-btn" onClick={onOpenHelp} data-tip="Help & contact">
          <I.help/>
        </button>
        {route !== "fleet" && (
          <>
            <button className={`icon-btn ${cliOpen ? "on" : ""}`} onClick={onToggleCli} data-tip="CLI preview">
              <I.terminal/>
            </button>
            <button className={`icon-btn ${sshOpen ? "on" : ""}`} onClick={onToggleSsh} data-tip="SSH session">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.02em" }}>SSH</span>
            </button>
            <button className="btn primary"><I.save size={14}/> Commit</button>
          </>
        )}
        <div style={{ width: 8 }} />
        <div className="row" style={{ gap: 6 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), var(--ok))",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 600, color: "oklch(0.1 0 0)" }}>NA</div>
        </div>
      </div>
    </header>
  );
}

// ============ Live API hooks ============

function useRouterPoll(routerId, endpoint, interval = 5000) {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!routerId || !endpoint) return;
    let cancelled = false;

    const doFetch = async () => {
      try {
        const res = await fetch(`/api/routers/${routerId}/${endpoint}`);
        if (cancelled) return;
        if (res.ok) {
          const json = await res.json();
          setData(json);
          setError(null);
        } else {
          setError(`HTTP ${res.status}`);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    doFetch();
    const timer = setInterval(doFetch, interval);
    return () => { cancelled = true; clearInterval(timer); };
  }, [routerId, endpoint, interval]);

  return { data, error, loading };
}

function useRollingHistory(value, windowSize = 60) {
  const [series, setSeries] = React.useState(() => new Array(windowSize).fill(0));
  React.useEffect(() => {
    if (value !== null && value !== undefined && !isNaN(Number(value))) {
      setSeries(prev => [...prev.slice(-(windowSize - 1)), Number(value)]);
    }
  }, [value]);
  return series;
}

Object.assign(window, {
  I, Icon, Pill, Sparkline, AreaChart, useLiveSeries, formatNum, formatBps,
  Sidebar, Topbar,
  useRouterPoll, useRollingHistory,
});

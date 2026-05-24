/* global React, ReactDOM, I, Pill,
   Sidebar, Topbar,
   Dashboard, Chassis, Interfaces, Routing, Config, Logs, System,
   Wizard, Terminal, AddRouterModal, FleetHome, HelpModal, RouterSearch,
   useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect, TweakToggle, TweakColor */

const DEFAULTS = {
  "theme": "noc",
  "density": "comfortable",
  "cliReveal": "on-demand",
  "accent": "cyan",
  "showSidebar": true
};

function App() {
  const [t, setTweak] = useTweaks(DEFAULTS);
  const [route, setRoute] = React.useState("fleet");
  const [cliOpen, setCliOpen] = React.useState(false);
  const [sshOpen, setSshOpen] = React.useState(false);
  const [wizard, setWizard] = React.useState(null);
  const [addRouterOpen, setAddRouterOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [generatedCli, setGeneratedCli] = React.useState([]);
  const [fleet, setFleet] = React.useState([]);
  const [fleetLoaded, setFleetLoaded] = React.useState(false);
  const [currentId, setCurrentId] = React.useState(null);

  // Load fleet from API on startup
  React.useEffect(() => {
    fetch("/api/routers")
      .then(r => r.json())
      .then(data => {
        setFleet(data);
        if (data.length > 0) setCurrentId(data[0].id);
        setFleetLoaded(true);
      })
      .catch(() => setFleetLoaded(true));
  }, []);

  const device = fleet.find(d => d.id === currentId) || fleet[0] || null;

  // Broadcast current router so Config screen can pick it up
  React.useEffect(() => {
    window.__currentRouterId = device?.id;
    window.dispatchEvent(new CustomEvent("__router_selected", { detail: device?.id }));
  }, [device?.id]);

  // Cmd/Ctrl+K opens search globally
  React.useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    const onOpen = () => setSearchOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("__open_search", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("__open_search", onOpen); };
  }, []);

  // Dark/light toggle
  const isDark = t.theme === "noc" || t.theme === "neon";
  const lastDarkRef  = React.useRef(isDark ? t.theme : "noc");
  const lastLightRef = React.useRef(isDark ? "light" : t.theme);
  React.useEffect(() => {
    if (isDark) lastDarkRef.current = t.theme;
    else lastLightRef.current = t.theme;
  }, [t.theme, isDark]);
  const toggleDark = () => setTweak("theme", isDark ? lastLightRef.current : lastDarkRef.current);

  // Apply theme class
  React.useEffect(() => {
    const root = document.documentElement;
    ["theme-noc","theme-light","theme-neon","theme-glass"].forEach(c => root.classList.remove(c));
    root.classList.add(`theme-${t.theme}`);
  }, [t.theme]);

  // Accent override
  React.useEffect(() => {
    const root = document.documentElement;
    const map = {
      cyan:    { l: 0.78, c: 0.14, h: 200 },
      blue:    { l: 0.62, c: 0.18, h: 250 },
      green:   { l: 0.78, c: 0.16, h: 145 },
      amber:   { l: 0.82, c: 0.16, h: 70  },
      magenta: { l: 0.78, c: 0.22, h: 325 },
    };
    const v = map[t.accent] || map.cyan;
    if (t.theme !== "neon") {
      root.style.setProperty("--accent",   `oklch(${v.l} ${v.c} ${v.h})`);
      root.style.setProperty("--accent-2", `oklch(${v.l - 0.1} ${v.c + 0.02} ${v.h})`);
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-2");
    }
  }, [t.accent, t.theme]);

  React.useEffect(() => {
    if (t.cliReveal === "always") setCliOpen(true);
  }, [t.cliReveal]);

  const openWizard = kind => setWizard(kind);

  const onCommitWizard = cli => {
    setGeneratedCli(cli);
    setCliOpen(true);
    setRoute("config");
  };

  // Fleet mutation helpers (local state + API)
  const deleteRouter = async id => {
    try { await fetch(`/api/routers/${id}`, { method: "DELETE" }); } catch (e) {}
    setFleet(f => f.filter(d => d.id !== id));
    if (currentId === id) {
      const remaining = fleet.find(d => d.id !== id);
      setCurrentId(remaining?.id ?? null);
    }
  };

  const deleteTeam = async team => {
    const toDelete = fleet.filter(d => (d.team || "Unassigned") === team);
    for (const r of toDelete) {
      try { await fetch(`/api/routers/${r.id}`, { method: "DELETE" }); } catch (e) {}
    }
    setFleet(f => f.filter(d => (d.team || "Unassigned") !== team));
    const remaining = fleet.find(d => (d.team || "Unassigned") !== team);
    if (remaining) setCurrentId(remaining.id);
  };

  // Periodic fleet status refresh
  React.useEffect(() => {
    if (fleet.length === 0) return;
    const refresh = async () => {
      try {
        const res = await fetch("/api/routers");
        if (res.ok) {
          const updated = await res.json();
          setFleet(updated);
        }
      } catch (e) {}
    };
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [fleet.length]);

  if (!fleetLoaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16, color: "var(--fg-3)" }}>
        <I.refresh size={32}/>
        <div>Loading fleet…</div>
      </div>
    );
  }

  return (
    <>
      <div className={`app ${t.density === "dense" ? "dense" : ""} ${route === "fleet" ? "no-sidebar" : ""}`}>
        {route !== "fleet" && (
          <Sidebar route={route} setRoute={setRoute} dense={t.density === "dense"} device={device}
                   devices={fleet} currentId={currentId}
                   onSelectDevice={id => setCurrentId(id)}
                   onAddDevice={() => setAddRouterOpen(true)}/>
        )}
        <Topbar route={route}
                onToggleCli={() => setCliOpen(!cliOpen)} cliOpen={cliOpen}
                onToggleSsh={() => setSshOpen(!sshOpen)} sshOpen={sshOpen}
                onToggleDark={toggleDark} isDark={isDark}
                onOpenHelp={() => setHelpOpen(true)}
                onOpenSearch={() => setSearchOpen(true)}
                device={device}/>
        <main className="main" key={(currentId || "none") + route}>
          {route === "fleet" && (
            <FleetHome devices={fleet} currentId={currentId}
                       onSelect={id => { setCurrentId(id); setRoute("dashboard"); }}
                       onAdd={() => setAddRouterOpen(true)}
                       onImport={() => setAddRouterOpen("bulk")}
                       onDelete={deleteRouter}
                       onDeleteTeam={deleteTeam}/>
          )}
          {route === "dashboard"  && device && <Dashboard device={device} setRoute={setRoute}/>}
          {route === "chassis"    && device && <Chassis   device={device} setRoute={setRoute}/>}
          {route === "interfaces" && device && <Interfaces device={device}/>}
          {route === "routing"    && device && <Routing   device={device} openWizard={openWizard}/>}
          {route === "config"     && device && <Config    openWizard={openWizard} generatedCli={generatedCli}/>}
          {route === "logs"       && device && <Logs      device={device}/>}
          {route === "system"     && device && <System    device={device}/>}
          {!device && route !== "fleet" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16, color: "var(--fg-3)" }}>
              <I.globe size={48}/>
              <div style={{ fontWeight: 600, fontSize: 18 }}>No routers in fleet</div>
              <div className="text-sm">Add a Juniper device to get started</div>
              <button className="btn primary" onClick={() => setRoute("fleet")}>← Back to Home</button>
            </div>
          )}
        </main>
      </div>

      {/* CLI Drawer */}
      <CliDrawer open={cliOpen} onClose={() => setCliOpen(false)} generatedCli={generatedCli}/>

      {/* SSH Terminal */}
      {device && (
        <Terminal open={sshOpen} onClose={() => setSshOpen(false)}
                  device={device}
                  onCommitLines={lines => setGeneratedCli(prev => [...prev, ...lines])}/>
      )}

      {/* Wizard */}
      {wizard && <Wizard kind={wizard} onClose={() => setWizard(null)} onCommit={onCommitWizard}/>}

      {/* Add router modal */}
      {addRouterOpen && (
        <AddRouterModal
          initialTab={addRouterOpen === "bulk" ? "bulk" : "single"}
          onClose={() => setAddRouterOpen(false)}
          onAdd={dev => {
            setFleet(f => [...f, { ...dev, state: dev.state || "ok", stateLabel: dev.stateLabel || "just added", loadHint: 0.5 }]);
            setCurrentId(dev.id);
          }}
          onAddMany={devs => setFleet(f => [...f, ...devs])}/>
      )}

      {/* Help modal */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)}/>}

      {/* Search palette */}
      <RouterSearch open={searchOpen} onClose={() => setSearchOpen(false)}
                    devices={fleet}
                    onSelect={id => { setCurrentId(id); setRoute("dashboard"); }}/>

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakSelect label="Visual theme" value={t.theme}
            options={[
              { value: "noc",   label: "NOC dark (default)" },
              { value: "light", label: "Light enterprise" },
              { value: "neon",  label: "Neon cyber" },
              { value: "glass", label: "Glassmorphism soft" },
            ]}
            onChange={v => setTweak("theme", v)}/>
          <TweakColor label="Accent" value={t.accent}
            options={["cyan","blue","green","amber","magenta"].map(id => ({
              cyan:"#5ec5dd",blue:"#5b88e6",green:"#5ec98a",amber:"#e6c266",magenta:"#dd6fc6"
            }[id]))}
            onChange={hex => {
              const map = {"#5ec5dd":"cyan","#5b88e6":"blue","#5ec98a":"green","#e6c266":"amber","#dd6fc6":"magenta"};
              setTweak("accent", map[hex.toLowerCase()] || "cyan");
            }}/>
        </TweakSection>
        <TweakSection label="Layout">
          <TweakRadio label="Sidebar" value={t.density}
            options={[
              { value: "comfortable", label: "Wide" },
              { value: "dense",       label: "Icons" },
            ]}
            onChange={v => setTweak("density", v)}/>
        </TweakSection>
        <TweakSection label="CLI">
          <TweakRadio label="Reveal" value={t.cliReveal}
            options={[
              { value: "on-demand", label: "On demand" },
              { value: "always",    label: "Pinned" },
            ]}
            onChange={v => setTweak("cliReveal", v)}/>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

function CliDrawer({ open, onClose, generatedCli }) {
  return (
    <div className={`cli-drawer ${open ? "open" : ""}`}>
      <div className="cli-drawer-head">
        <I.terminal size={14}/>
        <div style={{ fontWeight: 600 }}>CLI preview</div>
        <span className="pill mono">live</span>
        <span className="spacer"/>
        <button className="icon-btn" onClick={() => {
          const txt = generatedCli.join("\n");
          navigator.clipboard?.writeText(txt);
        }} data-tip="Copy"><I.copy/></button>
        <button className="icon-btn" onClick={onClose}><I.x/></button>
      </div>
      <div className="cli-body">
        {generatedCli.length > 0 && (
          <>
            <div className="line com">! generated CLI · {new Date().toLocaleTimeString()}</div>
            {generatedCli.map((l, i) => (
              <div key={i} className={`line ${l.startsWith("!") ? "com" : l.startsWith("+") ? "add" : l.startsWith("-") ? "del" : ""}`}>{l}</div>
            ))}
            <div className="line com">! -----</div>
          </>
        )}
        <div className="line com">! running-config preview — open SSH terminal for full config</div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);

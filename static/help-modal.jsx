/* global React, I */

// ============ Help & Contact modal ============
// Styled per attached reference — coral/red headings, mint accent cards,
// brutalist monospace. Self-contained color tokens so it pops the same way
// across every Helix theme.

function HelpModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="help-modal">
        <style>{HELP_STYLE}</style>

        <div className="help-head">
          <h2>HELP &amp; CONTACT</h2>
          <button className="help-close-x" onClick={onClose} aria-label="Close"><I.x size={18}/></button>
        </div>

        {/* Profile card */}
        <div className="help-card help-profile">
          <div className="help-avatar">
            <span>GK</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="help-name">Goutham Kumaresh</div>
            <div className="help-team">DC Testing FT &middot; HPE+Juniper</div>
            <div className="help-org">Hewlett-Packard (India) Software &middot; Bengaluru</div>
          </div>
        </div>

        {/* Contact tiles */}
        <div className="help-grid">
          <ContactTile icon="mail" label="EMAIL"
            value="goutham.kumaresh@hpe.com"
            href="mailto:goutham.kumaresh@hpe.com"/>
          <ContactTile icon="chat" label="CHAT"
            value="goutham@hpe.com"
            href="https://teams.microsoft.com/"/>
          <ContactTile icon="phone" label="PHONE"
            value="+91 8553509779"
            href="tel:+918553509779"/>
          <ContactTile icon="pin" label="LOCATION"
            value="Bengaluru, India"/>
          <ContactTile icon="dept" label="DEPT"
            value="DC Testing FT · HPE+Juniper" wide/>
        </div>

        {/* About */}
        <div className="help-card help-about">
          <div className="help-about-label">ABOUT THIS APP</div>
          <div className="help-about-row">
            <div>
              <div className="help-about-name">Helix Web Console</div>
              <div className="help-about-sub">Network Operations Console</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="help-version">v2.4.1</div>
              <div className="help-about-sub">HelixOS · Fleet manager</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="help-foot">
          <button className="help-btn-ghost" onClick={onClose}>CLOSE</button>
          <a href="mailto:goutham.kumaresh@hpe.com" className="help-btn-primary">
            <I.copy size={14}/> SEND EMAIL
          </a>
        </div>
      </div>
    </div>
  );
}

function ContactTile({ icon, label, value, href, wide }) {
  const ICONS = {
    mail:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8312b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>,
    chat:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8312b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 11-3.5 6.6L4 20l1.5-4.5A8 8 0 0121 12z"/></svg>,
    phone: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.8a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.34 1.84.57 2.8.7a2 2 0 011.73 2.03z"/></svg>,
    pin:   <svg width="22" height="22" viewBox="0 0 24 24"><path fill="#e23b3b" d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>,
    dept:  <svg width="22" height="22" viewBox="0 0 24 24" fill="#3a4a55"><rect x="4" y="3" width="16" height="18" rx="1"/><g fill="#cfd8dc"><rect x="6" y="5" width="3" height="3"/><rect x="11" y="5" width="3" height="3"/><rect x="15" y="5" width="3" height="3"/><rect x="6" y="10" width="3" height="3"/><rect x="11" y="10" width="3" height="3"/><rect x="15" y="10" width="3" height="3"/><rect x="6" y="15" width="3" height="3"/><rect x="15" y="15" width="3" height="3"/></g><rect x="10" y="15" width="4" height="6" fill="#8b5a3c"/></svg>,
  };
  const inner = (
    <>
      <div className="help-tile-icon">{ICONS[icon]}</div>
      <div className="help-tile-label">{label}</div>
      <div className="help-tile-value">{value}</div>
    </>
  );
  if (href) {
    return <a className={`help-tile ${wide ? "wide" : ""}`} href={href}>{inner}</a>;
  }
  return <div className={`help-tile ${wide ? "wide" : ""}`}>{inner}</div>;
}

const HELP_STYLE = `
  .help-modal {
    width: 720px; max-width: 92vw; max-height: 86vh;
    background: #f0eeec;
    border-radius: 22px;
    padding: 32px 30px 26px;
    font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
    color: #2b2b2b;
    box-shadow: 0 32px 80px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.06);
    overflow-y: auto;
    animation: rise 180ms cubic-bezier(.2,.7,.3,1);
  }
  .help-head { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
  .help-head h2 {
    margin: 0;
    color: #d63a35;
    font-size: 22px;
    letter-spacing: 0.04em;
    font-weight: 800;
  }
  .help-close-x {
    margin-left: auto;
    width: 32px; height: 32px;
    background: rgba(0,0,0,0.04);
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 8px;
    color: #2b2b2b;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: 160ms;
  }
  .help-close-x:hover { background: rgba(0,0,0,0.08); }

  .help-card {
    background: #cfeedd;
    border: 1.5px solid #6ed3a8;
    border-radius: 16px;
    padding: 18px 20px;
  }
  .help-profile {
    display: flex; align-items: center; gap: 18px;
    margin-bottom: 22px;
  }
  .help-avatar {
    width: 86px; height: 86px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c8312b, #6b1d1a);
    color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 0.02em;
    border: 4px solid #6ed3a8;
    flex-shrink: 0;
    box-shadow: 0 0 0 4px #cfeedd;
  }
  .help-avatar span { transform: translateY(1px); }
  .help-name {
    font-size: 26px;
    font-weight: 800;
    color: #d63a35;
    letter-spacing: -0.005em;
    line-height: 1.1;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .help-team {
    font-size: 13.5px;
    color: #1f9c6e;
    margin-bottom: 2px;
  }
  .help-org {
    font-size: 13px;
    color: #555;
  }

  .help-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 18px;
  }
  .help-tile {
    background: #d9efe2;
    border: 1.5px solid #84cdaa;
    border-radius: 12px;
    padding: 14px 16px;
    display: flex; flex-direction: column;
    gap: 6px;
    text-decoration: none;
    color: inherit;
    transition: 160ms;
    cursor: pointer;
    min-height: 110px;
  }
  .help-tile.wide { grid-column: span 1; }
  .help-tile:hover {
    transform: translateY(-2px);
    border-color: #2db377;
    box-shadow: 0 8px 20px -8px rgba(0,120,80,0.3);
  }
  .help-tile-icon { height: 24px; }
  .help-tile-label {
    font-size: 11px;
    letter-spacing: 0.12em;
    color: #777;
    font-weight: 600;
  }
  .help-tile-value {
    font-size: 14px;
    color: #d63a35;
    font-weight: 700;
    word-break: break-word;
    line-height: 1.3;
  }

  .help-about {
    background: #d9efe2;
    border-color: #84cdaa;
    margin-bottom: 20px;
  }
  .help-about-label {
    font-size: 11px;
    letter-spacing: 0.12em;
    color: #777;
    font-weight: 600;
    margin-bottom: 10px;
  }
  .help-about-row { display: flex; align-items: flex-start; gap: 18px; }
  .help-about-row > div:first-child { flex: 1; }
  .help-about-name {
    font-size: 17px;
    font-weight: 800;
    color: #d63a35;
    margin-bottom: 2px;
  }
  .help-about-sub { font-size: 12.5px; color: #555; }
  .help-version {
    font-size: 17px;
    font-weight: 800;
    color: #d63a35;
    margin-bottom: 2px;
  }

  .help-foot {
    display: flex; gap: 12px; justify-content: flex-end;
  }
  .help-btn-ghost, .help-btn-primary {
    height: 44px;
    padding: 0 22px;
    border-radius: 10px;
    font-family: inherit;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.08em;
    cursor: pointer;
    display: inline-flex; align-items: center; gap: 8px;
    text-decoration: none;
    border: 1.5px solid;
    transition: 160ms;
  }
  .help-btn-ghost {
    background: #d9efe2;
    border-color: #84cdaa;
    color: #2b2b2b;
  }
  .help-btn-ghost:hover { background: #c9e8d3; }
  .help-btn-primary {
    background: #c8312b;
    border-color: #c8312b;
    color: white;
  }
  .help-btn-primary:hover { background: #b5251f; }
`;

window.HelpModal = HelpModal;

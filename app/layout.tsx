import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dovatech World — POS",
  description: "Sales & Receipt Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          {/* ── Hidden checkbox toggle — pure CSS hamburger ── */}
          <input type="checkbox" id="sidebar-toggle" className="sidebar-toggle-input" aria-hidden="true" />

          {/* ── Overlay that closes sidebar on tap ── */}
          <label htmlFor="sidebar-toggle" className="sidebar-overlay" aria-hidden="true" />

          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="logo-mark">N</div>
              <div>
                <div className="logo-name">Dovatech</div>
                <div className="logo-sub">World POS</div>
              </div>
              {/* Close button inside sidebar */}
              <label htmlFor="sidebar-toggle" className="sidebar-close-btn" aria-label="Close menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </label>
            </div>

            <nav className="sidebar-nav">
              <a href="/new-sale" className="nav-link">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New Sale
              </a>
              <a href="/sales" className="nav-link">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="2" />
                  <path d="M9 12h6M9 16h4" />
                </svg>
                Sales History
              </a>
            </nav>

            <div className="sidebar-footer">
              <div className="sidebar-footer-text">Pepple St, Computer Village</div>
              <div className="sidebar-footer-text">Ikeja · 08036498157</div>
            </div>
          </aside>

          <div className="content-wrapper">
            {/* ── Mobile top bar ── */}
            <header className="mobile-header">
              <label htmlFor="sidebar-toggle" className="hamburger-btn" aria-label="Open menu">
                <span className="hamburger-bar" />
                <span className="hamburger-bar" />
                <span className="hamburger-bar" />
              </label>
              <div className="mobile-logo">
                <div className="logo-mark logo-mark-sm">N</div>
                <span className="logo-name">Dovatech</span>
              </div>
              {/* Spacer to center logo */}
              <div style={{ width: "40px" }} />
            </header>

            <main className="main-content">{children}</main>
          </div>
        </div>

        <style>{`
          /* ── Toggle input: hidden but functional ── */
          .sidebar-toggle-input {
            display: none;
          }

          .layout {
            display: flex;
            min-height: 100vh;
            position: relative;
          }

          /* ── Sidebar ── */
          .sidebar {
            width: 220px;
            flex-shrink: 0;
            background: var(--surface-1);
            border-right: 1px solid var(--navy-border);
            display: flex;
            flex-direction: column;
            padding: 24px 16px;
            position: sticky;
            top: 0;
            height: 100vh;
          }

          .sidebar-logo {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 40px;
            padding: 0 4px;
          }
          .logo-mark {
            width: 36px;
            height: 36px;
            border-radius: var(--radius-md);
            background: var(--accent);
            color: white;
            font-family: var(--font-display);
            font-weight: 700;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .logo-mark-sm {
            width: 30px;
            height: 30px;
            font-size: 15px;
            border-radius: var(--radius-sm);
          }
          .logo-name {
            font-weight: 700;
            font-size: 15px;
            color: var(--text-primary);
            letter-spacing: 0.01em;
          }
          .logo-sub {
            font-size: 11px;
            color: var(--text-muted);
            letter-spacing: 0.04em;
          }

          /* Close × button — hidden on desktop */
          .sidebar-close-btn {
            display: none;
            margin-left: auto;
            width: 32px;
            height: 32px;
            border-radius: var(--radius-sm);
            background: var(--surface-2);
            border: 1px solid var(--navy-border);
            color: var(--text-muted);
            cursor: pointer;
            align-items: center;
            justify-content: center;
            transition: background 0.15s, color 0.15s;
            flex-shrink: 0;
          }
          .sidebar-close-btn:hover {
            background: var(--danger-dim);
            color: var(--danger);
          }

          .sidebar-nav {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;
          }
          .nav-link {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.15s, color 0.15s;
          }
          .nav-link:hover {
            background: var(--surface-2);
            color: var(--text-primary);
          }
          .nav-link.active {
            background: var(--accent-dim);
            color: var(--accent);
          }
          .sidebar-footer {
            padding: 14px 4px 0;
            border-top: 1px solid var(--navy-border);
          }
          .sidebar-footer-text {
            font-size: 11px;
            color: var(--text-muted);
            line-height: 1.8;
          }

          /* ── Content wrapper (takes remaining space) ── */
          .content-wrapper {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
          }

          /* ── Mobile header (hamburger bar) — hidden on desktop ── */
          .mobile-header {
            display: none;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            height: 56px;
            background: var(--surface-1);
            border-bottom: 1px solid var(--navy-border);
            position: sticky;
            top: 0;
            z-index: 10;
          }

          .hamburger-btn {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 5px;
            width: 40px;
            height: 40px;
            cursor: pointer;
            padding: 8px;
            border-radius: var(--radius-sm);
            transition: background 0.15s;
            flex-shrink: 0;
          }
          .hamburger-btn:hover {
            background: var(--surface-2);
          }
          .hamburger-bar {
            display: block;
            width: 18px;
            height: 2px;
            background: var(--text-secondary);
            border-radius: 2px;
            transition: background 0.15s;
          }
          .hamburger-btn:hover .hamburger-bar {
            background: var(--text-primary);
          }

          .mobile-logo {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          /* ── Overlay (taps to close) ── */
          .sidebar-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(26, 20, 16, 0.45);
            z-index: 29;
            cursor: pointer;
          }

          .main-content {
            flex: 1;
            padding: 40px 48px;
            max-width: 960px;
          }

          /* ── Mobile breakpoint ── */
          @media (max-width: 768px) {
            /* Show mobile header */
            .mobile-header {
              display: flex;
            }

            /* Sidebar slides in from left */
            .sidebar {
              position: fixed;
              left: 0;
              top: 0;
              height: 100vh;
              z-index: 30;
              transform: translateX(-100%);
              transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: none;
              width: 260px;
              padding: 20px 16px;
            }

            /* Show close button inside sidebar on mobile */
            .sidebar-close-btn {
              display: flex;
            }

            /* When checkbox is checked: slide sidebar in, show overlay */
            .sidebar-toggle-input:checked ~ .sidebar-overlay {
              display: block;
            }
            .sidebar-toggle-input:checked ~ .sidebar {
              transform: translateX(0);
              box-shadow: 8px 0 32px rgba(26, 20, 16, 0.18);
            }

            /* Also handle the DOM order — sidebar and overlay are siblings of layout children */
            .sidebar-toggle-input:checked + .sidebar-overlay {
              display: block;
            }

            .main-content {
              padding: 24px 16px 40px;
            }
          }
        `}</style>
      </body>
    </html>
  );
}
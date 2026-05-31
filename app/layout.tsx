import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexaTech World — POS",
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
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="logo-mark">N</div>
              <div>
                <div className="logo-name">NexaTech</div>
                <div className="logo-sub">World POS</div>
              </div>
            </div>

            <nav className="sidebar-nav">
              <a href="/new-sale" className="nav-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New Sale
              </a>
              <a href="/sales" className="nav-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

          <main className="main-content">{children}</main>
        </div>

        <style>{`
          .layout {
            display: flex;
            min-height: 100vh;
          }
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
            background: var(--surface-3);
            color: var(--text-primary);
          }
          .sidebar-footer {
            padding: 12px 4px 0;
            border-top: 1px solid var(--navy-border);
          }
          .sidebar-footer-text {
            font-size: 11px;
            color: var(--text-muted);
            line-height: 1.7;
          }
          .main-content {
            flex: 1;
            min-width: 0;
            padding: 40px 48px;
            max-width: 960px;
          }
          @media (max-width: 768px) {
            .sidebar { display: none; }
            .main-content { padding: 24px 20px; }
          }
        `}</style>
      </body>
    </html>
  );
}

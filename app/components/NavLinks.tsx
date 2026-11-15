"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  plus: <path d="M12 5v14M5 12h14" />,
  clipboard: (
    <>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="2" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  box: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" />
    </>
  ),
};

const GROUPS: { label: string; links: { href: string; label: string; icon: keyof typeof ICONS }[] }[] = [
  {
    label: "Selling",
    links: [
      { href: "/new-sale", label: "New Sale", icon: "plus" },
      { href: "/sales", label: "Sales History", icon: "clipboard" },
    ],
  },
  {
    label: "Buying",
    links: [
      { href: "/new-purchase", label: "New Purchase", icon: "download" },
      { href: "/purchases", label: "Purchase History", icon: "box" },
    ],
  },
];

function closeMobileMenu() {
  const toggle = document.getElementById("sidebar-toggle") as HTMLInputElement | null;
  if (toggle) toggle.checked = false;
}

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav" aria-label="Main">
      {GROUPS.map((group) => (
        <div className="nav-group" key={group.label}>
          <div className="nav-group-label">{group.label}</div>
          {group.links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={closeMobileMenu}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {ICONS[link.icon]}
                </svg>
                {link.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity, ListOrdered, ScrollText, Radar, Microscope, Gauge,
  SlidersHorizontal, Star, Zap, ShieldAlert, Settings, Users,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Terminal", icon: Activity },
  { to: "/positions", label: "Positions", icon: ListOrdered },
  { to: "/market-scanner", label: "Market Scanner", icon: Radar },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/forensics", label: "Forensics", icon: Microscope },
  { to: "/performance", label: "Performance", icon: Gauge },
  { to: "/quick-actions", label: "Quick Actions", icon: Zap },
  { to: "/strategy-editor", label: "Strategy Editor", icon: SlidersHorizontal },
  { to: "/risk-parameters", label: "Risk Parameters", icon: ShieldAlert },
  { to: "/settings", label: "Agent Settings", icon: Settings },
  { to: "/audit-logs", label: "Audit Logs", icon: ScrollText },
  { to: "/admin", label: "Admin", icon: Users },
];

export default function NavSidebar() {
  const { pathname } = useLocation();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 lg:sticky lg:top-0 lg:h-screen lg:w-52 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-4">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`flex shrink-0 items-center gap-2 rounded-[4px] px-3 py-2 font-display text-[0.75rem] font-600 transition ${
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}
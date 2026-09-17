import React from "react";

export default function AutoTraderLogo({ size = 34, withWordmark = true }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="AutoTrader logo">
        <rect x="1" y="1" width="38" height="38" rx="9" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <path d="M8 27L15 18L21 23L32 10" stroke="hsl(var(--primary))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 10H32V16" stroke="hsl(var(--primary))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="15" cy="18" r="2.2" fill="hsl(var(--profit))" />
        <circle cx="21" cy="23" r="2.2" fill="hsl(var(--destructive))" />
      </svg>
      {withWordmark && (
        <div className="leading-none">
          <p className="font-display text-[1.0625rem] font-700 tracking-tight">
            AUTO<span className="text-primary">TRADER</span>
          </p>
          <p className="font-display text-[0.6875rem] tracking-[0.18em] text-muted-foreground">SOLANA AGENT</p>
        </div>
      )}
    </div>
  );
}
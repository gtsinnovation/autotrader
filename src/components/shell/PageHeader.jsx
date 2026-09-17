import React from "react";

export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
      <div>
        <h1 className="text-[1.5rem] font-600 tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-[0.8125rem] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
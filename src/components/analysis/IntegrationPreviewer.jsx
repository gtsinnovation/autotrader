import React, { useState } from "react";
import { recommendations } from "@/data/analysis";
import { Copy, Terminal } from "lucide-react";

export default function IntegrationPreviewer({ activeId, onSelect }) {
  const rec = recommendations.find((r) => r.id === activeId) || recommendations[0];
  const [copied, setCopied] = useState(false);

  const script = `#!/usr/bin/env bash
# Integration: ${rec.title}
# Impact ${rec.impact}/100 | Effort ${rec.effort}
set -euo pipefail

npx skills add GMGNAI/gmgn-skills
export GMGN_API_KEY="\${GMGN_API_KEY:?set your key}"
gmgn-cli market trending --chain sol --interval 1h --limit 3   # verify auth

git checkout -b feat/${rec.id}
${rec.how.map((s, i) => `# ${i + 1}. ${s}`).join("\n")}

docker compose run --rm --no-deps web python3 smoke_test_gmgn.py
docker compose run --rm --no-deps web python3 tests/run.py`;

  const copy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section id="previewer" className="rounded-[4px] border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="text-[1.25rem] font-600 tracking-tight">Patch Previewer</h2>
        <select
          value={rec.id}
          onChange={(e) => onSelect(e.target.value)}
          className="ml-auto rounded-[4px] border border-border bg-secondary px-2 py-1.5 font-display text-[0.75rem] text-foreground"
        >
          {recommendations.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-border lg:border-b-0 lg:border-r">
          <p className="px-4 py-2 font-display text-[0.75rem] uppercase tracking-wider text-muted-foreground">
            Proposed code
          </p>
          <pre className="max-h-[360px] overflow-auto px-4 pb-4 font-mono text-[0.75rem] leading-relaxed text-primary/90">
            {rec.patch}
          </pre>
        </div>
        <div>
          <div className="flex items-center gap-2 px-4 py-2">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="font-display text-[0.75rem] uppercase tracking-wider text-muted-foreground">Execution script</p>
            <button
              onClick={copy}
              className="ml-auto flex items-center gap-1.5 rounded-[4px] border border-primary/40 bg-primary/10 px-2 py-1 font-display text-[0.6875rem] font-600 text-primary"
            >
              <Copy className="h-3 w-3" /> {copied ? "COPIED" : "COPY"}
            </button>
          </div>
          <pre className="max-h-[360px] overflow-auto px-4 pb-4 font-mono text-[0.75rem] leading-relaxed text-muted-foreground">
            {script}
          </pre>
        </div>
      </div>
    </section>
  );
}
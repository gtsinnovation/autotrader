import React, { useMemo } from "react";
import DailyPnlChart from "@/components/trader/DailyPnlChart";
import AumPanel from "@/components/trader/AumPanel";
import ActiveExposureChart from "@/components/trader/ActiveExposureChart";

function dayKey(iso) {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function PerformanceDashboard({ positions }) {
  const { daily, aum, deployed, unrealized, realizedTotal, open } = useMemo(() => {
    const openPos = positions.filter((p) => p.status === "open");
    const closed = positions.filter((p) => p.status === "closed");

    const buckets = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    closed.forEach((p) => {
      const key = dayKey(p.closed_at || p.updated_date || p.created_date);
      if (key in buckets) buckets[key] += Number(p.realized_pnl_usd || 0);
    });

    const dep = openPos.reduce((s, p) => s + Number(p.allocated_usd || 0), 0);
    const unreal = openPos.reduce((s, p) => s + Number(p.unrealized_pnl_usd || 0), 0);
    const realized = closed.reduce((s, p) => s + Number(p.realized_pnl_usd || 0), 0);

    return {
      daily: Object.entries(buckets).map(([date, pnl]) => ({
        date: date.slice(5),
        pnl: Math.round(pnl * 100) / 100,
      })),
      aum: dep + unreal,
      deployed: dep,
      unrealized: unreal,
      realizedTotal: realized,
      open: openPos,
    };
  }, [positions]);

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DailyPnlChart data={daily} />
        </div>
        <AumPanel aum={aum} deployed={deployed} unrealized={unrealized} realized={realizedTotal} />
      </div>
      <ActiveExposureChart positions={open} />
    </section>
  );
}
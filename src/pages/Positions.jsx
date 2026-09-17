import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shell/PageHeader";
import PositionsPanel from "@/components/trader/PositionsPanel";
import ActiveExposureChart from "@/components/trader/ActiveExposureChart";

export default function Positions() {
  const [positions, setPositions] = useState([]);
  const [closingId, setClosingId] = useState(null);

  const load = useCallback(async () => {
    setPositions(await base44.entities.Position.list("-created_date", 100));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const close = async (id) => {
    setClosingId(id);
    await base44.functions.invoke("agentControl", { action: "close_position", position_id: id });
    await load();
    setClosingId(null);
  };

  const open = positions.filter((p) => p.status === "open");

  return (
    <main className="mx-auto max-w-[1300px] px-4 py-6 md:px-6">
      <PageHeader
        title="Trade Positions"
        subtitle="Open trades with entry price, ATR stop, take-profit target and trailing state — refreshed every 30 seconds."
      />
      <div className="space-y-5">
        <ActiveExposureChart positions={open} />
        <PositionsPanel positions={positions} onClose={close} closingId={closingId} />
      </div>
    </main>
  );
}
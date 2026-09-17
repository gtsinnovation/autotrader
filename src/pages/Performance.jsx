import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shell/PageHeader";
import PerformanceDashboard from "@/components/trader/PerformanceDashboard";
import ExecutionQualityPanel from "@/components/trader/ExecutionQualityPanel";

export default function Performance() {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    base44.entities.Position.list("-created_date", 200).then(setPositions);
  }, []);

  return (
    <main className="mx-auto max-w-[1300px] px-4 py-6 md:px-6">
      <PageHeader
        title="Execution Performance"
        subtitle="Realized results and pre-trade execution limits across every recorded trade."
      />
      <div className="space-y-5">
        <ExecutionQualityPanel positions={positions} />
        <PerformanceDashboard positions={positions} />
      </div>
    </main>
  );
}
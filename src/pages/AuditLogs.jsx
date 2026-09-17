import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shell/PageHeader";
import AuditPanel from "@/components/trader/AuditPanel";
import GuardAuditList from "@/components/trader/GuardAuditList";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [audits, setAudits] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [l, a] = await Promise.all([
        base44.entities.AuditLog.list("-created_date", 150),
        base44.entities.ExecutionAudit.list("-created_date", 50),
      ]);
      setLogs(l);
      setAudits(a);
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="mx-auto max-w-[1300px] px-4 py-6 md:px-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Every action the agent took, plus each policy-guard decision with its individual checks."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <GuardAuditList audits={audits} />
        <AuditPanel logs={logs} />
      </div>
    </main>
  );
}
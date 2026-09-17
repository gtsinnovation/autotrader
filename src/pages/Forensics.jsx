import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shell/PageHeader";
import ForensicsTable from "@/components/trader/ForensicsTable";

export default function Forensics() {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    base44.entities.TokenCandidate.list("-created_date", 30).then(setCandidates);
  }, []);

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6 md:px-6">
      <PageHeader
        title="Forensics Dashboard"
        subtitle="The weighted risk score for each candidate, broken into the measured components that produced it."
      />
      <ForensicsTable candidates={candidates} />
    </main>
  );
}
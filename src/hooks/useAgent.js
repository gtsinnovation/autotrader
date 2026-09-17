import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

// Single source for the agent config row plus the operator control channel.
export function useAgentConfig() {
  return useQuery({
    queryKey: ["agentConfig"],
    refetchInterval: 20000,
    queryFn: async () => (await base44.entities.AgentConfig.list("-created_date", 1))[0] || null
  });
}

export function useAgentControl(invalidateKeys = ["agentConfig"]) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const send = async (label, body) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("agentControl", body);
      const payload = res?.data || {};
      if (payload.error) toast({ title: label, description: payload.error, variant: "destructive" });
      else toast({ title: label, description: "Saved." });
      for (const key of invalidateKeys) await qc.invalidateQueries({ queryKey: [key] });
    } catch (err) {
      toast({ title: label, description: err.message, variant: "destructive" });
    }
    setBusy(false);
  };

  return { busy, send };
}
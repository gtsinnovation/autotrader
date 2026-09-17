import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Single source of truth for the agent config on every settings-style page.
export default function useAgentConfig() {
  const [config, setConfig] = useState(null);

  const reload = useCallback(async () => {
    const rows = await base44.entities.AgentConfig.list("-created_date", 1);
    setConfig(rows[0] || null);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveConfig = useCallback(
    async (patch) => {
      await base44.functions.invoke("agentControl", { action: "update_config", config: patch });
      await reload();
    },
    [reload]
  );

  return { config, reload, saveConfig };
}
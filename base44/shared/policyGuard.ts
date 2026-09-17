// Layer 2 of defense-in-depth around real signing, ported from
// signer_service/policy_guard.py.
//
// Layer 1: the gate pipeline (scanMarket) decides whether to ASK for execution.
// Layer 2: THIS MODULE re-derives every check from its own reads and trusts
//          nothing the caller claims about run state, the token, or the amount.
// Layer 3: whatever custody provider signs (its own enclave policy engine),
//          independent of every line of code here.
//
// This module only ever READS. It has no write path.

export async function checkExecutionAllowed(sr, { token_address, requested_usd, human_approved }) {
  const checks = [];
  const fail = (id, detail) => {
    checks.push({ id, passed: false, detail });
    return { allowed: false, reason: `${id}: ${detail}`, checks, signer_mode: null };
  };
  const pass = (id, detail) => checks.push({ id, passed: true, detail });

  const amount = Number(requested_usd);
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail("AMOUNT_POSITIVE", `requested amount must be positive, got ${requested_usd}`);
  }
  pass("AMOUNT_POSITIVE", `$${amount.toFixed(2)} requested`);

  if (!token_address || typeof token_address !== "string") {
    return fail("TOKEN_PRESENT", "no token address supplied");
  }
  pass("TOKEN_PRESENT", token_address);

  // The signer's own policy row — deliberately separate from AgentConfig, so the
  // trading policy the pipeline edits cannot widen the signing policy.
  const policies = await sr.entities.SignerPolicy.list("-created_date", 1);
  const policy = policies[0];
  if (!policy) {
    return fail("POLICY_READABLE", "no SignerPolicy row exists — refusing all execution until one is configured");
  }
  pass("POLICY_READABLE", "signer policy loaded");

  if (policy.execution_enabled !== true) {
    return fail("EXECUTION_ENABLED", "execution_enabled is false on the signer policy");
  }
  pass("EXECUTION_ENABLED", "signing switch on");

  const mode = policy.signer_mode || "disabled";
  if (mode === "disabled") {
    return fail("SIGNER_MODE", "signer_mode is disabled");
  }
  if (mode === "mainnet_swap") {
    return fail("SIGNER_MODE", "mainnet_swap is refused outright — real-money swap execution is not built");
  }
  pass("SIGNER_MODE", mode);

  const allowlist = policy.allowed_execution_tokens || [];
  if (allowlist.length === 0) {
    return fail("TOKEN_ALLOWLIST", "allowed_execution_tokens is empty — refusing all execution until it is configured");
  }
  if (!allowlist.includes(token_address)) {
    return fail("TOKEN_ALLOWLIST", `${token_address} is not on the signer allowlist`);
  }
  pass("TOKEN_ALLOWLIST", "token allowlisted");

  const maxTrade = Number(policy.max_trade_usd || 0);
  if (!(maxTrade > 0)) {
    return fail("MAX_TRADE_USD", "max_trade_usd is unset or zero — refusing all execution until it is configured");
  }
  if (amount > maxTrade) {
    return fail("MAX_TRADE_USD", `requested $${amount.toFixed(2)} exceeds the signer's max_trade_usd ($${maxTrade.toFixed(2)})`);
  }
  pass("MAX_TRADE_USD", `within $${maxTrade.toFixed(2)} per-trade cap`);

  // Human-approval threshold: the caller cannot approve its own trade by
  // claiming approval — the flag must come from an interactive request, and
  // above the threshold an unapproved request is refused.
  const threshold = Number(policy.human_approval_over_usd || 0);
  if (threshold > 0 && amount > threshold) {
    if (human_approved !== true) {
      return fail("HUMAN_APPROVAL", `$${amount.toFixed(2)} is over the $${threshold.toFixed(2)} human-approval threshold and was not approved`);
    }
    pass("HUMAN_APPROVAL", "human approval present");
  }

  // Re-derive run state from the agent config rather than believing the caller.
  const configs = await sr.entities.AgentConfig.list("-created_date", 1);
  const config = configs[0];
  if (!config) {
    return fail("RUN_STATE", "no AgentConfig row — cannot verify kill switch, refusing");
  }
  if (config.kill_switch === true) {
    return fail("RUN_STATE", "kill switch is engaged — trading is halted");
  }
  pass("RUN_STATE", "kill switch clear");

  if (config.mev_protection !== true) {
    return fail("MEV_PROTECTION", "MEV protection is off — unprotected submission is an invalid configuration, not a tuning option");
  }
  pass("MEV_PROTECTION", "protected submission required");

  const cap = config.capital_cap_usd;
  if (cap === null || cap === undefined) {
    if (policy.require_capital_cap !== false) {
      return fail("CAPITAL_CAP", "capital_cap_usd is not configured — refusing to execute against an unbounded capital limit");
    }
    pass("CAPITAL_CAP", "no cap configured (explicitly waived)");
  } else {
    const open = await sr.entities.Position.filter({ status: "open" });
    const deployed = open.reduce((sum, p) => sum + Number(p.allocated_usd || 0), 0);
    if (deployed + amount > Number(cap)) {
      return fail(
        "CAPITAL_CAP",
        `requested $${amount.toFixed(2)} would push deployed capital to $${(deployed + amount).toFixed(2)}, over the $${Number(cap).toFixed(2)} cap`
      );
    }
    pass("CAPITAL_CAP", `$${deployed.toFixed(2)} deployed of $${Number(cap).toFixed(2)} cap`);
  }

  return { allowed: true, reason: "all checks passed", checks, signer_mode: mode };
}
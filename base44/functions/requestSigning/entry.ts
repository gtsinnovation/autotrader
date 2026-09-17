import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { checkExecutionAllowed } from '../../shared/policyGuard.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const sr = base44.asServiceRole;

    const result = await checkExecutionAllowed(sr, {
      token_address: body.token_address,
      requested_usd: body.requested_usd,
      human_approved: body.human_approved === true,
    });

    // Every attempt is audited, approved or refused.
    await sr.entities.ExecutionAudit.create({
      token_address: body.token_address || 'unknown',
      symbol: body.symbol || '',
      requested_usd: Number(body.requested_usd) || 0,
      allowed: result.allowed,
      reason: result.reason,
      signer_mode: result.signer_mode || 'refused',
      requested_by: user.email,
      checks: result.checks,
    });

    await sr.entities.AuditLog.create({
      action: result.allowed ? 'SIGNING_APPROVED' : 'SIGNING_REFUSED',
      severity: result.allowed ? 'info' : 'warn',
      token_address: body.token_address || '',
      symbol: body.symbol || '',
      detail: result.reason,
      amount_usd: Number(body.requested_usd) || 0,
    });

    // No transaction is signed here. The guard is the gate; a custody provider
    // is the only thing that may hold a key, and none is wired.
    return Response.json({
      allowed: result.allowed,
      reason: result.reason,
      checks: result.checks,
      signer_mode: result.signer_mode,
      signed: false,
      note: 'Guard decision only — no signer is connected, so nothing was broadcast.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
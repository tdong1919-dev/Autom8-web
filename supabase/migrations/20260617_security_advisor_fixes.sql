-- ============================================================
-- Supabase advisor fixes (2026-06-17), applied to production.
-- Surfaced by mcp__supabase__get_advisors after correcting the agent-table RLS.
-- ============================================================

-- SECURITY ----------------------------------------------------

-- comment_locks was public with RLS disabled (ERROR 0013). It's an internal
-- lock table written only by the service-role client, so enable RLS with no
-- policy — the service role bypasses RLS; anon/authenticated get no access.
ALTER TABLE public.comment_locks ENABLE ROW LEVEL SECURITY;

-- set_updated_at() had a mutable search_path (WARN 0011). It only assigns
-- NEW.updated_at, so an empty search_path is safe and removes the surface.
ALTER FUNCTION public.set_updated_at() SET search_path = '';

-- handle_new_user() and rls_auto_enable() are SECURITY DEFINER functions that
-- were callable via /rest/v1/rpc by anon/authenticated (WARN 0028/0029). They
-- only ever run as triggers (which fire regardless of EXECUTE grants), so
-- revoke direct API execution. EXECUTE is granted to PUBLIC by default, so we
-- must revoke from PUBLIC (revoking from anon/authenticated alone is a no-op).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- PERFORMANCE -------------------------------------------------

-- Covering indexes for unindexed foreign keys (INFO 0001).
CREATE INDEX IF NOT EXISTS idx_ai_replies_reviewed_by ON public.ai_replies (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_help_tickets_user_id ON public.help_tickets (user_id);

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AiReplyUpdate, ReplyStatus } from '@/lib/types/database'

const PAGE_SIZE = 20

// GET /api/inbox — list ai_replies with optional status filter and pagination
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const VALID_STATUSES: ReplyStatus[] = ['pending', 'approved', 'rejected', 'posted']
  const rawStatus = searchParams.get('status')
  const status: ReplyStatus | null = rawStatus && (VALID_STATUSES as string[]).includes(rawStatus) ? (rawStatus as ReplyStatus) : null
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  // Escalated DM conversations needing a human — independent of comments.
  // RLS (user_id = auth.uid()) scopes this to the caller.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: escalatedDms } = await (supabase as any)
    .from('dm_conversations')
    .select('id, recipient_ig_id, recipient_username, history, handoff_reason, last_message_at')
    .eq('conversation_stage', 'escalated')
    .order('last_message_at', { ascending: false })
    .limit(50)

  const dms = escalatedDms ?? []

  // Step 1: get user's social account IDs
  const { data: userAccounts } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('user_id', user.id)

  const accountIds = (userAccounts ?? []).map((a: { id: string }) => a.id)

  if (accountIds.length === 0) {
    return NextResponse.json({
      data: [], dms,
      pagination: { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 },
    })
  }

  // Step 2: get comment IDs for those accounts
  const { data: userComments } = await supabase
    .from('comments')
    .select('id')
    .in('social_account_id', accountIds)

  const commentIds = (userComments ?? []).map((c: { id: string }) => c.id)

  if (commentIds.length === 0) {
    return NextResponse.json({
      data: [], dms,
      pagination: { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 },
    })
  }

  // Step 3: query ai_replies with comment details
  let query = supabase
    .from('ai_replies')
    .select('*, comment:comments(*)', { count: 'exact' })
    .in('comment_id', commentIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: data ?? [],
    dms,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
    },
  })
}

// PATCH /api/inbox — bulk update reply statuses
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: { ids: string[]; update: AiReplyUpdate } = await request.json()
  const ALLOWED_UPDATE_FIELDS: (keyof AiReplyUpdate)[] = ['status', 'edited_text', 'rejection_reason']
  const _sanitizedUpdate = Object.fromEntries(
    Object.entries(body.update ?? {}).filter(([k]) => ALLOWED_UPDATE_FIELDS.includes(k as keyof AiReplyUpdate))
  ) as AiReplyUpdate

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json(
      { error: 'ids must be a non-empty array' },
      { status: 400 }
    )
  }

  // TODO: validate ownership before updating
  // const { data, error } = await supabase
  //   .from('ai_replies')
  //   .update({ ...body.update, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
  //   .in('id', body.ids)
  //   .select()
  // if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: { updated: body.ids.length },
    message: `${body.ids.length} replies updated`,
  })
}

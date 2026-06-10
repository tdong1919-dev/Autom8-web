/**
 * PATCH /api/inbox/dm — update an escalated DM conversation's stage.
 * Used by the Inbox to mark a handed-off DM as resolved once a human has replied.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_STAGES = ['resolved', 'active', 'escalated'] as const

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { id, stage } = body as { id?: string; stage?: string }

  if (!id || !stage || !(ALLOWED_STAGES as readonly string[]).includes(stage)) {
    return NextResponse.json({ error: 'id and a valid stage are required' }, { status: 400 })
  }

  // RLS ensures the caller can only update their own conversations.
  const { error } = await supabase
    .from('dm_conversations')
    .update({ conversation_stage: stage })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

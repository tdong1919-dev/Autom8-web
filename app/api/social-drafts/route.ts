import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 30

// GET /api/social-drafts
// Query params: platform, brand_route, approval_status, page
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const platform      = searchParams.get('platform')      // 'x' | 'reddit'
  const brand_route   = searchParams.get('brand_route')   // 'Autom8' | 'Aurumverse' | 'Bare Branding Systems'
  const status        = searchParams.get('status')        // approval_status value
  const page          = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const offset        = (page - 1) * PAGE_SIZE

  const VALID_STATUSES = ['pending_review', 'approved', 'rejected', 'posted', 'revised']
  const VALID_PLATFORMS = ['x', 'reddit']
  const VALID_BRANDS = ['Autom8', 'Aurumverse', 'Bare Branding Systems', 'none']

  let query = supabase
    .from('social_drafts')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (platform && VALID_PLATFORMS.includes(platform)) {
    query = query.eq('platform', platform)
  }
  if (brand_route && VALID_BRANDS.includes(brand_route)) {
    query = query.eq('brand_route', brand_route)
  }
  if (status && VALID_STATUSES.includes(status)) {
    query = query.eq('approval_status', status)
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
    },
  })
}

// PATCH /api/social-drafts
// Body: { id, approval_status, reviewer_notes?, posted_url? }
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, approval_status, reviewer_notes, posted_url } = body

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const VALID_STATUSES = ['pending_review', 'approved', 'rejected', 'posted', 'revised']
  if (!approval_status || !VALID_STATUSES.includes(approval_status)) {
    return NextResponse.json({ error: 'Invalid approval_status' }, { status: 400 })
  }

  const updatePayload: Record<string, unknown> = {
    approval_status,
    reviewed_at: new Date().toISOString(),
  }
  if (reviewer_notes !== undefined) updatePayload.reviewer_notes = reviewer_notes
  if (posted_url !== undefined)     updatePayload.posted_url     = posted_url
  if (approval_status === 'posted') updatePayload.posted_at      = new Date().toISOString()

  const { data, error } = await supabase
    .from('social_drafts')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)   // ownership check
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

// POST /api/social-drafts — create a draft (used by agent runtime / n8n webhook)
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const required = ['platform', 'draft_content']
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('social_drafts')
    .insert({
      user_id:               user.id,
      platform:              body.platform,
      source_url:            body.source_url,
      source_account:        body.source_account,
      subreddit:             body.subreddit,
      topic:                 body.topic,
      thread_topic:          body.thread_topic,
      user_pain_point:       body.user_pain_point,
      topic_domain:          body.topic_domain,
      brand_route:           body.brand_route,
      link_to_include:       body.link_to_include,
      handle_to_include:     body.handle_to_include,
      routing_confidence:    body.routing_confidence,
      reason_for_route:      body.reason_for_route,
      draft_content:         body.draft_content,
      draft_type:            body.draft_type,
      suggested_action:      body.suggested_action,
      engagement_level:      body.engagement_level,
      audience_relevance:    body.audience_relevance,
      risk_level:            body.risk_level,
      promotional_risk_score: body.promotional_risk_score,
      risk_notes:            body.risk_notes,
      approval_status:       'pending_review',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}

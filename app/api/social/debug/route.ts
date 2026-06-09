/**
 * Temporary debug endpoint — remove before public launch.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = createServiceClient() as any

  const { data: brand } = await svc
    .from('brand_profiles')
    .select('ig_business_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: existing } = await svc
    .from('social_accounts')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  // Simulate the state that gets encoded in the OAuth flow
  const simulatedState = {
    userId: user.id,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?social_connected=true`,
  }

  return NextResponse.json({
    session_user_id: user.id,
    simulated_state_userId: simulatedState.userId,
    brand_ig_business_id: brand?.ig_business_id ?? null,
    existing_social_account: existing,
    diagnosis: !brand?.ig_business_id
      ? 'PROBLEM: brand has no ig_business_id — callback will skip save'
      : existing
      ? 'Row exists — callback would UPDATE'
      : 'No row yet — callback would INSERT',
  })
}

// POST — manually save social account using current session (bootstrap fix)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = createServiceClient() as any

  const { data: brand } = await svc
    .from('brand_profiles')
    .select('ig_business_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const igBusinessId = brand?.ig_business_id
  if (!igBusinessId) return NextResponse.json({ error: 'No ig_business_id on brand profile' }, { status: 400 })

  // Get IG profile
  const igRes = await fetch(
    `https://graph.facebook.com/v23.0/${igBusinessId}?fields=username,profile_picture_url&access_token=${token}`
  )
  const igProfile = await igRes.json()

  const { data: existing } = await svc
    .from('social_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('platform', 'instagram')
    .maybeSingle()

  const payload = {
    user_id: user.id,
    platform: 'instagram',
    external_account_id: igBusinessId,
    page_token_encrypted: token,
    page_id: null,
    username: igProfile.username ?? null,
    profile_picture_url: igProfile.profile_picture_url ?? null,
    connected_at: new Date().toISOString(),
    status: 'active',
  }

  const { data: saved, error: saveError } = existing
    ? await svc.from('social_accounts').update(payload).eq('id', existing.id).select().single()
    : await svc.from('social_accounts').insert(payload).select().single()

  if (saveError) return NextResponse.json({ error: saveError.message, details: saveError }, { status: 500 })

  return NextResponse.json({ success: true, saved })
}

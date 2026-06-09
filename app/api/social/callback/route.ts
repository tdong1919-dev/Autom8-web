import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/social/callback — Meta OAuth code exchange, stores tokens in Supabase directly
export async function GET(request: NextRequest) {
  const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID ?? '1859085634713050'
  const FB_APP_SECRET = process.env.FB_APP_SECRET ?? ''
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`
  const REDIRECT_URI = `${APP_URL}/api/social/callback`
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(new URL(`/dashboard?social_error=${encodeURIComponent(errorParam)}`, APP_URL))
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard?social_error=missing_params', APP_URL))
  }

  let stateData: { userId: string; returnUrl?: string }
  try {
    stateData = JSON.parse(decodeURIComponent(state))
  } catch {
    return NextResponse.redirect(new URL('/dashboard?social_error=invalid_state', APP_URL))
  }

  // Use session user as the authoritative userId (state can be tampered)
  // Fall back to state userId if no session (e.g. cookie not passed in redirect)
  const sessionSupabase = await createClient()
  const { data: { user: sessionUser } } = await sessionSupabase.auth.getUser()
  const userId = sessionUser?.id ?? stateData.userId
  console.log('[callback] userId from session:', sessionUser?.id, '| from state:', stateData.userId)

  try {
    // 1. Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v23.0/oauth/access_token?` +
      `client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code=${code}`
    )
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('No access token returned')

    // 2. Exchange for long-lived token (60-day)
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v23.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&client_id=${FB_APP_ID}` +
      `&client_secret=${FB_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
    )
    const longLivedData = await longLivedRes.json()
    const longToken = longLivedData.access_token ?? tokenData.access_token

    // 3. Get connected Facebook Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v23.0/me/accounts?access_token=${longToken}`
    )
    const pagesData = await pagesRes.json()
    const pages: Array<{ id: string; name: string; access_token: string }> = pagesData.data ?? []
    console.log('[callback] pages found:', pages.length, JSON.stringify(pagesData).slice(0, 200))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = createServiceClient() as any

    let savedIgBusinessId: string | null = null

    for (const page of pages) {
      const igRes = await fetch(
        `https://graph.facebook.com/v23.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      )
      const igData = await igRes.json()
      const igBusinessId = igData.instagram_business_account?.id
      console.log('[callback] page', page.id, 'ig_business_id:', igBusinessId)
      if (!igBusinessId) continue

      await saveAccount(svc, userId, igBusinessId, page.access_token, page.id)
      savedIgBusinessId = igBusinessId
      break // one IG account is enough
    }

    // Fallback: if pages loop saved nothing, use the known IG business ID with user token
    if (!savedIgBusinessId) {
      const { data: brand } = await svc
        .from('brand_profiles')
        .select('ig_business_id')
        .eq('user_id', userId)
        .maybeSingle()

      const igBusinessId = brand?.ig_business_id
      console.log('[callback] fallback ig_business_id:', igBusinessId, 'userId:', userId)

      if (igBusinessId) {
        await saveAccount(svc, userId, igBusinessId, longToken, null)
        savedIgBusinessId = igBusinessId
      }
    }

    console.log('[callback] final savedIgBusinessId:', savedIgBusinessId)
    return NextResponse.redirect(new URL('/dashboard?social_connected=true', APP_URL))
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(new URL('/dashboard?social_error=token_exchange_failed', APP_URL))
  }
}

async function saveAccount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  userId: string,
  igBusinessId: string,
  token: string,
  pageId: string | null
): Promise<void> {
  // Get IG profile details
  const igProfileRes = await fetch(
    `https://graph.facebook.com/v23.0/${igBusinessId}?fields=username,profile_picture_url&access_token=${token}`
  )
  const igProfile = await igProfileRes.json()
  console.log('[callback] ig profile:', igProfile.username ?? igProfile.error?.message)

  // Check for existing row
  const { data: existing } = await svc
    .from('social_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('platform', 'instagram')
    .maybeSingle()

  const payload = {
    user_id: userId,
    platform: 'instagram',
    external_account_id: igBusinessId,
    page_token_encrypted: token,
    page_id: pageId,
    username: igProfile.username ?? null,
    profile_picture_url: igProfile.profile_picture_url ?? null,
    connected_at: new Date().toISOString(),
    status: 'active',
  }

  const { error } = existing
    ? await svc.from('social_accounts').update(payload).eq('id', existing.id)
    : await svc.from('social_accounts').insert(payload)

  console.log('[callback] saveAccount error:', error ? JSON.stringify(error) : 'none')
  if (error) throw new Error(`saveAccount failed: ${JSON.stringify(error)}`)

  // Update brand_profiles
  await svc.from('brand_profiles').update({
    ig_business_id: igBusinessId,
    ig_username: igProfile.username ?? null,
  }).eq('user_id', userId)
}

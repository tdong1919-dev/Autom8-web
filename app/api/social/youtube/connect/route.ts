/**
 * GET /api/social/youtube/connect
 * Kicks off the one-time Google OAuth consent so Autom8 can upload to the
 * connected YouTube channel. Requests offline access to capture a refresh token.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`
  const redirectUri = `${appUrl}/api/social/youtube/callback`

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID ?? '')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
  ].join(' '))
  authUrl.searchParams.set('access_type', 'offline')   // get a refresh token
  authUrl.searchParams.set('prompt', 'consent')         // force refresh token issuance
  authUrl.searchParams.set('include_granted_scopes', 'true')
  authUrl.searchParams.set('state', user.id)

  return NextResponse.redirect(authUrl.toString())
}

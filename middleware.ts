import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const protectedPaths = [
  '/dashboard',
  '/inbox',
  '/settings',
  '/billing',
  '/analytics',
  '/scheduler',
  '/onboarding',
  '/brand-setup',
  '/account',
  '/help',
  '/waitlist-access',
  '/blog-admin',
]

const authPaths = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const { pathname } = request.nextUrl

  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isAuthPage = authPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPage && user) {
    const dashUrl = request.nextUrl.clone()
    dashUrl.pathname = '/dashboard'
    dashUrl.search = ''
    return NextResponse.redirect(dashUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

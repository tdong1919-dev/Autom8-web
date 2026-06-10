/**
 * Publisher trigger — POST to publish all due scheduled posts.
 * Called by Vercel Cron (every minute) or manually.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runPublisher } from '@/lib/agent/publisher'

// Publishing downloads media and uploads to platforms (esp. video) — allow
// the longest window the plan permits.
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runPublisher()
  return NextResponse.json({ success: true, ...result })
}

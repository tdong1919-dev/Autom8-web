/**
 * Smart Scheduler trigger — POST to run AI scheduling for all queued posts.
 * Called by Vercel Cron (hourly) or manually by admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runSmartScheduler } from '@/lib/agent/scheduler'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runSmartScheduler()
  return NextResponse.json({ success: true, ...result })
}

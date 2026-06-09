import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUsage, getUsageHistory } from '@/lib/actions/usage'

// GET /api/usage — return current billing period usage and plan limit
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [summary, history] = await Promise.all([
    getCurrentUsage(user.id),
    getUsageHistory(user.id, 30).catch(() => ({ daily: [], totalInRange: 0 })),
  ])

  const dailyCounts = history.daily.map(d => d.count)

  return NextResponse.json({
    used: summary.used,
    limit: summary.limit,
    billingPeriodStart: summary.billingPeriodStart,
    billingPeriodEnd: summary.billingPeriodEnd,
    percentUsed: summary.percentUsed,
    dailyCounts,
  })
}

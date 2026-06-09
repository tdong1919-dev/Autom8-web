/**
 * Usage gate — check plan limit and increment counter.
 * Multi-tenant: scoped to user_id + billing period.
 */

import { createServiceClient } from '@/lib/supabase/service'

export interface UsageStatus {
  can_run: boolean
  used_this_month: number
  plan_limit: number
  remaining: number
}

export async function checkAndIncrementUsage(userId: string, eventType: string = 'reply_generated'): Promise<UsageStatus> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Get current month usage count
  const { count: used } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('billing_period_start', periodStart)

  // Get plan limit
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('reply_limit, status')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .maybeSingle()

  const plan_limit = sub?.reply_limit ?? 500
  const used_this_month = used ?? 0
  const can_run = used_this_month < plan_limit

  if (can_run) {
    await supabase.from('usage_events').insert({
      user_id: userId,
      event_type: eventType as 'reply_generated' | 'reply_posted',
      billing_period_start: periodStart,
    })
  }

  return {
    can_run,
    used_this_month,
    plan_limit,
    remaining: Math.max(plan_limit - used_this_month, 0),
  }
}

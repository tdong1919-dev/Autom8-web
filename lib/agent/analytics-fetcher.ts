/**
 * Analytics Fetcher
 * Replicates: SS F2 Analytics (Instagram focus)
 *
 * Fetches IG media analytics for all active accounts,
 * normalizes and stores in platform_analytics table.
 */

import { createServiceClient } from '@/lib/supabase/service'

interface AnalyticsResult {
  accounts_processed: number
  posts_stored: number
  errors: number
}

export async function runAnalyticsFetch(): Promise<AnalyticsResult> {
  const supabase = createServiceClient()
  let accounts_processed = 0, posts_stored = 0, errors = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: accounts } = await (supabase as any)
    .from('social_accounts')
    .select('id, user_id, external_account_id, page_token_encrypted, platform')
    .eq('status', 'active')
    .not('page_token_encrypted', 'is', null) as { data: Array<{ id: string; user_id: string; external_account_id: string | null; page_token_encrypted: string | null; platform: string }> | null }

  if (!accounts?.length) return { accounts_processed: 0, posts_stored: 0, errors: 0 }

  for (const account of accounts) {
    accounts_processed++
    try {
      if (account.platform === 'instagram' || account.platform === 'facebook') {
        const count = await fetchInstagramAnalytics(
          account.user_id,
          account.id,
          account.external_account_id!,
          account.page_token_encrypted!
        )
        posts_stored += count
      }
    } catch {
      errors++
    }
  }

  return { accounts_processed, posts_stored, errors }
}

async function fetchInstagramAnalytics(
  userId: string,
  socialAccountId: string,
  igBusinessId: string,
  pageToken: string
): Promise<number> {
  const supabase = createServiceClient()

  const res = await fetch(
    `https://graph.facebook.com/v23.0/${igBusinessId}/media?` +
    `fields=id,caption,media_type,timestamp,like_count,comments_count&` +
    `access_token=${pageToken}&limit=50`
  )

  if (!res.ok) return 0

  const { data: posts } = await res.json()
  if (!Array.isArray(posts)) return 0

  let count = 0
  for (const post of posts) {
    const postedTime = post.timestamp ? new Date(post.timestamp) : null
    const likes = post.like_count ?? 0
    const comments = post.comments_count ?? 0
    const engagementScore = likes + comments

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('platform_analytics').upsert({
      user_id: userId,
      social_account_id: socialAccountId,
      platform: 'instagram',
      post_id: post.id,
      posted_time: post.timestamp ?? null,
      date: postedTime?.toISOString().slice(0, 10) ?? null,
      hour: postedTime?.getHours() ?? null,
      day_of_week: postedTime?.toLocaleDateString('en-US', { weekday: 'long' }) ?? null,
      caption: post.caption ?? '',
      media_type: post.media_type ?? '',
      likes,
      comments,
      engagement_score: engagementScore,
      performance_score: engagementScore,
      raw_metrics: post,
    }, { onConflict: 'user_id,platform,post_id' })

    if (!error) count++
  }

  return count
}

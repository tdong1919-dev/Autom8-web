/**
 * Smart Scheduler Agent
 * Replicates: SS F3 Smart Scheduler Engine
 *
 * For each queued post (per user), uses GPT to pick the best
 * posting time based on content metadata + recent analytics.
 * Multi-tenant: processes all users' queued content.
 */

import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/service'

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface SchedulerResult {
  processed: number
  scheduled: number
  errors: number
}

export async function runSmartScheduler(): Promise<SchedulerResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  let processed = 0, scheduled = 0, errors = 0

  // Get all queued posts across all users
  const { data: queuedPosts } = await supabase
    .from('content_queue')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })

  if (!queuedPosts?.length) return { processed: 0, scheduled: 0, errors: 0 }

  for (const post of queuedPosts) {
    processed++
    try {
      // Get recent analytics for this user+platform to inform scheduling
      const { data: analytics } = await supabase
        .from('platform_analytics')
        .select('day_of_week, hour, engagement_score, media_type')
        .eq('user_id', post.user_id)
        .eq('platform', post.platform)
        .order('fetched_at', { ascending: false })
        .limit(30)

      const decision = await getSchedulingDecision(post, analytics ?? [])

      await supabase
        .from('content_queue')
        .update({
          status: 'scheduled',
          scheduled_time: decision.scheduled_time,
          schedule_reason: decision.schedule_reason,
          confidence_score: decision.confidence_score,
        })
        .eq('id', post.id)

      scheduled++
    } catch {
      errors++
    }
  }

  return { processed, scheduled, errors }
}

async function getSchedulingDecision(
  post: Record<string, unknown>,
  analytics: Array<{ day_of_week: string | null; hour: number | null; engagement_score: number | null; media_type: string | null }>
) {
  const prompt = `Content Queue Item:
${JSON.stringify({
  content_type: post.content_type,
  platform: post.platform,
  caption_preview: String(post.caption ?? '').slice(0, 100),
  emotional_tone: post.emotional_tone,
  hook_strength: post.hook_strength,
  engagement_prediction: post.engagement_prediction,
  best_posting_window: post.best_posting_window,
  ideal_days: post.ideal_days,
  virality_probability: post.virality_probability,
}, null, 2)}

Recent Analytics (top engaging posts by day/hour):
${JSON.stringify(analytics.slice(0, 10), null, 2)}

Rules:
- Schedule within the next 7 days from now: ${new Date().toISOString()}
- Prefer content's ideal_days and best_posting_window when available
- Use analytics engagement_score, hour, and day_of_week to find stronger times
- Return scheduled_time in ISO 8601 format
- Use America/New_York timezone

Return ONLY valid JSON with fields: scheduled_time, schedule_reason, confidence_score`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: "You are Autom8's Smart Scheduling Engine. Return ONLY valid JSON. No markdown. No explanation.",
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 200,
    temperature: 0.3,
  })

  const raw = response.choices[0]?.message?.content?.trim() ?? '{}'
  try {
    return JSON.parse(raw)
  } catch {
    // fallback: schedule 24h from now at 9am EST
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return {
      scheduled_time: tomorrow.toISOString(),
      schedule_reason: 'Default scheduling — analytics parsing failed',
      confidence_score: 0.5,
    }
  }
}

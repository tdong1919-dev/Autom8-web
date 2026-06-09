/**
 * Comment Responder Agent
 * Replicates: Autom8 Client Acquisition MAIN Workflow (comment branch)
 *
 * Flow:
 * 1. Deduplicate via comment_processing_log
 * 2. Check usage gate
 * 3. Classify comment (auto-reply vs human review)
 * 4. Generate AI reply (brand-voice aware)
 * 5. Check DM trigger keywords
 * 6. Auto-post reply OR queue for human review
 * 7. Optionally send DM
 */

import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/service'
import type { BrandBrain } from './brand-brain'
import { checkAndIncrementUsage } from './usage'

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface CommentEvent {
  ig_business_id: string
  comment_id: string
  comment_text: string
  commenter_id: string
  commenter_username: string | null
  page_id: string | null
  post_id: string | null
  is_self_comment: boolean
}

async function fetchPostCaption(postId: string, pageToken: string): Promise<string | null> {
  if (!postId || !pageToken) return null
  try {
    const res = await fetch(
      `https://graph.facebook.com/v23.0/${postId}?fields=caption,media_type&access_token=${pageToken}`
    )
    const data = await res.json()
    return data.caption ?? null
  } catch {
    return null
  }
}

interface ReplyResult {
  status: 'auto_posted' | 'queued_review' | 'skipped' | 'limit_reached' | 'duplicate'
  reply_text?: string
  dm_queued?: boolean
}

export async function handleComment(event: CommentEvent, brand: BrandBrain): Promise<ReplyResult> {
  // DEBUG: Log brand config
  console.log('[handleComment] comment:', event.comment_text, 'dm_enabled:', brand.dm_enabled, 'keywords:', brand.dm_trigger_keywords, 'template:', brand.dm_template?.slice(0, 30))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  // 1. Deduplicate
  const { error: dedupError } = await supabase
    .from('comment_processing_log')
    .insert({
      ig_business_id: event.ig_business_id,
      comment_id: event.comment_id,
      comment_text: event.comment_text,
      reply_status: 'processing',
    })

  if (dedupError) {
    // unique constraint violation = already processed
    return { status: 'duplicate' }
  }

  // 2. Usage gate
  const usage = await checkAndIncrementUsage(brand.user_id)
  if (!usage.can_run) {
    await supabase
      .from('comment_processing_log')
      .update({ reply_status: 'skipped' })
      .eq('ig_business_id', event.ig_business_id)
      .eq('comment_id', event.comment_id)
    return { status: 'limit_reached' }
  }

  // 3. Fetch post caption for context
  const postCaption = event.post_id && brand.page_token
    ? await fetchPostCaption(event.post_id, brand.page_token)
    : null

  // 4. Classify — check escalation conditions
  const route = classifyComment(event.comment_text, brand)

  // 5. Check DM keyword trigger (needed before generating reply)
  const shouldDm = brand.dm_enabled && checkDmTrigger(event.comment_text, brand)

  // 6. Generate reply — use buying-intent shortcuts before hitting AI
  const replyText = await generateReply(event.comment_text, brand, route === 'human_review', postCaption, shouldDm)

  // 6. Store in comments + ai_replies tables
  const { data: commentRow } = await supabase
    .from('comments')
    .upsert({
      social_account_id: brand.social_account_id!,
      external_comment_id: event.comment_id,
      commenter_username: event.commenter_username,
      comment_text: event.comment_text,
    }, { onConflict: 'external_comment_id' })
    .select('id')
    .single()

  if (commentRow) {
    await supabase.from('ai_replies').insert({
      comment_id: commentRow.id,
      draft_text: replyText,
      status: route === 'human_review' ? 'pending' : 'approved',
    })
  }

  // 7. If auto-reply, post to IG Graph API
  if (route === 'auto_reply' && brand.page_token) {
    const posted = await postReplyToInstagram(event.comment_id, replyText, brand.page_token)
    if (posted) {
      await supabase
        .from('comment_processing_log')
        .update({ reply_status: 'replied', response_text: replyText })
        .eq('ig_business_id', event.ig_business_id)
        .eq('comment_id', event.comment_id)

      if (shouldDm && brand.page_token) {
        await sendDmFromComment(event, brand, replyText, postCaption)
      }

      return { status: 'auto_posted', reply_text: replyText, dm_queued: shouldDm }
    }
  }

  await supabase
    .from('comment_processing_log')
    .update({ reply_status: 'replied', response_text: replyText })
    .eq('ig_business_id', event.ig_business_id)
    .eq('comment_id', event.comment_id)

  return { status: 'queued_review', reply_text: replyText, dm_queued: shouldDm }
}

function classifyComment(text: string, brand: BrandBrain): 'auto_reply' | 'human_review' {
  const escalationTriggers = [
    'refund', 'cancel', 'billing', 'charge', 'lawsuit', 'legal', 'fraud',
    'scam', 'hate', 'threat', 'harassment', 'human', 'manager', 'supervisor',
  ]
  const lower = text.toLowerCase()
  if (escalationTriggers.some(t => lower.includes(t))) return 'human_review'
  if (brand.escalation_rules) {
    const customTriggers = brand.escalation_rules.toLowerCase()
    if (escalationTriggers.some(t => customTriggers.includes(t) && lower.includes(t))) return 'human_review'
  }
  return 'auto_reply'
}

function checkDmTrigger(text: string, brand: BrandBrain): boolean {
  if (!brand.dm_trigger_keywords?.length) return false
  const lower = text.toLowerCase()
  const mode = brand.dm_trigger_mode ?? 'keyword'
  if (mode === 'always') return true
  return brand.dm_trigger_keywords.some(kw => lower.includes(kw.toLowerCase()))
}

// Buying intent keywords trigger template-based DMs (v2)
const BUYING_INTENT = [
  'sign up', 'signup', 'how do i', 'how to', 'get started', 'start', 'join',
  'price', 'pricing', 'how much', 'cost', 'plan', 'plans', 'subscribe',
  'trial', 'free trial', 'demo', 'try', 'interested', 'want this', 'need this',
  'where', 'link', 'info', 'learn more', 'more info', 'details',
]

function detectBuyingIntent(text: string): boolean {
  const lower = text.toLowerCase()
  return BUYING_INTENT.some(kw => lower.includes(kw))
}

async function generateReply(
  commentText: string,
  brand: BrandBrain,
  isHumanReview: boolean,
  postCaption: string | null,
  dmWillBeSent: boolean
): Promise<string> {
  // TEMPLATE-ONLY replies (no AI). If DM will be sent, confirm it. Otherwise use generic thank you.
  if (!isHumanReview && dmWillBeSent) {
    return 'Just sent you the details — check your DMs! 🙌'
  }
  return 'Thanks for reaching out! Check your DMs for more info. 😊'
}

async function postReplyToInstagram(commentId: string, message: string, pageToken: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v23.0/${commentId}/replies`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ message, access_token: pageToken }),
      }
    )
    return res.ok
  } catch {
    return false
  }
}

async function sendDmFromComment(event: CommentEvent, brand: BrandBrain, _commentReply: string, postCaption: string | null = null): Promise<void> {
  if (!brand.page_token || !brand.ig_business_id) return

  // Build DM without AI — guaranteed to include the link
  const link = brand.cta_links?.[0]?.url || brand.booking_link || brand.web_link || 'https://www.autom8ig.io'
  const name = brand.business_name || 'us'

  // Use custom DM template if provided, otherwise default
  let dmText = brand.dm_template || `Hey! Thanks for reaching out to {business_name} 🙌\n\nHere's your link to get started with a free 14-day trial 👉 {link}\n\nNo credit card required. Reply here if you have any questions!`

  // Replace template variables
  dmText = dmText
    .replace('{link}', link)
    .replace('{business_name}', name)
    .replace('{name}', name)

  const _unused = postCaption // kept for future context-aware link selection
  if (!dmText) return

  try {
    await fetch(`https://graph.facebook.com/v23.0/${brand.ig_business_id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: event.commenter_id },
        message: { text: dmText },
        access_token: brand.page_token,
      }),
    })

    // Store DM conversation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServiceClient() as any
    await supabase.from('dm_conversations').upsert({
      user_id: brand.user_id,
      social_account_id: brand.social_account_id,
      recipient_ig_id: event.commenter_id,
      recipient_username: event.commenter_username,
      trigger_source: 'comment_keyword',
      matched_keyword: brand.dm_trigger_keywords?.[0] ?? null,
      history: [
        { role: 'assistant', content: dmText, ts: new Date().toISOString() },
      ],
      message_count: 1,
      last_message_at: new Date().toISOString(),
    }, { onConflict: 'user_id,recipient_ig_id' })
  } catch {
    // non-fatal
  }
}

async function selectCtaLink(commentText: string, postCaption: string | null, brand: BrandBrain): Promise<{ label: string; url: string }> {
  const links = brand.cta_links ?? []
  if (links.length === 0) {
    const url = brand.booking_link || brand.web_link || 'https://www.autom8ig.io'
    return { label: 'Get Started', url }
  }
  if (links.length === 1) return links[0]

  // Use GPT to pick the most relevant link based on context
  const linkList = links.map((l, i) => `${i + 1}. ${l.label}: ${l.url}`).join('\n')
  const res = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Given a post caption and a comment, pick the single most relevant link to send in a DM. Return ONLY the number (1, 2, 3, etc).`,
      },
      {
        role: 'user',
        content: `Post caption: "${postCaption ?? 'N/A'}"\nComment: "${commentText}"\n\nLinks:\n${linkList}`,
      },
    ],
    max_tokens: 5,
    temperature: 0,
  })
  const pick = parseInt(res.choices[0]?.message?.content?.trim() ?? '1', 10)
  return links[(pick - 1)] ?? links[0]
}

async function generateDmText(commentText: string, brand: BrandBrain, postCaption: string | null): Promise<string> {
  const chosenLink = await selectCtaLink(commentText, postCaption, brand)
  const actionLink = chosenLink.url

  // Generate just the personalized opener (1 sentence) — link is hardcoded below
  const openerRes = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Write ONE short warm sentence (under 15 words) acknowledging what this person commented on ${brand.business_name}'s Instagram post. Reference their comment and the post topic. Tone: ${brand.tone}. No hashtags. Return only the sentence, no punctuation at the end.`,
      },
      {
        role: 'user',
        content: `Post caption: "${postCaption ?? 'about our service'}"
Comment: "${commentText}"`,
      },
    ],
    max_tokens: 40,
    temperature: 0.7,
  })

  const opener = openerRes.choices[0]?.message?.content?.trim() ?? 'Thanks for your interest'

  // Hardcode the link — never rely on AI to include it
  const trialLine = `Here's the link 👉 ${actionLink}`
  const closingLine = `Any questions? Just reply here — we've got you! ${brand.emoji_allowed ? '🚀' : ''}`

  return `${opener}!\n\n${trialLine}\n\n${closingLine}`.trim()
}

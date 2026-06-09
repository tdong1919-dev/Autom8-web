/**
 * DM Chatbot Agent
 * Handles incoming Instagram DMs, maintains conversation history,
 * escalates when needed. Multi-tenant by user_id via social_account.
 */

import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/service'
import type { BrandBrain } from './brand-brain'

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MAX_MESSAGES_BEFORE_ESCALATION = 8

interface DmEvent {
  sender_id: string
  sender_name: string | null
  message_text: string
  message_id: string
}

interface DmResult {
  status: 'replied' | 'escalated' | 'skipped'
  reply_text?: string
}

// Keywords that signal the person wants to buy / sign up / learn more
const BUYING_INTENT_KEYWORDS = [
  'sign up', 'signup', 'how do i', 'how to', 'get started', 'start',
  'price', 'pricing', 'how much', 'cost', 'plan', 'plans', 'subscribe',
  'trial', 'free trial', 'demo', 'try', 'interested', 'want this',
  'need this', 'where', 'link', 'info', 'information', 'learn more',
]

function hasBuyingIntent(text: string): boolean {
  const lower = text.toLowerCase()
  return BUYING_INTENT_KEYWORDS.some(kw => lower.includes(kw))
}

function pickBestLink(brand: BrandBrain): string {
  const links = brand.cta_links ?? []
  if (links.length > 0) return links[0].url
  return brand.booking_link || brand.web_link || 'https://www.autom8ig.io'
}

export async function handleDm(event: DmEvent, brand: BrandBrain): Promise<DmResult> {
  if (!brand.dm_enabled) return { status: 'skipped' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  // Fetch or create conversation
  const { data: convo } = await supabase
    .from('dm_conversations')
    .select('*')
    .eq('user_id', brand.user_id)
    .eq('recipient_ig_id', event.sender_id)
    .maybeSingle()

  const history: Array<{ role: string; content: string; ts: string }> = convo?.history ?? []
  const messageCount = convo?.message_count ?? 0
  const stage = convo?.conversation_stage ?? 'active'

  if (stage === 'escalated') return { status: 'escalated' }

  // Add incoming message to history
  history.push({ role: 'user', content: event.message_text, ts: new Date().toISOString() })

  // If first message (no prior history) → ALWAYS use template, no AI
  if (history.length === 1) {  // history only has the one we just added
    const link = pickBestLink(brand)
    const name = brand.business_name || 'us'

    // Use custom DM template if provided, otherwise default
    let replyText = brand.dm_template || `Hey! Thanks for reaching out to {business_name} 🙌\n\nHere's your link to get started with a free 14-day trial 👉 {link}\n\nNo credit card required. Reply here if you have any questions!`

    // Replace template variables
    replyText = replyText
      .replace('{link}', link)
      .replace('{business_name}', name)
      .replace('{name}', name)
    await sendIgDm(brand.ig_business_id!, event.sender_id, replyText, brand.page_token!)
    history.push({ role: 'assistant', content: replyText, ts: new Date().toISOString() })
    await supabase.from('dm_conversations').upsert({
      user_id: brand.user_id,
      social_account_id: brand.social_account_id,
      recipient_ig_id: event.sender_id,
      recipient_username: event.sender_name,
      conversation_stage: 'active',
      history,
      message_count: messageCount + 1,
      last_message_at: new Date().toISOString(),
    }, { onConflict: 'user_id,recipient_ig_id' })
    return { status: 'replied', reply_text: replyText }
  }

  // Check escalation conditions
  const shouldEscalate = messageCount >= MAX_MESSAGES_BEFORE_ESCALATION ||
    detectEscalationIntent(event.message_text)

  if (shouldEscalate) {
    await supabase.from('dm_conversations').upsert({
      user_id: brand.user_id,
      social_account_id: brand.social_account_id,
      recipient_ig_id: event.sender_id,
      recipient_username: event.sender_name,
      conversation_stage: 'escalated',
      history,
      message_count: messageCount + 1,
      last_message_at: new Date().toISOString(),
      handoff_reason: messageCount >= MAX_MESSAGES_BEFORE_ESCALATION
        ? 'max_messages_reached'
        : 'escalation_intent_detected',
    }, { onConflict: 'user_id,recipient_ig_id' })
    return { status: 'escalated' }
  }

  // For follow-up messages (after first contact), use template
  const link = pickBestLink(brand)
  const name = brand.business_name || 'us'
  let replyText = brand.dm_template || `Got it! Just to clarify — here's our link 👉 {link}\n\nFeel free to reach out if you have more questions!`
  replyText = replyText
    .replace('{link}', link)
    .replace('{business_name}', name)
    .replace('{name}', name)

  // Add reply to history
  history.push({ role: 'assistant', content: replyText, ts: new Date().toISOString() })

  // Send via IG Messaging API
  if (brand.page_token && brand.ig_business_id) {
    await sendIgDm(brand.ig_business_id, event.sender_id, replyText, brand.page_token)
  }

  // Save updated conversation
  await supabase.from('dm_conversations').upsert({
    user_id: brand.user_id,
    social_account_id: brand.social_account_id,
    recipient_ig_id: event.sender_id,
    recipient_username: event.sender_name,
    conversation_stage: 'active',
    history,
    message_count: messageCount + 1,
    last_message_at: new Date().toISOString(),
  }, { onConflict: 'user_id,recipient_ig_id' })

  return { status: 'replied', reply_text: replyText }
}

function detectEscalationIntent(text: string): boolean {
  const triggers = ['refund', 'cancel', 'billing', 'lawsuit', 'legal', 'fraud', 'scam', 'human', 'manager', 'speak to someone']
  const lower = text.toLowerCase()
  return triggers.some(t => lower.includes(t))
}

async function sendIgDm(igBusinessId: string, recipientId: string, text: string, pageToken: string): Promise<void> {
  await fetch(`https://graph.facebook.com/v23.0/${igBusinessId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      access_token: pageToken,
    }),
  })
}

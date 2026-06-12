/**
 * POST /api/scheduler/upload — authorize a direct-to-Storage media upload.
 *
 * Returns a short-lived SIGNED UPLOAD URL so the browser can upload the file
 * bytes straight to Supabase Storage. This bypasses Vercel's ~4.5MB request
 * body limit (routing a 500MB video through the function would fail) while
 * still enforcing auth + a server-controlled path/type here.
 *
 * Body: { filename: string, content_type: string }
 * Returns: { path, token, publicUrl, media_type }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const BUCKET = 'content-media'
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif',
  'video/mp4': 'mp4', 'video/quicktime': 'mov',
}
// Fallback when the browser reports no/unknown MIME (iOS Files app, AirDrop, etc.)
const TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/mp4',
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  let contentType: string = body.content_type ?? ''
  const filename: string = body.filename ?? ''

  // If the browser didn't supply a usable MIME type, infer it from the extension.
  if (!EXT_BY_TYPE[contentType]) {
    const fileExt = filename.split('.').pop()?.toLowerCase() ?? ''
    contentType = TYPE_BY_EXT[fileExt] ?? contentType
  }

  const ext = EXT_BY_TYPE[contentType]
  if (!ext) {
    return NextResponse.json({
      error: `Unsupported file type${filename ? ` for "${filename}"` : ''}. Supported: JPG, PNG, WebP, GIF, HEIC, MP4, MOV.`,
    }, { status: 415 })
  }

  // Server-controlled path keeps the extension (publisher detects video by it)
  // and scopes the object to the user's folder.
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = createServiceClient() as any
  const { data, error } = await svc.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: pub } = svc.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({
    path,
    token: data.token,
    publicUrl: pub.publicUrl,
    media_type: contentType.startsWith('video') ? 'reel' : 'image',
    // Resolved server-side; client passes this to the storage upload so files
    // with a missing browser MIME type don't land as application/octet-stream.
    content_type: contentType,
  })
}

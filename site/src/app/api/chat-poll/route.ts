import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const mailerUrl = process.env.MAILER_URL || 'http://mailer:3001'
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  try {
    const res = await fetch(`${mailerUrl}/chat-poll?sessionId=${sessionId}`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Mailer unavailable' }, { status: 502 })
  }
}

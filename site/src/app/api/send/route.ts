import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const mailerUrl = process.env.MAILER_URL || 'http://mailer:3001'
  try {
    const body = await req.json()
    const res = await fetch(`${mailerUrl}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Mailer unavailable' }, { status: 502 })
  }
}

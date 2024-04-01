import { NextResponse } from 'next/server'

export const GET = () => {
  return NextResponse.json({ code: 200, message: 'ok' })
}

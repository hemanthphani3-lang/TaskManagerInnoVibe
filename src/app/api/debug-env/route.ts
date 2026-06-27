import { NextResponse } from "next/server"

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  return NextResponse.json({
    supabaseUrl,
    urlLength: supabaseUrl ? supabaseUrl.length : 0,
    anonKeyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
    anonKeyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) : 'none',
    nodeEnv: process.env.NODE_ENV,
  })
}

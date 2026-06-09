import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  // Validate required environment variables
  const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
  requiredEnv.forEach((name) => {
    if (!process.env[name]) {
      throw new Error(`[Supabase] Missing required environment variable ${name}. Please define it in .env.local`)
    }
  })

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // The `set` method was called from a Server Component.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: -1 })
          } catch {
            // The `remove` method was called from a Server Component.
          }
        },
      },
    }
  )

  // Wrap auth.getUser to avoid uncaught errors
  const originalGetUser = client.auth.getUser.bind(client.auth)
  client.auth.getUser = async (jwt?: string) => {
    try {
      return await originalGetUser(jwt)
    } catch (e: any) {
      console.error('[Supabase] getUser failed:', e)
      return { data: { user: null }, error: e }
    }
  }

  return client
}

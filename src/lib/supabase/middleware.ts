import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch (error) {
      console.error('[Middleware] Error getting user:', error)
    }

    const pathname = request.nextUrl.pathname
    const isLoginRoute = pathname.startsWith('/login')
    const isAdminRoute = pathname.startsWith('/admin')
    const isDeptRoute = pathname.startsWith('/department')
    const isEmployeeRoute = pathname.startsWith('/employee')
    const isProtectedRoute = isAdminRoute || isDeptRoute || isEmployeeRoute

    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (user) {
      let role: 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE' | null = null

      try {
        const [
          { data: admin },
          { data: dept },
          { data: employee }
        ] = await Promise.all([
          supabase.from('admins').select('id').eq('id', user.id).maybeSingle(),
          supabase.from('departments').select('id').eq('id', user.id).maybeSingle(),
          supabase.from('employees').select('id').eq('id', user.id).maybeSingle()
        ])

        if (admin) role = 'ADMIN'
        else if (dept) role = 'DEPARTMENT'
        else if (employee) role = 'EMPLOYEE'
      } catch (e) {
        console.error('[Middleware] Error fetching role:', e)
      }

      if (isLoginRoute) {
        const url = request.nextUrl.clone()
        if (role === 'ADMIN') url.pathname = '/admin/dashboard'
        else if (role === 'DEPARTMENT') url.pathname = '/department/dashboard'
        else url.pathname = '/employee/identity-check'
        return NextResponse.redirect(url)
      }

      if (!role && isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }

      if (isAdminRoute && role !== 'ADMIN') {
        const url = request.nextUrl.clone()
        url.pathname = role === 'DEPARTMENT' ? '/department/dashboard' : '/employee/identity-check'
        return NextResponse.redirect(url)
      }

      if (isDeptRoute && role !== 'DEPARTMENT') {
        const url = request.nextUrl.clone()
        url.pathname = role === 'ADMIN' ? '/admin/dashboard' : '/employee/identity-check'
        return NextResponse.redirect(url)
      }

      if (isEmployeeRoute && role !== 'EMPLOYEE') {
        const url = request.nextUrl.clone()
        url.pathname = role === 'ADMIN' ? '/admin/dashboard' : '/department/dashboard'
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new NextResponse(`Middleware Crash: ${message}`, { status: 500 })
  }
}

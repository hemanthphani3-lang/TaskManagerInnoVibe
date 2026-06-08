/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const isOnboardingRoute = 
      pathname.startsWith('/onboarding') ||
      pathname.startsWith('/admin/onboarding') ||
      pathname.startsWith('/department/onboarding') ||
      pathname.startsWith('/employee/onboarding')
    const isProtectedRoute = isAdminRoute || isDeptRoute || isEmployeeRoute || isOnboardingRoute

    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (user) {
      let role: 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE' | null = null
      let onboardingCompleted = false

      try {
        const [
          { data: admin },
          { data: dept },
          { data: employee }
        ] = await Promise.all([
          supabase.from('admins').select('id, onboarding_completed').eq('id', user.id).maybeSingle(),
          supabase.from('departments').select('id, onboarding_completed, profile_completion_percentage').eq('id', user.id).maybeSingle(),
          supabase.from('employees').select('id, onboarding_completed, profile_completion_percentage').eq('id', user.id).maybeSingle()
        ])

        if (admin) {
          role = 'ADMIN'
          onboardingCompleted = true // Admins are always fully onboarded/exempt
        } else if (dept) {
          role = 'DEPARTMENT'
          onboardingCompleted = !!dept.onboarding_completed || (typeof dept.profile_completion_percentage === 'number' && dept.profile_completion_percentage >= 70)
        } else if (employee) {
          role = 'EMPLOYEE'
          onboardingCompleted = !!employee.onboarding_completed || (typeof employee.profile_completion_percentage === 'number' && employee.profile_completion_percentage >= 70)
        }
      } catch (e) {
        console.error('[Middleware] Error fetching role/onboarding:', e)
      }

      const getOnboardingPath = (r: typeof role) => {
        if (r === 'ADMIN') return '/admin/onboarding'
        if (r === 'DEPARTMENT') return '/department/onboarding'
        return '/employee/onboarding'
      }

      if (isLoginRoute) {
        const url = request.nextUrl.clone()
        if (role && !onboardingCompleted) {
          url.pathname = getOnboardingPath(role)
        } else {
          if (role === 'ADMIN') url.pathname = '/admin/dashboard'
          else if (role === 'DEPARTMENT') url.pathname = '/department/dashboard'
          else url.pathname = '/employee/identity-check'
        }
        return NextResponse.redirect(url)
      }

      if (!role && isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }

      // Restrict access for users who haven't completed onboarding
      if (role && !onboardingCompleted && !isOnboardingRoute) {
        const url = request.nextUrl.clone()
        url.pathname = getOnboardingPath(role)
        return NextResponse.redirect(url)
      }

      if (isAdminRoute && role !== 'ADMIN') {
        const url = request.nextUrl.clone()
        if (!onboardingCompleted) {
          url.pathname = getOnboardingPath(role)
        } else {
          url.pathname = role === 'DEPARTMENT' ? '/department/dashboard' : '/employee/identity-check'
        }
        return NextResponse.redirect(url)
      }

      if (isDeptRoute && role !== 'DEPARTMENT') {
        const url = request.nextUrl.clone()
        if (!onboardingCompleted) {
          url.pathname = getOnboardingPath(role)
        } else {
          url.pathname = role === 'ADMIN' ? '/admin/dashboard' : '/employee/identity-check'
        }
        return NextResponse.redirect(url)
      }

      if (isEmployeeRoute && role !== 'EMPLOYEE') {
        const url = request.nextUrl.clone()
        if (!onboardingCompleted) {
          url.pathname = getOnboardingPath(role)
        } else {
          url.pathname = role === 'ADMIN' ? '/admin/dashboard' : '/department/dashboard'
        }
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  } catch (error: any) {
    return new NextResponse(`Middleware Crash: ${error?.message || String(error)}`, { status: 500 })
  }
}

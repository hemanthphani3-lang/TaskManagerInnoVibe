"use server"

import { createServiceClient } from "@/lib/supabase/service"
import { revalidatePath } from "next/cache"

export interface BirthdayPerson {
  id: string
  name: string
  designation: string
  profile_photo: string | null
}

/**
 * Returns today's date in IST formatted as YYYY-MM-DD
 */
export async function getISTTodayStr(): Promise<string> {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  return new Date(now.getTime() + istOffset).toISOString().split('T')[0]
}

/**
 * Checks and generates birthday notifications for today's birthday celebrants.
 * Prevents duplicates by verifying if a notification was already sent today.
 */
export async function checkAndGenerateBirthdayNotifications() {
  try {
    const supabaseAdmin = createServiceClient()

    // 1. Get today's month-day in IST (MM-DD)
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const todayIST = new Date(now.getTime() + istOffset)
    const todayISTStr = todayIST.toISOString().split('T')[0]
    const todayMonthDay = `${String(todayIST.getMonth() + 1).padStart(2, '0')}-${String(todayIST.getDate()).padStart(2, '0')}`

    const startUTC = new Date(`${todayISTStr}T00:00:00+05:30`).toISOString()
    const endUTC = new Date(`${todayISTStr}T23:59:59+05:30`).toISOString()

    // 2. Fetch all users from admins, departments, and employees to find birthdays
    const [
      { data: admins, error: adminErr },
      { data: departments, error: deptErr },
      { data: employees, error: empErr }
    ] = await Promise.all([
      supabaseAdmin.from('admins').select('id, full_name, dob, profile_photo'),
      supabaseAdmin.from('departments').select('id, department_head_name, dob, profile_photo, leadership_role'),
      supabaseAdmin.from('employees').select('id, employee_name, dob, profile_photo, designation, account_status')
    ])

    if (adminErr) console.error("[Birthday] Error loading admins:", adminErr)
    if (deptErr) console.error("[Birthday] Error loading departments:", deptErr)
    if (empErr) console.error("[Birthday] Error loading employees:", empErr)

    const allUsers: Array<{
      id: string
      name: string
      dob: string | null
      designation: string
      profile_photo: string | null
    }> = []

    const seenIds = new Set<string>()

    // Add admins
    if (admins) {
      for (const u of admins) {
        if (u.id && !seenIds.has(u.id)) {
          seenIds.add(u.id)
          allUsers.push({
            id: u.id,
            name: u.full_name,
            dob: u.dob,
            designation: 'Admin',
            profile_photo: u.profile_photo
          })
        }
      }
    }

    // Add departments (heads)
    if (departments) {
      for (const u of departments) {
        if (u.id && !seenIds.has(u.id)) {
          seenIds.add(u.id)
          allUsers.push({
            id: u.id,
            name: u.department_head_name,
            dob: u.dob,
            designation: u.leadership_role || 'Department Head',
            profile_photo: u.profile_photo
          })
        }
      }
    }

    // Add employees (only if not already added as a department head to avoid duplicates)
    if (employees) {
      for (const u of employees) {
        if (u.id && !seenIds.has(u.id)) {
          if (u.account_status === 'Inactive' || u.account_status === 'INACTIVE') {
            continue
          }
          seenIds.add(u.id)
          allUsers.push({
            id: u.id,
            name: u.employee_name,
            dob: u.dob,
            designation: u.designation || 'Employee',
            profile_photo: u.profile_photo
          })
        }
      }
    }

    // 3. Filter users who have a birthday today
    const birthdayPeople = allUsers.filter(u => {
      if (!u.dob) return false
      // Format of u.dob is YYYY-MM-DD
      const dobMonthDay = u.dob.substring(5)
      return dobMonthDay === todayMonthDay
    })

    if (birthdayPeople.length === 0) return { success: true, count: 0 }

    let notificationsCreated = 0

    // 4. For each birthday person, check if we already sent notifications today
    for (const person of birthdayPeople) {
      const title = `🎂 Today is ${person.name}'s Birthday!`
      
      const { data: existing, error: existErr } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('title', title)
        .gte('created_at', startUTC)
        .lte('created_at', endUTC)
        .limit(1)

      if (existErr) {
        console.error("[Birthday] Error checking existing notifications:", existErr)
        continue
      }

      if (existing && existing.length > 0) {
        // Notification already sent for this user today
        continue
      }

      // 5. Generate notification for ALL active users
      const notificationInserts = Array.from(seenIds).map(userId => ({
        user_id: userId,
        title: title,
        message: `Take a moment to wish them a wonderful year ahead.`,
        type: 'SYSTEM',
        link_url: '#',
        is_read: false
      }))

      if (notificationInserts.length > 0) {
        const { error: insertErr } = await supabaseAdmin
          .from('notifications')
          .insert(notificationInserts)

        if (insertErr) {
          console.error(`[Birthday] Error inserting notifications for ${person.name}:`, insertErr)
        } else {
          console.log(`[Birthday] Broadcasted birthday notification for ${person.name}`)
          notificationsCreated += notificationInserts.length
        }
      }
    }

    if (notificationsCreated > 0) {
      revalidatePath('/admin/notifications')
      revalidatePath('/department/notifications')
      revalidatePath('/employee/notifications')
    }

    return { success: true, count: notificationsCreated }
  } catch (error: any) {
    console.error("[Birthday] Error in checkAndGenerateBirthdayNotifications server action:", error)
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Returns list of users whose birthday is today.
 */
export async function getBirthdaysToday(): Promise<BirthdayPerson[]> {
  try {
    const supabaseAdmin = createServiceClient()

    // 1. Get today's month-day in IST (MM-DD)
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const todayIST = new Date(now.getTime() + istOffset)
    const todayMonthDay = `${String(todayIST.getMonth() + 1).padStart(2, '0')}-${String(todayIST.getDate()).padStart(2, '0')}`

    // 2. Fetch admins, departments, employees
    const [
      { data: admins },
      { data: departments },
      { data: employees }
    ] = await Promise.all([
      supabaseAdmin.from('admins').select('id, full_name, dob, profile_photo'),
      supabaseAdmin.from('departments').select('id, department_head_name, dob, profile_photo, leadership_role'),
      supabaseAdmin.from('employees').select('id, employee_name, dob, profile_photo, designation, account_status')
    ])

    const birthdayPeople: BirthdayPerson[] = []
    const seenIds = new Set<string>()

    const checkBirthday = (dob: string | null) => {
      if (!dob) return false
      return dob.substring(5) === todayMonthDay
    }

    // Admins
    if (admins) {
      for (const u of admins) {
        if (u.id && !seenIds.has(u.id) && checkBirthday(u.dob)) {
          seenIds.add(u.id)
          birthdayPeople.push({
            id: u.id,
            name: u.full_name,
            designation: 'Admin',
            profile_photo: u.profile_photo
          })
        }
      }
    }

    // Departments (heads)
    if (departments) {
      for (const u of departments) {
        if (u.id && !seenIds.has(u.id) && checkBirthday(u.dob)) {
          seenIds.add(u.id)
          birthdayPeople.push({
            id: u.id,
            name: u.department_head_name,
            designation: u.leadership_role || 'Department Head',
            profile_photo: u.profile_photo
          })
        }
      }
    }

    // Employees
    if (employees) {
      for (const u of employees) {
        if (u.id && !seenIds.has(u.id) && checkBirthday(u.dob)) {
          if (u.account_status === 'Inactive' || u.account_status === 'INACTIVE') {
            continue
          }
          seenIds.add(u.id)
          birthdayPeople.push({
            id: u.id,
            name: u.employee_name,
            designation: u.designation || 'Employee',
            profile_photo: u.profile_photo
          })
        }
      }
    }

    return birthdayPeople
  } catch (error) {
    console.error("[Birthday] Error in getBirthdaysToday server action:", error)
    return []
  }
}

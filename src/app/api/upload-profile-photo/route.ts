import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { calculateCompletionPercentage } from "@/lib/onboarding-utils"
import { revalidatePath } from "next/cache"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get("file") as File
    const action = formData.get("action") as string // "upload" or "delete"

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check user role to fetch current profile for recalculation & photo path
    let currentPhotoUrl: string | null = null
    let role: 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE' | null = null
    let tableName: 'admins' | 'departments' | 'employees' | null = null
    let profileData: any = null

    const [empCheck, deptCheck, adminCheck] = await Promise.all([
      adminSupabase.from("employees").select("*").eq("id", user.id).maybeSingle(),
      adminSupabase.from("departments").select("*").eq("id", user.id).maybeSingle(),
      adminSupabase.from("admins").select("*").eq("id", user.id).maybeSingle(),
    ])

    if (empCheck.data) {
      currentPhotoUrl = empCheck.data.profile_photo
      role = 'EMPLOYEE'
      tableName = 'employees'
      profileData = empCheck.data
    } else if (deptCheck.data) {
      currentPhotoUrl = deptCheck.data.profile_photo
      role = 'DEPARTMENT'
      tableName = 'departments'
      profileData = deptCheck.data
    } else if (adminCheck.data) {
      currentPhotoUrl = adminCheck.data.profile_photo
      role = 'ADMIN'
      tableName = 'admins'
      profileData = adminCheck.data
    }

    // Helper to delete a file from storage if url is valid
    const deleteOldFile = async (url: string | null) => {
      if (!url) return
      try {
        const urlObj = new URL(url)
        const pathParts = urlObj.pathname.split("/storage/v1/object/public/profile-photo/")
        if (pathParts.length === 2) {
          const filePath = pathParts[1]
          await adminSupabase.storage.from("profile-photo").remove([filePath])
        }
      } catch (e) {
        console.error("Failed to delete old profile photo file:", e)
      }
    }

    // Helper to revalidate caches
    const revalidatePaths = (userRole: 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE', profile: any) => {
      try {
        revalidatePath('/onboarding')
        if (userRole === 'ADMIN') {
          revalidatePath('/admin/dashboard')
        } else if (userRole === 'DEPARTMENT') {
          revalidatePath('/department/dashboard')
        } else {
          revalidatePath('/employee/dashboard')
          if (profile?.employee_code) {
            revalidatePath(`/employee/${profile.employee_code}/dashboard`)
          }
        }
      } catch (e) {
        console.error("Failed to revalidate paths:", e)
      }
    }

    if (action === "delete") {
      // Delete old photo file
      if (currentPhotoUrl) {
        await deleteOldFile(currentPhotoUrl)
      }

      if (role && tableName && profileData) {
        const updatedProfile = { ...profileData, profile_photo: null }
        if (updatedProfile.onboarding_draft && typeof updatedProfile.onboarding_draft === 'object') {
          updatedProfile.onboarding_draft = {
            ...updatedProfile.onboarding_draft,
            profile_photo: null
          }
        }

        const percentageData = calculateCompletionPercentage(role, updatedProfile)

        const updatePayload: any = {
          profile_photo: null,
          profile_completion_percentage: percentageData.score,
          mandatory_fields_completed: percentageData.completedMandatoryFields,
          completed_fields: percentageData.completedMandatoryFields,
          onboarding_draft: updatedProfile.onboarding_draft,
          last_saved_at: new Date().toISOString()
        }

        // Deleting the photo means it's no longer 100%, so update onboarding_completed
        if (percentageData.score < 100) {
          updatePayload.onboarding_completed = false
        }

        await adminSupabase.from(tableName).update(updatePayload).eq("id", user.id)
        
        revalidatePaths(role, profileData)
      }

      return NextResponse.json({ success: true, url: null })
    }

    // Default action: UPLOAD
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    // Validation rules
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, JPEG, PNG, and WEBP formats are supported." }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size must be less than 5MB." }, { status: 400 })
    }

    // Delete old file if exists (Replace feature)
    if (currentPhotoUrl) {
      await deleteOldFile(currentPhotoUrl)
    }

    const ext = file.name.split(".").pop() || "jpg"
    const fileName = `profile-${user.id}-${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await adminSupabase.storage
      .from("profile-photo")
      .upload(fileName, buffer, { contentType: file.type, upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = adminSupabase.storage
      .from("profile-photo")
      .getPublicUrl(fileName)

    if (role && tableName && profileData) {
      const updatedProfile = { ...profileData, profile_photo: publicUrl }
      if (updatedProfile.onboarding_draft && typeof updatedProfile.onboarding_draft === 'object') {
        updatedProfile.onboarding_draft = {
          ...updatedProfile.onboarding_draft,
          profile_photo: publicUrl
        }
      }

      const percentageData = calculateCompletionPercentage(role, updatedProfile)

      const updatePayload: any = {
        profile_photo: publicUrl,
        profile_completion_percentage: percentageData.score,
        mandatory_fields_completed: percentageData.completedMandatoryFields,
        completed_fields: percentageData.completedMandatoryFields,
        onboarding_draft: updatedProfile.onboarding_draft,
        last_saved_at: new Date().toISOString()
      }

      if (percentageData.score === 100) {
        updatePayload.onboarding_completed = true
        updatePayload.onboarding_completed_at = new Date().toISOString()
      }

      await adminSupabase.from(tableName).update(updatePayload).eq("id", user.id)

      revalidatePaths(role, profileData)
    }

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { createDepartmentAccount } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export default function CreateDepartmentPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    department_name: "",
    department_email: "",
    department_head_name: "",
    department_code: "",
    password: "",
    check_in_cutoff_time: "09:30",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }
    if (!user) {
      setError("Not authenticated")
      setLoading(false)
      return
    }

    const result = await createDepartmentAccount({
      ...formData,
      admin_id: user.id,
      profile_photo: "" // Omitting file upload for brevity in this step, can add later
    })

    if (!result.success) {
      setError(result.error || "Failed to create department")
      setLoading(false)
    } else {
      router.push('/admin/departments')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/departments" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Departments
        </Link>
        
        <PageHeader 
          title="Create Department" 
          description="Set up a new department and generate credentials for the department head."
        />

        <Card className="p-6 sm:p-8 rounded-2xl border-slate-200 shadow-sm bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm font-medium">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="department_name">Department Name</Label>
                <Input id="department_name" name="department_name" required value={formData.department_name} onChange={handleChange} placeholder="e.g. Engineering" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department_code">Department Code</Label>
                <Input id="department_code" name="department_code" required value={formData.department_code} onChange={handleChange} placeholder="e.g. ENG-01" className="uppercase" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department_head_name">Department Head Name</Label>
              <Input id="department_head_name" name="department_head_name" required value={formData.department_head_name} onChange={handleChange} placeholder="e.g. Jane Doe" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="department_email">Login Email</Label>
                <Input id="department_email" name="department_email" type="email" required value={formData.department_email} onChange={handleChange} placeholder="engineering@innovibe.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Login Password</Label>
                <Input id="password" name="password" type="password" required minLength={6} value={formData.password} onChange={handleChange} placeholder="••••••••" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="check_in_cutoff_time">Check-In Cutoff Time</Label>
              <Input id="check_in_cutoff_time" name="check_in_cutoff_time" type="time" required value={formData.check_in_cutoff_time} onChange={handleChange} />
              <p className="text-xs text-slate-500">Employees checking in after this time will be marked as LATE.</p>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={loading} className="bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl px-8">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? "Creating..." : "Create Department"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { createEmployeeAccount } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export default function CreateEmployeePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    employee_name: "",
    employee_email: "",
    designation: "",
    phone_number: "",
    employee_code: "",
    joining_date: new Date().toISOString().split('T')[0],
    password: "",
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

    const result = await createEmployeeAccount({
      ...formData,
      department_id: user.id, // Current logged-in department ID
      profile_photo: ""
    })

    if (!result.success) {
      setError(result.error || "Failed to create employee")
      setLoading(false)
    } else {
      router.push('/department/employees')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/department/employees" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </Link>
        
        <PageHeader 
          title="Onboard Employee" 
          description="Create a new employee account and generate their login credentials."
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
                <Label htmlFor="employee_name">Full Name</Label>
                <Input id="employee_name" name="employee_name" required value={formData.employee_name} onChange={handleChange} placeholder="e.g. John Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_code">Employee ID / Code</Label>
                <Input id="employee_code" name="employee_code" required value={formData.employee_code} onChange={handleChange} placeholder="e.g. EMP-1042" className="uppercase" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="designation">Job Title / Designation</Label>
                <Input id="designation" name="designation" required value={formData.designation} onChange={handleChange} placeholder="e.g. Software Engineer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder="+1 (555) 000-0000" />
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="joining_date">Joining Date</Label>
              <Input id="joining_date" name="joining_date" type="date" required value={formData.joining_date} onChange={handleChange} className="w-full sm:w-1/2" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <Label htmlFor="employee_email">Work Email (Login ID)</Label>
                <Input id="employee_email" name="employee_email" type="email" required value={formData.employee_email} onChange={handleChange} placeholder="john.smith@innovibe.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Change Password</Label>
                <Input id="password" name="password" type="password" required minLength={6} value={formData.password} onChange={handleChange} placeholder="••••••••" />
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <Button type="submit" disabled={loading} className="bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl px-8">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? "Creating Account..." : "Create Employee Account"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

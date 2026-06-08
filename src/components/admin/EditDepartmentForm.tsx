"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { updateDepartmentAccount } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Department {
  id: string
  department_name: string
  department_code: string
  department_head_name: string
  department_email: string
  check_in_cutoff_time: string
}

export function EditDepartmentForm({ department }: { department: Department }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Format check_in_cutoff_time if it has seconds (e.g. "09:30:00" -> "09:30")
  const initialTime = department.check_in_cutoff_time ? department.check_in_cutoff_time.substring(0, 5) : "09:30"

  const [formData, setFormData] = useState({
    department_name: department.department_name || "",
    department_code: department.department_code || "",
    department_head_name: department.department_head_name || "",
    department_email: department.department_email || "",
    password: "", // Optional password change
    check_in_cutoff_time: initialTime,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Call update department action
    const result = await updateDepartmentAccount(department.id, {
      ...formData,
    })

    if (!result.success) {
      setError(result.error || "Failed to update department")
      setLoading(false)
    } else {
      toast.success("Department updated successfully!")
      router.push(`/admin/departments/${department.id}`)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <Link href={`/admin/departments/${department.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Breakdown
        </Link>
        
        <PageHeader 
          title="Edit Department" 
          description="Update department details, head metadata, or change their login credentials."
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
                <Label htmlFor="password">Login Password (Leave blank to keep current)</Label>
                <Input id="password" name="password" type="password" minLength={6} value={formData.password} onChange={handleChange} placeholder="••••••••" />
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
                {loading ? "Saving changes..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

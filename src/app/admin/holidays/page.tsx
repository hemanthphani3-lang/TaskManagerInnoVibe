import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Calendar as CalendarIcon, Trash2, Globe, Building2 } from "lucide-react"
import { createHoliday, deleteHoliday } from "@/app/actions/holidays"

export default async function AdminHolidaysPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }

  if (!user) redirect("/login")

  const { data: holidays } = await supabase
    .from('holidays')
    .select('*')
    .order('holiday_date', { ascending: true })

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[#0A1A2F]">Holiday Management</h1>
        <p className="text-slate-500 mt-1">Configure company-wide and national holidays.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-[#0A1A2F] mb-6">Add Holiday</h3>
            <form action={async (formData) => { "use server"; await createHoliday(formData); }} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Holiday Name</label>
                <input type="text" name="name" required placeholder="e.g. Diwali" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Date</label>
                <input type="date" name="date" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Type</label>
                <select name="type" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm">
                  <option value="NATIONAL">National Holiday</option>
                  <option value="COMPANY">Company Holiday</option>
                  <option value="OPTIONAL">Optional / Restricted</option>
                </select>
              </div>

              <button type="submit" className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white py-3 rounded-xl font-semibold transition-colors mt-2">
                Add to Calendar
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-[#0A1A2F] mb-6">Upcoming Holidays</h3>
            <div className="space-y-4">
              {holidays && holidays.length > 0 ? (
                holidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${holiday.holiday_type === 'NATIONAL' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-[#0066FF]'}`}>
                        {holiday.holiday_type === 'NATIONAL' ? <Globe className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{holiday.holiday_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <CalendarIcon className="w-4 h-4" />
                          <span>{new Date(holiday.holiday_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-200 text-slate-700 uppercase tracking-wider">
                        {holiday.holiday_type}
                      </span>
                      <form action={async () => {
                        "use server"
                        await deleteHoliday(holiday.id)
                      }}>
                        <button type="submit" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p>No holidays have been scheduled yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

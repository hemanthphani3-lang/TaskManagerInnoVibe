import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = status.toUpperCase()

  const styles: Record<string, string> = {
    'ACTIVE': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'COMPLETED': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'LOGGED OUT': 'bg-slate-100 text-slate-500 border-slate-200',
    'PENDING LOGOUT': 'bg-amber-50 text-amber-600 border-amber-200',
    'NOT CHECKED IN': 'bg-slate-50 text-slate-400 border-slate-200',
    'PENDING': 'bg-amber-50 text-amber-600 border-amber-200',
    'APPROVED': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'REJECTED': 'bg-red-50 text-red-500 border-red-200',
  }

  const className = styles[s] ?? 'bg-slate-50 text-slate-500 border-slate-200'

  return (
    <Badge 
      variant="outline" 
      className={`px-2.5 py-0.5 font-semibold text-[10px] tracking-wider rounded-full border ${className}`}
    >
      {s}
    </Badge>
  )
}

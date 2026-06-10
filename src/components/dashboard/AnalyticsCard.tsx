import { LucideIcon } from "lucide-react"
import { InteractiveCard } from "@/components/custom/InteractiveCard"
import { AnimatedCounter } from "@/components/custom/AnimatedCounter"

interface AnalyticsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  colorClass?: string
  bgClass?: string
  subtitle?: string
  delay?: number
}

export function AnalyticsCard({ 
  title, 
  value, 
  icon: Icon, 
  colorClass = "text-[#0066FF] dark:text-blue-400",
  bgClass = "bg-blue-50 dark:bg-blue-900/30",
  subtitle,
  delay = 0
}: AnalyticsCardProps) {
  return (
    <InteractiveCard 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: delay * 0.08, ease: "easeOut" }}
      className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full min-h-[120px]"
    >
      <div className="flex flex-col gap-3">
        <div className={`p-2.5 rounded-xl ${bgClass} ${colorClass} self-start transition-transform duration-300 group-hover/glow:scale-110`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 leading-tight">{title}</p>
          <h3 className="text-xl sm:text-2xl font-black text-[#0A1A2F] dark:text-white tracking-tight leading-none">
            <AnimatedCounter value={value} />
          </h3>
        </div>
      </div>
      {subtitle && (
        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-2">{subtitle}</p>
      )}
    </InteractiveCard>
  )
}


"use client"

import { FileText, FileSpreadsheet } from "lucide-react"

export type ExportFormat = "PDF" | "EXCEL"

interface ExportTypeSelectorProps {
  format: ExportFormat
  setFormat: (format: ExportFormat) => void
  disabled?: boolean
}

export function ExportTypeSelector({ format, setFormat, disabled = false }: ExportTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Export Format</label>
      <div className="grid grid-cols-1 gap-2.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setFormat("PDF")}
          className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
            format === "PDF"
              ? "border-red-500 bg-red-50/50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
              : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className={`p-2 rounded-lg ${format === "PDF" ? "bg-red-100 dark:bg-red-950/40 text-red-600" : "bg-white dark:bg-slate-800"}`}>
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-bold block leading-tight">PDF Document</span>
            <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Best for printing & sharing</span>
          </div>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setFormat("EXCEL")}
          className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
            format === "EXCEL"
              ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
              : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className={`p-2 rounded-lg ${format === "EXCEL" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600" : "bg-white dark:bg-slate-800"}`}>
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-bold block leading-tight">Excel Spreadsheet</span>
            <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Best for data analysis</span>
          </div>
        </button>
      </div>
    </div>
  )
}

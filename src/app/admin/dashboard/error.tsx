"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard caught error:", error)
  }, [error])

  return (
    <div className="p-8 max-w-4xl mx-auto bg-red-50 text-red-900 border border-red-200 rounded-xl mt-8">
      <h2 className="text-2xl font-bold mb-4">Something went wrong in the Dashboard!</h2>
      
      <div className="bg-white p-4 rounded border border-red-100 overflow-auto text-sm font-mono whitespace-pre-wrap mb-4">
        <strong>Error Message:</strong> {error.message || "No message available"}
        <br/><br/>
        <strong>Stack Trace:</strong><br/>
        {error.stack || "No stack trace available"}
        <br/><br/>
        <strong>Digest:</strong> {error.digest || "No digest"}
      </div>

      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  )
}

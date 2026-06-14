"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function MagicBentoListener() {
  const pathname = usePathname()

  useEffect(() => {
    // Exclude the login page
    if (pathname === "/login") return

    const handleMouseMove = (e: MouseEvent) => {
      // Find all dashboard cards, widgets, boxes
      const cards = document.querySelectorAll(
        '[data-slot="card"], .bg-white.rounded-2xl, .bg-white.rounded-3xl, .bg-slate-50.rounded-xl, .bg-white.rounded-xl'
      )

      cards.forEach((card) => {
        const el = card as HTMLElement
        const rect = el.getBoundingClientRect()
        const mouseX = e.clientX
        const mouseY = e.clientY

        // Check distance to center to avoid setting custom properties when far away
        const cardCenterX = rect.left + rect.width / 2
        const cardCenterY = rect.top + rect.height / 2
        const distance = Math.hypot(mouseX - cardCenterX, mouseY - cardCenterY)

        const threshold = 400
        if (distance < threshold) {
          const relativeX = ((mouseX - rect.left) / rect.width) * 100
          const relativeY = ((mouseY - rect.top) / rect.height) * 100

          const isInside =
            mouseX >= rect.left &&
            mouseX <= rect.right &&
            mouseY >= rect.top &&
            mouseY <= rect.bottom

          let intensity = 0
          if (isInside) {
            intensity = 1
          } else {
            // Fade out the glow index based on distance to card boundaries
            const maxDimension = Math.max(rect.width, rect.height) / 2
            intensity = Math.max(0, 1 - (distance - maxDimension) / 250)
          }

          el.style.setProperty("--glow-x", `${relativeX}%`)
          el.style.setProperty("--glow-y", `${relativeY}%`)
          el.style.setProperty("--glow-intensity", intensity.toString())
        } else {
          el.style.setProperty("--glow-intensity", "0")
        }
      })
    }

    const handleMouseLeave = () => {
      const cards = document.querySelectorAll(
        '[data-slot="card"], .bg-white.rounded-2xl, .bg-white.rounded-3xl, .bg-slate-50.rounded-xl, .bg-white.rounded-xl'
      )
      cards.forEach((card) => {
        ;(card as HTMLElement).style.setProperty("--glow-intensity", "0")
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [pathname])

  return null
}

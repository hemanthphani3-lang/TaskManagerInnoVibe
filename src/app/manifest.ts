import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'InnoVibe TMS & HRMS',
    short_name: 'InnoVibe',
    description: 'Next Generation Team Management System',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A1A2F',
    theme_color: '#0066FF',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ]
  }
}

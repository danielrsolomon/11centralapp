'use client'

import dynamic from 'next/dynamic'

// Dynamically import the SessionErrorDetector component client-side only
const SessionErrorDetector = dynamic(
  () => import('./SessionErrorDetector'),
  { ssr: false }
)

export default function ClientSessionErrorDetector() {
  return <SessionErrorDetector />
} 
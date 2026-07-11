'use client'

import React, { useEffect, useState } from 'react'
import { Header } from '@/components/landing/Header'

interface ServerWakeScreenProps {
  elapsedMs: number
  attempt: number
}

export function ServerWakeScreen({ elapsedMs }: ServerWakeScreenProps) {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % 3), 5000)
    return () => clearInterval(id)
  }, [])

  const seconds = Math.max(1, Math.round(elapsedMs / 1000))
  const messages = [
    'Getting things ready…',
    'This may take a moment on first visit.',
    'Almost ready…',
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Please wait</h2>
          <p className="text-sm text-muted-foreground mb-4">{messages[msgIndex]}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{seconds}s</p>
        </div>
      </main>
    </div>
  )
}

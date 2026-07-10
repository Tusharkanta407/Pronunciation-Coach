'use client'

import React from 'react'
import { Logo } from './Logo'

export function Header() {
  return (
    <header className="w-full border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <Logo size="lg" />
      </div>
    </header>
  )
}

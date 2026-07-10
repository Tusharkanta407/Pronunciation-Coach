'use client'

import React from 'react'
import { Header } from '../landing/Header'
import { HeroSection } from '../landing/HeroSection'
import { HowItWorks } from '../landing/HowItWorks'

interface LandingPageProps {
  onStart: () => void
}

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection onStart={onStart} />
        <HowItWorks />
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>Your audio is processed securely and deleted after analysis. No login required.</p>
      </footer>
    </div>
  )
}

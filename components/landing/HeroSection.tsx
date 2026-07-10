'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Check, ArrowRight, Clock, Shield } from 'lucide-react'
import { TestPreview } from './TestPreview'

interface HeroSectionProps {
  onStart: () => void
}

const benefits = [
  'Pronunciation Score',
  'Word-level Feedback',
  'Personalized Practice',
]

const rounds = ['Read a passage', 'Introduce yourself', 'Jam — Just a Minute']

export function HeroSection({ onStart }: HeroSectionProps) {
  return (
    <section className="w-full px-6 py-12 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — message */}
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-5 px-3 py-1.5 rounded-full bg-primary/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Pronunciation Test
            </p>

            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-5 text-balance leading-tight">
              Test your English pronunciation in{' '}
              <span className="text-primary">3 quick rounds</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 text-balance leading-relaxed">
              Record your voice, get an AI score, see exactly which words you mispronounced,
              then practice them before moving to the next level.
            </p>

            <ul className="flex flex-col gap-3 mb-8">
              {benefits.map((item) => (
                <li key={item} className="flex items-center gap-3 text-foreground font-medium">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <Check className="h-4 w-4" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2 mb-8">
              {rounds.map((round, i) => (
                <span
                  key={round}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground"
                >
                  Round {i + 1}: {round}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Button
                onClick={onStart}
                size="lg"
                className="group bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg h-auto rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02]"
              >
                Start Pronunciation Test
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 mt-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                ~5 min total
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Audio deleted after analysis
              </span>
            </div>
          </div>

          {/* Right — interactive preview */}
          <div className="flex justify-center lg:justify-end">
            <TestPreview />
          </div>
        </div>
      </div>
    </section>
  )
}

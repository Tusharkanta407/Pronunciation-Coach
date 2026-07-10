'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export interface TutorialStep {
  id: string
  title: string
  description: string
  hint?: string
  target: string
}

interface FloatingTutorialProps {
  steps: TutorialStep[]
  currentStep: number
  onNext: () => void
  onSkip: () => void
}

export function FloatingTutorial({
  steps,
  currentStep,
  onNext,
  onSkip,
}: FloatingTutorialProps) {
  const step = steps[currentStep]
  if (!step) return null

  const isLast = currentStep === steps.length - 1

  return (
    <div className="fixed bottom-6 right-4 md:right-8 z-50 w-[min(100vw-2rem,340px)] animate-in slide-in-from-right-4 fade-in duration-300">
      <Card className="p-5 border-2 border-primary shadow-2xl bg-card">
        <div className="flex gap-1.5 mb-4">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i === currentStep
                  ? 'bg-primary'
                  : i < currentStep
                    ? 'bg-primary/50'
                    : 'bg-border'
              }`}
            />
          ))}
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
          Step {currentStep + 1} of {steps.length}
        </p>
        <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {step.description}
        </p>

        {step.hint && (
          <div className="p-3 mb-4 rounded-lg bg-primary/10 border border-primary/20 text-sm text-foreground">
            {step.hint}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onSkip}>
            Skip
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={onNext}
          >
            {isLast ? 'Start' : 'Next →'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

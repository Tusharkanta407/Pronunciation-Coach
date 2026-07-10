'use client'

import React, { useEffect, useState } from 'react'
import { ProgressStep } from './ProgressStep'

interface LoadingStateProps {
  onComplete: () => void
}

const steps = [
  'Upload Complete',
  'Speech-to-Text',
  'AI Pronunciation Analysis',
  'Finding Difficult Words',
]

export function LoadingState({ onComplete }: LoadingStateProps) {
  const [completedSteps, setCompletedSteps] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCompletedSteps(prev => {
        if (prev < steps.length) {
          return prev + 1
        } else {
          clearInterval(interval)
          setTimeout(onComplete, 500)
          return prev
        }
      })
    }, 1200)

    return () => clearInterval(interval)
  }, [onComplete])

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-lg">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">
          Analyzing your pronunciation...
        </h2>

        <div className="space-y-4 mb-8">
          {steps.map((step, idx) => (
            <ProgressStep
              key={idx}
              title={step}
              isComplete={idx < completedSteps}
              isActive={idx === completedSteps}
            />
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground animate-pulse">
          Generating Feedback...
        </p>
      </div>
    </div>
  )
}

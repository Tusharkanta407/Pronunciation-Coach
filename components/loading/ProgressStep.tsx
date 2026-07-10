'use client'

import React from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

interface ProgressStepProps {
  title: string
  isComplete: boolean
  isActive: boolean
}

export function ProgressStep({ title, isComplete, isActive }: ProgressStepProps) {
  return (
    <div className="flex items-center gap-3">
      {isComplete ? (
        <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
      ) : isActive ? (
        <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        </div>
      ) : (
        <Circle className="w-6 h-6 text-border flex-shrink-0" />
      )}
      <span className={`text-sm font-medium ${isComplete || isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
        {title}
      </span>
    </div>
  )
}

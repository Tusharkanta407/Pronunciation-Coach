'use client'

import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

const rules = [
  'Speak clearly and naturally',
  'Maintain steady pace',
  'Avoid background noise',
  'Complete the full sentence',
  'Take your time',
]

export function AssessmentChecklist() {
  return (
    <div className="space-y-4">
      <Card className="p-6 bg-background border-border">
        <h3 className="font-semibold text-foreground mb-4 text-lg">Assessment Rules</h3>
        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-muted-foreground text-sm">{rule}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-primary/5 border border-primary/20">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">Step 1 of 1</p>
          <p className="text-lg font-semibold text-foreground mt-2">Ready to Begin?</p>
        </div>
      </Card>
    </div>
  )
}

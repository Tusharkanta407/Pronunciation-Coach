'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Volume2, Target, CheckCircle2 } from 'lucide-react'
import { WordIssue } from '@/context/AssessmentContext'

interface WordCardProps {
  issue: WordIssue
  isActive?: boolean
  onPractice?: () => void
  onVerify?: () => void
}

export function WordCard({ issue, isActive, onPractice, onVerify }: WordCardProps) {
  const cleared = issue.cleared

  return (
    <Card
      className={`p-4 border transition-all ${
        cleared
          ? 'border-primary/30 bg-primary/5'
          : isActive
            ? 'border-primary shadow-md'
            : 'border-border'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        {cleared ? (
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
        ) : (
          <span className="text-destructive font-bold shrink-0">✕</span>
        )}
        <h4 className={`text-lg font-bold ${cleared ? 'text-primary' : 'text-foreground'}`}>
          {issue.word}
        </h4>
        {cleared && <span className="text-xs text-primary font-medium ml-auto">Verified</span>}
      </div>

      {!cleared && (
        <>
          <p className="text-sm text-muted-foreground mb-1">{issue.issue}</p>
          {issue.suggestion && (
            <p className="text-sm text-primary mb-4">{issue.suggestion}</p>
          )}

          {isActive ? (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium text-foreground">
                Say &ldquo;{issue.word}&rdquo; clearly and tap Verify
              </p>
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={onVerify}
              >
                Verify Pronunciation
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">
                <Volume2 className="h-4 w-4 mr-2" />
                Listen
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={onPractice}
              >
                <Target className="h-4 w-4 mr-2" />
                Practice
              </Button>
            </div>
          )}

          <div className="mt-3 border-t border-border" />
        </>
      )}
    </Card>
  )
}

'use client'

import React from 'react'
import { AssessmentMode } from '@/lib/levels'
import { LEVELS } from '@/lib/levels'
import { Lock } from 'lucide-react'

interface ModeTabsProps {
  active: AssessmentMode
  unlockedModes: AssessmentMode[]
  onChange: (mode: AssessmentMode) => void
}

export function ModeTabs({ active, unlockedModes, onChange }: ModeTabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6">
      {LEVELS.map((level) => {
        const unlocked = unlockedModes.includes(level.id)
        const isActive = active === level.id

        return (
          <button
            key={level.id}
            disabled={!unlocked}
            onClick={() => unlocked && onChange(level.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : unlocked
                  ? 'text-muted-foreground hover:text-foreground'
                  : 'text-muted-foreground/50 cursor-not-allowed'
            }`}
          >
            {!unlocked && <Lock className="h-3.5 w-3.5" />}
            {level.tabLabel}
          </button>
        )
      })}
    </div>
  )
}

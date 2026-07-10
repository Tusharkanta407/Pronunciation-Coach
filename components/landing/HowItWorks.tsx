'use client'

import React, { useState } from 'react'
import { Mic, BarChart3, Target } from 'lucide-react'

const steps = [
  {
    icon: Mic,
    step: '01',
    title: 'Record your voice',
    description: 'Read a passage, introduce yourself, or jam for one minute on a random topic.',
  },
  {
    icon: BarChart3,
    step: '02',
    title: 'Get your score',
    description: 'AI highlights every word you mispronounced with reasons and suggestions.',
  },
  {
    icon: Target,
    step: '03',
    title: 'Fix & level up',
    description: 'Re-pronounce flagged words, clear them, then unlock the next round.',
  },
]

export function HowItWorks() {
  const [active, setActive] = useState(0)

  return (
    <section className="w-full px-6 py-16 bg-muted/20">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
            How the test works
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            3 rounds. One pronunciation test.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((item, i) => {
            const Icon = item.icon
            const isActive = active === i
            return (
              <button
                key={item.step}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
                className={`text-left p-5 rounded-2xl border transition-all duration-300 ${
                  isActive
                    ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                    : 'border-border bg-background hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">{item.step}</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

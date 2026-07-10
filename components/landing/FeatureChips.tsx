'use client'

import React from 'react'
import { CheckCircle } from 'lucide-react'

const features = [
  {
    title: 'Pronunciation Score',
    description: 'Get instant scoring on your pronunciation accuracy',
  },
  {
    title: 'Word-Level Feedback',
    description: 'Identify specific words that need improvement',
  },
  {
    title: 'Secure Audio Processing',
    description: 'Your recordings are processed with enterprise-grade security',
  },
  {
    title: 'Personalized Practice',
    description: 'Custom recommendations based on your results',
  },
]

export function FeatureChips() {
  return (
    <section className="w-full py-20 px-6 bg-muted/30">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold text-center text-foreground mb-16">Why Choose Livo AI?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, idx) => (
            <div key={idx} className="flex gap-4 items-start p-6 bg-background rounded-xl border border-border shadow-sm">
              <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

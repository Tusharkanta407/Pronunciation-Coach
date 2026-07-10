'use client'

import React from 'react'

interface PassageDisplayProps {
  text: string
  hardWords?: string[]
  highlighted?: boolean
}

export function PassageDisplay({ text, hardWords = [], highlighted }: PassageDisplayProps) {
  const hardSet = new Set(hardWords.map((w) => w.toLowerCase()))
  const tokens = text.split(/(\s+)/)

  return (
    <p
      className={`text-foreground leading-relaxed text-base transition-all duration-300 ${
        highlighted ? 'ring-2 ring-primary ring-offset-4 rounded-lg p-3 bg-primary/5' : ''
      }`}
    >
      {tokens.map((token, i) => {
        const clean = token.replace(/[^a-zA-Z']/g, '').toLowerCase()
        if (!clean || !hardSet.has(clean)) {
          return <span key={i}>{token}</span>
        }
        return (
          <span
            key={i}
            className="font-semibold text-primary underline decoration-primary/40 decoration-2 underline-offset-2"
            title="Challenging word — pronounce carefully"
          >
            {token}
          </span>
        )
      })}
    </p>
  )
}

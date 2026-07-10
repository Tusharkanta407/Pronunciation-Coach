'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const markSizes = {
  sm: 'h-6 w-6',
  md: 'h-7 w-7',
  lg: 'h-9 w-9',
}

const textSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl md:text-2xl',
}

/** Livo mark — microphone (replaces the old v0 favicon mark). */
function LivoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <rect width="40" height="40" rx="10" className="fill-primary" />
      <rect x="16" y="8" width="8" height="14" rx="4" fill="white" />
      <path
        d="M12 20c0 5 3.5 8.5 8 8.5s8-3.5 8-8.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <line x1="20" y1="28.5" x2="20" y2="33" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="33" x2="24" y2="33" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M29 15c2 2 2 8 0 10"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  )
}

export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 font-bold tracking-tight select-none',
        textSizes[size],
        className
      )}
    >
      <LivoMark className={markSizes[size]} />
      <div className="flex items-baseline gap-1.5 leading-none">
        <span className="text-foreground">Livo</span>
        <span className="font-semibold text-muted-foreground">Assistant</span>
      </div>
    </div>
  )
}

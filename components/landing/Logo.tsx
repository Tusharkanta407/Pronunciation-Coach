'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl md:text-2xl',
}

export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <div className={cn('flex items-center font-bold tracking-tight select-none', sizes[size], className)}>
      <span className="text-primary mr-1.5">&gt;</span>
      <span className="text-primary">LIVO</span>
      <span className="text-primary/80 ml-2">ASSISTANT</span>
    </div>
  )
}

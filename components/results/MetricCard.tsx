'use client'

import React from 'react'
import { Card } from '@/components/ui/card'

interface MetricCardProps {
  label: string
  value: number
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <Card className="p-6 text-center bg-card border-border">
      <p className="text-sm text-muted-foreground font-medium mb-2">{label}</p>
      <p className="text-4xl font-bold text-primary">{value}</p>
    </Card>
  )
}

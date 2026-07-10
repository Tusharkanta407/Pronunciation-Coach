'use client'

import React, { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Header } from '../landing/Header'
import { consentSections, CONSENT_VERSION, DATA_FIDUCIARY } from '@/lib/consentNotice'
import { AlertTriangle, ChevronDown, Shield } from 'lucide-react'

interface PrivacyPageProps {
  onContinue: () => void | Promise<void>
  onBack: () => void
}

const SCROLL_THRESHOLD = 24

export function PrivacyPage({ onContinue, onBack }: PrivacyPageProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  const checkScrollEnd = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD
    if (atBottom) {
      setHasScrolledToEnd(true)
      setShowWarning(false)
    }
  }, [])

  const handleCheckboxClick = () => {
    if (!hasScrolledToEnd) {
      setShowWarning(true)
      return
    }
    setAgreed((prev) => !prev)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-2xl">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Before You Begin
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Privacy Notice &amp; Consent under the Digital Personal Data Protection Act, 2023
            </p>
          </div>

          <Card className="mb-4 border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                DPDP Section 5 Notice — v{CONSENT_VERSION}
              </p>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Data Fiduciary: {DATA_FIDUCIARY.name}
              </p>
            </div>

            <div className="relative">
              <div
                ref={scrollRef}
                onScroll={checkScrollEnd}
                className="h-[min(52vh,420px)] overflow-y-auto px-5 py-4 scroll-smooth"
                role="document"
                aria-label="Privacy notice and consent form"
              >
                <div className="space-y-6 text-sm text-foreground leading-relaxed">
                  {consentSections.map((section) => (
                    <section key={section.title}>
                      <h2 className="font-semibold text-foreground mb-2 text-base">
                        {section.title}
                      </h2>
                      <div className="text-muted-foreground whitespace-pre-line">
                        {section.body}
                      </div>
                    </section>
                  ))}
                </div>
              </div>

              {!hasScrolledToEnd && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent flex items-end justify-center pb-2">
                  <span className="flex items-center gap-1 text-xs font-medium text-primary animate-bounce">
                    <ChevronDown className="h-4 w-4" />
                    Scroll to read fully
                  </span>
                </div>
              )}
            </div>
          </Card>

          {showWarning && !hasScrolledToEnd && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold">Please read the notice fully</p>
                <p className="text-amber-800 mt-0.5">
                  Scroll to the end of the consent form before you can agree. This ensures
                  your consent is informed as required under the DPDP Act.
                </p>
              </div>
            </div>
          )}

          {hasScrolledToEnd && (
            <p className="mb-3 text-xs text-primary font-medium text-center">
              ✓ You have reached the end of the notice
            </p>
          )}

          <div
            className={`flex items-start gap-3 mb-6 p-4 rounded-lg border transition-colors ${
              hasScrolledToEnd
                ? 'border-border bg-card cursor-pointer'
                : 'border-border/60 bg-muted/30 cursor-not-allowed opacity-70'
            }`}
            onClick={handleCheckboxClick}
            role="checkbox"
            aria-checked={agreed}
            aria-disabled={!hasScrolledToEnd}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                handleCheckboxClick()
              }
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              readOnly
              disabled={!hasScrolledToEnd}
              className="h-5 w-5 mt-0.5 rounded border-2 border-border accent-primary pointer-events-none"
              aria-hidden
            />
            <div>
              <span className="text-foreground font-medium text-sm block">
                I have read and understood the entire notice. I freely consent to the
                processing of my personal data as described above.
              </span>
              <span className="text-xs text-muted-foreground mt-1 block">
                Consent is specific to pronunciation assessment only. I may withdraw at any
                time.
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={onBack} variant="outline" className="flex-1 h-11">
              Back
            </Button>
            <Button
              onClick={onContinue}
              disabled={!agreed || !hasScrolledToEnd}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
            >
              Continue
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

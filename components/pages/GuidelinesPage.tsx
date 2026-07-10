import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface GuidelinesPageProps {
  onSkip: () => void
  onContinue: () => void
  onBack: () => void
}

export function GuidelinesPage({ onSkip, onContinue, onBack }: GuidelinesPageProps) {
  const [showModal, setShowModal] = useState(true)

  const guidelines = [
    {
      title: 'Clear Pronunciation',
      description: 'Speak clearly and naturally. Avoid rushing through words.'
    },
    {
      title: 'Consistent Pace',
      description: 'Maintain a steady speaking pace throughout the recording.'
    },
    {
      title: 'Proper Intonation',
      description: 'Use appropriate emphasis and tone for English speech patterns.'
    },
    {
      title: 'Quiet Environment',
      description: 'Record in a quiet place with minimal background noise.'
    },
    {
      title: 'Microphone Distance',
      description: 'Keep the microphone at a consistent distance from your mouth.'
    },
  ]

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6 relative">
      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-8 bg-card border border-border rounded-2xl shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2 1m2-1l-2-1m2 1v2.5"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Assignment Level 1</h2>
              <p className="text-muted-foreground">Welcome to your pronunciation assessment</p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowModal(false)
                  onSkip()
                }}
                variant="outline"
                className="flex-1"
              >
                Skip Guidelines
              </Button>
              <Button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                View Guidelines
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {!showModal && (
        <div className="w-full max-w-3xl">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-2">Assignment Guidelines</h1>
            <p className="text-lg text-muted-foreground">Follow these tips for the best results</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {guidelines.map((guide, index) => (
              <Card key={index} className="p-6 bg-card border border-border hover:border-accent/50 transition">
                <h3 className="text-lg font-semibold text-foreground mb-2">{guide.title}</h3>
                <p className="text-muted-foreground">{guide.description}</p>
              </Card>
            ))}
          </div>

          <div className="flex gap-4">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1 h-12 text-base"
            >
              Back
            </Button>
            <Button
              onClick={onContinue}
              className="flex-1 h-12 text-base bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Start Recording
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}

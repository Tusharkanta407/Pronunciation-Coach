export type AssessmentMode = 'read-passage' | 'free-speech' | 'just-a-minute'

export interface LevelConfig {
  id: AssessmentMode
  tabLabel: string
  title: string
  instruction: string
  content: string
  minRecordingSeconds: number
  maxRecordingSeconds: number
}

export const PRACTICE_WORD_MAX_SECONDS = 10
export const MAX_PRACTICE_WORDS = 4

/** Challenge words from the passage — backend practice priority only. */
export const CRITICAL_WORDS = [
  'entrepreneur',
  'opportunity',
  'environment',
  'communication',
  'particularly',
  'responsibility',
  'necessary',
]

/** Random topics for Round 3 — Jam: Just a Minute */
export const JAM_TOPICS = [
  'Your favorite food and why you enjoy it',
  'A memorable trip or vacation you took',
  'A hobby you love spending time on',
  'Your morning routine and why it works for you',
  'A book or movie that inspired you',
  'Someone you admire and what you learned from them',
  'Your dream job and what excites you about it',
  'A skill you want to learn this year',
  'The best advice you have ever received',
  'How you like to spend weekends',
  'A place in your city you recommend visiting',
  'Technology you use every day and why',
  'A challenge you overcame recently',
  'Your favorite season and what you do in it',
  'A tradition in your family or culture',
]

export function pickJamTopic(): string {
  return JAM_TOPICS[Math.floor(Math.random() * JAM_TOPICS.length)]
}

export const LEVELS: LevelConfig[] = [
  {
    id: 'read-passage',
    tabLabel: 'Read Passage',
    title: 'Read the Passage',
    instruction: 'Read the passage below clearly and naturally in English.',
    content:
      'Every morning, I take a short walk through a peaceful neighborhood before starting my work. ' +
      'The fresh air helps me concentrate and improves my confidence when speaking English. ' +
      'Along the way, I notice how comfortable conversations become with regular practice and clear pronunciation. ' +
      'Sometimes, words like entrepreneur, opportunity, environment, communication, particularly, responsibility, and necessary require extra attention because they are easy to mispronounce. ' +
      'Certain words, such as island and comfortable, are tricky because their spelling does not match how they actually sound. ' +
      'By reading aloud every day and listening carefully to my own voice, I gradually become more fluent, expressive, and confident in everyday conversations.',
    minRecordingSeconds: 3,
    maxRecordingSeconds: 60,
  },
  {
    id: 'free-speech',
    tabLabel: 'Free Speech',
    title: 'Share About Yourself',
    instruction: 'Cover your name, a hobby, or anything you want to share — speak naturally.',
    content:
      'Cover your name, a hobby, or anything you want to share. ' +
      'Speak clearly and naturally for up to 60 seconds.',
    minRecordingSeconds: 3,
    maxRecordingSeconds: 60,
  },
  {
    id: 'just-a-minute',
    tabLabel: 'Jam',
    title: 'Jam — Just a Minute',
    instruction: 'Talk about the topic below for at least one full minute. Any angle is fine — just keep speaking clearly.',
    content:
      'Speak continuously for at least 60 seconds (up to 75 seconds). ' +
      'We will pick up pronunciation mistakes from your speech as you go.',
    minRecordingSeconds: 60,
    maxRecordingSeconds: 75,
  },
]

export const PASS_THRESHOLD = 80

export function getLevel(mode: AssessmentMode): LevelConfig {
  return LEVELS.find((l) => l.id === mode) ?? LEVELS[0]
}

export function isGuidedMode(mode: AssessmentMode): boolean {
  return mode === 'free-speech' || mode === 'just-a-minute'
}

import { create } from 'zustand'
import { advanceDay, applyDecision, calculateScore, createGame } from '../game/engine'
import { scenarioById, scenarios } from '../game/scenarios'
import type { GameState, PlayerDecision } from '../game/types'

const STORAGE_KEY = 'scm-game-progress-v2'
const LEGACY_STORAGE_KEY = 'scm-game-progress-v1'

interface SavedProgress {
  version: 2
  tutorialComplete: boolean
  unlockedScenarioIds: string[]
  bestScores: Record<string, number>
}

const defaults: SavedProgress = { version: 2, tutorialComplete: false, unlockedScenarioIds: ['january'], bestScores: {} }

function loadProgress(): SavedProgress {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as SavedProgress
    if (current.version === 2) return current
  } catch {
    // Attempt the legacy migration below.
  }
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? '') as { version: 1; tutorialComplete?: boolean; unlockedScenarioIds?: string[]; bestScores?: Record<string, number> }
    if (legacy.version !== 1) return defaults
    const legacyUnlocked = legacy.unlockedScenarioIds ?? []
    const unlockedScenarioIds = ['january']
    if (legacy.tutorialComplete || legacyUnlocked.includes('growth')) unlockedScenarioIds.push('february')
    if (legacyUnlocked.includes('resilience')) unlockedScenarioIds.push('march')
    const migrated: SavedProgress = {
      version: 2,
      tutorialComplete: Boolean(legacy.tutorialComplete),
      unlockedScenarioIds,
      bestScores: {
        ...(legacy.bestScores?.basics ? { january: legacy.bestScores.basics } : {}),
        ...(legacy.bestScores?.growth ? { march: legacy.bestScores.growth } : {}),
        ...(legacy.bestScores?.resilience ? { june: legacy.bestScores.resilience } : {}),
      },
    }
    saveProgress(migrated)
    return migrated
  } catch {
    return defaults
  }
}

function saveProgress(progress: SavedProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

interface GameStore extends SavedProgress {
  screen: 'home' | 'game' | 'debrief'
  game: GameState | null
  tutorialOpen: boolean
  startScenario: (id: string) => void
  updateDecision: (decision: Partial<PlayerDecision>) => void
  nextDay: () => void
  restart: () => void
  goHome: () => void
  openTutorial: () => void
  closeTutorial: () => void
}

const progress = loadProgress()
const scrollToTop = () => queueMicrotask(() => window.scrollTo({ top: 0, left: 0 }))

export const useGameStore = create<GameStore>((set, get) => ({
  ...progress,
  screen: 'home',
  game: null,
  tutorialOpen: false,
  startScenario: (id) => {
    const scenario = scenarioById(id)
    set({ game: createGame(scenario), screen: 'game', tutorialOpen: !get().tutorialComplete && id === 'january' })
    scrollToTop()
  },
  updateDecision: (decision) => set((state) => state.game ? { game: applyDecision(state.game, decision) } : {}),
  nextDay: () => {
    const game = get().game
    if (!game) return
    const next = advanceDay(game)
    if (next.status !== 'finished') {
      set({ game: next })
      return
    }
    const score = calculateScore(next).total
    const scenarioIndex = scenarios.findIndex((item) => item.id === next.scenarioId)
    const nextScenario = scenarios[scenarioIndex + 1]
    const unlockedScenarioIds = Array.from(new Set([...get().unlockedScenarioIds, ...(nextScenario ? [nextScenario.id] : [])]))
    const bestScores = { ...get().bestScores, [next.scenarioId]: Math.max(score, get().bestScores[next.scenarioId] ?? 0) }
    const saved = { version: 2 as const, tutorialComplete: true, unlockedScenarioIds, bestScores }
    saveProgress(saved)
    set({ game: next, screen: 'debrief', ...saved })
    scrollToTop()
  },
  restart: () => {
    const game = get().game
    if (game) {
      set({ game: createGame(scenarioById(game.scenarioId)), screen: 'game' })
      scrollToTop()
    }
  },
  goHome: () => {
    set({ screen: 'home', game: null, tutorialOpen: false })
    scrollToTop()
  },
  openTutorial: () => set({ tutorialOpen: true }),
  closeTutorial: () => {
    const saved = { version: 2 as const, tutorialComplete: true, unlockedScenarioIds: get().unlockedScenarioIds, bestScores: get().bestScores }
    saveProgress(saved)
    set({ tutorialOpen: false, tutorialComplete: true })
  },
}))

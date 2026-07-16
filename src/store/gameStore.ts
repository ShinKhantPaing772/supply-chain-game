import { create } from 'zustand'
import { advanceDay, applyDecision, calculateScore, createGame } from '../game/engine'
import { scenarioById, scenarios } from '../game/scenarios'
import type { GameState, PlayerDecision } from '../game/types'
import { clearSavedSessions, createSavedGameSession, loadSessions, saveSessions, type SavedGameSession, type SessionScreen } from './sessionPersistence'

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
  activeScenarioId: string | null
  savedSessions: Record<string, SavedGameSession>
  tutorialOpen: boolean
  startScenario: (id: string) => void
  resumeGame: (id?: string) => void
  deleteScenarioProgress: (id: string) => void
  deleteAllProgress: () => void
  updateDecision: (decision: Partial<PlayerDecision>) => void
  nextDay: () => void
  restart: () => void
  goHome: () => void
  openTutorial: () => void
  closeTutorial: () => void
}

const progress = loadProgress()
const sessionState = loadSessions()
const initialSession = sessionState.activeScenarioId ? sessionState.sessions[sessionState.activeScenarioId] : undefined
const scrollToTop = () => queueMicrotask(() => window.scrollTo({ top: 0, left: 0 }))
const persistSessions = (screen: SessionScreen, activeScenarioId: string | null, sessions: Record<string, SavedGameSession>) => saveSessions({ version: 2, screen, activeScenarioId, sessions })

export const useGameStore = create<GameStore>((set, get) => ({
  ...progress,
  screen: initialSession ? sessionState.screen : 'home',
  game: initialSession?.game ?? null,
  activeScenarioId: initialSession?.game.scenarioId ?? null,
  savedSessions: sessionState.sessions,
  tutorialOpen: initialSession?.tutorialOpen ?? false,
  startScenario: (id) => {
    const scenario = scenarioById(id)
    const game = createGame(scenario)
    const tutorialOpen = !get().tutorialComplete && id === 'january'
    const savedSessions = { ...get().savedSessions, [id]: createSavedGameSession(game, tutorialOpen) }
    persistSessions('game', id, savedSessions)
    set({ game, screen: 'game', tutorialOpen, activeScenarioId: id, savedSessions })
    scrollToTop()
  },
  resumeGame: (id) => {
    const scenarioId = id ?? get().activeScenarioId
    const saved = scenarioId ? get().savedSessions[scenarioId] : undefined
    if (!saved) return
    const game = saved.game
    const screen = game.status === 'finished' ? 'debrief' : 'game'
    const savedSessions = { ...get().savedSessions, [game.scenarioId]: createSavedGameSession(game, false) }
    persistSessions(screen, game.scenarioId, savedSessions)
    set({ game, screen, tutorialOpen: false, activeScenarioId: game.scenarioId, savedSessions })
    scrollToTop()
  },
  updateDecision: (decision) => set((state) => {
    if (!state.game) return {}
    const game = applyDecision(state.game, decision)
    const savedSessions = { ...state.savedSessions, [game.scenarioId]: createSavedGameSession(game, state.tutorialOpen) }
    persistSessions('game', game.scenarioId, savedSessions)
    return { game, savedSessions }
  }),
  nextDay: () => {
    const game = get().game
    if (!game) return
    const next = advanceDay(game)
    if (next.status !== 'finished') {
      const savedSessions = { ...get().savedSessions, [next.scenarioId]: createSavedGameSession(next, false) }
      persistSessions('game', next.scenarioId, savedSessions)
      set({ game: next, savedSessions })
      return
    }
    const score = calculateScore(next).total
    const scenarioIndex = scenarios.findIndex((item) => item.id === next.scenarioId)
    const nextScenario = scenarios[scenarioIndex + 1]
    const unlockedScenarioIds = Array.from(new Set([...get().unlockedScenarioIds, ...(nextScenario ? [nextScenario.id] : [])]))
    const bestScores = { ...get().bestScores, [next.scenarioId]: Math.max(score, get().bestScores[next.scenarioId] ?? 0) }
    const saved = { version: 2 as const, tutorialComplete: true, unlockedScenarioIds, bestScores }
    saveProgress(saved)
    const savedSessions = { ...get().savedSessions, [next.scenarioId]: createSavedGameSession(next, false) }
    persistSessions('debrief', next.scenarioId, savedSessions)
    set({ game: next, screen: 'debrief', savedSessions, ...saved })
    scrollToTop()
  },
  restart: () => {
    const game = get().game
    if (game) {
      const restarted = createGame(scenarioById(game.scenarioId))
      const savedSessions = { ...get().savedSessions, [restarted.scenarioId]: createSavedGameSession(restarted, false) }
      persistSessions('game', restarted.scenarioId, savedSessions)
      set({ game: restarted, screen: 'game', savedSessions })
      scrollToTop()
    }
  },
  goHome: () => {
    const game = get().game
    const activeScenarioId = game?.scenarioId ?? get().activeScenarioId
    const savedSessions = game ? { ...get().savedSessions, [game.scenarioId]: createSavedGameSession(game, false) } : get().savedSessions
    persistSessions('home', activeScenarioId, savedSessions)
    set({ screen: 'home', tutorialOpen: false, activeScenarioId, savedSessions })
    scrollToTop()
  },
  deleteScenarioProgress: (id) => {
    const savedSessions = { ...get().savedSessions }
    delete savedSessions[id]
    const deletingActive = get().activeScenarioId === id
    const activeScenarioId = deletingActive ? null : get().activeScenarioId
    persistSessions('home', activeScenarioId, savedSessions)
    set({ savedSessions, activeScenarioId, ...(deletingActive ? { game: null, screen: 'home' as const, tutorialOpen: false } : {}) })
  },
  deleteAllProgress: () => {
    clearSavedSessions()
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    saveProgress(defaults)
    set({ ...defaults, screen: 'home', game: null, activeScenarioId: null, savedSessions: {}, tutorialOpen: false })
    scrollToTop()
  },
  openTutorial: () => {
    const game = get().game
    if (!game) return
    const savedSessions = { ...get().savedSessions, [game.scenarioId]: createSavedGameSession(game, true) }
    persistSessions(get().screen, game.scenarioId, savedSessions)
    set({ tutorialOpen: true, savedSessions })
  },
  closeTutorial: () => {
    const saved = { version: 2 as const, tutorialComplete: true, unlockedScenarioIds: get().unlockedScenarioIds, bestScores: get().bestScores }
    saveProgress(saved)
    const game = get().game
    const savedSessions = game ? { ...get().savedSessions, [game.scenarioId]: createSavedGameSession(game, false) } : get().savedSessions
    if (game) persistSessions(get().screen, game.scenarioId, savedSessions)
    set({ tutorialOpen: false, tutorialComplete: true, savedSessions })
  },
}))

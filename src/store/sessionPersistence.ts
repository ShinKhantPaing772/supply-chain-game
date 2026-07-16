import type { GameState } from '../game/types'

export const SESSION_STORAGE_KEY = 'scm-game-sessions-v2'
export const LEGACY_SESSION_STORAGE_KEY = 'scm-game-active-session-v1'

export type SessionScreen = 'home' | 'game' | 'debrief'

export interface SavedGameSession {
  game: GameState
  tutorialOpen: boolean
  savedAt: string
}

export interface SavedSessions {
  version: 2
  screen: SessionScreen
  activeScenarioId: string | null
  sessions: Record<string, SavedGameSession>
}

const emptySessions = (): SavedSessions => ({ version: 2, screen: 'home', activeScenarioId: null, sessions: {} })

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false
  const game = value as Partial<GameState>
  return typeof game.scenarioId === 'string'
    && typeof game.day === 'number'
    && (game.status === 'playing' || game.status === 'finished')
    && Boolean(game.decision)
    && Array.isArray(game.history)
}

function isSavedSessions(value: unknown): value is SavedSessions {
  if (!value || typeof value !== 'object') return false
  const saved = value as Partial<SavedSessions>
  if (saved.version !== 2 || !['home', 'game', 'debrief'].includes(saved.screen ?? '') || !saved.sessions || typeof saved.sessions !== 'object') return false
  return Object.values(saved.sessions).every((session) => isGameState(session?.game) && typeof session.savedAt === 'string')
}

export function loadSessions(): SavedSessions {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null') as unknown
    if (isSavedSessions(saved)) return saved
  } catch {
    // Try the single-session migration below.
  }
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_SESSION_STORAGE_KEY) ?? 'null') as { version?: number; screen?: SessionScreen; game?: GameState; tutorialOpen?: boolean; savedAt?: string } | null
    if (legacy?.version !== 1 || !isGameState(legacy.game)) return emptySessions()
    const migrated: SavedSessions = {
      version: 2,
      screen: legacy.screen ?? 'home',
      activeScenarioId: legacy.game.scenarioId,
      sessions: { [legacy.game.scenarioId]: { game: legacy.game, tutorialOpen: Boolean(legacy.tutorialOpen), savedAt: legacy.savedAt ?? new Date().toISOString() } },
    }
    saveSessions(migrated)
    localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY)
    return migrated
  } catch {
    return emptySessions()
  }
}

export function createSavedGameSession(game: GameState, tutorialOpen = false): SavedGameSession {
  return { game, tutorialOpen, savedAt: new Date().toISOString() }
}

export function saveSessions(sessions: SavedSessions) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions))
}

export function clearSavedSessions() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
  localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY)
}

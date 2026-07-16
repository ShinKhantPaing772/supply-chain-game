import type { GameState } from '../game/types'

export const SESSION_STORAGE_KEY = 'scm-game-active-session-v1'

export type SessionScreen = 'home' | 'game' | 'debrief'

export interface SavedSession {
  version: 1
  screen: SessionScreen
  game: GameState
  tutorialOpen: boolean
  savedAt: string
}

function isSavedSession(value: unknown): value is SavedSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<SavedSession>
  const game = session.game as Partial<GameState> | undefined
  return session.version === 1
    && ['home', 'game', 'debrief'].includes(session.screen ?? '')
    && Boolean(game)
    && typeof game?.scenarioId === 'string'
    && typeof game?.day === 'number'
    && (game?.status === 'playing' || game?.status === 'finished')
    && Boolean(game?.decision)
    && Array.isArray(game?.history)
}

export function loadSession(): SavedSession | null {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null') as unknown
    return isSavedSession(saved) ? saved : null
  } catch {
    return null
  }
}

export function saveSession(screen: SessionScreen, game: GameState, tutorialOpen = false) {
  const session: SavedSession = { version: 1, screen, game, tutorialOpen, savedAt: new Date().toISOString() }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

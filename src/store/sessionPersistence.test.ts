import { beforeEach, describe, expect, it } from 'vitest'
import { applyDecision, createGame } from '../game/engine'
import { scenarioById } from '../game/scenarios'
import { createSavedGameSession, LEGACY_SESSION_STORAGE_KEY, loadSessions, saveSessions, SESSION_STORAGE_KEY } from './sessionPersistence'

describe('saved game persistence', () => {
  beforeEach(() => localStorage.clear())

  it('restores independent games and their latest uncommitted decisions', () => {
    const february = createGame(scenarioById('february'))
    const march = applyDecision(createGame(scenarioById('march')), { sellingPrice: 165 })

    saveSessions({ version: 2, screen: 'home', activeScenarioId: 'march', sessions: { february: createSavedGameSession(february), march: createSavedGameSession(march) } })
    const restored = loadSessions()

    expect(Object.keys(restored.sessions)).toEqual(['february', 'march'])
    expect(restored.sessions.february.game.scenarioId).toBe('february')
    expect(restored.sessions.march.game.decision.sellingPrice).toBe(165)
    expect(restored.activeScenarioId).toBe('march')
  })

  it('migrates the previous single-session save without losing it', () => {
    const game = createGame(scenarioById('april'))
    localStorage.setItem(LEGACY_SESSION_STORAGE_KEY, JSON.stringify({ version: 1, screen: 'game', game, tutorialOpen: false, savedAt: '2026-01-01T00:00:00.000Z' }))

    const restored = loadSessions()

    expect(restored.sessions.april.game.scenarioId).toBe('april')
    expect(restored.activeScenarioId).toBe('april')
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeTruthy()
    expect(localStorage.getItem(LEGACY_SESSION_STORAGE_KEY)).toBeNull()
  })

  it('ignores invalid or incompatible saved sessions', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: 99, sessions: {} }))
    expect(loadSessions().sessions).toEqual({})
  })
})

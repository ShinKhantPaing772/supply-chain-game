import { beforeEach, describe, expect, it } from 'vitest'
import { applyDecision, createGame } from '../game/engine'
import { scenarioById } from '../game/scenarios'
import { loadSession, saveSession, SESSION_STORAGE_KEY } from './sessionPersistence'

describe('active game persistence', () => {
  beforeEach(() => localStorage.clear())

  it('restores the current game and latest uncommitted decisions', () => {
    const game = applyDecision(createGame(scenarioById('march')), { sellingPrice: 165 })

    saveSession('game', game, false)
    const restored = loadSession()

    expect(restored?.screen).toBe('game')
    expect(restored?.game.scenarioId).toBe('march')
    expect(restored?.game.day).toBe(1)
    expect(restored?.game.decision.sellingPrice).toBe(165)
    expect(restored?.savedAt).toBeTruthy()
  })

  it('ignores invalid or incompatible saved sessions', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: 99, game: {} }))
    expect(loadSession()).toBeNull()
  })
})

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { advanceDay, createGame } from './game/engine'
import { scenarioById } from './game/scenarios'
import { useGameStore } from './store/gameStore'
import { createSavedGameSession } from './store/sessionPersistence'

describe('Supply-Chain Management Game', () => {
  afterEach(cleanup)

  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    useGameStore.setState({ screen: 'home', game: null, activeScenarioId: null, savedSessions: {}, tutorialOpen: false, tutorialComplete: false, unlockedScenarioIds: ['january'], bestScores: {} })
  })

  it('introduces the learning goal and available scenarios', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /can you keep the chain moving/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start the campaign/i })).toBeInTheDocument()
    expect(screen.getByText(/Cobalt One Smart Speaker supply chain/i)).toBeInTheDocument()
    expect(screen.getByText('Foundations')).toBeInTheDocument()
    expect(screen.getByText('Supplier Mix')).toBeInTheDocument()
    expect(screen.getByText('Market Pricing')).toBeInTheDocument()
    expect(screen.getByText('Port Pressure')).toBeInTheDocument()
    expect(screen.getByText('Peak Season')).toBeInTheDocument()
    expect(screen.getByText('Resilient Network')).toBeInTheDocument()
  })

  it('keeps one saved game per month when starting another chapter', () => {
    const february = createGame(scenarioById('february'))
    useGameStore.setState({ screen: 'home', game: february, activeScenarioId: 'february', savedSessions: { february: createSavedGameSession(february) }, unlockedScenarioIds: ['january', 'february', 'march'] })
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Play March — Market Pricing' }))

    expect(Object.keys(useGameStore.getState().savedSessions)).toEqual(['february', 'march'])
    expect(useGameStore.getState().game?.scenarioId).toBe('march')
  })

  it('requires confirmation before deleting a saved month', () => {
    const february = createGame(scenarioById('february'))
    useGameStore.setState({ screen: 'home', game: february, activeScenarioId: 'february', savedSessions: { february: createSavedGameSession(february) }, unlockedScenarioIds: ['january', 'february'] })
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete February saved game' }))
    expect(screen.getByRole('dialog', { name: 'Delete February progress?' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete saved game' }))
    expect(useGameStore.getState().savedSessions.february).toBeUndefined()
  })

  it('provides directly addressable privacy and terms pages', () => {
    window.location.hash = '#/privacy'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument()
    expect(screen.getByText(/browser’s local storage/i)).toBeInTheDocument()

    window.location.hash = '#/terms'
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument()
    expect(screen.getByText(/educational simulation/i)).toBeInTheDocument()
  })

  it('presents the stricter grading standard in the final report', () => {
    let game = createGame(scenarioById('january'))
    while (game.status === 'playing') game = advanceDay(game)
    useGameStore.setState({ screen: 'debrief', game, activeScenarioId: 'january' })

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Developing Planner' })).toBeInTheDocument()
    expect(screen.getByText(/Leader standard: 85\+/i)).toBeInTheDocument()
    expect(screen.getByText(/needs substantial improvement/i)).toBeInTheDocument()
  })
})

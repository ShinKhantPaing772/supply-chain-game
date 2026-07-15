import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createGame } from '../game/engine'
import { scenarioById } from '../game/scenarios'
import { DecisionPanel } from './DecisionPanel'

describe('DecisionPanel supplier mix', () => {
  it('allows supplier percentages to be unlinked and edited independently', () => {
    const onChange = vi.fn()
    render(<DecisionPanel game={createGame(scenarioById('february'))} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Unlink supplier percentages' }))

    const atlas = screen.getByRole('spinbutton', { name: 'Atlas Materials share value' }) as HTMLInputElement
    const northstar = screen.getByRole('spinbutton', { name: 'Northstar Components share value' }) as HTMLInputElement
    const nova = screen.getByRole('spinbutton', { name: 'Nova Rapid Supply share value' }) as HTMLInputElement
    const originalNorthstar = northstar.value

    fireEvent.change(atlas, { target: { value: '40' } })

    expect(northstar.value).toBe(originalNorthstar)
    expect(screen.getByText(/adjust the mix to 100% to apply it/i)).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.change(nova, { target: { value: '6' } })

    expect(onChange).toHaveBeenCalledWith({
      supplierAllocations: { atlas: 22, northstar: 20, harborworks: 10, nova: 3 },
    })
  })
})

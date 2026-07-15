import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Supply-Chain Management Game', () => {
  it('introduces the learning goal and available scenarios', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /can you keep the chain moving/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start the campaign/i })).toBeInTheDocument()
    expect(screen.getByText('Foundations')).toBeInTheDocument()
    expect(screen.getByText('Supplier Mix')).toBeInTheDocument()
    expect(screen.getByText('Market Pricing')).toBeInTheDocument()
    expect(screen.getByText('Port Pressure')).toBeInTheDocument()
    expect(screen.getByText('Peak Season')).toBeInTheDocument()
    expect(screen.getByText('Resilient Network')).toBeInTheDocument()
  })
})

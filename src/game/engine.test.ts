import { describe, expect, it } from 'vitest'
import { advanceDay, applyDecision, calculateForecastAccuracy, calculateKpis, calculateScore, createGame, projectDemand } from './engine'
import { scenarioById } from './scenarios'

const zeroAllocations = { atlas: 0, northstar: 0, harborworks: 0, nova: 0 }

describe('expanded supply-chain simulation', () => {
  it('keeps factory raw materials and finished goods as separate inventories', () => {
    const game = createGame(scenarioById('january'))
    const factory = game.nodes.find((item) => item.id === 'factory')!
    expect(factory.inventory.rawMaterials).toBe(135)
    expect(factory.inventory.finishedGoods).toBe(45)
    expect(game.nodes.some((item) => item.name === 'Materials')).toBe(false)
  })

  it('splits orders across suppliers with separate yields and arrival times', () => {
    let game = createGame(scenarioById('february'))
    game = advanceDay(applyDecision(game, { supplierAllocations: { atlas: 20, northstar: 15, harborworks: 10, nova: 5 }, regularProduction: 0, factoryRelease: 0, dcRelease: 0 }))
    const inbound = game.shipments.filter((item) => item.target === 'factory')
    expect(inbound).toHaveLength(4)
    expect(new Set(inbound.map((item) => item.arrivalDay)).size).toBeGreaterThan(1)
    expect(game.orders.filter((order) => order.day === 1)).toHaveLength(4)
    expect(game.orders.find((order) => order.supplierId === 'harborworks')!.yieldedQuantity).toBeLessThan(10)
  })

  it('reduces supplier and regular production capacity to 60% on weekends', () => {
    let game = createGame(scenarioById('february')) // February starts on Saturday.
    game = advanceDay(applyDecision(game, { supplierAllocations: { atlas: 75, northstar: 0, harborworks: 0, nova: 0 }, regularProduction: 80, overtimeProduction: 0, factoryRelease: 0, dcRelease: 0 }))
    expect(game.calendar[0].isWeekend).toBe(true)
    expect(game.supplierStates.find((item) => item.id === 'atlas')!.availableCapacity).toBeLessThanOrEqual(45)
    expect(game.history[0].produced).toBeLessThanOrEqual(48)
  })

  it('makes lower prices create more expected demand than higher prices', () => {
    const scenario = scenarioById('march')
    const low = projectDemand(scenario, 10, 100)
    const reference = projectDemand(scenario, 10, 140)
    const high = projectDemand(scenario, 10, 190)
    expect(low.expected).toBeGreaterThan(reference.expected)
    expect(reference.expected).toBeGreaterThan(high.expected)
    expect(low.priceResponse).toBeLessThanOrEqual(1.65)
    expect(high.priceResponse).toBeGreaterThanOrEqual(0.55)
  })

  it('retains the original selling price on backlogged customer orders', () => {
    let game = createGame(scenarioById('march'))
    game.nodes.find((item) => item.id === 'retailer')!.inventory.finishedGoods = 0
    game = advanceDay(applyDecision(game, { supplierAllocations: zeroAllocations, regularProduction: 0, factoryRelease: 0, dcRelease: 0, sellingPrice: 100 }))
    const oldOrder = game.customerOrders.find((order) => order.createdDay === 1)!
    expect(oldOrder.remainingQuantity).toBeGreaterThan(0)
    expect(oldOrder.sellingPrice).toBe(100)
    game.nodes.find((item) => item.id === 'retailer')!.inventory.finishedGoods = 500
    game = advanceDay(applyDecision(game, { sellingPrice: 190 }))
    expect(game.customerOrders.find((order) => order.createdDay === 1)!.remainingQuantity).toBe(0)
    expect(game.customerOrders.find((order) => order.createdDay === 1)!.sellingPrice).toBe(100)
  })

  it('applies a port delay to an affected in-transit shipment exactly once', () => {
    let game = createGame(scenarioById('april'))
    game = {
      ...game,
      day: 12,
      shipments: [{ id: 'ocean-load', source: 'atlas', target: 'factory', materialType: 'raw-materials', routeId: 'ocean-west', quantity: 20, departureDay: 10, arrivalDay: 13, mode: 'standard', status: 'moving', appliedDelayEventIds: [] }],
    }
    game = advanceDay(applyDecision(game, { supplierAllocations: zeroAllocations, regularProduction: 0, factoryRelease: 0, dcRelease: 0 }))
    expect(game.shipments.find((item) => item.id === 'ocean-load')!.arrivalDay).toBe(16)
    game = advanceDay(game)
    expect(game.shipments.find((item) => item.id === 'ocean-load')!.arrivalDay).toBe(16)
  })

  it('does not expose hidden event details before activation', () => {
    let game = createGame(scenarioById('april'))
    expect(game.activeEvents).toEqual([])
    expect(JSON.stringify(game)).not.toContain('Port congestion')
    game = { ...game, day: 8 }
    game = advanceDay(applyDecision(game, { supplierAllocations: zeroAllocations, regularProduction: 0, factoryRelease: 0, dcRelease: 0 }))
    expect(game.activeRiskSignals[0].message).toContain('risk is elevated')
    expect(game.activeRiskSignals[0].message).not.toContain('three days')
  })

  it('calculates KPI, scoring, and forecast outputs from the ledger', () => {
    let game = createGame(scenarioById('january'))
    for (let day = 0; day < 4; day += 1) game = advanceDay(game)
    const kpis = calculateKpis(game.history), score = calculateScore(game)
    expect(kpis.totalDemand).toBeGreaterThan(0)
    expect(kpis.totalRevenue - kpis.totalCost).toBeCloseTo(kpis.profit)
    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(score.total).toBeLessThanOrEqual(100)
    expect(calculateForecastAccuracy(game.forecastHistory)).toBeGreaterThan(0)
  })

  it('requires active optimization to reach leader-level scores', () => {
    const defaultScores = ['january', 'february', 'march', 'april', 'may', 'june'].map((scenarioId) => {
      let game = createGame(scenarioById(scenarioId))
      while (game.status === 'playing') game = advanceDay(game)
      return calculateScore(game)
    })

    expect(Math.max(...defaultScores.map((score) => score.total))).toBeLessThan(85)
    expect(defaultScores[0].total).toBeLessThan(70)
    expect(defaultScores[0].profit).toBeLessThan(5)
    expect(defaultScores.every((score) => score.grade !== 'Operations Leader' && score.grade !== 'Elite Supply Chain Strategist')).toBe(true)
  })
})

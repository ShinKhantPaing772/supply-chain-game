import { baseEdges, baseNodes, routeById, scenarioById, suppliers } from './scenarios'
import type { CalendarDay, CustomerOrder, DailySnapshot, DemandProjection, GameEvent, GameState, KpiSummary, PlayerDecision, ScenarioDefinition, ScoreBreakdown, Shipment, SupplierOption, SupplierState, SupplyNode, TransportMode } from './types'

const round = (value: number) => Math.round(value * 10) / 10
const roundYield = (value: number) => Math.round(value * 1000) / 1000
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const node = (nodes: SupplyNode[], id: string) => nodes.find((item) => item.id === id)!
const cloneNodes = (nodes: SupplyNode[]) => nodes.map((item) => ({ ...item, inventory: { ...item.inventory }, position: { ...item.position } }))
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function deterministic(seed: number, day: number, salt: number): number {
  const value = Math.sin((seed + day * 97 + salt * 131) * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function createCalendar(scenario: ScenarioDefinition): CalendarDay[] {
  return Array.from({ length: scenario.totalDays }, (_, index) => {
    const weekdayIndex = (scenario.startWeekdayIndex + index) % 7
    const isWeekend = weekdayIndex === 0 || weekdayIndex === 6
    return { day: index + 1, dateLabel: `${scenario.month.slice(0, 3)} ${index + 1}`, weekday: weekdays[weekdayIndex], isWeekend, capacityModifier: isWeekend ? 0.6 : 1, demandModifier: isWeekend ? scenario.demandModel.weekendDemandModifier : 1 }
  })
}

function defaultDecision(): PlayerDecision {
  return {
    supplierAllocations: { atlas: 25, northstar: 20, harborworks: 10, nova: 0 },
    regularProduction: 50,
    overtimeProduction: 0,
    factoryRelease: 50,
    dcRelease: 50,
    safetyStocks: { rawMaterials: 70, factoryFinished: 35, distribution: 55, retailer: 40 },
    transport: { procurement: 'standard', factoryToDc: 'standard', dcToRetailer: 'standard' },
    sellingPrice: 140,
  }
}

function previewSupplierStates(options: SupplierOption[], decision: PlayerDecision, calendar: CalendarDay, signals: GameState['activeRiskSignals'], knownEvents: GameEvent[] = []): SupplierState[] {
  return options.map((supplier) => {
    const supplierEvents = knownEvents.filter((event) => event.affectedSupplierIds?.includes(supplier.id))
    const capacityMultiplier = supplierEvents.reduce((value, event) => value * (event.supplierCapacityMultiplier ?? 1), 1)
    const qualityMultiplier = supplierEvents.reduce((value, event) => value * (event.qualityYieldMultiplier ?? 1), 1)
    return {
      ...supplier,
      availableCapacity: round(supplier.dailyCapacity * calendar.capacityModifier * capacityMultiplier),
      orderedQuantity: decision.supplierAllocations[supplier.id] ?? 0,
      acceptedQuantity: 0,
      deliveredYield: roundYield(clamp(supplier.qualityYield * qualityMultiplier, 0.5, 1)),
      outcome: capacityMultiplier < 1 ? 'disrupted' as const : 'normal' as const,
      riskLevel: signals.some((signal) => signal.supplierIds?.includes(supplier.id)) ? 'elevated' as const : 'low' as const,
    }
  })
}

export function projectDemand(scenario: ScenarioDefinition, day: number, sellingPrice: number, includeKnownEvents = true): DemandProjection {
  const calendar = createCalendar(scenario)[Math.min(day - 1, scenario.totalDays - 1)]
  const seasonality = scenario.demandModel.seasonality[Math.min(day - 1, scenario.demandModel.seasonality.length - 1)] ?? 1
  const priceResponse = clamp(Math.pow(sellingPrice / scenario.demandModel.referencePrice, -scenario.demandModel.elasticity), scenario.demandModel.minPriceResponse, scenario.demandModel.maxPriceResponse)
  const plannedMultiplier = includeKnownEvents
    ? scenario.events.filter((event) => event.visibility === 'planned' && event.kind === 'market' && day >= event.startDay && day <= event.endDay).reduce((value, event) => value * (event.demandMultiplier ?? 1), 1)
    : 1
  const expected = scenario.demandModel.baseDemand * seasonality * calendar.demandModifier * priceResponse * plannedMultiplier
  return { expected: Math.round(expected), low: Math.round(expected * 0.94), high: Math.round(expected * 1.06), priceResponse: round(priceResponse) }
}

export function createGame(scenario: ScenarioDefinition): GameState {
  const nodes = cloneNodes(baseNodes)
  const factory = node(nodes, 'factory')
  factory.inventory.rawMaterials = scenario.startingRawMaterials
  factory.inventory.finishedGoods = scenario.startingFactoryFinished
  node(nodes, 'dc').inventory.finishedGoods = scenario.startingDcInventory
  node(nodes, 'retailer').inventory.finishedGoods = scenario.startingRetailInventory
  const decision = defaultDecision()
  const calendar = createCalendar(scenario)
  const initialSignals = scenario.riskSignals.filter((signal) => 1 >= signal.startDay && 1 <= signal.endDay)
  const supplierStates = previewSupplierStates(suppliers, decision, calendar[0], initialSignals)
  return {
    scenarioId: scenario.id, day: 1, totalDays: scenario.totalDays, calendar, status: 'playing', cash: scenario.startingCash,
    nodes, edges: baseEdges.map((edge) => ({ ...edge })), suppliers: suppliers.map((supplier) => ({ ...supplier })), supplierStates,
    orders: [], customerOrders: [], shipments: [], demandHistory: [], forecastHistory: [], history: [], decision,
    activeEvents: [], activeRiskSignals: initialSignals, lastMessage: 'Review each inventory category, set today’s plan, then run the day.',
  }
}

export function applyDecision(state: GameState, decision: Partial<PlayerDecision>): GameState {
  if (state.status === 'finished') return state
  return {
    ...state,
    decision: {
      ...state.decision,
      ...decision,
      supplierAllocations: decision.supplierAllocations ? { ...state.decision.supplierAllocations, ...decision.supplierAllocations } : state.decision.supplierAllocations,
      safetyStocks: decision.safetyStocks ? { ...state.decision.safetyStocks, ...decision.safetyStocks } : state.decision.safetyStocks,
      transport: decision.transport ? { ...state.decision.transport, ...decision.transport } : state.decision.transport,
    },
  }
}

function transportLeadTime(base: number, mode: TransportMode) {
  return Math.max(1, base - (mode === 'expedited' ? 1 : 0))
}

function makeShipment(id: string, source: string, target: string, materialType: Shipment['materialType'], routeId: string, quantity: number, day: number, baseLeadTime: number, mode: TransportMode, delayEvents: GameEvent[]): Shipment {
  const applicable = delayEvents.filter((event) => event.affectedRouteIds?.includes(routeId))
  const delay = applicable.reduce((total, event) => total + (event.transportDelay ?? 0), 0)
  return { id, source, target, materialType, routeId, quantity: round(quantity), departureDay: day, arrivalDay: day + transportLeadTime(baseLeadTime, mode) + delay, mode, status: delay > 0 ? 'delayed' : 'moving', appliedDelayEventIds: applicable.map((event) => event.id) }
}

function applyInTransitDelays(shipments: Shipment[], events: GameEvent[]) {
  return shipments.map((shipment) => {
    const newlyApplicable = events.filter((event) => event.affectedRouteIds?.includes(shipment.routeId) && !shipment.appliedDelayEventIds.includes(event.id))
    if (!newlyApplicable.length) return { ...shipment, appliedDelayEventIds: [...shipment.appliedDelayEventIds] }
    return {
      ...shipment,
      arrivalDay: shipment.arrivalDay + newlyApplicable.reduce((sum, event) => sum + (event.transportDelay ?? 0), 0),
      status: 'delayed' as const,
      appliedDelayEventIds: [...shipment.appliedDelayEventIds, ...newlyApplicable.map((event) => event.id)],
    }
  })
}

function supplierStateForDay(supplier: SupplierOption, state: GameState, events: GameEvent[], calendar: CalendarDay, signals: GameState['activeRiskSignals']): SupplierState {
  const affectedEvents = events.filter((event) => event.affectedSupplierIds?.includes(supplier.id))
  const capacityMultiplier = affectedEvents.reduce((value, event) => value * (event.supplierCapacityMultiplier ?? 1), 1)
  const reliabilityMiss = deterministic(scenarioById(state.scenarioId).seed, state.day, supplier.id.length * 17) > supplier.reliability
  const reliabilityMultiplier = reliabilityMiss ? 0.5 : 1
  const availableCapacity = round(supplier.dailyCapacity * calendar.capacityModifier * capacityMultiplier * reliabilityMultiplier)
  const orderedQuantity = Math.max(0, state.decision.supplierAllocations[supplier.id] ?? 0)
  const acceptedQuantity = round(Math.min(orderedQuantity, availableCapacity))
  const qualityMultiplier = affectedEvents.reduce((value, event) => value * (event.qualityYieldMultiplier ?? 1), 1)
  const deliveredYield = clamp(supplier.qualityYield * qualityMultiplier, 0.5, 1)
  const outcome = capacityMultiplier < 1 ? 'disrupted' : reliabilityMiss ? 'capacity-loss' : 'normal'
  return { ...supplier, availableCapacity, orderedQuantity, acceptedQuantity, deliveredYield: roundYield(deliveredYield), outcome, riskLevel: signals.some((signal) => signal.supplierIds?.includes(supplier.id)) ? 'elevated' : 'low' }
}

function routeCost(routeId: string, mode: TransportMode) {
  const route = routeById(routeId)
  return route ? (mode === 'expedited' ? route.expeditedUnitCost : route.standardUnitCost) : 0
}

export function advanceDay(state: GameState): GameState {
  if (state.status === 'finished') return state
  const scenario = scenarioById(state.scenarioId)
  const calendar = state.calendar[state.day - 1]
  const nodes = cloneNodes(state.nodes)
  const factory = node(nodes, 'factory')
  const dc = node(nodes, 'dc')
  const retailer = node(nodes, 'retailer')
  const customer = node(nodes, 'customer')
  const events = scenario.events.filter((event) => state.day >= event.startDay && state.day <= event.endDay)
  const riskSignals = scenario.riskSignals.filter((signal) => state.day >= signal.startDay && state.day <= signal.endDay)
  const delayEvents = events.filter((event) => event.kind === 'transport-disruption')
  const delayedExisting = applyInTransitDelays(state.shipments, delayEvents)
  const arrivals = delayedExisting.filter((item) => item.arrivalDay <= state.day)
  let inTransit = delayedExisting.filter((item) => item.arrivalDay > state.day)
  arrivals.forEach((item) => {
    if (item.target === 'factory') factory.inventory.rawMaterials += item.quantity
    if (item.target === 'dc') dc.inventory.finishedGoods += item.quantity
    if (item.target === 'retailer') retailer.inventory.finishedGoods += item.quantity
  })

  const supplierStates = state.suppliers.map((supplier) => supplierStateForDay(supplier, state, events, calendar, riskSignals))
  const supplierShipments = supplierStates.filter((supplier) => supplier.acceptedQuantity > 0).map((supplier) => {
    const yielded = supplier.acceptedQuantity * supplier.deliveredYield
    return makeShipment(`raw-${supplier.id}-${state.day}`, supplier.id, 'factory', 'raw-materials', supplier.routeId, yielded, state.day, supplier.leadTime, state.decision.transport.procurement, delayEvents)
  })

  const projection = projectDemand(scenario, state.day, state.decision.sellingPrice)
  const hiddenDemandMultiplier = events.filter((event) => event.kind === 'market' && event.visibility === 'hidden').reduce((value, event) => value * (event.demandMultiplier ?? 1), 1)
  const variation = 0.94 + deterministic(scenario.seed, state.day, 811) * 0.12
  const actualDemand = Math.round(projection.expected * hiddenDemandMultiplier * variation)
  const forecast = Math.round(projection.expected * scenario.forecastBias)

  const productionMultiplier = events.reduce((value, event) => value * (event.productionCapacityMultiplier ?? 1), 1)
  const regularCapacity = factory.capacity * calendar.capacityModifier * productionMultiplier
  const regularProduced = Math.min(Math.max(0, state.decision.regularProduction), regularCapacity, factory.inventory.rawMaterials)
  factory.inventory.rawMaterials -= regularProduced
  const overtimeCapacity = 20 * calendar.capacityModifier
  const overtimeProduced = Math.min(Math.max(0, state.decision.overtimeProduction), overtimeCapacity, factory.inventory.rawMaterials)
  factory.inventory.rawMaterials -= overtimeProduced
  const produced = round(regularProduced + overtimeProduced)
  factory.inventory.finishedGoods += produced

  factory.inventory.safetyStock = state.decision.safetyStocks.factoryFinished
  dc.inventory.safetyStock = state.decision.safetyStocks.distribution
  retailer.inventory.safetyStock = state.decision.safetyStocks.retailer
  const factoryRelease = round(Math.min(factory.inventory.finishedGoods, Math.max(0, state.decision.factoryRelease)))
  factory.inventory.finishedGoods -= factoryRelease
  const dcRelease = round(Math.min(dc.inventory.finishedGoods, Math.max(0, state.decision.dcRelease)))
  dc.inventory.finishedGoods -= dcRelease
  const outboundShipments: Shipment[] = []
  if (factoryRelease > 0) outboundShipments.push(makeShipment(`factory-${state.day}`, 'factory', 'dc', 'finished-goods', 'factory-dc', factoryRelease, state.day, 2, state.decision.transport.factoryToDc, delayEvents))
  if (dcRelease > 0) outboundShipments.push(makeShipment(`dc-${state.day}`, 'dc', 'retailer', 'finished-goods', 'dc-retailer', dcRelease, state.day, 1, state.decision.transport.dcToRetailer, delayEvents))

  const customerOrders = state.customerOrders.map((order) => ({ ...order }))
  let revenue = 0
  let fulfilledBacklog = 0
  customerOrders.forEach((order) => {
    if (order.remainingQuantity <= 0 || retailer.inventory.finishedGoods <= 0) return
    const quantity = Math.min(order.remainingQuantity, retailer.inventory.finishedGoods)
    order.remainingQuantity = round(order.remainingQuantity - quantity)
    retailer.inventory.finishedGoods -= quantity
    revenue += quantity * order.sellingPrice
    fulfilledBacklog += quantity
  })
  const fulfilledNew = Math.min(retailer.inventory.finishedGoods, actualDemand)
  retailer.inventory.finishedGoods -= fulfilledNew
  revenue += fulfilledNew * state.decision.sellingPrice
  const unmetNew = actualDemand - fulfilledNew
  const acceptedBacklog = round(unmetNew * 0.45)
  const lostSales = round(unmetNew - acceptedBacklog)
  customerOrders.push({ id: `customer-${state.day}`, createdDay: state.day, requestedQuantity: actualDemand, remainingQuantity: acceptedBacklog, sellingPrice: state.decision.sellingPrice })
  const backlog = round(customerOrders.reduce((sum, order) => sum + order.remainingQuantity, 0))
  const fulfilled = round(fulfilledBacklog + fulfilledNew)
  retailer.inventory.backlog = backlog
  customer.inventory.backlog = backlog

  inTransit = [...inTransit, ...supplierShipments, ...outboundShipments]
  factory.inventory.inTransit = round(inTransit.filter((item) => item.target === 'factory').reduce((sum, item) => sum + item.quantity, 0))
  dc.inventory.inTransit = round(inTransit.filter((item) => item.target === 'dc').reduce((sum, item) => sum + item.quantity, 0))
  retailer.inventory.inTransit = round(inTransit.filter((item) => item.target === 'retailer').reduce((sum, item) => sum + item.quantity, 0))

  const ordered = round(supplierStates.reduce((sum, supplier) => sum + supplier.acceptedQuantity, 0))
  const purchaseCost = supplierStates.reduce((sum, supplier) => sum + supplier.acceptedQuantity * supplier.unitCost, 0)
  const procurementTransportCost = supplierStates.reduce((sum, supplier) => sum + supplier.acceptedQuantity * routeCost(supplier.routeId, state.decision.transport.procurement), 0)
  const outboundTransportCost = factoryRelease * routeCost('factory-dc', state.decision.transport.factoryToDc) + dcRelease * routeCost('dc-retailer', state.decision.transport.dcToRetailer)
  const productionCost = regularProduced * 18 + overtimeProduced * 29
  const totalInventory = factory.inventory.rawMaterials + factory.inventory.finishedGoods + dc.inventory.finishedGoods + retailer.inventory.finishedGoods
  const holdingCost = totalInventory * 0.7
  const shortageCost = backlog * 4 + lostSales * 10
  const dailyCost = round(purchaseCost + procurementTransportCost + outboundTransportCost + productionCost + holdingCost + shortageCost)
  const profit = round(revenue - dailyCost)
  const cash = round(state.cash + profit)
  const cumulativeDemand = state.demandHistory.reduce((sum, item) => sum + item.quantity, 0) + actualDemand
  const cumulativeFulfilled = state.demandHistory.reduce((sum, item) => sum + item.fulfilled, 0) + fulfilled
  const serviceLevel = round(Math.min(100, cumulativeFulfilled / Math.max(1, cumulativeDemand) * 100))
  const visibleEvents = events.map((event) => ({ id: event.id, name: event.name, description: event.description, kind: event.kind, startDay: event.startDay, endDay: event.endDay, newlyActive: state.day === event.startDay }))
  const weightedMaterialCost = ordered ? purchaseCost / ordered : 0
  const unitMargin = round(state.decision.sellingPrice - weightedMaterialCost - 18 - 13)
  const note = visibleEvents.length
    ? `${visibleEvents.map((event) => event.name).join(' + ')} is affecting operations now.`
    : riskSignals.length ? riskSignals.map((signal) => signal.message).join(' ') : lostSales > 0 ? `${lostSales} sales were lost because sellable inventory ran out.` : `${calendar.weekday} operations completed without a major exception.`
  const snapshot: DailySnapshot = {
    day: state.day, dateLabel: calendar.dateLabel, demand: actualDemand, forecast, sellingPrice: state.decision.sellingPrice, fulfilled, lostSales, backlog,
    totalInventory: round(totalInventory), rawMaterials: round(factory.inventory.rawMaterials), factoryFinished: round(factory.inventory.finishedGoods), dcFinished: round(dc.inventory.finishedGoods), retailerFinished: round(retailer.inventory.finishedGoods),
    inTransit: round(inTransit.reduce((sum, item) => sum + item.quantity, 0)), produced, ordered, revenue: round(revenue), dailyCost, unitMargin, profit, cash, serviceLevel,
    activeEvents: visibleEvents, supplierStates, delayedShipmentCount: inTransit.filter((item) => item.status === 'delayed').length, note,
  }
  const finished = state.day >= state.totalDays
  const nextDay = finished ? state.day : state.day + 1
  const nextSignals = scenario.riskSignals.filter((signal) => nextDay >= signal.startDay && nextDay <= signal.endDay)
  const alreadyRevealedContinuingEvents = scenario.events.filter((event) => event.startDay < nextDay && nextDay <= event.endDay && events.some((active) => active.id === event.id))
  const supplierPreview = previewSupplierStates(state.suppliers, state.decision, state.calendar[nextDay - 1], nextSignals, alreadyRevealedContinuingEvents)
  return {
    ...state, nodes, cash, day: nextDay, status: finished ? 'finished' : 'playing', supplierStates: supplierPreview,
    orders: [...state.orders, ...supplierStates.map((supplier) => ({ id: `order-${supplier.id}-${state.day}`, day: state.day, supplierId: supplier.id, quantity: supplier.orderedQuantity, fulfilledQuantity: supplier.acceptedQuantity, yieldedQuantity: round(supplier.acceptedQuantity * supplier.deliveredYield), unitCost: supplier.unitCost }))],
    customerOrders, shipments: inTransit, demandHistory: [...state.demandHistory, { day: state.day, quantity: actualDemand, fulfilled, lost: lostSales }],
    forecastHistory: [...state.forecastHistory, { day: state.day, forecast, actual: actualDemand, sellingPrice: state.decision.sellingPrice }], history: [...state.history, snapshot],
    activeEvents: visibleEvents, activeRiskSignals: nextSignals, lastMessage: note,
  }
}

export function calculateForecastAccuracy(history: GameState['forecastHistory']): number {
  if (!history.length) return 100
  const error = history.reduce((sum, item) => sum + Math.abs(item.actual - item.forecast) / Math.max(1, item.actual), 0) / history.length
  return round(clamp((1 - error) * 100, 0, 100))
}

export function calculateKpis(history: DailySnapshot[]): KpiSummary {
  if (!history.length) return { serviceLevel: 100, totalRevenue: 0, totalCost: 0, profit: 0, totalDemand: 0, fulfilledDemand: 0, lostSales: 0, averageInventory: 0, forecastAccuracy: 100 }
  const totalDemand = history.reduce((sum, item) => sum + item.demand, 0)
  const fulfilledDemand = history.reduce((sum, item) => sum + item.fulfilled, 0)
  const totalRevenue = history.reduce((sum, item) => sum + item.revenue, 0)
  const totalCost = history.reduce((sum, item) => sum + item.dailyCost, 0)
  const forecastError = history.reduce((sum, item) => sum + Math.abs(item.demand - item.forecast) / Math.max(1, item.demand), 0) / history.length
  return { serviceLevel: round(Math.min(100, fulfilledDemand / Math.max(1, totalDemand) * 100)), totalRevenue: round(totalRevenue), totalCost: round(totalCost), profit: round(totalRevenue - totalCost), totalDemand: round(totalDemand), fulfilledDemand: round(fulfilledDemand), lostSales: round(history.reduce((sum, item) => sum + item.lostSales, 0)), averageInventory: round(history.reduce((sum, item) => sum + item.totalInventory, 0) / history.length), forecastAccuracy: round(clamp((1 - forecastError) * 100, 0, 100)) }
}

export function calculateScore(state: GameState, scenario = scenarioById(state.scenarioId)): ScoreBreakdown {
  const kpis = calculateKpis(state.history)
  const service = clamp(Math.round(kpis.serviceLevel * 0.4), 0, 40)
  const profit = clamp(Math.round(18 + kpis.profit / 7000), 0, 25)
  const disruptionDays = state.history.filter((item) => item.activeEvents.some((event) => event.kind !== 'market'))
  const resilienceRate = disruptionDays.length ? disruptionDays.reduce((sum, item) => sum + item.fulfilled / Math.max(1, item.demand), 0) / disruptionDays.length : kpis.serviceLevel / 100
  const resilience = clamp(Math.round(resilienceRate * 20), 0, 20)
  const targetInventory = scenario.demandModel.baseDemand * 4.5
  const efficiencyRatio = 1 - Math.abs(kpis.averageInventory - targetInventory) / Math.max(targetInventory, 1)
  const inventoryEfficiency = clamp(Math.round(efficiencyRatio * 15), 0, 15)
  const total = service + profit + resilience + inventoryEfficiency
  const grade = total >= 90 ? 'Supply Chain Strategist' : total >= 75 ? 'Operations Leader' : total >= 60 ? 'Planning Professional' : 'Developing Planner'
  return { total, service, profit, resilience, inventoryEfficiency, grade }
}

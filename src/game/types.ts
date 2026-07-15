export type NodeKind = 'manufacturer' | 'distribution' | 'retailer' | 'customer'
export type TransportMode = 'standard' | 'expedited'

export interface InventoryPosition {
  rawMaterials: number
  finishedGoods: number
  inTransit: number
  backlog: number
  safetyStock: number
}

export interface SupplyNode {
  id: string
  name: string
  kind: NodeKind
  capacity: number
  inventory: InventoryPosition
  position: { x: number; y: number }
}

export interface SupplyEdge {
  id: string
  source: string
  target: string
  standardLeadTime: number
  routeId: string
}

export interface SupplierOption {
  id: string
  name: string
  unitCost: number
  dailyCapacity: number
  reliability: number
  qualityYield: number
  leadTime: number
  routeId: string
  routeLabel: string
  portExposed: boolean
}

export interface SupplierState extends SupplierOption {
  availableCapacity: number
  orderedQuantity: number
  acceptedQuantity: number
  deliveredYield: number
  outcome: 'normal' | 'capacity-loss' | 'disrupted'
  riskLevel: 'low' | 'elevated'
}

export interface Order {
  id: string
  day: number
  supplierId: string
  quantity: number
  fulfilledQuantity: number
  yieldedQuantity: number
  unitCost: number
}

export interface CustomerOrder {
  id: string
  createdDay: number
  requestedQuantity: number
  remainingQuantity: number
  sellingPrice: number
}

export interface Shipment {
  id: string
  source: string
  target: string
  materialType: 'raw-materials' | 'finished-goods'
  routeId: string
  quantity: number
  departureDay: number
  arrivalDay: number
  mode: TransportMode
  status: 'moving' | 'delayed'
  appliedDelayEventIds: string[]
}

export interface DemandForecast {
  day: number
  forecast: number
  actual: number
  sellingPrice: number
}

export interface CustomerDemand {
  day: number
  quantity: number
  fulfilled: number
  lost: number
}

export interface CalendarDay {
  day: number
  dateLabel: string
  weekday: string
  isWeekend: boolean
  capacityModifier: number
  demandModifier: number
}

export interface DemandModel {
  baseDemand: number
  referencePrice: number
  elasticity: number
  minPriceResponse: number
  maxPriceResponse: number
  weekendDemandModifier: number
  seasonality: number[]
}

export interface TransportRoute {
  id: string
  label: string
  standardLeadTime: number
  standardUnitCost: number
  expeditedUnitCost: number
  portExposed: boolean
}

export interface TransportDecision {
  procurement: TransportMode
  factoryToDc: TransportMode
  dcToRetailer: TransportMode
}

export type EventKind = 'market' | 'supplier-disruption' | 'transport-disruption' | 'factory-disruption' | 'quality-disruption'

export interface GameEvent {
  id: string
  name: string
  description: string
  kind: EventKind
  visibility: 'planned' | 'hidden'
  startDay: number
  endDay: number
  affectedSupplierIds?: string[]
  affectedRouteIds?: string[]
  demandMultiplier?: number
  supplierCapacityMultiplier?: number
  productionCapacityMultiplier?: number
  qualityYieldMultiplier?: number
  transportDelay?: number
}

export interface VisibleEvent {
  id: string
  name: string
  description: string
  kind: EventKind
  startDay: number
  endDay: number
  newlyActive: boolean
}

export interface RiskSignal {
  id: string
  message: string
  startDay: number
  endDay: number
  level: 'watch' | 'elevated'
  supplierIds?: string[]
}

export interface SafetyStockTargets {
  rawMaterials: number
  factoryFinished: number
  distribution: number
  retailer: number
}

export interface PlayerDecision {
  supplierAllocations: Record<string, number>
  regularProduction: number
  overtimeProduction: number
  factoryRelease: number
  dcRelease: number
  safetyStocks: SafetyStockTargets
  transport: TransportDecision
  sellingPrice: number
}

export type ChapterDifficulty = 'Guided' | 'Core' | 'Intermediate' | 'Advanced' | 'Expert'

export interface ScenarioDefinition {
  id: string
  month: string
  name: string
  subtitle: string
  description: string
  difficulty: ChapterDifficulty
  totalDays: number
  startWeekdayIndex: number
  seed: number
  startingCash: number
  startingRawMaterials: number
  startingFactoryFinished: number
  startingDcInventory: number
  startingRetailInventory: number
  demandModel: DemandModel
  forecastBias: number
  events: GameEvent[]
  riskSignals: RiskSignal[]
  objectives: string[]
  introducedMechanics: string[]
}

export interface DailySnapshot {
  day: number
  dateLabel: string
  demand: number
  forecast: number
  sellingPrice: number
  fulfilled: number
  lostSales: number
  backlog: number
  totalInventory: number
  rawMaterials: number
  factoryFinished: number
  dcFinished: number
  retailerFinished: number
  inTransit: number
  produced: number
  ordered: number
  revenue: number
  dailyCost: number
  unitMargin: number
  profit: number
  cash: number
  serviceLevel: number
  activeEvents: VisibleEvent[]
  supplierStates: SupplierState[]
  delayedShipmentCount: number
  note: string
}

export interface KpiSummary {
  serviceLevel: number
  totalRevenue: number
  totalCost: number
  profit: number
  totalDemand: number
  fulfilledDemand: number
  lostSales: number
  averageInventory: number
  forecastAccuracy: number
}

export interface ScoreBreakdown {
  total: number
  service: number
  profit: number
  resilience: number
  inventoryEfficiency: number
  grade: string
}

export interface DemandProjection {
  expected: number
  low: number
  high: number
  priceResponse: number
}

export interface GameState {
  scenarioId: string
  day: number
  totalDays: number
  calendar: CalendarDay[]
  status: 'playing' | 'finished'
  cash: number
  nodes: SupplyNode[]
  edges: SupplyEdge[]
  suppliers: SupplierOption[]
  supplierStates: SupplierState[]
  orders: Order[]
  customerOrders: CustomerOrder[]
  shipments: Shipment[]
  demandHistory: CustomerDemand[]
  forecastHistory: DemandForecast[]
  history: DailySnapshot[]
  decision: PlayerDecision
  activeEvents: VisibleEvent[]
  activeRiskSignals: RiskSignal[]
  lastMessage: string
}

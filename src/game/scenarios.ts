import type { ScenarioDefinition, SupplierOption, SupplyEdge, SupplyNode, TransportRoute } from './types'
import { PRODUCT } from './product'

export const suppliers: SupplierOption[] = [
  { id: 'atlas', name: 'Atlas Materials', unitCost: 48, dailyCapacity: 75, reliability: 0.91, qualityYield: 0.96, leadTime: 3, routeId: 'ocean-west', routeLabel: 'Ocean West', portExposed: true },
  { id: 'northstar', name: 'Northstar Components', unitCost: 57, dailyCapacity: 60, reliability: 0.96, qualityYield: 0.98, leadTime: 2, routeId: 'continental-rail', routeLabel: 'Continental Rail', portExposed: false },
  { id: 'harborworks', name: 'HarborWorks Global', unitCost: 45, dailyCapacity: 100, reliability: 0.88, qualityYield: 0.94, leadTime: 4, routeId: 'ocean-east', routeLabel: 'Ocean East', portExposed: true },
  { id: 'nova', name: 'Nova Rapid Supply', unitCost: 72, dailyCapacity: 45, reliability: 0.99, qualityYield: 0.995, leadTime: 1, routeId: 'air-express', routeLabel: 'Air Express', portExposed: false },
]

export const transportRoutes: TransportRoute[] = [
  ...suppliers.map((supplier) => ({ id: supplier.routeId, label: supplier.routeLabel, standardLeadTime: supplier.leadTime, standardUnitCost: supplier.portExposed ? 6 : supplier.id === 'nova' ? 15 : 8, expeditedUnitCost: supplier.portExposed ? 15 : supplier.id === 'nova' ? 22 : 17, portExposed: supplier.portExposed })),
  { id: 'factory-dc', label: 'Factory linehaul', standardLeadTime: 2, standardUnitCost: 7, expeditedUnitCost: 17, portExposed: false },
  { id: 'dc-retailer', label: 'Retail distribution', standardLeadTime: 1, standardUnitCost: 6, expeditedUnitCost: 14, portExposed: false },
]

export const baseNodes: SupplyNode[] = [
  { id: 'factory', name: `${PRODUCT.shortName} Factory`, kind: 'manufacturer', capacity: 80, inventory: { rawMaterials: 120, finishedGoods: 35, inTransit: 0, backlog: 0, safetyStock: 45 }, position: { x: 330, y: 145 } },
  { id: 'dc', name: 'Distribution Center', kind: 'distribution', capacity: 120, inventory: { rawMaterials: 0, finishedGoods: 100, inTransit: 0, backlog: 0, safetyStock: 55 }, position: { x: 590, y: 145 } },
  { id: 'retailer', name: `${PRODUCT.shortName} Retail`, kind: 'retailer', capacity: 110, inventory: { rawMaterials: 0, finishedGoods: 85, inTransit: 0, backlog: 0, safetyStock: 40 }, position: { x: 850, y: 145 } },
  { id: 'customer', name: 'Customers', kind: 'customer', capacity: 0, inventory: { rawMaterials: 0, finishedGoods: 0, inTransit: 0, backlog: 0, safetyStock: 0 }, position: { x: 1110, y: 145 } },
]

export const baseEdges: SupplyEdge[] = [
  ...suppliers.map((supplier) => ({ id: `${supplier.id}-factory`, source: supplier.id, target: 'factory', standardLeadTime: supplier.leadTime, routeId: supplier.routeId })),
  { id: 'factory-dc', source: 'factory', target: 'dc', standardLeadTime: 2, routeId: 'factory-dc' },
  { id: 'dc-retailer', source: 'dc', target: 'retailer', standardLeadTime: 1, routeId: 'dc-retailer' },
  { id: 'retailer-customer', source: 'retailer', target: 'customer', standardLeadTime: 0, routeId: 'retail-sale' },
]

const season = (peak = 1, slope = 0) => Array.from({ length: 30 }, (_, index) => Number((1 + Math.sin(index * 0.72) * 0.06 * peak + index * slope).toFixed(3)))
const demandModel = (baseDemand: number, peak = 1, slope = 0) => ({ baseDemand, referencePrice: 140, elasticity: 1.35, minPriceResponse: 0.55, maxPriceResponse: 1.65, weekendDemandModifier: 0.86, seasonality: season(peak, slope) })

export const scenarios: ScenarioDefinition[] = [
  {
    id: 'january', month: 'January', name: 'Foundations', subtitle: 'See every inventory stage clearly', difficulty: 'Guided', totalDays: 30, startWeekdayIndex: 3, seed: 1101,
    description: `Learn how component kits become ${PRODUCT.pluralName} and move toward customers.`, startingCash: 115000, startingRawMaterials: 135, startingFactoryFinished: 45, startingDcInventory: 115, startingRetailInventory: 95,
    demandModel: demandModel(40), forecastBias: 1, events: [{ id: 'jan-promo', name: 'Campus promotion', description: 'A planned campaign lifts demand by 15%.', kind: 'market', visibility: 'planned', startDay: 18, endDay: 20, demandMultiplier: 1.15 }], riskSignals: [],
    objectives: ['Finish above 90% service', 'Keep component and speaker inventory balanced', 'Finish with positive operating profit'], introducedMechanics: ['Inventory flow', 'Production', 'Daily pricing'],
  },
  {
    id: 'february', month: 'February', name: 'Supplier Mix', subtitle: 'Diversify with purpose', difficulty: 'Core', totalDays: 30, startWeekdayIndex: 6, seed: 2202,
    description: 'Allocate orders across cost, quality, reliability, and speed profiles.', startingCash: 112000, startingRawMaterials: 125, startingFactoryFinished: 40, startingDcInventory: 105, startingRetailInventory: 88,
    demandModel: demandModel(43, 1, 0.002), forecastBias: 0.99, events: [{ id: 'feb-quality', name: 'Supplier quality issue', description: 'HarborWorks yield falls unexpectedly.', kind: 'quality-disruption', visibility: 'hidden', startDay: 14, endDay: 17, affectedSupplierIds: ['harborworks'], qualityYieldMultiplier: 0.72 }],
    riskSignals: [{ id: 'feb-signal', message: 'Incoming inspection variance is elevated across low-cost supply.', startDay: 10, endDay: 13, level: 'watch', supplierIds: ['harborworks'] }],
    objectives: ['Use at least two suppliers', 'Protect service from quality losses', 'Keep procurement cost controlled'], introducedMechanics: ['Split sourcing', 'Quality yield', 'Supplier reliability'],
  },
  {
    id: 'march', month: 'March', name: 'Market Pricing', subtitle: 'Shape profitable demand', difficulty: 'Intermediate', totalDays: 30, startWeekdayIndex: 6, seed: 3303,
    description: `Set the ${PRODUCT.shortName} price to balance demand, margin, inventory, and service.`, startingCash: 110000, startingRawMaterials: 120, startingFactoryFinished: 38, startingDcInventory: 100, startingRetailInventory: 82,
    demandModel: demandModel(47, 1.1, 0.003), forecastBias: 1.02, events: [{ id: 'march-festival', name: 'Spring festival', description: 'A known local event raises category demand.', kind: 'market', visibility: 'planned', startDay: 20, endDay: 23, demandMultiplier: 1.22 }], riskSignals: [],
    objectives: ['Achieve a healthy average margin', 'Keep service above 87%', 'Avoid pricing-driven excess inventory'], introducedMechanics: ['Demand elasticity', 'Price-aware forecasts', 'Margin management'],
  },
  {
    id: 'april', month: 'April', name: 'Port Pressure', subtitle: 'Manage goods already moving', difficulty: 'Advanced', totalDays: 30, startWeekdayIndex: 2, seed: 4404,
    description: 'Ocean-route uncertainty tests sourcing and transportation choices.', startingCash: 115000, startingRawMaterials: 125, startingFactoryFinished: 38, startingDcInventory: 105, startingRetailInventory: 88,
    demandModel: demandModel(48, 1.2, 0.002), forecastBias: 1, events: [{ id: 'april-port', name: 'Port congestion', description: 'Ocean shipments are delayed by three days.', kind: 'transport-disruption', visibility: 'hidden', startDay: 12, endDay: 16, affectedRouteIds: ['ocean-west', 'ocean-east'], transportDelay: 3 }],
    riskSignals: [{ id: 'april-signal', message: 'Ocean-route congestion risk is elevated.', startDay: 8, endDay: 11, level: 'elevated', supplierIds: ['atlas', 'harborworks'] }],
    objectives: ['Limit customer impact from port delays', 'Use route diversity', 'Avoid excessive expediting'], introducedMechanics: ['Route exposure', 'In-transit delays', 'Risk signals'],
  },
  {
    id: 'may', month: 'May', name: 'Peak Season', subtitle: 'Plan across the calendar', difficulty: 'Advanced', totalDays: 30, startWeekdayIndex: 4, seed: 5505,
    description: 'Fast-growing seasonal demand makes weekday and weekend capacity matter.', startingCash: 120000, startingRawMaterials: 130, startingFactoryFinished: 42, startingDcInventory: 110, startingRetailInventory: 90,
    demandModel: demandModel(52, 1.5, 0.008), forecastBias: 0.96, events: [{ id: 'may-surge', name: 'Unplanned demand surge', description: 'Social attention lifts demand sharply.', kind: 'market', visibility: 'hidden', startDay: 22, endDay: 25, demandMultiplier: 1.3 }],
    riskSignals: [{ id: 'may-signal', message: 'Retail demand volatility is trending above normal.', startDay: 19, endDay: 21, level: 'watch' }],
    objectives: ['Prepare for peak demand', 'Plan around reduced weekend capacity', 'Maintain profitable availability'], introducedMechanics: ['Seasonality', 'Weekend capacity', 'Forecast error'],
  },
  {
    id: 'june', month: 'June', name: 'Resilient Network', subtitle: 'Run the complete system', difficulty: 'Expert', totalDays: 30, startWeekdayIndex: 0, seed: 6606,
    description: 'Pricing, sourcing, capacity, and hidden disruptions combine in the final month.', startingCash: 125000, startingRawMaterials: 130, startingFactoryFinished: 40, startingDcInventory: 110, startingRetailInventory: 92,
    demandModel: demandModel(54, 1.35, 0.004), forecastBias: 1, events: [
      { id: 'june-supplier', name: 'Atlas capacity interruption', description: 'Atlas capacity falls to 25%.', kind: 'supplier-disruption', visibility: 'hidden', startDay: 7, endDay: 10, affectedSupplierIds: ['atlas'], supplierCapacityMultiplier: 0.25 },
      { id: 'june-port', name: 'Ocean terminal closure', description: 'Ocean shipments are delayed by four days.', kind: 'transport-disruption', visibility: 'hidden', startDay: 16, endDay: 19, affectedRouteIds: ['ocean-west', 'ocean-east'], transportDelay: 4 },
      { id: 'june-factory', name: 'Factory equipment failure', description: 'Regular production capacity falls by 50%.', kind: 'factory-disruption', visibility: 'hidden', startDay: 25, endDay: 27, productionCapacityMultiplier: 0.5 },
    ],
    riskSignals: [
      { id: 'june-supply-signal', message: 'Primary-source continuity risk is elevated.', startDay: 4, endDay: 6, level: 'watch', supplierIds: ['atlas'] },
      { id: 'june-port-signal', message: 'Ocean-route disruption risk is elevated.', startDay: 13, endDay: 15, level: 'elevated', supplierIds: ['atlas', 'harborworks'] },
    ],
    objectives: ['Recover after multiple disruptions', 'Balance service, resilience, and profit', 'Finish as a supply-chain strategist'], introducedMechanics: ['Combined uncertainty', 'Recovery planning', 'Full-system optimization'],
  },
]

export const scenarioById = (id: string) => scenarios.find((scenario) => scenario.id === id) ?? scenarios[0]
export const routeById = (id: string) => transportRoutes.find((route) => route.id === id)

import { ChevronDown, CircleDollarSign, Factory, Gauge, PackagePlus, Route, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import { useState } from 'react'
import { projectDemand } from '../game/engine'
import { scenarioById, scenarios } from '../game/scenarios'
import type { GameState, PlayerDecision, TransportMode } from '../game/types'

interface Props {
  game: GameState
  onChange: (decision: Partial<PlayerDecision>) => void
}

type Strategy = 'low-cost' | 'balanced' | 'high-service'

function RangeControl({ label, value, min = 0, max, step = 5, suffix = 'units', icon: Icon, onChange }: { label: string; value: number; min?: number; max: number; step?: number; suffix?: string; icon: typeof PackagePlus; onChange: (value: number) => void }) {
  const setValue = (next: number) => onChange(Math.min(max, Math.max(min, next)))
  return <label className="rangeControl">
    <span className="controlLabel"><span><Icon size={15} /> {label}</span><span className="numberInputWrap">{suffix === '$' && <i>$</i>}<input aria-label={`${label} value`} type="number" min={min} max={max} step={step} value={value} onChange={(event) => setValue(Number(event.target.value))} />{suffix !== '$' && <small>{suffix}</small>}</span></span>
    <input aria-label={`${label} slider`} type="range" min={min} max={max} step={step} value={value} onChange={(event) => setValue(Number(event.target.value))} />
    <span className="rangeEnds"><span>{suffix === '$' ? '$' : ''}{min}</span><span>{suffix === '$' ? '$' : ''}{max}</span></span>
  </label>
}

function ModeSelector({ label, value, onChange }: { label: string; value: TransportMode; onChange: (mode: TransportMode) => void }) {
  return <div className="modeRow"><span>{label}</span><div className="miniSegmented"><button className={value === 'standard' ? 'active' : ''} onClick={() => onChange('standard')}>Standard</button><button className={value === 'expedited' ? 'active' : ''} onClick={() => onChange('expedited')}>Expedite</button></div></div>
}

function allocateByShares(total: number, shares: Record<string, number>) {
  const ids = Object.keys(shares)
  const result: Record<string, number> = {}
  let assigned = 0
  ids.forEach((id, index) => {
    const quantity = index === ids.length - 1 ? Math.max(0, total - assigned) : Math.round(total * shares[id] / 100)
    result[id] = quantity
    assigned += quantity
  })
  return result
}

function currentShares(allocations: Record<string, number>) {
  const total = Object.values(allocations).reduce((sum, value) => sum + value, 0)
  const ids = Object.keys(allocations)
  if (!total) return Object.fromEntries(ids.map((id) => [id, 100 / ids.length]))
  const raw = ids.map((id) => ({ id, value: allocations[id] / total * 100 }))
  const result = Object.fromEntries(raw.map(({ id, value }) => [id, Math.floor(value)])) as Record<string, number>
  let remaining = 100 - Object.values(result).reduce((sum, value) => sum + value, 0)
  const priority = [...raw].sort((a, b) => (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value)))
  priority.forEach(({ id }) => {
    if (remaining > 0) {
      result[id] += 1
      remaining -= 1
    }
  })
  return result
}

export function DecisionPanel({ game, onChange }: Props) {
  const decision = game.decision
  const scenario = scenarioById(game.scenarioId)
  const chapter = scenarios.findIndex((item) => item.id === game.scenarioId) + 1
  const [strategy, setStrategy] = useState<Strategy>('balanced')
  const projection = projectDemand(scenario, game.day, decision.sellingPrice)
  const totalProcurement = Math.round(Object.values(decision.supplierAllocations).reduce((sum, quantity) => sum + quantity, 0))
  const shares = currentShares(decision.supplierAllocations)
  const purchaseEstimate = game.suppliers.reduce((sum, supplier) => sum + (decision.supplierAllocations[supplier.id] ?? 0) * supplier.unitCost, 0)
  const weightedCost = totalProcurement ? purchaseEstimate / totalProcurement : 0
  const expectedMargin = Math.round(decision.sellingPrice - weightedCost - 31)

  const setTotalProcurement = (total: number) => onChange({ supplierAllocations: allocateByShares(total, shares) })
  const setSupplierShare = (supplierId: string, nextShare: number) => {
    const clamped = Math.min(100, Math.max(0, nextShare))
    const otherIds = Object.keys(shares).filter((id) => id !== supplierId)
    const otherTotal = otherIds.reduce((sum, id) => sum + shares[id], 0)
    const remaining = 100 - clamped
    const nextShares = { ...shares, [supplierId]: clamped }
    otherIds.forEach((id) => { nextShares[id] = otherTotal ? remaining * shares[id] / otherTotal : remaining / otherIds.length })
    onChange({ supplierAllocations: allocateByShares(totalProcurement, nextShares) })
  }
  const setProduction = (regularProduction: number) => onChange({ regularProduction, factoryRelease: Math.min(100, regularProduction), dcRelease: Math.min(100, Math.max(projection.expected, regularProduction)) })
  const setPrice = (sellingPrice: number) => {
    const nextProjection = projectDemand(scenario, game.day, sellingPrice)
    onChange({ sellingPrice, dcRelease: Math.min(100, nextProjection.expected + 5) })
  }
  const updateSafety = (key: keyof PlayerDecision['safetyStocks'], value: number) => onChange({ safetyStocks: { ...decision.safetyStocks, [key]: value } })
  const updateTransport = (key: keyof PlayerDecision['transport'], value: TransportMode) => onChange({ transport: { ...decision.transport, [key]: value } })

  const applyStrategy = (next: Strategy) => {
    setStrategy(next)
    const expected = projection.expected
    const settings: Record<Strategy, Partial<PlayerDecision>> = {
      'low-cost': { supplierAllocations: allocateByShares(totalProcurement, { atlas: 35, northstar: 15, harborworks: 50, nova: 0 }), overtimeProduction: 0, factoryRelease: Math.min(100, expected), dcRelease: Math.min(100, expected), safetyStocks: { rawMaterials: 55, factoryFinished: 25, distribution: 40, retailer: 30 }, transport: { procurement: 'standard', factoryToDc: 'standard', dcToRetailer: 'standard' } },
      balanced: { supplierAllocations: allocateByShares(totalProcurement, { atlas: 35, northstar: 35, harborworks: 20, nova: 10 }), overtimeProduction: 0, factoryRelease: Math.min(100, expected + 8), dcRelease: Math.min(100, expected + 8), safetyStocks: { rawMaterials: 70, factoryFinished: 35, distribution: 55, retailer: 40 }, transport: { procurement: 'standard', factoryToDc: 'standard', dcToRetailer: 'standard' } },
      'high-service': { supplierAllocations: allocateByShares(totalProcurement, { atlas: 20, northstar: 40, harborworks: 0, nova: 40 }), overtimeProduction: chapter >= 5 ? 10 : 0, factoryRelease: Math.min(100, expected + 20), dcRelease: Math.min(100, expected + 20), safetyStocks: { rawMaterials: 95, factoryFinished: 55, distribution: 75, retailer: 60 }, transport: { procurement: chapter >= 4 ? 'expedited' : 'standard', factoryToDc: chapter >= 4 ? 'expedited' : 'standard', dcToRetailer: 'standard' } },
    }
    onChange(settings[next])
  }

  return <aside className="decisionPanel simplifiedPanel">
    <div className="panelTitle"><div><p className="eyebrow">TODAY’S PLAN</p><h2>{game.calendar[game.day - 1]?.dateLabel} decisions</h2></div><span className="livePill">{chapter}/6</span></div>
    <div className="panelScroll simplifiedScroll">
      <section className="simpleSection strategySection"><div className="simpleHeading"><span>Operating strategy</span><small>Configures hidden policies</small></div><div className="strategyButtons"><button className={strategy === 'low-cost' ? 'active' : ''} onClick={() => applyStrategy('low-cost')}>Low cost<small>Lean buffers</small></button><button className={strategy === 'balanced' ? 'active' : ''} onClick={() => applyStrategy('balanced')}>Balanced<small>Steady flow</small></button><button className={strategy === 'high-service' ? 'active' : ''} onClick={() => applyStrategy('high-service')}>High service<small>More protection</small></button></div></section>

      <section className="simpleSection"><div className="simpleHeading"><span>Core plan</span><small>Available from January</small></div><RangeControl label="Total purchasing" value={totalProcurement} max={180} icon={PackagePlus} onChange={setTotalProcurement} /><RangeControl label="Production quantity" value={decision.regularProduction} max={80} icon={Gauge} onChange={setProduction} /></section>

      {chapter >= 2 ? <details className="progressiveGroup" open><summary><span><PackagePlus size={15} /> Supplier mix</span><strong>100%</strong><ChevronDown size={15} /></summary><div className="supplierMixBody">{game.suppliers.map((supplier) => <div className="shareControl" key={supplier.id}><div><strong>{supplier.name}</strong><small>${supplier.unitCost} · {supplier.leadTime}d</small></div><input aria-label={`${supplier.name} share slider`} type="range" min="0" max="100" step="1" value={shares[supplier.id]} onChange={(event) => setSupplierShare(supplier.id, Number(event.target.value))} /><span className="numberInputWrap"><input aria-label={`${supplier.name} share value`} type="number" min="0" max="100" step="1" value={shares[supplier.id]} onChange={(event) => setSupplierShare(supplier.id, Number(event.target.value))} /><small>%</small></span></div>)}</div></details> : <div className="nextUnlock"><span>February unlock</span><strong>Supplier allocation</strong><small>January uses the selected strategy’s supplier mix.</small></div>}

      {chapter >= 3 ? <section className="simpleSection pricingSimple"><div className="simpleHeading"><span>Market price</span><small>Demand responds immediately</small></div><RangeControl label="Retail selling price" value={decision.sellingPrice} min={100} max={190} step={5} suffix="$" icon={CircleDollarSign} onChange={setPrice} /><div className="demandPreview"><div><span>Projected demand</span><strong>{projection.low}–{projection.high}</strong><small>Expected {projection.expected}</small></div><div><span>Expected margin</span><strong className={expectedMargin >= 0 ? 'positive' : 'negative'}>{expectedMargin >= 0 ? '+' : '−'}${Math.abs(expectedMargin)}</strong><small>Before holding costs</small></div></div></section> : <div className="nextUnlock"><span>March unlock</span><strong>Price-sensitive demand</strong><small>Price remains fixed at ${decision.sellingPrice} until then.</small></div>}

      {chapter >= 4 && <details className="progressiveGroup advancedGroup"><summary><span><Route size={15} /> Advanced controls</span><strong>Optional</strong><ChevronDown size={15} /></summary><div className="advancedBody"><div className="advancedSubhead"><Route size={14} /> Transportation</div><ModeSelector label="Supplier → Factory" value={decision.transport.procurement} onChange={(value) => updateTransport('procurement', value)} /><ModeSelector label="Factory → DC" value={decision.transport.factoryToDc} onChange={(value) => updateTransport('factoryToDc', value)} /><ModeSelector label="DC → Retailer" value={decision.transport.dcToRetailer} onChange={(value) => updateTransport('dcToRetailer', value)} />
        {chapter >= 5 && <><div className="advancedSubhead"><ShieldCheck size={14} /> Buffers & overtime</div><RangeControl label="Overtime" value={decision.overtimeProduction} max={20} icon={Sparkles} onChange={(overtimeProduction) => onChange({ overtimeProduction })} /><RangeControl label="Raw-material buffer" value={decision.safetyStocks.rawMaterials} max={140} icon={ShieldCheck} onChange={(value) => updateSafety('rawMaterials', value)} /><RangeControl label="Retail buffer" value={decision.safetyStocks.retailer} max={100} icon={ShieldCheck} onChange={(value) => updateSafety('retailer', value)} /></>}
        {chapter >= 6 && <><div className="advancedSubhead"><Factory size={14} /> Manual flow releases</div><RangeControl label="Factory → DC" value={decision.factoryRelease} max={100} icon={Truck} onChange={(factoryRelease) => onChange({ factoryRelease })} /><RangeControl label="DC → Retailer" value={decision.dcRelease} max={100} icon={Truck} onChange={(dcRelease) => onChange({ dcRelease })} /></>}
      </div></details>}
    </div>
    <div className="estimate"><span>Estimated procurement</span><strong>${Math.round(purchaseEstimate).toLocaleString()}</strong></div>
  </aside>
}

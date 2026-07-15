import { AlertTriangle, ArrowLeft, ArrowRight, BarChart3, BookOpen, CalendarDays, Check, ChevronRight, CircleDollarSign, Clock3, Gauge, HelpCircle, PackageCheck, Play, Radar, RotateCcw, ShieldCheck, Sparkles, Target, TrendingUp, Trophy } from 'lucide-react'
import { calculateForecastAccuracy, calculateKpis, calculateScore, projectDemand } from './game/engine'
import { scenarioById, scenarios } from './game/scenarios'
import { useGameStore } from './store/gameStore'
import { DecisionPanel } from './components/DecisionPanel'
import { Logo } from './components/Logo'
import { PerformanceChart } from './components/PerformanceChart'
import { SupplyMap } from './components/SupplyMap'
import { TutorialModal } from './components/TutorialModal'
import type { VisibleEvent } from './game/types'

const money = (value: number) => `${value < 0 ? '−' : ''}$${Math.abs(Math.round(value)).toLocaleString()}`

function Home() {
  const start = useGameStore((state) => state.startScenario)
  const unlocked = useGameStore((state) => state.unlockedScenarioIds)
  const bestScores = useGameStore((state) => state.bestScores)
  return <main className="homeScreen">
    <header className="homeHeader"><Logo /><div className="headerTag"><span /> SIX-MONTH LEARNING CAMPAIGN</div></header>
    <section className="hero">
      <div className="heroCopy"><p className="eyebrow lime">END-TO-END OPERATIONS STRATEGY</p><h1>Every decision<br />moves the chain.</h1><p className="heroLead">Source across four suppliers, convert materials into finished goods, set your price, and protect customer service when the unexpected happens.</p><div className="heroStats"><div><strong>6</strong><span>Monthly chapters</span></div><div><strong>30</strong><span>Calendar days each</span></div><div><strong>4</strong><span>Supplier profiles</span></div></div></div>
      <div className="heroVisual" aria-hidden="true"><div className="chainLine" /><div className="heroNode n1"><span>01</span><PackageCheck /></div><div className="heroNode n2"><span>02</span><Gauge /></div><div className="heroNode n3"><span>03</span><ShieldCheck /></div><div className="pulseRing" /><p>SOURCE <i /> FLOW <i /> ADAPT</p></div>
    </section>
    <section className="scenarioSection"><div className="sectionHeading"><div><p className="eyebrow">YOUR OPERATING YEAR</p><h2>January starts here.</h2></div><p>Each month introduces a management layer. Complete one chapter to unlock the next.</p></div>
      <div className="scenarioGrid monthGrid">{scenarios.map((scenario, index) => {
        const isUnlocked = unlocked.includes(scenario.id), score = bestScores[scenario.id]
        return <article className={`scenarioCard ${!isUnlocked ? 'locked' : ''}`} key={scenario.id}>
          <div className="scenarioNumber">{String(index + 1).padStart(2, '0')}</div><div className="scenarioMeta"><span>{scenario.month}</span><span>{scenario.difficulty}</span><span>30 days</span></div><p className="chapterLabel">CHAPTER {index + 1}</p><h3>{scenario.name}</h3><p>{scenario.description}</p>
          <div className="mechanicTags">{scenario.introducedMechanics.map((mechanic) => <span key={mechanic}>{mechanic}</span>)}</div>
          <ul>{scenario.objectives.slice(0, 2).map((objective) => <li key={objective}><Check size={14} />{objective}</li>)}</ul>
          <div className="scenarioFooter">{score ? <span className="bestScore"><Trophy size={15} /> Best {score}</span> : <span>{isUnlocked ? 'Ready to begin' : 'Complete previous month'}</span>}<button disabled={!isUnlocked} onClick={() => start(scenario.id)} aria-label={`Play ${scenario.month} — ${scenario.name}`}>{isUnlocked ? <><Play size={17} fill="currentColor" /> Play</> : 'Locked'}</button></div>
        </article>
      })}</div>
    </section>
    <footer className="homeFooter"><span>Understand the inventory. Price the market. Prepare for uncertainty.</span><span>SCM / CAMPAIGN 01</span></footer>
  </main>
}

function GameHeader() {
  const game = useGameStore((state) => state.game)!, home = useGameStore((state) => state.goHome), openTutorial = useGameStore((state) => state.openTutorial)
  const scenario = scenarioById(game.scenarioId), calendar = game.calendar[game.day - 1]
  return <header className="gameHeader"><button className="backButton" onClick={home} aria-label="Back to chapters"><ArrowLeft size={18} /></button><Logo />
    <div className="scenarioHeader"><span>{scenario.month.slice(0, 3)}</span><div><strong>{scenario.month} — {scenario.name}</strong><small>{scenario.subtitle}</small></div></div>
    <div className="dayProgress"><span>{calendar?.weekday.toUpperCase()} <strong>{calendar?.dateLabel}</strong> · {game.day}/{game.totalDays}</span><div><i style={{ width: `${game.history.length / game.totalDays * 100}%` }} /></div></div>
    <button className="iconButton" onClick={openTutorial} aria-label="Open tutorial"><HelpCircle size={19} /></button>
  </header>
}

function KpiStrip() {
  const game = useGameStore((state) => state.game)!, kpis = calculateKpis(game.history), latest = game.history.at(-1)
  const items = [
    { label: 'Service level', value: `${kpis.serviceLevel.toFixed(1)}%`, note: kpis.serviceLevel >= 88 ? 'On target' : 'Below target', icon: Target, tone: kpis.serviceLevel >= 88 ? 'good' : 'warn' },
    { label: 'Operating profit', value: money(kpis.profit), note: latest ? `${latest.profit >= 0 ? '+' : '−'}${money(Math.abs(latest.profit))} last day` : 'No days completed', icon: TrendingUp, tone: kpis.profit >= 0 ? 'good' : 'bad' },
    { label: 'Available cash', value: money(game.cash), note: 'For future decisions', icon: CircleDollarSign, tone: 'neutral' },
    { label: 'Forecast accuracy', value: `${calculateForecastAccuracy(game.forecastHistory)}%`, note: 'Price-aware forecast', icon: BarChart3, tone: 'neutral' },
  ]
  return <div className="kpiStrip">{items.map((item) => <div className="kpi" key={item.label}><span className={`kpiIcon ${item.tone}`}><item.icon size={17} /></span><div><small>{item.label}</small><strong>{item.value}</strong><em>{item.note}</em></div></div>)}</div>
}

function EventBanner() {
  const game = useGameStore((state) => state.game)!, scenario = scenarioById(game.scenarioId)
  const active = game.activeEvents
  if (active.length) return <div className="eventBanner active"><span className="eventIcon"><AlertTriangle size={19} /></span><div><p>OPERATIONS EVENT — NOW VISIBLE</p><strong>{active.map((event) => event.name).join(' + ')}</strong><span>{active.map((event) => event.description).join(' ')}</span></div><span className="eventDays">OBSERVED DAY {game.history.at(-1)?.day}</span></div>
  if (game.activeRiskSignals.length) return <div className="eventBanner signal"><span className="eventIcon"><Radar size={19} /></span><div><p>RISK SIGNAL — NOT A CERTAINTY</p><strong>{game.activeRiskSignals.map((signal) => signal.message).join(' ')}</strong><span>Timing, duration, and severity are unknown. Adjust only if the tradeoff makes sense.</span></div></div>
  const planned = scenario.events.filter((event) => event.visibility === 'planned' && event.startDay >= game.day).sort((a, b) => a.startDay - b.startDay)[0]
  return <div className="eventBanner"><span className="eventIcon"><Clock3 size={19} /></span><div><p>OPERATIONS BRIEF</p><strong>{game.lastMessage}</strong><span>{planned ? `Planned: ${planned.name}, day ${planned.startDay}–${planned.endDay}.` : 'No additional planned commercial events.'}</span></div></div>
}

function Game() {
  const game = useGameStore((state) => state.game)!, update = useGameStore((state) => state.updateDecision), next = useGameStore((state) => state.nextDay)
  const scenario = scenarioById(game.scenarioId), projection = projectDemand(scenario, game.day, game.decision.sellingPrice), calendar = game.calendar[game.day - 1]
  return <main className="gameScreen"><GameHeader /><KpiStrip /><div className="gameBody"><div className="operations"><EventBanner />
    <section className="mapCard expandedMapCard"><div className="cardHeading"><div><p className="eyebrow">LIVE NETWORK</p><h2>Raw materials → finished goods → customers</h2></div><span className="forecastChip">Price ${game.decision.sellingPrice} · expected <strong>{projection.expected} units</strong></span></div><SupplyMap game={game} /></section>
    <div className="lowerGrid"><PerformanceChart history={game.history} /><div className="insightCard"><p className="eyebrow">PLANNER’S NOTE</p><Sparkles size={21} /><h3>{calendar?.isWeekend ? 'Reduced weekend capacity' : game.history.at(-1)?.lostSales ? 'Protect sellable inventory' : 'Watch every inventory stage'}</h3><p>{calendar?.isWeekend ? 'Suppliers and regular production run at 60%. Demand and shipments continue.' : game.history.length ? game.lastMessage : 'Supplier capacity is not inventory. Raw materials arrive at the factory, then production creates finished goods.'}</p></div></div>
  </div><DecisionPanel game={game} onChange={update} /></div>
  <div className="advanceBar"><div><CalendarDays size={18} /><p><strong>Ready to run {calendar?.dateLabel}?</strong><small>{calendar?.isWeekend ? 'Weekend capacity: 60%' : 'Decisions lock when the day advances.'}</small></p></div><button className="advanceButton" onClick={next}>Run {calendar?.dateLabel} <ArrowRight size={19} /></button></div>
  </main>
}

function Debrief() {
  const game = useGameStore((state) => state.game)!, restart = useGameStore((state) => state.restart), home = useGameStore((state) => state.goHome)
  const score = calculateScore(game), kpis = calculateKpis(game.history), scenario = scenarioById(game.scenarioId)
  const bestDay = [...game.history].sort((a, b) => b.profit - a.profit)[0], worstDay = [...game.history].sort((a, b) => b.lostSales - a.lostSales)[0]
  const revealedEvents = Array.from(new Map(game.history.flatMap((snapshot) => snapshot.activeEvents).map((event) => [event.id, event])).values()) as VisibleEvent[]
  return <main className="debriefScreen"><header className="homeHeader"><Logo /><span className="headerTag"><Check size={14} /> {scenario.month.toUpperCase()} COMPLETE</span></header>
    <section className="scoreHero"><p className="eyebrow lime">{scenario.month.toUpperCase()} — {scenario.name.toUpperCase()} / FINAL REPORT</p><div className="scoreRing"><div><strong>{score.total}</strong><span>/ 100</span></div></div><h1>{score.grade}</h1><p>Your chain served <strong>{kpis.fulfilledDemand.toLocaleString()}</strong> of <strong>{kpis.totalDemand.toLocaleString()}</strong> units while generating <strong>{money(kpis.profit)}</strong> in operating profit.</p></section>
    <section className="breakdownGrid"><div className="breakdownCard"><div className="cardHeading"><div><p className="eyebrow">SCORE BREAKDOWN</p><h2>Four lenses, one system</h2></div><Trophy size={24} /></div>{[['Customer service', score.service, 40], ['Operating profit', score.profit, 25], ['Resilience', score.resilience, 20], ['Inventory efficiency', score.inventoryEfficiency, 15]].map(([label, value, max]) => <div className="scoreRow" key={String(label)}><span>{label}</span><div><i style={{ width: `${Number(value) / Number(max) * 100}%` }} /></div><strong>{value}<small>/{max}</small></strong></div>)}</div>
      <div className="debriefKpis"><div><Target /><span>Service level</span><strong>{kpis.serviceLevel}%</strong></div><div><CircleDollarSign /><span>Total cost</span><strong>{money(kpis.totalCost)}</strong></div><div><PackageCheck /><span>Avg. inventory</span><strong>{kpis.averageInventory}</strong></div><div><AlertTriangle /><span>Lost sales</span><strong>{kpis.lostSales}</strong></div></div>
    </section>
    <section className="timelineCard"><div className="cardHeading"><div><p className="eyebrow">REVEALED EVENT TIMELINE</p><h2>What was happening behind the signals</h2></div><BookOpen size={22} /></div><div className="timelineItems eventTimeline">{revealedEvents.length ? revealedEvents.map((event) => <div key={event.id}><span className={`timelineDay ${event.kind !== 'market' ? 'warning' : ''}`}>DAY {event.startDay}–{event.endDay}</span><strong>{event.name}</strong><p>{event.description}</p></div>) : <div><span className="timelineDay">STABLE MONTH</span><strong>No concealed disruption occurred</strong><p>Performance was driven by price, demand, capacity, and operating decisions.</p></div>}</div></section>
    <section className="timelineCard"><div className="cardHeading"><div><p className="eyebrow">CAUSE & EFFECT</p><h2>Operational takeaways</h2></div></div><div className="timelineItems"><div><span className="timelineDay">DAY {bestDay.day}</span><strong>Your strongest day</strong><p>{money(bestDay.profit)} profit at a ${bestDay.sellingPrice} price while fulfilling {bestDay.fulfilled} units.</p></div><div><span className="timelineDay warning">DAY {worstDay.day}</span><strong>{worstDay.lostSales > 0 ? 'Customer impact peaked' : 'Availability remained protected'}</strong><p>{worstDay.lostSales > 0 ? `${worstDay.lostSales} sales were lost after inventory and lead-time pressure.` : 'No customer demand was permanently lost.'}</p></div><div><span className="timelineDay">NEXT MONTH</span><strong>{score.inventoryEfficiency < 10 ? 'Separate buffers by stage' : 'Build on this operating rhythm'}</strong><p>{score.inventoryEfficiency < 10 ? 'Raw materials and finished goods protect different constraints; tune them independently.' : 'Test a different supplier mix or price without sacrificing service.'}</p></div></div></section>
    <div className="debriefActions"><button className="secondaryButton" onClick={restart}><RotateCcw size={17} /> Replay month</button><button className="primaryButton" onClick={home}>Choose next month <ChevronRight size={18} /></button></div>
  </main>
}

export default function App() {
  const screen = useGameStore((state) => state.screen), tutorialOpen = useGameStore((state) => state.tutorialOpen)
  return <>{screen === 'home' && <Home />}{screen === 'game' && <Game />}{screen === 'debrief' && <Debrief />}{tutorialOpen && <TutorialModal />}</>
}

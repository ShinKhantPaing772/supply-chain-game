import { ArrowRight, Boxes, Factory, LineChart, ShieldCheck, Truck, X } from 'lucide-react'
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

const steps = [
  { icon: Boxes, eyebrow: '01 / FLOW', title: 'Every inventory stage has a role', text: 'Supplier capacity creates inbound raw materials. The factory converts them into finished goods that move through distribution and retail.' },
  { icon: Factory, eyebrow: '02 / PLAN', title: 'Balance every stage', text: 'Split supplier orders, schedule production, and release finished goods. A buffer in the wrong place cannot serve the customer.' },
  { icon: Truck, eyebrow: '03 / TIME', title: 'Lead time changes outcomes', text: 'Shipments already in transit cannot teleport. Expediting is faster, but the extra cost can erase your margin.' },
  { icon: ShieldCheck, eyebrow: '04 / ADAPT', title: 'Signals are not spoilers', text: 'Risk signals indicate uncertainty, not a guaranteed event. Diversification and inventory buffers improve resilience at a cost.' },
  { icon: LineChart, eyebrow: '05 / WIN', title: 'Price shapes demand', text: 'A lower price can grow demand but squeeze margin. Your score rewards service, profit, resilience, and efficient inventory.' },
]

export function TutorialModal() {
  const close = useGameStore((state) => state.closeTutorial)
  const [step, setStep] = useState(0)
  const item = steps[step]
  const Icon = item.icon
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorialCard">
        <button className="iconButton modalClose" onClick={close} aria-label="Close tutorial"><X size={19} /></button>
        <div className="tutorialVisual"><div className="tutorialOrb"><Icon size={48} /></div><span className="orbit one" /><span className="orbit two" /></div>
        <div className="tutorialContent">
          <p className="eyebrow">{item.eyebrow}</p>
          <h2 id="tutorial-title">{item.title}</h2>
          <p>{item.text}</p>
          <div className="tutorialFooter">
            <div className="stepDots" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((_, index) => <span key={index} className={index === step ? 'active' : ''} />)}</div>
            <button className="primaryButton" onClick={() => step === steps.length - 1 ? close() : setStep(step + 1)}>
              {step === steps.length - 1 ? 'Start planning' : 'Continue'} <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

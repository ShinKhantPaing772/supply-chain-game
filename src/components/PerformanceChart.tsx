import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailySnapshot } from '../game/types'

export function PerformanceChart({ history }: { history: DailySnapshot[] }) {
  const data = history.length ? history : [{ day: 0, demand: 0, fulfilled: 0, totalInventory: 0 }]
  return (
    <div className="chartCard">
      <div className="chartHeading"><div><p className="eyebrow">FLOW HISTORY</p><h3>Demand vs. fulfilled</h3></div><div className="chartLegend"><span className="demand">Demand</span><span className="fulfilled">Fulfilled</span></div></div>
      <div className="chartBody">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <defs><linearGradient id="fulfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b9ff66" stopOpacity={0.28} /><stop offset="100%" stopColor="#b9ff66" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="#263533" vertical={false} />
            <XAxis dataKey="day" stroke="#71807d" tickLine={false} axisLine={false} fontSize={10} />
            <YAxis stroke="#71807d" tickLine={false} axisLine={false} fontSize={10} />
            <Tooltip contentStyle={{ background: '#101d1c', border: '1px solid #344541', borderRadius: 10, fontSize: 12 }} />
            <Area type="monotone" dataKey="demand" stroke="#728481" fill="transparent" strokeDasharray="4 4" strokeWidth={2} />
            <Area type="monotone" dataKey="fulfilled" stroke="#b9ff66" fill="url(#fulfill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

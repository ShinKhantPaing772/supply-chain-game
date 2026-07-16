import { Background, BaseEdge, Controls, EdgeLabelRenderer, getBezierPath, Handle, Position, ReactFlow, useNodesState, type EdgeProps, type Node, type NodeProps } from '@xyflow/react'
import { Boxes, Factory, Plane, ShoppingBag, Ship, TrainFront, Truck, Users } from 'lucide-react'
import { memo, useEffect, useMemo } from 'react'
import type { GameState, NodeKind } from '../game/types'
import { PRODUCT } from '../game/product'

interface FacilityData extends Record<string, unknown> { label: string; kind: NodeKind; raw: number; finished: number; inbound: number; capacity: number; backlog: number; price: number; demand: number; fulfilled: number; health: 'healthy' | 'warning' | 'critical' }
interface SupplierData extends Record<string, unknown> { label: string; available: number; ordered: number; leadTime: number; reliability: number; yield: number; routeLabel: string; portExposed: boolean; risk: boolean; outcome: string }

const facilityIcons = { manufacturer: Factory, distribution: Truck, retailer: ShoppingBag, customer: Users }
const routeIcon = (route: string) => route.includes('Ocean') ? Ship : route.includes('Rail') ? TrainFront : route.includes('Air') ? Plane : Boxes

const SupplierNode = memo(({ data }: NodeProps<Node<SupplierData>>) => {
  const Icon = routeIcon(data.routeLabel)
  const health = data.outcome === 'normal' ? data.risk ? 'warning' : 'healthy' : 'critical'
  return <div className={`supplierNode ${health}`}><div className="facilityTop"><span className="facilityIcon"><Icon size={16} /></span><span className="statusDot" /></div><p>{data.label}</p><strong>{Math.round(data.available)} <small>capacity today</small></strong><div className="supplierFacts"><span>{data.ordered} ordered</span><span>{data.leadTime}d · {Math.round(data.yield * 100)}% yield</span></div><Handle type="source" position={Position.Right} /></div>
})

const FacilityNode = memo(({ data }: NodeProps<Node<FacilityData>>) => {
  const Icon = facilityIcons[data.kind]
  return <div className={`facilityNode detailed ${data.health}`}><Handle type="target" position={Position.Left} /><div className="facilityTop"><span className="facilityIcon"><Icon size={18} /></span><span className="statusDot" /></div><p>{data.label}</p>
    {data.kind === 'manufacturer' && <div className="stockRows"><span><small>Component kits</small><strong>{Math.round(data.raw)}</strong></span><span><small>{PRODUCT.shortName} speakers</small><strong>{Math.round(data.finished)}</strong></span><span><small>Inbound kits</small><strong>{Math.round(data.inbound)}</strong></span></div>}
    {data.kind === 'distribution' && <div className="stockRows"><span><small>{PRODUCT.shortName} inventory</small><strong>{Math.round(data.finished)}</strong></span><span><small>Inbound speakers</small><strong>{Math.round(data.inbound)}</strong></span></div>}
    {data.kind === 'retailer' && <div className="stockRows"><span><small>Sellable {PRODUCT.shortName}</small><strong>{Math.round(data.finished)}</strong></span><span><small>Speaker price</small><strong>${data.price}</strong></span><span><small>Backlog</small><strong>{Math.round(data.backlog)}</strong></span></div>}
    {data.kind === 'customer' && <div className="stockRows"><span><small>Speaker demand</small><strong>{Math.round(data.demand)}</strong></span><span><small>Orders fulfilled</small><strong>{Math.round(data.fulfilled)}</strong></span><span><small>Waiting</small><strong>{Math.round(data.backlog)}</strong></span></div>}
    {data.kind !== 'customer' && <Handle type="source" position={Position.Right} />}
  </div>
})

function ShipmentEdge(props: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath(props)
  const active = Boolean(props.data?.active), delayed = Boolean(props.data?.delayed)
  return <><BaseEdge path={path} markerEnd={props.markerEnd} style={{ stroke: delayed ? '#ff9e67' : active ? '#b9ff66' : '#445452', strokeWidth: active ? 2.2 : 1.3 }} />{active && <circle r="4" fill={delayed ? '#ff9e67' : '#b9ff66'} className="shipmentParticle"><animateMotion dur={delayed ? '4s' : '2.2s'} repeatCount="indefinite" path={path} /></circle>}{props.label && <EdgeLabelRenderer><div className={`edgeLabel ${delayed ? 'delayed' : ''}`} style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}>{String(props.label)}</div></EdgeLabelRenderer>}</>
}

const nodeTypes = { facility: FacilityNode, supplier: SupplierNode }
const edgeTypes = { shipment: ShipmentEdge }

export function SupplyMap({ game }: { game: GameState }) {
  const graph = useMemo(() => {
    const latest = game.history.at(-1)
    const supplierNodes: Node<SupplierData>[] = game.supplierStates.map((supplier, index) => ({ id: supplier.id, type: 'supplier', position: { x: 10, y: index * 102 }, draggable: true, data: { label: supplier.name, available: supplier.availableCapacity, ordered: game.decision.supplierAllocations[supplier.id] ?? 0, leadTime: supplier.leadTime, reliability: supplier.reliability, yield: supplier.deliveredYield, routeLabel: supplier.routeLabel, portExposed: supplier.portExposed, risk: supplier.riskLevel === 'elevated', outcome: supplier.outcome } }))
    const facilityNodes: Node<FacilityData>[] = game.nodes.map((item) => {
      const finished = item.inventory.finishedGoods
      const relevantStock = item.kind === 'manufacturer' ? item.inventory.rawMaterials : finished
      const target = item.kind === 'manufacturer' ? game.decision.safetyStocks.rawMaterials : item.inventory.safetyStock
      const health = item.kind === 'customer' ? item.inventory.backlog > 20 ? 'critical' : item.inventory.backlog > 0 ? 'warning' : 'healthy' : relevantStock < target * 0.45 ? 'critical' : relevantStock < target ? 'warning' : 'healthy'
      return { id: item.id, type: 'facility', position: item.position, draggable: true, data: { label: item.name, kind: item.kind, raw: item.inventory.rawMaterials, finished, inbound: item.inventory.inTransit, capacity: item.capacity, backlog: item.inventory.backlog, price: game.decision.sellingPrice, demand: latest?.demand ?? 0, fulfilled: latest?.fulfilled ?? 0, health } }
    })
    const edges = game.edges.map((edge) => {
      const shipments = game.shipments.filter((item) => item.source === edge.source && item.target === edge.target)
      const quantity = shipments.reduce((sum, item) => sum + item.quantity, 0)
      const earliest = shipments.length ? Math.min(...shipments.map((item) => item.arrivalDay)) : 0
      const material = shipments[0]?.materialType === 'raw-materials' ? 'component kits' : PRODUCT.shortName
      return { id: edge.id, source: edge.source, target: edge.target, type: 'shipment', label: quantity ? `${Math.round(quantity)} ${material} · ETA d${earliest}` : '', data: { active: quantity > 0, delayed: shipments.some((item) => item.status === 'delayed') } }
    })
    return { nodes: [...supplierNodes, ...facilityNodes], edges }
  }, [game])
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes)
  useEffect(() => {
    setNodes((current) => graph.nodes.map((next) => {
      const existing = current.find((item) => item.id === next.id)
      return { ...next, position: existing?.position ?? next.position }
    }))
  }, [graph.nodes, setNodes])
  return <div className="mapWrap expandedMap"><ReactFlow nodes={nodes} edges={graph.edges} onNodesChange={onNodesChange} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView fitViewOptions={{ padding: 0.08 }} minZoom={0.35} maxZoom={1.6} panOnDrag zoomOnScroll zoomOnPinch preventScrolling nodesDraggable elementsSelectable nodesConnectable={false} proOptions={{ hideAttribution: true }}><Background color="#2a3937" gap={28} size={1} /><Controls showInteractive={false} /></ReactFlow><div className="mapHint">Drag nodes · drag canvas to pan · scroll to zoom</div><div className="mapLegend"><span><i className="healthy" /> Healthy</span><span><i className="warning" /> Risk / watch</span><span><i className="critical" /> Disrupted</span></div></div>
}

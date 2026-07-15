export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Supply-Chain Management Game">
      <span className="brandMark" aria-hidden="true"><i /><i /><i /></span>
      {!compact && <span>SCM<span className="brandMuted">/GAME</span></span>}
    </div>
  )
}

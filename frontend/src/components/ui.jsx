import { forwardRef, useState, useEffect } from 'react'
import clsx from 'clsx'

export function Button({ children, variant = 'primary', size = 'md', className, loading, ...props }) {
  const sz = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-2.5 text-sm' }
  return (
    <button
      className={clsx(`btn btn-${variant}`, sz[size], loading && 'opacity-60 cursor-not-allowed', className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2 align-middle" />}
      {children}
    </button>
  )
}

export const Input = forwardRef(({ label, error, icon, className, ...props }, ref) => (
  <div className={className}>
    {label && <label className="label">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dim text-sm">{icon}</span>}
      <input ref={ref} className={clsx('input', icon && 'pl-9', error && 'border-red focus:border-red')} {...props} />
    </div>
    {error && <p className="mt-1 text-xs text-red">{error}</p>}
  </div>
))
Input.displayName = 'Input'

export const Textarea = forwardRef(({ label, error, className, ...props }, ref) => (
  <div className={className}>
    {label && <label className="label">{label}</label>}
    <textarea ref={ref} className={clsx('input resize-y min-h-[96px]', error && 'border-red')} {...props} />
    {error && <p className="mt-1 text-xs text-red">{error}</p>}
  </div>
))
Textarea.displayName = 'Textarea'

export function Card({ children, className, hover, onClick }) {
  return <div className={clsx('card', hover && 'card-hover cursor-pointer', className)} onClick={onClick}>{children}</div>
}

const BADGE_VARIANTS = {
  success: 'bg-green/10 text-green border border-green/30',
  danger:  'bg-red/10   text-red   border border-red/30',
  warning: 'bg-accent/10 text-accent border border-accent/30',
  info:    'bg-blue/10  text-blue  border border-blue/30',
  muted:   'bg-[#1e2538] text-muted border border-[#1e2538]',
  Pricing:    'bg-blue/10  text-blue  border border-blue/30',
  Booking:    'bg-green/10 text-green border border-green/30',
  Complaint:  'bg-red/10   text-red   border border-red/30',
  Escalation: 'bg-red/10   text-red   border border-red/30',
  'High Value':'bg-accent/10 text-accent border border-accent/30',
  Info:        'bg-[#1e2538] text-muted border border-[#1e2538]',
}

export function Badge({ label, variant }) {
  const v = variant || label
  return <span className={clsx('badge', BADGE_VARIANTS[v] || BADGE_VARIANTS.muted)}>{label}</span>
}

export function StatusBadge({ status }) {
  const h = status === 'needs_human'
  return <span className={clsx('badge', h ? 'bg-red/10 text-red border border-red/30' : 'bg-green/10 text-green border border-green/30')}>
    {h ? '⚡ Human' : '✓ AI'}
  </span>
}

export function Toggle({ value, onChange, label, sub }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#1e2538]">
      <div>
        <div className="text-sm text-[#dde3f0] font-medium">{label}</div>
        {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className={clsx('relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0', value ? 'bg-green' : 'bg-[#1e2538]')}>
        <span className={clsx('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200', value ? 'left-6' : 'left-1')} />
      </button>
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = 520 }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    if (open) { document.addEventListener('keydown', esc); document.body.style.overflow = 'hidden' }
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card animate-fade-up p-8 w-full max-h-[90vh] overflow-y-auto" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-[#dde3f0]">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-[#dde3f0] text-xl leading-none cursor-pointer bg-transparent border-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Spinner({ size = 'md', className }) {
  const sz = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return <div className={clsx(sz[size], 'border-2 border-[#1e2538] border-t-accent rounded-full animate-spin inline-block', className)} />
}

export function EmptyState({ icon, title, sub, action }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="text-base font-semibold text-[#dde3f0] mb-2">{title}</div>
      <div className="text-sm text-muted">{sub}</div>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function ProgressBar({ value, max, color, height = 6 }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const bg  = pct > 85 ? '#ff4757' : pct > 60 ? '#f5a623' : (color || '#00c47d')
  return (
    <div className="rounded-full bg-[#1e2538] overflow-hidden" style={{ height }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: bg }} />
    </div>
  )
}

export function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-br-2xl"
           style={{ background: `radial-gradient(circle at 80% 20%, ${accent}25 0%, transparent 65%)` }} />
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-3xl font-bold font-mono tracking-tight" style={{ color: accent }}>{value}</div>
      <div className="text-sm text-[#dde3f0] font-medium mt-1">{label}</div>
      <div className="text-xs text-muted mt-0.5">{sub}</div>
    </div>
  )
}

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="flex justify-between items-end mb-6">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={420}>
      <p className="text-sm text-muted mb-6 leading-relaxed">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose() }}>Confirm</Button>
      </div>
    </Modal>
  )
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <div className="px-5 py-4 border-b border-[#1e2538] flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className={clsx('skeleton h-4 rounded', i === 0 ? 'w-32' : 'flex-1')} />
      ))}
    </div>
  )
}

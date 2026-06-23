import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { useAuthStore } from '@/context/authStore'
import { ProgressBar } from '@/components/ui'

const PLAN_LIMITS = { starter: 500, growth: 2000, pro: 10000 }
const NAV = [
  { to: '/',             icon: '◈', label: 'Overview' },
  { to: '/leads',        icon: '◎', label: 'Leads',         badge: true },
  { to: '/chats',        icon: '◉', label: 'Live Chats' },
  { to: '/knowledge',    icon: '◇', label: 'Knowledge Base' },
  { to: '/subscription', icon: '◆', label: 'Subscription' },
  { to: '/settings',     icon: '⊙', label: 'Settings' },
]

export default function Sidebar({ hotLeads = 0 }) {
  const { user, tenant, logout } = useAuthStore()
  const plan  = tenant?.plan || 'starter'
  const used  = tenant?.messages_used_this_month || 0
  const limit = PLAN_LIMITS[plan] || 500
  const pct   = Math.round((used / limit) * 100)

  return (
    <aside className="w-56 bg-[#0f1219] border-r border-[#1e2538] flex flex-col flex-shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#1e2538]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold text-bg flex-shrink-0"
               style={{ background: 'linear-gradient(135deg,#f5a623,#e8830a)' }}>S</div>
          <div>
            <div className="text-sm font-bold text-[#dde3f0] leading-tight">SME Growth AI</div>
            <div className="text-[10px] text-muted mt-0.5 truncate max-w-[110px]">{tenant?.business_name || '…'}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        <div className="section-title px-2 mb-3">Menu</div>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            className={({ isActive }) => clsx('nav-item mb-1', isActive && 'active')}>
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
            {item.badge && hotLeads > 0 && (
              <span className="ml-auto bg-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{hotLeads}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Usage */}
      <div className="px-4 py-3 border-t border-b border-[#1e2538]">
        <div className="flex justify-between mb-1.5">
          <span className="text-[11px] text-muted">Messages used</span>
          <span className="text-[11px] font-mono font-semibold" style={{ color: pct > 85 ? '#ff4757' : '#f5a623' }}>{used}/{limit}</span>
        </div>
        <ProgressBar value={used} max={limit} height={4} />
        <div className="text-[10px] text-dim mt-1.5">
          Plan: <span className="text-accent capitalize">{plan}</span>
        </div>
      </div>

      {/* User + brand */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
            {user?.full_name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[#dde3f0] truncate">{user?.full_name}</div>
            <div className="text-[10px] text-muted capitalize">{plan} plan</div>
          </div>
          <button onClick={logout} title="Logout" className="text-dim hover:text-red text-xs bg-transparent border-none cursor-pointer">⏻</button>
        </div>
        <div className="pt-3 border-t border-[#1e2538] text-center">
          <div className="text-[10px] text-dim">Powered by</div>
          <div className="text-[11px] font-bold text-accent tracking-wide mt-0.5">Qlambda Technologies LLP</div>
        </div>
      </div>
    </aside>
  )
}

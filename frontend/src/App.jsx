import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useQuery } from 'react-query'
import { useAuthStore } from '@/context/authStore'
import { leadsAPI } from '@/api/client'
import Sidebar from '@/components/Sidebar'
import { LoginPage, RegisterPage } from '@/pages/Auth'
import Overview      from '@/pages/Overview'
import Leads         from '@/pages/Leads'
import Chats         from '@/pages/Chats'
import KnowledgeBase from '@/pages/KnowledgeBase'
import Subscription  from '@/pages/Subscription'
import Settings      from '@/pages/Settings'

function DashboardLayout() {
  const { isAuthenticated, user, tenant } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace/>

  const { data: hotData } = useQuery('leads-hot', () => leadsAPI.list({ status_filter:'needs_human', page:1, page_size:1 }).then(r => r.data), { refetchInterval: 30_000 })

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar hotLeads={hotData?.total || 0}/>
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur-sm border-b border-[#1e2538] px-9 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-dim">
            <span>Powered by</span>
            <span className="text-accent font-bold tracking-wide">Qlambda Technologies LLP</span>
          </div>
          <div className="flex items-center gap-2.5 bg-[#151a27] border border-[#1e2538] rounded-xl px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-[11px] font-bold text-accent">
              {user?.full_name?.[0] || 'U'}
            </div>
            <div>
              <div className="text-xs font-semibold text-[#dde3f0] leading-tight">{user?.full_name}</div>
              <div className="text-[10px] text-muted capitalize leading-tight">{tenant?.plan} plan</div>
            </div>
          </div>
        </div>
        <div className="px-9 py-8"><Outlet/></div>
      </main>
    </div>
  )
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <Navigate to="/" replace/> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<PublicRoute><LoginPage/></PublicRoute>}/>
      <Route path="/register" element={<PublicRoute><RegisterPage/></PublicRoute>}/>
      <Route element={<DashboardLayout/>}>
        <Route path="/"             element={<Overview/>}/>
        <Route path="/leads"        element={<Leads/>}/>
        <Route path="/chats"        element={<Chats/>}/>
        <Route path="/knowledge"    element={<KnowledgeBase/>}/>
        <Route path="/subscription" element={<Subscription/>}/>
        <Route path="/settings"     element={<Settings/>}/>
      </Route>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  )
}

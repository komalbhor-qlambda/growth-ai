import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { analyticsAPI, leadsAPI } from '@/api/client'
import { useAuthStore } from '@/context/authStore'
import { StatCard, Card, Badge, StatusBadge, ProgressBar, SkeletonRow } from '@/components/ui'

const PLAN_LIMITS = { starter: 500, growth: 2000, pro: 10000 }
const COLORS = { pricing: '#4d9fff', booking: '#00c47d', location: '#f5a623', complaint: '#ff4757' }

export default function Overview() {
  const navigate = useNavigate()
  const { tenant } = useAuthStore()
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  const { data: stats, isLoading: sL } = useQuery('dashboard', () => analyticsAPI.dashboard().then(r => r.data), { refetchInterval: 60_000 })
  const { data: leadsData, isLoading: lL } = useQuery('leads-recent', () => leadsAPI.list({ page: 1, page_size: 6 }).then(r => r.data))

  const intentData = stats ? Object.entries(stats.intent_breakdown || {}).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1), value: Math.round(v * 100), color: COLORS[k] || '#8892aa',
  })) : []

  const planLimit = PLAN_LIMITS[tenant?.plan] || 500

  return (
    <div className="space-y-7 animate-fade-up">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#dde3f0]">Namaste, {tenant?.business_name?.split(' ')[0] || 'there'} 🙏</h1>
          <p className="text-sm text-muted mt-1">Business pulse for {today}</p>
        </div>
        <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-2 text-sm text-accent font-semibold capitalize">
          Plan: {tenant?.plan || '—'} ✓
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {sL ? Array.from({length:4}).map((_,i) => <div key={i} className="card p-6 space-y-2"><div className="skeleton h-6 w-8 rounded"/><div className="skeleton h-8 w-16 rounded"/><div className="skeleton h-4 w-24 rounded"/></div>)
          : <>
            <StatCard icon="💬" label="Messages today" value={stats?.messages_today ?? '—'} sub="Live" accent="#f5a623"/>
            <StatCard icon="🤖" label="AI resolved"    value={`${Math.round((stats?.ai_resolve_rate||0)*100)}%`} sub="Target >80%" accent="#00c47d"/>
            <StatCard icon="⚡" label="Avg response"   value={`${((stats?.avg_latency_ms||0)/1000).toFixed(1)}s`} sub="Near real-time" accent="#4d9fff"/>
            <StatCard icon="🔥" label="Hot leads"      value={stats?.hot_leads ?? '—'} sub="Need attention" accent="#ff4757"/>
          </>
        }
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <Card className="p-6">
          <div className="flex justify-between items-center mb-5">
            <span className="section-title">Recent interactions</span>
            <button onClick={() => navigate('/leads')} className="text-xs text-accent font-semibold bg-transparent border-none cursor-pointer hover:underline">View all →</button>
          </div>
          {lL ? Array.from({length:5}).map((_,i) => <SkeletonRow key={i} cols={3}/>)
            : (leadsData?.items || []).map((lead, i) => (
              <div key={lead.id} className="flex items-center gap-3 py-3 border-b border-[#1e2538] last:border-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                     style={{ background: lead.status==='needs_human'?'rgba(255,71,87,0.1)':'rgba(0,196,125,0.1)', border:`1.5px solid ${lead.status==='needs_human'?'#ff4757':'#00c47d'}`, color: lead.status==='needs_human'?'#ff4757':'#00c47d' }}>
                  {(lead.name||lead.phone)?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#dde3f0] font-semibold truncate">{lead.name||lead.phone}</div>
                  <div className="text-xs text-muted truncate">{lead.intent||'General inquiry'}</div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge label={lead.tag||'Info'}/>
                  <span className="text-[11px] text-dim">{lead.created_at ? new Date(lead.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}</span>
                </div>
              </div>
            ))
          }
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="section-title mb-4">Intent breakdown</div>
            {sL ? <div className="space-y-3">{Array.from({length:4}).map((_,i)=><div key={i} className="skeleton h-4 rounded"/>)}</div>
              : <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={intentData} layout="vertical" margin={{top:0,right:30,left:0,bottom:0}}>
                    <XAxis type="number" tick={{fill:'#4a5270',fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fill:'#8892aa',fontSize:12}} axisLine={false} tickLine={false} width={70}/>
                    <Tooltip contentStyle={{background:'#1c2234',border:'1px solid #1e2538',borderRadius:8}} labelStyle={{color:'#dde3f0'}} formatter={v=>[`${v}%`,'']}/>
                    <Bar dataKey="value" radius={[0,4,4,0]}>{intentData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
            }
          </Card>
          <Card className="p-5">
            <div className="section-title mb-4">Plan usage</div>
            {[
              {label:'Messages',used:stats?.messages_this_month||0,max:stats?.plan_messages_limit||planLimit},
              {label:'Leads',used:leadsData?.total||0,max:tenant?.plan==='pro'?5000:tenant?.plan==='growth'?1000:200},
            ].map(item => (
              <div key={item.label} className="mb-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted">{item.label}</span>
                  <span className="text-dim font-mono">{item.used}/{item.max}</span>
                </div>
                <ProgressBar value={item.used} max={item.max} height={5}/>
              </div>
            ))}
            <button onClick={() => navigate('/subscription')} className="mt-3 w-full py-2 rounded-lg text-xs font-semibold text-accent bg-accent/10 border border-accent/30 cursor-pointer hover:bg-accent/20 transition-colors">
              Upgrade Plan →
            </button>
          </Card>
        </div>
      </div>
    </div>
  )
}

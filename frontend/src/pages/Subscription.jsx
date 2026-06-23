import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { billingAPI } from '@/api/client'
import { useAuthStore } from '@/context/authStore'
import { Card, Button, Modal, Spinner, PageHeader } from '@/components/ui'

const PLANS = {
  starter:{ name:'Starter', monthly:999,  annual:799,  messages:500,   leads:200,  kb:3,  agents:1,  features:['Hinglish AI replies','Lead capture','3 KB files','Email support'] },
  growth: { name:'Growth',  monthly:2499, annual:1999, messages:2000,  leads:1000, kb:10, agents:3,  features:['Everything in Starter','Voice note STT','Bulk CSV import','Priority support'], popular:true },
  pro:    { name:'Pro',     monthly:5999, annual:4799, messages:10000, leads:5000, kb:50, agents:10, features:['Everything in Growth','Custom AI persona','API access','Dedicated manager'] },
}

function loadRazorpay() {
  return new Promise(r => {
    if (window.Razorpay) return r(true)
    const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => r(true); s.onerror = () => r(false); document.body.appendChild(s)
  })
}

function PlanCard({ planId, plan, current, billing, onSelect }) {
  const price = billing === 'annual' ? plan.annual : plan.monthly
  const isCurr = current === planId
  return (
    <div className={`card p-6 flex flex-col relative transition-all ${isCurr?'border-green shadow-[0_0_30px_rgba(0,196,125,.1)]':plan.popular?'border-accent shadow-[0_0_30px_rgba(245,166,35,.08)]':''}`}>
      {plan.popular && !isCurr && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-bg text-[11px] font-bold px-4 py-0.5 rounded-full">MOST POPULAR</div>}
      {isCurr && <div className="absolute -top-3 right-5 bg-green text-bg text-[11px] font-bold px-3 py-0.5 rounded-full">CURRENT</div>}
      <div className="text-base font-bold text-[#dde3f0] mb-1">{plan.name}</div>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-sm text-muted">₹</span>
        <span className="text-4xl font-extrabold font-mono tracking-tight" style={{ color:plan.popular?'#f5a623':'#dde3f0' }}>{price.toLocaleString('en-IN')}</span>
        <span className="text-sm text-muted">/mo</span>
      </div>
      {billing==='annual' && <div className="text-xs text-green font-semibold mb-3">Save 20% annually</div>}
      <div className="divider"/>
      <ul className="space-y-2 flex-1 mb-5">
        {[`${plan.messages.toLocaleString('en-IN')} messages/mo`,`${plan.leads.toLocaleString('en-IN')} leads`,`${plan.kb} KB files`,`${plan.agents} agent${plan.agents>1?'s':''}`, ...plan.features].map((f,i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted"><span className="text-green mt-0.5 flex-shrink-0">✓</span>{f}</li>
        ))}
      </ul>
      <Button variant={isCurr?'ghost':plan.popular?'primary':'accent'} className="w-full" onClick={() => !isCurr && onSelect(planId)} disabled={isCurr}>
        {isCurr ? 'Current plan' : `Upgrade to ${plan.name}`}
      </Button>
    </div>
  )
}

function PayModal({ open, onClose, planId, billing, onSuccess }) {
  const { user } = useAuthStore()
  const [step, setStep]   = useState('method')
  const [upiId, setUpiId] = useState('')
  const plan  = PLANS[planId] || {}
  const price = (billing==='annual' ? plan.annual*12*.8 : plan.monthly) || 0
  const gst   = Math.round(price*.18)
  const total = price + gst

  const orderMut = useMutation(
    () => billingAPI.createOrder({ plan: planId, billing_cycle: billing }).then(r => r.data),
    { onSuccess: async order => {
        const ok = await loadRazorpay()
        if (!ok) { toast.error('Payment gateway failed to load'); setStep('method'); return }
        new window.Razorpay({
          key: order.key_id, amount: order.amount, currency: order.currency,
          name: 'SME Growth AI', description: `${plan.name} Plan`, order_id: order.order_id,
          prefill: { name: user?.full_name, email: user?.email },
          theme: { color: '#f5a623' },
          handler: async resp => {
            try {
              await billingAPI.verify({ razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature })
              setStep('done'); setTimeout(() => { onSuccess(planId); onClose() }, 2000)
            } catch { toast.error('Payment verification failed'); setStep('method') }
          },
          modal: { ondismiss: () => setStep('method') },
        }).open()
      },
      onError: () => { toast.error('Could not create order'); setStep('method') },
    }
  )

  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} title={`Upgrade to ${plan.name||''}`} width={460}>
      {step==='done' ? <div className="text-center py-8"><div className="text-5xl mb-4">✅</div><div className="text-xl font-bold text-green mb-2">Payment Successful!</div><div className="text-sm text-muted">Your {plan.name} plan is now active.</div></div>
       : orderMut.isLoading ? <div className="text-center py-10"><Spinner className="mx-auto mb-4" size="lg"/><div className="text-sm text-muted">Opening payment window…</div></div>
       : <>
          <div className="bg-bg rounded-xl p-4 mb-5">
            <div className="section-title mb-3">Order summary</div>
            {[{l:`${plan.name} (${billing})`,v:`₹${price.toLocaleString('en-IN')}`},{l:'GST (18%)',v:`₹${gst.toLocaleString('en-IN')}`}].map(r=>(
              <div key={r.l} className="flex justify-between text-sm mb-2"><span className="text-muted">{r.l}</span><span className="font-mono text-[#dde3f0]">{r.v}</span></div>
            ))}
            <div className="divider"/>
            <div className="flex justify-between font-semibold"><span className="text-[#dde3f0]">Total</span><span className="text-accent font-bold font-mono text-lg">₹{total.toLocaleString('en-IN')}</span></div>
          </div>
          <div className="section-title mb-3">Choose payment method</div>
          {[{icon:'🇮🇳',title:'UPI (Recommended)',sub:'PhonePe, GPay, Paytm, BHIM',tag:'Instant →',fn:()=>setStep('upi')},
            {icon:'💳',title:'Credit / Debit Card',sub:'Visa, Mastercard, RuPay',tag:'→',fn:()=>orderMut.mutate()},
            {icon:'🏦',title:'Net Banking',sub:'SBI, HDFC, ICICI & 50+ banks',tag:'→',fn:()=>orderMut.mutate()}].map(m=>(
            <div key={m.title} onClick={m.fn} className="flex items-center gap-4 p-4 rounded-xl border border-[#1e2538] mb-2.5 cursor-pointer hover:border-[#252d42] hover:bg-white/[0.02] transition-all">
              <span className="text-2xl">{m.icon}</span>
              <div className="flex-1"><div className="text-sm font-semibold text-[#dde3f0]">{m.title}</div><div className="text-xs text-muted">{m.sub}</div></div>
              <span className="text-xs font-semibold text-accent">{m.tag}</span>
            </div>
          ))}
          {step==='upi'&&<>
            <div className="mt-4 space-y-3">
              <div className="divider"/>
              <div><label className="label">Your UPI ID</label>
                <input value={upiId} onChange={e=>setUpiId(e.target.value)} placeholder="name@paytm / @gpay / @phonepe" className={`input ${upiId.includes('@')?'border-green':''}`}/>
                {upiId.includes('@')&&<div className="text-xs text-green mt-1">✓ Valid UPI ID</div>}
              </div>
              <Button variant="primary" className="w-full py-3" onClick={()=>orderMut.mutate()} disabled={!upiId.includes('@')}>Pay ₹{total.toLocaleString('en-IN')} via UPI</Button>
            </div>
          </>}
          <div className="text-center text-[11px] text-dim mt-4">🔒 Secured by Razorpay · PCI-DSS compliant</div>
        </>
      }
    </Modal>
  )
}

export default function Subscription() {
  const qc = useQueryClient()
  const { tenant, refreshTenant } = useAuthStore()
  const [billing, setBilling] = useState('monthly')
  const [selPlan, setSelPlan] = useState(null)
  const [payOpen, setPayOpen] = useState(false)

  const { data: invoices = [], isLoading: invLoad } = useQuery('invoices', () => billingAPI.invoices().then(r => r.data))

  const onSelect = id => { setSelPlan(id); setPayOpen(true) }
  const onSuccess = async () => { await refreshTenant(); toast.success('🎉 Plan upgraded!'); qc.invalidateQueries('invoices') }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex justify-between items-end">
        <div><h1 className="page-title">Subscription & Billing</h1><p className="page-sub">Manage your plan, upgrade, and view invoices</p></div>
        <div className="flex rounded-xl overflow-hidden border border-[#1e2538]">
          {['monthly','annual'].map(b => <button key={b} onClick={()=>setBilling(b)} className={`px-4 py-2 text-xs font-semibold cursor-pointer transition-all border-none ${billing===b?'bg-accent text-bg':'bg-transparent text-muted hover:text-[#dde3f0]'}`}>{b==='monthly'?'Monthly':'Annual (–20%)'}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {Object.entries(PLANS).map(([id,plan]) => <PlanCard key={id} planId={id} plan={plan} current={tenant?.plan} billing={billing} onSelect={onSelect}/>)}
      </div>

      <Card className="p-6">
        <div className="section-title mb-4">Current subscription</div>
        <div className="grid grid-cols-4 gap-4">
          {[{label:'Plan',value:PLANS[tenant?.plan]?.name||'—'},{label:'Status',value:tenant?.subscription_status||'—',color:'#00c47d'},{label:'Plan',value:tenant?.plan||'—'},{label:'Next charge',value:tenant?.plan?`₹${PLANS[tenant.plan]?.monthly?.toLocaleString('en-IN')}`:'—'}].map((item,i)=>(
            <div key={i}><div className="text-xs text-muted mb-1">{item.label}</div><div className="text-base font-bold capitalize" style={{color:item.color||'#dde3f0'}}>{item.value}</div></div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1e2538] section-title">Invoice history</div>
        {invLoad ? <div className="p-6 text-sm text-muted">Loading…</div>
          : invoices.length === 0 ? <div className="px-5 py-6 text-sm text-muted">No invoices yet.</div>
          : invoices.map((inv,i) => (
            <div key={inv.id} className="grid px-5 py-3.5 items-center border-b border-[#1e2538] last:border-0" style={{gridTemplateColumns:'1fr 2fr 1fr 90px 80px'}}>
              <div className="text-xs text-muted font-mono">{new Date(inv.created_at).toLocaleDateString('en-IN')}</div>
              <div className="text-sm text-[#dde3f0] capitalize">{inv.plan} ({inv.billing_cycle})</div>
              <div className="text-sm font-bold font-mono">₹{Math.round(inv.amount_paise/100).toLocaleString('en-IN')}</div>
              <span className={`badge ${inv.status==='paid'?'bg-green/10 text-green border border-green/30':'bg-[#1e2538] text-muted border-[#1e2538]'}`}>{inv.status}</span>
              <button onClick={() => toast.success('Invoice downloaded')} className="text-xs text-blue font-semibold bg-transparent border-none cursor-pointer hover:underline">Download</button>
            </div>
          ))
        }
      </Card>

      <PayModal open={payOpen} onClose={() => setPayOpen(false)} planId={selPlan} billing={billing} onSuccess={onSuccess}/>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useMutation } from 'react-query'
import toast from 'react-hot-toast'
import { chatAPI } from '@/api/client'
import { Card, Button, Spinner, PageHeader } from '@/components/ui'

const CONTACTS = [
  { id:1, name:'Rajesh Kumar', phone:'+919876543210', status:'online',  lastMsg:'Haircut ka price?', unread:2 },
  { id:2, name:'Priya Sharma', phone:'+918765432109', status:'online',  lastMsg:'Bridal package?',   unread:1, escalated:true },
  { id:3, name:'Amit Singh',   phone:'+917654321098', status:'offline', lastMsg:'Thanks!',           unread:0 },
]
const INIT = [
  { from:'customer', text:'Bhai haircut ka price kya hai?',                                                              time:'10:42' },
  { from:'ai',       text:'Hamara basic haircut ₹250 se start hota hai! ✂️ Premium styling ₹450 tak. Koi aur sawal?',   time:'10:42' },
  { from:'customer', text:'Sunday 11 baje slot milega?',                                                                  time:'10:44' },
  { from:'ai',       text:'Sunday 11 AM available hai! Naam confirm karein, main slot fix kar deta hoon. 😊',            time:'10:44' },
]

export default function Chats() {
  const [activeC, setActiveC] = useState(CONTACTS[0])
  const [msgs, setMsgs]       = useState(INIT)
  const [input, setInput]     = useState('')
  const [aiMode, setAiMode]   = useState(true)
  const [conf, setConf]       = useState(92)
  const [intent, setIntent]   = useState('pricing')
  const [lang, setLang]       = useState('hinglish')
  const bottomRef = useRef(null)

  const mut = useMutation(chatAPI.send, {
    onSuccess: r => {
      const d = r.data, time = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
      setMsgs(m => [...m, { from:'ai', text:d.reply, time }])
      setConf(Math.round(d.confidence*100)); setIntent(d.intent||'general'); setLang(d.language||'hinglish')
      if (d.escalated) toast.error('⚡ Escalated — needs human attention')
    },
    onError: () => {
      const time = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
      setMsgs(m => [...m, { from:'ai', text:'Abhi technical issue hai. Please try again. 🙏', time }])
    },
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs, mut.isLoading])

  const send = () => {
    if (!input.trim() || mut.isLoading) return
    const text = input.trim(), time = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
    setMsgs(m => [...m, { from:'customer', text, time }]); setInput('')
    if (aiMode) mut.mutate({ message:text, customer_phone:activeC.phone, conversation_history:msgs.slice(-6).map(m=>({from:m.from,text:m.text})) })
  }

  return (
    <div className="animate-fade-up flex flex-col gap-4" style={{ height:'calc(100vh - 100px)' }}>
      <PageHeader title="Live Chats" sub="Simulate AI conversations — powered by Claude"/>
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Contact list */}
        <div className="w-56 card overflow-hidden flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-[#1e2538] section-title">Active chats</div>
          <div className="overflow-y-auto flex-1">
            {CONTACTS.map(c => (
              <div key={c.id} onClick={() => setActiveC(c)}
                className={`px-4 py-3 cursor-pointer border-b border-[#1e2538] transition-all ${activeC.id===c.id?'bg-accent/10 border-l-2 border-l-accent':'border-l-2 border-l-transparent hover:bg-white/[0.02]'}`}>
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                         style={{ background:c.escalated?'rgba(255,71,87,.1)':'rgba(0,196,125,.1)', border:`2px solid ${c.escalated?'#ff4757':'#00c47d'}`, color:c.escalated?'#ff4757':'#00c47d' }}>{c.name[0]}</div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-surface" style={{ background:c.status==='online'?'#00c47d':'#4a5270' }}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#dde3f0]">{c.name.split(' ')[0]}</div>
                    <div className="text-[11px] text-muted truncate">{c.lastMsg}</div>
                  </div>
                  {c.unread > 0 && <div className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-bg flex-shrink-0" style={{ background:c.escalated?'#ff4757':'#f5a623' }}>{c.unread}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="card flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1e2538] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background:'rgba(0,196,125,.1)', border:'2px solid #00c47d', color:'#00c47d' }}>{activeC.name[0]}</div>
              <div>
                <div className="text-sm font-semibold text-[#dde3f0]">{activeC.name}</div>
                <div className="text-xs text-green">● {activeC.status}</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${aiMode?'bg-accent/10 text-accent border border-accent/30':'bg-green/10 text-green border border-green/30'}`}>{aiMode?'🤖 AI Active':'👤 Manual'}</span>
                {aiMode ? <Button variant="danger" size="sm" onClick={() => { setAiMode(false); toast('You took over. AI paused.',{icon:'👤'}) }}>Take Over</Button>
                        : <Button variant="success" size="sm" onClick={() => { setAiMode(true); toast.success('AI re-activated') }}>Activate AI</Button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {msgs.map((msg, i) => (
                <div key={i} className={`flex ${msg.from==='customer'?'justify-start':'justify-end'}`}>
                  <div className="max-w-[70%] px-4 py-2.5 text-sm leading-relaxed text-[#dde3f0]"
                       style={{ borderRadius:msg.from==='customer'?'4px 16px 16px 16px':'16px 4px 16px 16px', background:msg.from==='customer'?'#1e2538':'rgba(245,166,35,.12)', border:`1px solid ${msg.from==='customer'?'#252d42':'rgba(245,166,35,.3)'}` }}>
                    {msg.text}
                    <div className="text-[10px] text-dim mt-1 text-right">{msg.from==='ai'&&<span className="text-accent mr-1">🤖</span>}{msg.time}</div>
                  </div>
                </div>
              ))}
              {mut.isLoading && <div className="flex justify-end"><div className="px-4 py-3 rounded-2xl rounded-tr-sm bg-accent/10 border border-accent/30 flex gap-1.5 items-center">{[0,1,2].map(d=><span key={d} className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" style={{animationDelay:`${d*.2}s`}}/>)}</div></div>}
              <div ref={bottomRef}/>
            </div>
            <div className="px-4 py-3 border-t border-[#1e2538] flex gap-2.5">
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
                placeholder="Type a customer message in Hinglish… (Enter to send)" className="input flex-1"/>
              <Button variant="primary" onClick={send} disabled={mut.isLoading||!input.trim()} className="px-5">{mut.isLoading?<Spinner size="sm"/>:'Send'}</Button>
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div className="w-44 flex flex-col gap-3 flex-shrink-0">
          <Card className="p-4"><div className="section-title mb-3">AI confidence</div>
            <div className="text-3xl font-bold font-mono" style={{ color: conf>=70?'#00c47d':'#ff4757' }}>{conf}%</div>
            <div className="h-1.5 rounded-full bg-[#1e2538] mt-2 mb-1.5 overflow-hidden"><div className="h-full rounded-full" style={{ width:`${conf}%`, background:conf>=70?'#00c47d':'#ff4757', transition:'width .4s' }}/></div>
            <div className="text-[11px] text-muted">Threshold: 70%</div>
          </Card>
          <Card className="p-4"><div className="section-title mb-2">Intent</div><div className="text-sm text-[#dde3f0] capitalize font-medium">{intent}</div></Card>
          <Card className="p-4"><div className="section-title mb-2">Language</div><div className="text-lg font-bold text-blue capitalize">{lang}</div></Card>
        </div>
      </div>
    </div>
  )
}

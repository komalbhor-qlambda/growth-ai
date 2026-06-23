import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from 'react-query'
import toast from 'react-hot-toast'
import { tenantAPI } from '@/api/client'
import { useAuthStore } from '@/context/authStore'
import { Button, Card, Input, Textarea, Toggle, Modal, PageHeader } from '@/components/ui'

const schema = z.object({
  business_name:   z.string().min(2).optional(),
  whatsapp_number: z.string().optional(),
  location:        z.string().optional(),
  website:         z.string().url().or(z.literal('')).optional(),
  ai_persona:      z.string().optional(),
  escalation_keywords: z.string().optional(),
})

function SettingRow({ label, sub, children }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#1e2538]">
      <div className="max-w-[55%]">
        <div className="text-sm text-[#dde3f0] font-medium">{label}</div>
        {sub && <div className="text-xs text-muted mt-0.5 leading-relaxed">{sub}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Sec({ title, children }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-3.5 border-b border-[#1e2538]"><span className="section-title">{title}</span></div>
      <div className="px-6">{children}</div>
    </Card>
  )
}

export default function Settings() {
  const { tenant, setTenant } = useAuthStore()
  const [resetOpen, setResetOpen] = useState(false)
  const [hinglish, setHinglish]   = useState(tenant?.hinglish_mode ?? true)
  const [voice, setVoice]         = useState(tenant?.voice_enabled ?? true)
  const [threshold, setThreshold] = useState(Math.round((tenant?.confidence_threshold ?? 0.7) * 100))

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      business_name:       tenant?.business_name || '',
      whatsapp_number:     tenant?.whatsapp_number || '',
      location:            tenant?.location || '',
      website:             tenant?.website || '',
      ai_persona:          tenant?.ai_persona || '',
      escalation_keywords: tenant?.escalation_keywords || '',
    },
  })

  useEffect(() => {
    if (tenant) {
      reset({ business_name:tenant.business_name, whatsapp_number:tenant.whatsapp_number||'', location:tenant.location||'', website:tenant.website||'', ai_persona:tenant.ai_persona, escalation_keywords:tenant.escalation_keywords })
      setHinglish(tenant.hinglish_mode); setVoice(tenant.voice_enabled); setThreshold(Math.round((tenant.confidence_threshold||.7)*100))
    }
  }, [tenant, reset])

  const mut = useMutation(tenantAPI.update, {
    onSuccess: r => { setTenant(r.data); toast.success('Settings saved!') },
    onError:   () => toast.error('Failed to save settings'),
  })

  const onSubmit = d => mut.mutate({ ...d, hinglish_mode:hinglish, voice_enabled:voice, confidence_threshold:threshold/100 })

  const SI = ({ k, placeholder }) => <input value={tenant?.[k]||''} className="input w-64" placeholder={placeholder} {...register(k)}/>

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="animate-fade-up space-y-5">
      <div className="flex justify-between items-end">
        <div><h1 className="page-title">Settings</h1><p className="page-sub">Configure your AI agent, WhatsApp connection, and business details</p></div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setResetOpen(true)}>Reset defaults</Button>
          <Button type="submit" variant="primary" loading={mut.isLoading || isSubmitting}>Save changes</Button>
        </div>
      </div>

      <Sec title="AI behaviour">
        <Toggle value={hinglish} onChange={setHinglish} label="Hinglish mode"      sub="Detect and respond in mixed Hindi-English"/>
        <Toggle value={voice}    onChange={setVoice}    label="Voice note support"  sub="Transcribe customer voice messages using Whisper STT"/>
        <SettingRow label="Confidence threshold" sub={`Chats below ${threshold}% are flagged for human review`}>
          <div className="flex items-center gap-3">
            <input type="range" min={40} max={95} value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-32"/>
            <span className="text-accent font-bold font-mono text-base w-12 text-right">{threshold}%</span>
          </div>
        </SettingRow>
        <SettingRow label="Escalation keywords" sub="Always trigger human handoff regardless of confidence">
          <input className="input w-64" placeholder="Complain, Owner, Manager, Refund" {...register('escalation_keywords')}/>
        </SettingRow>
      </Sec>

      <Sec title="AI persona">
        <div className="py-4">
          <Textarea label="Persona instructions" rows={4} placeholder="Describe how the AI should introduce itself, its tone, and any phrases it should always use…" {...register('ai_persona')}/>
        </div>
      </Sec>

      <Sec title="Business information">
        <SettingRow label="Business name"><input className="input w-64" placeholder="Jai's Unisex Salon"    {...register('business_name')}/></SettingRow>
        <SettingRow label="WhatsApp number" sub="The number your AI agent is connected to"><input className="input w-64" placeholder="+91 98765 43210" {...register('whatsapp_number')}/></SettingRow>
        <SettingRow label="Location"><input className="input w-64" placeholder="Shop 14, Civil Lines, Indore" {...register('location')}/></SettingRow>
        <SettingRow label="Website URL"><input className="input w-64" placeholder="https://jaisalon.in" {...register('website')}/></SettingRow>
      </Sec>

      <Sec title="Danger zone">
        <SettingRow label="Clear all leads" sub="Permanently delete all lead records."><Button type="button" variant="danger" size="sm" onClick={() => toast('Contact support to clear leads',{icon:'ℹ️'})}>Clear leads</Button></SettingRow>
        <SettingRow label="Reset knowledge base" sub="Remove all uploaded files and URLs."><Button type="button" variant="danger" size="sm" onClick={() => toast('Contact support to reset KB',{icon:'ℹ️'})}>Clear KB</Button></SettingRow>
        <SettingRow label="Delete account" sub="Permanently close your account and cancel subscription."><Button type="button" variant="danger" size="sm" onClick={() => toast('Contact support@qlambda.ai',{icon:'ℹ️'})}>Delete account</Button></SettingRow>
      </Sec>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset to defaults?" width={420}>
        <p className="text-sm text-muted mb-6 leading-relaxed">This will reset all AI behaviour settings to factory defaults. Your business info, leads, and knowledge base will not be affected.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { setHinglish(true); setVoice(true); setThreshold(70); setResetOpen(false); toast('Settings reset',{icon:'🔄'}) }}>Reset</Button>
        </div>
      </Modal>
    </form>
  )
}

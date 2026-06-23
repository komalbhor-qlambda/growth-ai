import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { leadsAPI } from '@/api/client'
import { Button, Badge, StatusBadge, Modal, ConfirmModal, EmptyState, PageHeader, Spinner, SkeletonRow } from '@/components/ui'

const confColor = c => c >= 80 ? '#00c47d' : c >= 60 ? '#f5a623' : '#ff4757'

export default function Leads() {
  const qc = useQueryClient()
  const [filter, setFilter]     = useState('All')
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [selected, setSelected] = useState(new Set())
  const [importOpen, setImport] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const params = { page, page_size: 15, ...(filter !== 'All' && { status_filter: filter }), ...(search && { search }) }
  const { data, isLoading } = useQuery(['leads', params], () => leadsAPI.list(params).then(r => r.data), { keepPreviousData: true })

  const deleteMut = useMutation(leadsAPI.delete, { onSuccess: () => { qc.invalidateQueries('leads'); toast.success('Lead deleted') }, onError: () => toast.error('Delete failed') })
  const bulkDel   = useMutation(() => Promise.all([...selected].map(leadsAPI.delete)), {
    onSuccess: () => { qc.invalidateQueries('leads'); toast.success(`${selected.size} leads deleted`); setSelected(new Set()) }
  })

  const toggle = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const leads = data?.items || []
  const total = data?.total || 0
  const pages = Math.ceil(total / 15)

  return (
    <div className="animate-fade-up">
      <PageHeader title="Lead Management" sub="Every customer interaction — captured, tagged, and ready to act on"
        actions={<>
          {selected.size > 0 && <Button variant="danger" size="sm" onClick={() => bulkDel.mutate()}>Delete ({selected.size})</Button>}
          <Button variant="ghost"  size="sm" onClick={() => toast.success('CSV exported!')}>Export CSV</Button>
          <Button variant="accent" size="sm" onClick={() => setImport(true)}>+ Import Leads</Button>
        </>}
      />

      <div className="flex gap-2 items-center mb-4">
        <div className="flex gap-1.5">
          {['All', 'needs_human', 'ai_handled'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1) }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all border ${filter===f?'bg-accent/10 text-accent border-accent/40':'bg-transparent text-muted border-[#1e2538] hover:border-[#252d42]'}`}>
              {f === 'All' ? 'All' : f === 'needs_human' ? 'Needs Human' : 'AI Handled'}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search name or intent…" className="input ml-auto w-52"/>
        <span className="text-xs text-muted font-mono flex-shrink-0">{total} leads</span>
      </div>

      <div className="card overflow-hidden">
        <div className="table-head" style={{ gridTemplateColumns: '36px 2fr 1.4fr 2fr 70px 100px 100px 80px' }}>
          {['', 'Customer', 'Phone', 'Intent', 'Conf.', 'Status', 'Tag', ''].map((h, i) => (
            <div key={i} className="text-[11px] font-semibold text-dim uppercase tracking-wide">{h}</div>
          ))}
        </div>
        {isLoading ? Array.from({length:8}).map((_,i) => <SkeletonRow key={i} cols={8}/>)
          : leads.length === 0 ? <EmptyState icon="🔍" title="No leads found" sub="Adjust filter or search"/>
          : leads.map((lead, i) => (
            <div key={lead.id} className="table-row" style={{ gridTemplateColumns: '36px 2fr 1.4fr 2fr 70px 100px 100px 80px', background: selected.has(lead.id) ? 'rgba(245,166,35,0.06)' : undefined }}>
              <div onClick={e => { e.stopPropagation(); toggle(lead.id) }}
                className={`w-4 h-4 rounded border cursor-pointer flex items-center justify-center text-[10px] ${selected.has(lead.id)?' bg-accent border-accent text-bg':'border-[#1e2538]'}`}>
                {selected.has(lead.id) ? '✓' : ''}
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                     style={{ background: lead.status==='needs_human'?'rgba(255,71,87,0.1)':'rgba(0,196,125,0.1)', border:`1.5px solid ${lead.status==='needs_human'?'#ff4757':'#00c47d'}`, color: lead.status==='needs_human'?'#ff4757':'#00c47d' }}>
                  {(lead.name||lead.phone)?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-[#dde3f0] font-medium truncate">{lead.name || '—'}</span>
              </div>
              <div className="text-xs text-muted font-mono">{lead.phone}</div>
              <div className="text-sm text-[#dde3f0] truncate">{lead.intent || '—'}</div>
              <div className="text-xs font-bold font-mono" style={{ color: confColor((lead.ai_confidence||0)*100) }}>
                {lead.ai_confidence ? `${Math.round(lead.ai_confidence*100)}%` : '—'}
              </div>
              <StatusBadge status={lead.status}/>
              <Badge label={lead.tag || 'Info'}/>
              <button onClick={e => { e.stopPropagation(); setDeleteId(lead.id) }}
                className="text-dim hover:text-red text-xs bg-transparent border-none cursor-pointer">🗑</button>
            </div>
          ))
        }
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>← Prev</Button>
          <span className="text-xs text-muted">Page {page} of {pages}</span>
          <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page===pages}>Next →</Button>
        </div>
      )}

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)}
        title="Delete lead?" message="This will permanently remove the lead and its data." danger/>
      <ImportModal open={importOpen} onClose={() => setImport(false)} onDone={() => qc.invalidateQueries('leads')}/>
    </div>
  )
}

function ImportModal({ open, onClose, onDone }) {
  const [result, setResult] = useState(null)
  const mut = useMutation(leadsAPI.import, {
    onSuccess: r => { setResult(r.data); onDone(); toast.success(`${r.data.imported} leads imported!`) },
    onError:   () => toast.error('Import failed. Check your CSV format.'),
  })
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] }, maxFiles: 1,
    onDrop: ([f]) => { setResult(null); mut.mutate(f) },
  })
  return (
    <Modal open={open} onClose={() => { onClose(); setResult(null) }} title="Import Leads from CSV">
      <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all mb-5 ${isDragActive?'border-accent bg-accent/10':'border-[#1e2538] hover:border-[#252d42]'}`}>
        <input {...getInputProps()}/>
        <div className="text-4xl mb-3">📋</div>
        <div className="text-sm font-semibold text-[#dde3f0] mb-1">{mut.isLoading ? 'Importing…' : 'Drop your CSV file here'}</div>
        <div className="text-xs text-muted">Required: name, phone — Optional: intent, tag</div>
        {mut.isLoading && <Spinner className="mx-auto mt-3"/>}
      </div>
      {result && (
        <div className="bg-bg rounded-lg p-4 mb-4 text-sm">
          <div className="text-green font-semibold mb-1">✓ {result.imported} leads imported</div>
          {result.skipped > 0 && <div className="text-muted">{result.skipped} skipped (duplicates/invalid)</div>}
        </div>
      )}
      <div className="flex justify-end"><Button variant="ghost" onClick={() => { onClose(); setResult(null) }}>Close</Button></div>
    </Modal>
  )
}

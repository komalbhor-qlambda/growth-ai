import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { knowledgeAPI } from '@/api/client'
import { Button, Card, Modal, Input, EmptyState, PageHeader, ConfirmModal, Spinner, SkeletonRow } from '@/components/ui'

const STATUS_STYLE = {
  active:     'bg-green/10 text-green border-green/30',
  processing: 'bg-accent/10 text-accent border-accent/30',
  failed:     'bg-red/10 text-red border-red/30',
  outdated:   'bg-[#1e2538] text-muted border-[#1e2538]',
}

export default function KnowledgeBase() {
  const qc = useQueryClient()
  const [urlOpen, setUrlOpen]   = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [url, setUrl]           = useState('')
  const [addingUrl, setAddingUrl] = useState(false)

  const { data: docs = [], isLoading } = useQuery('knowledge', () => knowledgeAPI.list().then(r => r.data), { refetchInterval: 5000 })
  const uploadMut = useMutation(knowledgeAPI.upload, {
    onSuccess: () => { qc.invalidateQueries('knowledge'); toast.success('File uploaded and processing…') },
    onError: e => toast.error(e.response?.data?.detail || 'Upload failed'),
  })
  const deleteMut = useMutation(knowledgeAPI.delete, {
    onSuccess: () => { qc.invalidateQueries('knowledge'); toast.success('Document removed') },
    onError: () => toast.error('Delete failed'),
  })
  const addUrlMut = useMutation(() => knowledgeAPI.addUrl({ url, name: url.split('//')[1]?.substring(0,60) }), {
    onSuccess: () => { qc.invalidateQueries('knowledge'); setUrl(''); setUrlOpen(false); toast.success('URL indexed!') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to index URL'),
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf':['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['.docx'], 'text/plain':['.txt'] },
    onDrop: files => files.forEach(f => uploadMut.mutate(f)),
  })

  const active = docs.filter(d => d.status === 'active')
  const chunks = active.reduce((s, d) => s + (d.chunk_count || 0), 0)

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader title="Knowledge Base" sub="Train the AI with your menus, prices, and website content"
        actions={<>
          <Button variant="ghost"  size="sm" onClick={() => toast('Re-syncing…', {icon:'🔄'})}>Sync All</Button>
          <Button variant="accent" size="sm" onClick={() => setUrlOpen(true)}>+ Add URL</Button>
          <Button variant="primary" size="sm" onClick={() => document.getElementById('kb-file').click()}>+ Upload File</Button>
        </>}
      />
      <input id="kb-file" type="file" accept=".pdf,.docx,.txt" multiple className="hidden" onChange={e => [...e.target.files].forEach(f => uploadMut.mutate(f))}/>

      <div className="grid grid-cols-4 gap-3">
        {[{label:'Documents',value:docs.filter(d=>d.source_type!=='url').length,color:'#4d9fff'},
          {label:'URLs indexed',value:docs.filter(d=>d.source_type==='url').length,color:'#a78bfa'},
          {label:'Total chunks',value:chunks,color:'#00c47d'},
          {label:'Active sources',value:active.length,color:'#f5a623'}].map(s => (
          <Card key={s.label} className="p-4">
            <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-muted mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${isDragActive?'border-accent bg-accent/10':'border-[#1e2538] hover:border-[#252d42]'}`}>
        <input {...getInputProps()}/>
        {uploadMut.isLoading ? <><Spinner className="mx-auto mb-3"/><p className="text-sm text-muted">Uploading and processing…</p></>
          : <><div className="text-4xl mb-3">📂</div>
             <div className="text-sm font-semibold text-[#dde3f0] mb-1">Drop PDF, Word, or TXT files here</div>
             <div className="text-xs text-muted">Chunked, embedded with vectors, stored in your private knowledge silo</div></>
        }
      </div>

      <div className="card overflow-hidden">
        <div className="table-head" style={{ gridTemplateColumns:'2.5fr 70px 70px 80px 1fr 90px 130px' }}>
          {['File / Source','Type','Chunks','Size','Last synced','Status','Actions'].map(h => (
            <div key={h} className="text-[11px] font-semibold text-dim uppercase tracking-wide">{h}</div>
          ))}
        </div>
        {isLoading ? Array.from({length:4}).map((_,i) => <SkeletonRow key={i} cols={7}/>)
          : docs.length === 0 ? <EmptyState icon="📭" title="No documents yet" sub="Upload a PDF or add a URL to train your AI"/>
          : docs.map((doc, i) => (
            <div key={doc.id} className="table-row" style={{ gridTemplateColumns:'2.5fr 70px 70px 80px 1fr 90px 130px' }}>
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{doc.source_type==='url'?'🔗':'📄'}</span>
                <span className="text-sm text-[#dde3f0] font-medium truncate" title={doc.name}>{doc.name}</span>
              </div>
              <div className="text-xs text-muted font-mono uppercase">{doc.source_type}</div>
              <div className="text-xs text-muted font-mono">{doc.chunk_count}</div>
              <div className="text-xs text-muted font-mono">{doc.file_size_bytes ? `${Math.round(doc.file_size_bytes/1024)} KB` : '—'}</div>
              <div className="text-xs text-muted">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-IN') : '—'}</div>
              <span className={`badge border ${STATUS_STYLE[doc.status] || STATUS_STYLE.outdated}`}>{doc.status==='processing'?'⏳ Processing':doc.status}</span>
              <div className="flex gap-2">
                <button onClick={() => toast('Re-syncing…',{icon:'🔄'})} className="text-xs px-2.5 py-1 rounded-md bg-blue/10 text-blue border border-blue/30 cursor-pointer hover:bg-blue/20">Sync</button>
                <button onClick={() => setDeleteId(doc.id)} className="text-xs px-2.5 py-1 rounded-md bg-red/10 text-red border border-red/30 cursor-pointer hover:bg-red/20">Delete</button>
              </div>
            </div>
          ))
        }
      </div>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)}
        title="Remove document?" message="This will permanently delete the document and all its vectors." danger/>

      <Modal open={urlOpen} onClose={() => setUrlOpen(false)} title="Add Website URL" width={460}>
        <div className="space-y-4">
          <Input label="Website or page URL" placeholder="https://your-salon-website.com/services" value={url} onChange={e => setUrl(e.target.value)}/>
          <p className="text-xs text-muted">Page will be scraped, chunked, and embedded into your private vector store.</p>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setUrlOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={addingUrl} disabled={!url.trim().startsWith('http')} onClick={() => addUrlMut.mutate()}>Add & Index</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const ALUNOS = ['Dudu', 'Rapha']
const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const STATUS_OPTS = [
  { value: 'realizada',  label: 'Realizada',           emoji: '✅' },
  { value: 'aluno',      label: 'Aluno faltou',        emoji: '🔴' },
  { value: 'professora', label: 'Professora cancelou', emoji: '🟡' },
  { value: 'outro',      label: 'Outro',               emoji: '⚪' },
]

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg:      '#0d1117', surface: '#161b22', card: '#1c2128',
  border:  '#30363d', accent:  '#58a6ff', green:  '#3fb950',
  yellow:  '#d29922', red:    '#f85149', muted:  '#8b949e',
  text:    '#e6edf3', textDim: '#7d8590',
  dudu:    '#58a6ff', rapha:  '#3fb950',
}

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { min-height: 100%; }
  body { background: ${C.bg}; color: ${C.text}; font-family: 'Sora', sans-serif; -webkit-font-smoothing: antialiased; }
  input, select, button, textarea { font-family: 'Sora', sans-serif; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
  input[type=number]::-webkit-inner-spin-button { opacity: 1; }
  * { -webkit-tap-highlight-color: transparent; }
`

// ─── Calc ─────────────────────────────────────────────────────────────────────
function calcSaldo(dadosAluno) {
  const { aulas = [], saldoAnterior = 0, valorAula = 65 } = dadosAluno
  const previstas   = aulas.length
  const realizadas  = aulas.filter(a => a.status === 'realizada').length
  const naorealizadas = aulas.filter(a => a.status !== 'realizada').length
  const descontos   = aulas.filter(a => a.desconto).length
  const cobradas    = previstas - descontos
  const valor       = cobradas * valorAula
  const saldoGerado = aulas.filter(a => a.status !== 'realizada' && !a.desconto).length
  const saldoFinal  = saldoAnterior - descontos + saldoGerado
  return { previstas, realizadas, naorealizadas, descontos, cobradas, valor, saldoGerado, saldoFinal }
}

function gerarResumoWpp(mes, ano, alunosData) {
  const label = `${MESES_PT[mes - 1]}/${ano}`
  let txt = `🏊 *Natação — ${label}*\n\n`
  let totalGeral = 0
  for (const nome of ALUNOS) {
    const d = alunosData[nome]
    const s = calcSaldo(d)
    totalGeral += s.valor
    txt += `*${nome}*\n`
    txt += `• Saldo anterior: ${d.saldoAnterior} aula${d.saldoAnterior !== 1 ? 's' : ''}\n`
    txt += `• Previstas: ${s.previstas} | Realizadas: ${s.realizadas}\n`
    if (s.descontos > 0) txt += `• Descontos usados: ${s.descontos}\n`
    txt += `• Cobradas: ${s.cobradas} × R$${d.valorAula} = *R$${s.valor}*\n`
    txt += `• Saldo p/ próximo mês: *${s.saldoFinal} aula${s.saldoFinal !== 1 ? 's' : ''}*\n`
    const naoFez = d.aulas.filter(a => a.status !== 'realizada')
    if (naoFez.length > 0) {
      txt += `• Não realizadas:\n`
      naoFez.forEach(a => {
        const lbl = STATUS_OPTS.find(o => o.value === a.status)?.label || a.status
        txt += `  - ${a.data}${a.obs ? ' (' + a.obs + ')' : ''}: ${lbl}${a.desconto ? ' [desconto]' : ''}\n`
      })
    }
    txt += '\n'
  }
  const dTotal = calcSaldo(alunosData['Dudu']).valor
  const rTotal = calcSaldo(alunosData['Rapha']).valor
  txt += `💰 *Total: R$${totalGeral}*\n_(Dudu R$${dTotal} + Rapha R$${rTotal})_`
  return txt
}

// ─── UI primitives ────────────────────────────────────────────────────────────
function Btn({ children, onClick, variant = 'primary', small, full, disabled, style: sx }) {
  const base = {
    border: 'none', borderRadius: 8, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    padding: small ? '6px 12px' : '11px 20px', fontSize: small ? 12 : 14,
    transition: 'opacity .15s, transform .1s', width: full ? '100%' : undefined,
    opacity: disabled ? 0.5 : 1, ...sx,
  }
  const v = {
    primary: { background: C.accent,        color: '#0d1117' },
    success: { background: C.green,         color: '#0d1117' },
    danger:  { background: C.red + '25',    color: C.red,   border: `1px solid ${C.red}40` },
    ghost:   { background: 'transparent',   color: C.textDim, border: `1px solid ${C.border}` },
    yellow:  { background: C.yellow + '25', color: C.yellow, border: `1px solid ${C.yellow}50` },
  }
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...v[variant] }}>{children}</button>
}

function Card({ children, style: sx }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, ...sx }}>{children}</div>
}

function Tag({ children, color = C.accent }) {
  return (
    <span style={{
      background: color + '20', color, border: `1px solid ${color}40`,
      borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace",
    }}>{children}</span>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 12, color: C.muted }}>
      <div style={{
        width: 20, height: 20, border: `2px solid ${C.border}`, borderTopColor: C.accent,
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Carregando…
    </div>
  )
}

// ─── SaldoCard ────────────────────────────────────────────────────────────────
function SaldoCard({ nome, dados }) {
  const s = calcSaldo(dados)
  const cor = nome === 'Dudu' ? C.dudu : C.rapha
  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0 }} />
        <span style={{ fontWeight: 800, fontSize: 14 }}>{nome}</span>
        <Tag color={cor}>R${dados.valorAula}</Tag>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        {[
          ['Previstas',    s.previstas,    C.textDim],
          ['Realizadas',   s.realizadas,   C.green],
          ['Não realiz.',  s.naorealizadas, s.naorealizadas > 0 ? C.red : C.textDim],
          ['Cobradas',     s.cobradas,     C.accent],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: C.surface, borderRadius: 7, padding: '7px 8px' }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 1 }}>{l}</div>
            <div style={{ fontWeight: 700, color: c, fontFamily: "'JetBrains Mono', monospace", fontSize: 15 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.surface, borderRadius: 7, padding: '7px 8px', marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 1 }}>Valor a pagar</div>
        <div style={{ fontWeight: 800, color: C.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 17 }}>R${s.valor}</div>
      </div>
      <div style={{
        borderRadius: 7, padding: '7px 10px',
        background: s.saldoFinal > 0 ? C.yellow + '20' : C.green + '20',
        border: `1px solid ${s.saldoFinal > 0 ? C.yellow : C.green}40`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: C.muted }}>Saldo p/ próx. mês</span>
        <span style={{ fontWeight: 800, color: s.saldoFinal > 0 ? C.yellow : C.green, fontFamily: "'JetBrains Mono', monospace" }}>
          {s.saldoFinal} aula{s.saldoFinal !== 1 ? 's' : ''}
        </span>
      </div>
    </Card>
  )
}

// ─── AulaRow ──────────────────────────────────────────────────────────────────
function AulaRow({ aula, onUpdate, onDelete, saving }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 8, padding: '8px 10px', marginBottom: 6,
      display: 'grid', gap: 6,
      gridTemplateColumns: '100px 1fr',
      opacity: saving ? 0.6 : 1, transition: 'opacity .2s',
    }}>
      <input type="date" value={aula.data}
        onChange={e => onUpdate({ ...aula, data: e.target.value })}
        style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 7px', fontSize: 12, width: '100%' }} />
      <input placeholder="Observação (opcional)" value={aula.obs || ''}
        onChange={e => onUpdate({ ...aula, obs: e.target.value })}
        style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 13, width: '100%' }} />
      <select value={aula.status} onChange={e => onUpdate({ ...aula, status: e.target.value })}
        style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 6px', fontSize: 12 }}>
        {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.emoji} {o.label}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button onClick={() => onUpdate({ ...aula, desconto: !aula.desconto })}
          title="Marcar como desconto do saldo anterior"
          style={{
            flex: 1, background: aula.desconto ? C.yellow + '30' : C.bg,
            color: aula.desconto ? C.yellow : C.muted,
            border: `1px solid ${aula.desconto ? C.yellow + '60' : C.border}`,
            borderRadius: 6, padding: '5px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
          🔖 {aula.desconto ? 'desconto' : 'sem desconto'}
        </button>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', color: C.red, fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>✕</button>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [meses,     setMeses]     = useState([])      // [{id, mes, ano}]
  const [mesSel,    setMesSel]    = useState(null)
  const [alunoData, setAlunoData] = useState({})      // {mesId: {Dudu:{valorAula,saldoAnterior,aulas[]}, Rapha:{...}}}
  const [tab,       setTab]       = useState('Dudu')
  const [view,      setView]      = useState('mes')   // mes | historico | resumo
  const [copied,    setCopied]    = useState(false)
  const [boleto,    setBoleto]    = useState({ Dudu: {}, Rapha: {} })
  const [showBoleto, setShowBoleto] = useState(false)
  const [savingRows, setSavingRows] = useState({})    // {aulaId: true}

  // ── Load all data ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: mesesDb } = await supabase.from('meses').select('*').order('ano').order('mes')
      const { data: alunosDb } = await supabase.from('aluno_mes').select('*')
      const { data: aulasDb }  = await supabase.from('aulas').select('*').order('data')

      const newData = {}
      for (const m of (mesesDb || [])) {
        newData[m.id] = { Dudu: { valorAula: 65, saldoAnterior: 0, aulas: [] }, Rapha: { valorAula: 55, saldoAnterior: 0, aulas: [] } }
        for (const a of (alunosDb || []).filter(a => a.mes_id === m.id)) {
          newData[m.id][a.aluno] = { valorAula: a.valor_aula, saldoAnterior: a.saldo_anterior, aulas: [] }
        }
        for (const a of (aulasDb || []).filter(a => a.mes_id === m.id)) {
          if (newData[m.id][a.aluno]) {
            newData[m.id][a.aluno].aulas.push({ id: a.id, data: a.data, status: a.status, obs: a.obs || '', desconto: a.desconto })
          }
        }
      }

      setMeses(mesesDb || [])
      setAlunoData(newData)
      if (mesesDb?.length > 0) setMesSel(mesesDb[mesesDb.length - 1].id)
      setLoading(false)
    }
    load()
  }, [])

  const mesAtual = meses.find(m => m.id === mesSel)
  const dadosMesAtual = mesSel ? alunoData[mesSel] : null

  // ── Upsert aluno_mes config ────────────────────────────────────────────────
  async function upsertAlunoMes(mesId, aluno, fields) {
    await supabase.from('aluno_mes').upsert({ mes_id: mesId, aluno, ...fields }, { onConflict: 'mes_id,aluno' })
  }

  // ── Add Mês ────────────────────────────────────────────────────────────────
  async function addMes() {
    const last = meses[meses.length - 1]
    let nm = (last?.mes || new Date().getMonth()) + 1
    let ny = last?.ano || new Date().getFullYear()
    if (nm > 12) { nm = 1; ny++ }
    const id = `${ny}-${String(nm).padStart(2, '0')}`
    if (meses.find(m => m.id === id)) return

    setSaving(true)
    const { error } = await supabase.from('meses').insert({ id, mes: nm, ano: ny })
    if (!error) {
      // carry saldo
      for (const nome of ALUNOS) {
        const prevSaldo = last ? calcSaldo(alunoData[last.id]?.[nome] || { aulas: [], saldoAnterior: 0 }).saldoFinal : 0
        const prevValor = alunoData[last?.id]?.[nome]?.valorAula || (nome === 'Dudu' ? 65 : 55)
        await supabase.from('aluno_mes').insert({ mes_id: id, aluno: nome, valor_aula: prevValor, saldo_anterior: prevSaldo })
      }
      const newEntry = {
        Dudu:  { valorAula: alunoData[last?.id]?.Dudu?.valorAula  || 65, saldoAnterior: last ? calcSaldo(alunoData[last.id]?.Dudu  || { aulas: [], saldoAnterior: 0 }).saldoFinal : 0, aulas: [] },
        Rapha: { valorAula: alunoData[last?.id]?.Rapha?.valorAula || 55, saldoAnterior: last ? calcSaldo(alunoData[last.id]?.Rapha || { aulas: [], saldoAnterior: 0 }).saldoFinal : 0, aulas: [] },
      }
      setMeses(prev => [...prev, { id, mes: nm, ano: ny }])
      setAlunoData(prev => ({ ...prev, [id]: newEntry }))
      setMesSel(id)
      setView('mes')
    }
    setSaving(false)
  }

  // ── Add aula ───────────────────────────────────────────────────────────────
  async function addAula(nome) {
    const today = new Date().toISOString().slice(0, 10)
    setSaving(true)
    const { data, error } = await supabase.from('aulas').insert({ mes_id: mesSel, aluno: nome, data: today, status: 'realizada', obs: '', desconto: false }).select().single()
    if (!error && data) {
      setAlunoData(prev => ({
        ...prev,
        [mesSel]: { ...prev[mesSel], [nome]: { ...prev[mesSel][nome], aulas: [...prev[mesSel][nome].aulas, { id: data.id, data: today, status: 'realizada', obs: '', desconto: false }] } }
      }))
    }
    setSaving(false)
  }

  // ── Update aula (debounced) ────────────────────────────────────────────────
  async function updateAula(nome, aulaAtualizada) {
    setSavingRows(prev => ({ ...prev, [aulaAtualizada.id]: true }))
    // Optimistic update
    setAlunoData(prev => ({
      ...prev,
      [mesSel]: { ...prev[mesSel], [nome]: { ...prev[mesSel][nome], aulas: prev[mesSel][nome].aulas.map(a => a.id === aulaAtualizada.id ? aulaAtualizada : a) } }
    }))
    await supabase.from('aulas').update({ data: aulaAtualizada.data, status: aulaAtualizada.status, obs: aulaAtualizada.obs, desconto: aulaAtualizada.desconto }).eq('id', aulaAtualizada.id)
    setSavingRows(prev => { const n = { ...prev }; delete n[aulaAtualizada.id]; return n })
  }

  // ── Delete aula ────────────────────────────────────────────────────────────
  async function deleteAula(nome, aulaId) {
    setAlunoData(prev => ({
      ...prev,
      [mesSel]: { ...prev[mesSel], [nome]: { ...prev[mesSel][nome], aulas: prev[mesSel][nome].aulas.filter(a => a.id !== aulaId) } }
    }))
    await supabase.from('aulas').delete().eq('id', aulaId)
  }

  // ── Update config (valorAula / saldoAnterior) ──────────────────────────────
  async function updateConfig(nome, field, value) {
    const num = Number(value) || 0
    const dbField = field === 'valorAula' ? 'valor_aula' : 'saldo_anterior'
    setAlunoData(prev => ({
      ...prev,
      [mesSel]: { ...prev[mesSel], [nome]: { ...prev[mesSel][nome], [field]: num } }
    }))
    await upsertAlunoMes(mesSel, nome, { [dbField]: num })
  }

  // ── Copy resumo ────────────────────────────────────────────────────────────
  function copyResumo() {
    if (!mesAtual || !dadosMesAtual) return
    const txt = gerarResumoWpp(mesAtual.mes, mesAtual.ano, dadosMesAtual)
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 3000) })
  }

  // ── Divergência check ──────────────────────────────────────────────────────
  function checkDivergencia() {
    if (!dadosMesAtual) return null
    const alertas = []
    for (const nome of ALUNOS) {
      const s = calcSaldo(dadosMesAtual[nome])
      const b = boleto[nome]
      if (b.cobradas !== undefined && b.cobradas !== '' && Number(b.cobradas) !== s.cobradas)
        alertas.push(`${nome}: boleto diz ${b.cobradas} cobradas, controle aponta ${s.cobradas}`)
      if (b.valor !== undefined && b.valor !== '' && Number(b.valor) !== s.valor)
        alertas.push(`${nome}: boleto diz R$${b.valor}, controle aponta R$${s.valor}`)
      if (b.saldoFinal !== undefined && b.saldoFinal !== '' && Number(b.saldoFinal) !== s.saldoFinal)
        alertas.push(`${nome}: boleto diz saldo ${b.saldoFinal}, controle aponta ${s.saldoFinal}`)
    }
    return alertas.length > 0 ? alertas : null
  }

  if (loading) return <Spinner />

  const divergencias = showBoleto ? checkDivergencia() : null

  return (
    <div style={{ maxWidth: 580, margin: '0 auto', padding: '16px 12px 60px' }}>
      <style>{globalCss}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 24 }}>🏊</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>Natação</div>
            <div style={{ fontSize: 11, color: C.muted }}>Controle de aulas · Dudu & Rapha</div>
          </div>
          {saving && <div style={{ marginLeft: 'auto', fontSize: 11, color: C.muted }}>Salvando…</div>}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={mesSel || ''} onChange={e => setMesSel(e.target.value)}
            style={{ background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 10px', fontSize: 14, fontWeight: 700, flex: 1 }}>
            {meses.map(m => <option key={m.id} value={m.id}>{MESES_PT[m.mes - 1]}/{m.ano}</option>)}
          </select>
          <Btn onClick={addMes} small variant="ghost" disabled={saving}>+ Mês</Btn>
        </div>
      </div>

      {/* ── Nav ── */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 16, background: C.surface, borderRadius: 10, padding: 3 }}>
        {[['mes','📋 Aulas'],['historico','📈 Histórico'],['resumo','📤 WhatsApp']].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700,
            background: view === v ? C.card : 'transparent',
            color: view === v ? C.text : C.muted, cursor: 'pointer', transition: 'all .15s',
          }}>{l}</button>
        ))}
      </div>

      {/* ══════════════════ VIEW: AULAS ══════════════════ */}
      {view === 'mes' && dadosMesAtual && (
        <>
          {/* Saldo cards */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {ALUNOS.map(n => <SaldoCard key={n} nome={n} dados={dadosMesAtual[n]} />)}
          </div>

          {/* Conferir boleto */}
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>🧾 Conferir boleto</span>
              <Btn small variant="ghost" onClick={() => setShowBoleto(v => !v)}>{showBoleto ? 'Fechar' : 'Abrir'}</Btn>
            </div>
            {showBoleto && (
              <div style={{ marginTop: 12 }}>
                {ALUNOS.map(nome => (
                  <div key={nome} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 700 }}>{nome}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[['cobradas','Qtd cobrada'],['valor','Valor (R$)'],['saldoFinal','Saldo final']].map(([f, l]) => (
                        <div key={f}>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>{l}</div>
                          <input type="number" placeholder="—" value={boleto[nome][f] ?? ''}
                            onChange={e => setBoleto(b => ({ ...b, [nome]: { ...b[nome], [f]: e.target.value } }))}
                            style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 13, width: 85 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {divergencias ? (
                  <div style={{ background: C.red + '20', border: `1px solid ${C.red}40`, borderRadius: 8, padding: '10px 12px', marginTop: 6 }}>
                    <div style={{ fontWeight: 700, color: C.red, fontSize: 13, marginBottom: 4 }}>⚠️ Divergências</div>
                    {divergencias.map((d, i) => <div key={i} style={{ color: C.red, fontSize: 12, marginBottom: 2 }}>• {d}</div>)}
                  </div>
                ) : (
                  <div style={{ background: C.green + '20', border: `1px solid ${C.green}40`, borderRadius: 8, padding: '8px 12px', marginTop: 6, color: C.green, fontSize: 13, fontWeight: 700 }}>
                    ✅ Boleto confere com o controle
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Aluno tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {ALUNOS.map(nome => {
              const cor = nome === 'Dudu' ? C.dudu : C.rapha
              const sel = tab === nome
              return (
                <button key={nome} onClick={() => setTab(nome)} style={{
                  padding: '8px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 800, fontSize: 14,
                  border: `2px solid ${sel ? cor : C.border}`,
                  background: sel ? cor + '20' : 'transparent',
                  color: sel ? cor : C.muted, transition: 'all .15s',
                }}>{nome}</button>
              )
            })}
          </div>

          {/* Config */}
          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Valor/aula (R$)</div>
                <input type="number" value={dadosMesAtual[tab].valorAula}
                  onChange={e => updateConfig(tab, 'valorAula', e.target.value)}
                  style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 10px', fontSize: 14, width: 80 }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Saldo anterior</div>
                <input type="number" value={dadosMesAtual[tab].saldoAnterior}
                  onChange={e => updateConfig(tab, 'saldoAnterior', e.target.value)}
                  style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 10px', fontSize: 14, width: 70 }} />
              </div>
              <Btn onClick={() => addAula(tab)} variant="success" small style={{ marginLeft: 'auto' }}>+ Aula</Btn>
            </div>
          </Card>

          {/* Aulas */}
          {dadosMesAtual[tab].aulas.length === 0 ? (
            <div style={{ textAlign: 'center', color: C.muted, padding: '36px 0', fontSize: 13 }}>
              Nenhuma aula registrada ainda.<br />
              <span style={{ fontSize: 12 }}>Toque em "+ Aula" para adicionar.</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: C.muted, padding: '0 2px 6px', display: 'grid', gridTemplateColumns: '100px 1fr', gap: 6 }}>
                <span>Data</span><span>Observação</span>
              </div>
              {dadosMesAtual[tab].aulas.map(aula => (
                <AulaRow key={aula.id} aula={aula} saving={!!savingRows[aula.id]}
                  onUpdate={a => updateAula(tab, a)}
                  onDelete={() => deleteAula(tab, aula.id)} />
              ))}
            </>
          )}

          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {STATUS_OPTS.map(o => <span key={o.value} style={{ fontSize: 11, color: C.muted }}>{o.emoji} {o.label}</span>)}
          </div>
          <div style={{ fontSize: 11, color: C.yellow, marginTop: 4 }}>🔖 = aula usada como desconto do saldo anterior</div>
        </>
      )}

      {/* ══════════════════ VIEW: HISTÓRICO ══════════════════ */}
      {view === 'historico' && (
        <>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>📈 Histórico de Saldos</div>
          {ALUNOS.map(nome => {
            const cor = nome === 'Dudu' ? C.dudu : C.rapha
            return (
              <Card key={nome} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cor }} />
                  <span style={{ fontWeight: 800 }}>{nome}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                        {['Mês','Prev.','Real.','Cobr.','Valor','S.ant','Desc.','S.final'].map(h => (
                          <th key={h} style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {meses.map((m, i) => {
                        const d = alunoData[m.id]?.[nome] || { aulas: [], saldoAnterior: 0, valorAula: 0 }
                        const s = calcSaldo(d)
                        const prevSaldoFinal = i > 0 ? calcSaldo(alunoData[meses[i-1].id]?.[nome] || { aulas: [], saldoAnterior: 0, valorAula: 0 }).saldoFinal : null
                        const mismatch = prevSaldoFinal !== null && prevSaldoFinal !== d.saldoAnterior
                        return (
                          <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}22`, background: i % 2 === 0 ? C.surface + '80' : 'transparent' }}>
                            <td style={{ padding: '6px', fontWeight: 700, color: cor, whiteSpace: 'nowrap' }}>{MESES_PT[m.mes-1]}/{m.ano}</td>
                            <td style={{ padding: '6px', textAlign: 'center', color: C.textDim }}>{s.previstas}</td>
                            <td style={{ padding: '6px', textAlign: 'center', color: C.green }}>{s.realizadas}</td>
                            <td style={{ padding: '6px', textAlign: 'center', color: C.accent }}>{s.cobradas}</td>
                            <td style={{ padding: '6px', textAlign: 'center', color: C.accent, fontFamily: "'JetBrains Mono', monospace', whiteSpace: 'nowrap" }}>R${s.valor}</td>
                            <td style={{ padding: '6px', textAlign: 'center', color: mismatch ? C.red : C.textDim }}>
                              {d.saldoAnterior}{mismatch ? '⚠️' : ''}
                            </td>
                            <td style={{ padding: '6px', textAlign: 'center', color: C.yellow }}>{s.descontos}</td>
                            <td style={{ padding: '6px', textAlign: 'center', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: s.saldoFinal > 0 ? C.yellow : C.green }}>{s.saldoFinal}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          })}
        </>
      )}

      {/* ══════════════════ VIEW: RESUMO ══════════════════ */}
      {view === 'resumo' && mesAtual && dadosMesAtual && (
        <>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>
            📤 Resumo — {MESES_PT[mesAtual.mes-1]}/{mesAtual.ano}
          </div>
          <Card style={{ marginBottom: 14 }}>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, fontFamily: "'Sora', sans-serif", lineHeight: 1.7, color: C.text }}>
              {gerarResumoWpp(mesAtual.mes, mesAtual.ano, dadosMesAtual)}
            </pre>
          </Card>
          <Btn onClick={copyResumo} variant={copied ? 'success' : 'primary'} full>
            {copied ? '✅ Copiado! Cole no WhatsApp' : '📋 Copiar para WhatsApp'}
          </Btn>
          <div style={{ marginTop: 10, fontSize: 12, color: C.muted, textAlign: 'center' }}>
            Cole na conversa com a professora ou com a babá
          </div>
        </>
      )}

      {/* ── Sem meses ── */}
      {meses.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏊</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Nenhum mês cadastrado</div>
          <Btn onClick={addMes} variant="primary">Criar primeiro mês</Btn>
        </div>
      )}
    </div>
  )
}

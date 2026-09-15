import { useState, useMemo } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import MeasurementsTable from './MeasurementsTable'
import TelemetrySummary from './TelemetrySummary'

export default function MeasurementsSidebar({
  measurements,
  onHighlightNode,
  onDeleteNode,
  onAddMeasurement,
}) {
  const [filter, setFilter] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [inputU, setInputU] = useState('')
  const [inputIo, setInputIo] = useState('')
  const { isDark } = useTheme()

  const filtered = useMemo(() => {
    const term = filter.toLowerCase().trim()
    if (!term) return measurements
    return measurements.filter(
      (item) =>
        item.id.toLowerCase().includes(term) ||
        item.u.toString().includes(term) ||
        item.k.toString().includes(term)
    )
  }, [measurements, filter])

  const avgVoltage = useMemo(() => {
    if (measurements.length === 0) return '0 V'
    const sum = measurements.reduce((acc, m) => acc + parseFloat(m.u || 0), 0)
    const val = sum / measurements.length
    return (val >= 10 ? val.toFixed(1) : val.toFixed(2)) + ' V'
  }, [measurements])

  const peakCurrent = useMemo(() => {
    if (measurements.length === 0) return '0 mA'
    const max = Math.max(...measurements.map((m) => parseFloat(m.k || 0)))
    return (max >= 10 ? max.toFixed(1) : max.toFixed(2)) + ' mA'
  }, [measurements])

  const handleManualAdd = (e) => {
    e.preventDefault()
    const u = parseFloat(inputU.replace(',', '.'))
    const io = parseFloat(inputIo.replace(',', '.'))
    if (!isNaN(u) && !isNaN(io) && u > 0 && io > 0) {
      if (onAddMeasurement) {
        onAddMeasurement(u, io)
      }
      setInputU('')
      setInputIo('')
      setShowAddForm(false)
    }
  }

  return (
    <aside className={`w-full lg:w-[32%] xl:w-[28%] flex flex-col h-full z-10 overflow-hidden border-t lg:border-t-0 ${isDark ? 'bg-[#0c121e]' : 'bg-white'}`} data-purpose="measurements-sidebar">
      {/* Sidebar Header & Search Filter */}
      <div className={`p-3 border-b shrink-0 ${isDark ? 'bg-[#0e1626] border-[#1e2a3f]' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
              <line x1="3" x2="21" y1="9" y2="9" />
              <line x1="9" x2="9" y1="21" y2="21" />
            </svg>
            <h2 className={`text-sm font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Tabela de Medições
            </h2>
          </div>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded border font-semibold ${isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
            {measurements.length} Pontos
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              className={`w-full border text-xs rounded px-2.5 py-1.5 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDark ? 'bg-[#131d2e] border-[#23334d] text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
              placeholder="Filtrar pontos..."
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            {filter.length > 0 && (
              <button
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                onClick={() => setFilter('')}
              >
                ×
              </button>
            )}
          </div>
          <button
            className={`p-1.5 rounded transition flex items-center justify-center ${showAddForm ? 'bg-slate-700 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
            title="Adicionar ponto manualmente por valor"
            onClick={() => setShowAddForm((prev) => !prev)}
          >
            <svg className={`w-4 h-4 transition-transform ${showAddForm ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
          </button>
        </div>

        {/* Manual point entry form */}
        {showAddForm && (
          <form onSubmit={handleManualAdd} className={`mt-2.5 p-2.5 rounded-lg border flex flex-col gap-2 ${isDark ? 'bg-[#131d2e] border-[#23334d]' : 'bg-white border-slate-300 shadow-sm'}`}>
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Novo Ponto Manual:</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>U (V):</label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  placeholder="Ex: 120"
                  value={inputU}
                  onChange={(e) => setInputU(e.target.value)}
                  className={`w-full px-2 py-1 text-xs rounded border font-mono ${isDark ? 'bg-[#0c121e] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  autoFocus
                />
              </div>
              <div>
                <label className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Io (mA):</label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  placeholder="Ex: 15.5"
                  value={inputIo}
                  onChange={(e) => setInputIo(e.target.value)}
                  className={`w-full px-2 py-1 text-xs rounded border font-mono ${isDark ? 'bg-[#0c121e] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className={`px-2 py-1 text-[11px] rounded border ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-2.5 py-1 text-[11px] font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
              >
                Adicionar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <MeasurementsTable
          data={filtered}
          onHighlightNode={onHighlightNode}
          onDeleteNode={onDeleteNode}
        />
      </div>

      <TelemetrySummary
        avgVoltage={avgVoltage}
        peakCurrent={peakCurrent}
        activeNodes={`${measurements.length} / ${measurements.length}`}
        frequency="60.00 Hz"
        imbalance="0.0%"
      />
    </aside>
  )
}

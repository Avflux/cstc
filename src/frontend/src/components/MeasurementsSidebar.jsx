import { useState, useMemo } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import MeasurementsTable from './MeasurementsTable'
import TelemetrySummary from './TelemetrySummary'

export default function MeasurementsSidebar({ measurements, onHighlightNode }) {
  const [filter, setFilter] = useState('')
  const { isDark } = useTheme()

  const filtered = useMemo(() => {
    const term = filter.toLowerCase().trim()
    if (!term) return measurements
    return measurements.filter(
      (item) => item.id.toLowerCase().includes(term) || item.u.includes(term) || item.k.includes(term)
    )
  }, [measurements, filter])

  const avgVoltage = useMemo(() => {
    if (measurements.length === 0) return '0 V'
    const sum = measurements.reduce((acc, m) => acc + parseFloat(m.u), 0)
    return (sum / measurements.length).toFixed(1) + ' V'
  }, [measurements])

  const peakCurrent = useMemo(() => {
    if (measurements.length === 0) return '0 mA'
    const max = Math.max(...measurements.map((m) => parseFloat(m.k)))
    return max.toFixed(1) + ' mA'
  }, [measurements])

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
            {filtered.length} Pontos
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
            className="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition flex items-center justify-center"
            title="Adicionar nova medição"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table with fixed 12-row height */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <MeasurementsTable
          data={filtered}
          onHighlightNode={onHighlightNode}
        />
      </div>

      <TelemetrySummary
        avgVoltage={avgVoltage}
        peakCurrent={peakCurrent}
        activeNodes={`${measurements.length} / ${measurements.length}`}
        frequency="60.02 Hz"
        imbalance="0.3%"
      />
    </aside>
  )
}

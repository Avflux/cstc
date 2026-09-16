import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'

// ─── CalibrationPanel (antes CalibrationDialog, agora fora do canvas) ─────────
export default function CalibrationPanel({ calibPoints, onConfirm, onCancel }) {
  const { isDark } = useTheme()
  const pointCount = calibPoints.length
  const labels = ['O (Origem)', 'X (Eixo Io)', 'Y (Eixo U)']
  const colors = ['text-red-500', 'text-emerald-500', 'text-blue-500']
  const descriptions = [
    'Ponto de origem: canto inferior-esquerdo do gráfico na imagem',
    'Ponto no eixo X: mesmo nível vertical de O, num valor conhecido de Io(mA)',
    'Ponto no eixo Y: mesma coluna horizontal de O, num valor conhecido de U(V)',
  ]

  const [kO, setKO] = useState('1')
  const [uO, setUO] = useState('1')
  const [kX, setKX] = useState('10000')
  const [uY, setUY] = useState('10000')

  const inputClass = `w-full px-2 py-1.5 rounded border text-xs font-mono ${
    isDark
      ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-blue-500 focus:outline-none'
      : 'bg-white border-slate-300 text-slate-800 focus:border-blue-500 focus:outline-none'
  }`
  const labelClass = `text-[10px] font-medium mb-0.5 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`

  const canConfirm = pointCount === 3

  const handleConfirm = () => {
    onConfirm({
      kO: parseFloat(kO) || 1,
      uO: parseFloat(uO) || 1,
      kX: parseFloat(kX) || 10000,
      uY: parseFloat(uY) || 10000,
    })
  }

  return (
    <div className={`shrink-0 border-b shadow-lg ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}>
      {/* Header */}
      <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'}`}>
        <svg className="w-4 h-4 text-purple-500 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span className="text-xs font-bold">Calibração de Imagem</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                i < pointCount
                  ? i === 0 ? 'bg-red-500 border-red-500 text-white'
                    : i === 1 ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-blue-500 border-blue-500 text-white'
                  : i === pointCount
                    ? isDark ? 'border-slate-400 text-slate-400 animate-pulse' : 'border-slate-500 text-slate-500 animate-pulse'
                    : isDark ? 'border-slate-600 text-slate-600' : 'border-slate-300 text-slate-400'
              }`}>
                {i < pointCount ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`w-6 h-px ${i < pointCount - 1 ? 'bg-slate-400' : isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />}
            </div>
          ))}
          <span className="ml-1 text-[10px] text-slate-500">
            {pointCount < 3 ? `Clique ponto ${labels[pointCount]} no gráfico` : 'Informe os valores reais'}
          </span>
        </div>

        {/* Current step description */}
        {pointCount < 3 && (
          <div className={`text-[11px] px-2.5 py-2 rounded-lg ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
            <span className={`font-bold ${colors[pointCount]}`}>{labels[pointCount]}:</span>{' '}
            {descriptions[pointCount]}
          </div>
        )}

        {/* Real values inputs — shown when all 3 points placed */}
        {pointCount === 3 && (
          <div className="space-y-2">
            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Informe os valores reais de cada ponto de referência:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Io O (mA)</label>
                <input type="number" value={kO} onChange={e => setKO(e.target.value)} className={inputClass} placeholder="ex: 1" />
              </div>
              <div>
                <label className={labelClass}>U O (V)</label>
                <input type="number" value={uO} onChange={e => setUO(e.target.value)} className={inputClass} placeholder="ex: 1" />
              </div>
              <div>
                <label className={`${labelClass} text-emerald-500`}>Io X (mA)</label>
                <input type="number" value={kX} onChange={e => setKX(e.target.value)} className={inputClass} placeholder="ex: 10000" />
              </div>
              <div>
                <label className={`${labelClass} text-blue-500`}>U Y (V)</label>
                <input type="number" value={uY} onChange={e => setUY(e.target.value)} className={inputClass} placeholder="ex: 10000" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className={`px-4 py-2.5 border-t flex items-center justify-between gap-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <button
          onClick={onCancel}
          className={`px-3 py-1.5 rounded text-xs font-medium transition active:scale-95 ${
            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300'
          }`}
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className={`px-3 py-1.5 rounded text-xs font-bold transition active:scale-95 ${
            canConfirm
              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm shadow-purple-500/20'
              : isDark ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          }`}
        >
          Confirmar
        </button>
      </div>
    </div>
  )
}

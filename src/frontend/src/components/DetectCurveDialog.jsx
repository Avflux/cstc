import { useEffect, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { hexToHueRange } from '../services/opencvApi'

// Parâmetros fixos de saturação/brilho usados na máscara do backend
const SAT_MIN = 50
const VAL_MIN = 20
// Meia-largura da faixa de matiz em torno da cor escolhida (OpenCV: 0–179)
const HUE_TOLERANCE = 25
const MIN_POINTS = 5
const MAX_POINTS = 500
// Abaixo disso a cor tem pouca saturação (preto/cinza) e a máscara por matiz falha
const MIN_SATURATION = 40

const COLOR_PRESETS = [
  { label: 'Azul', hex: '#1f4fd8' },
  { label: 'Vermelho', hex: '#e11d48' },
  { label: 'Verde', hex: '#16a34a' },
  { label: 'Ciano', hex: '#0891b2' },
  { label: 'Magenta', hex: '#c026d3' },
  { label: 'Laranja', hex: '#ea580c' },
]

export default function DetectCurveDialog({ fileName, onCancel, onConfirm }) {
  const { isDark } = useTheme()
  const [color, setColor] = useState(COLOR_PRESETS[0].hex)
  const [points, setPoints] = useState('50')

  const colorOk = /^#[0-9a-fA-F]{6}$/.test(color)
  const range = colorOk ? hexToHueRange(color, HUE_TOLERANCE) : null
  const pointCount = parseInt(points, 10)
  const pointsValid = Number.isInteger(pointCount) && pointCount >= MIN_POINTS && pointCount <= MAX_POINTS
  const colorValid = colorOk && range.saturation >= MIN_SATURATION
  const canConfirm = pointsValid && colorValid

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm({
      maxPoints: pointCount,
      hMin: range.hMin,
      hMax: range.hMax,
      satMin: SAT_MIN,
      valMin: VAL_MIN,
    })
  }

  const panelClass = isDark
    ? 'bg-[#0e1422] border-[#26354f] text-slate-200'
    : 'bg-white border-slate-300 text-slate-800'
  const inputClass = `w-full px-2 py-1.5 rounded border text-xs font-mono ${
    isDark
      ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-cyan-500 focus:outline-none'
      : 'bg-white border-slate-300 text-slate-800 focus:border-cyan-500 focus:outline-none'
  }`
  const labelClass = `text-[10px] font-semibold uppercase tracking-wider mb-1 block ${
    isDark ? 'text-slate-400' : 'text-slate-500'
  }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configurar detecção de curva"
        className={`w-full max-w-sm rounded-lg border shadow-2xl ${panelClass}`}
      >
        {/* Header */}
        <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${isDark ? 'border-[#26354f]' : 'border-slate-200'}`}>
          <svg className="w-4 h-4 text-cyan-500 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="text-xs font-bold">Detectar Curva (CV)</span>
        </div>

        <div className="px-4 py-3 space-y-4">
          {/* Selected file */}
          <div className={`text-[11px] px-2.5 py-2 rounded ${isDark ? 'bg-slate-800/70 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
            <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Imagem:</span>{' '}
            <span className="break-all">{fileName}</span>
          </div>

          {/* Line color */}
          <div>
            <label className={labelClass} htmlFor="detect-color">Cor da linha</label>
            <div className="flex items-center gap-2">
              <input
                id="detect-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-10 shrink-0 rounded border border-slate-400/60 bg-transparent cursor-pointer"
                title="Escolher a cor da linha na imagem"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                spellCheck={false}
                className={inputClass}
                aria-label="Cor em hexadecimal"
              />
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setColor(preset.hex)}
                  title={preset.label}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] transition ${
                    color.toLowerCase() === preset.hex
                      ? 'border-cyan-500 ring-1 ring-cyan-500'
                      : isDark
                        ? 'border-slate-600 hover:border-slate-500'
                        : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: preset.hex }} />
                  {preset.label}
                </button>
              ))}
            </div>

            <p className={`mt-1.5 text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {range
                ? `Faixa de matiz (HSV): ${range.hMin}–${range.hMax}${range.hMin > range.hMax ? ' (cruza o vermelho)' : ''}`
                : 'Faixa de matiz (HSV): —'}
            </p>

            {!colorOk && (
              <p className="mt-1 text-[10px] text-amber-500">
                Informe uma cor válida no formato #rrggbb.
              </p>
            )}

            {colorOk && !colorValid && (
              <p className="mt-1 text-[10px] text-amber-500">
                Escolha uma cor com mais saturação — tons de preto/cinza não são detectados por matiz.
              </p>
            )}
          </div>

          {/* Point count */}
          <div>
            <label className={labelClass} htmlFor="detect-points">Quantidade de pontos</label>
            <input
              id="detect-points"
              type="number"
              min={MIN_POINTS}
              max={MAX_POINTS}
              step="1"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
              className={inputClass}
            />
            {!pointsValid && (
              <p className="mt-1 text-[10px] text-amber-500">
                Informe um valor entre {MIN_POINTS} e {MAX_POINTS}.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-4 py-2.5 border-t flex items-center justify-end gap-2 ${isDark ? 'border-[#26354f]' : 'border-slate-200'}`}>
          <button
            type="button"
            onClick={onCancel}
            className={`px-3 py-1.5 rounded text-xs font-medium transition active:scale-95 border ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`px-3 py-1.5 rounded text-xs font-bold transition active:scale-95 ${
              canConfirm
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-500/20'
                : isDark
                  ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            Detectar
          </button>
        </div>
      </div>
    </div>
  )
}

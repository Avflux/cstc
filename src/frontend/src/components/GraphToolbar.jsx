import { useTheme } from '../contexts/ThemeContext'

export default function GraphToolbar({
  onResetZoom, onAddNode, onBuildEdges,
  cursorK, cursorU, zoomLevel,
  placementMode, nodeCount, edgeCount,
  imageAdjustMode, calibrateMode,
  loadedImage, onToggleImageAdjust, onZoomImage, onResetImageBounds,
  imageOpacity, onChangeImageOpacity, onRemoveImage,
  onStartCalibrate,
}) {
  const { isDark } = useTheme()
  const hasEnoughNodes = nodeCount >= 2

  const rowBase = `w-full px-4 py-2 flex items-center gap-2 shrink-0`
  const divider = `h-5 w-px ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`
  const btnBase = `px-3 py-1.5 rounded text-xs font-medium border shadow-sm transition flex items-center gap-1.5 active:scale-95`
  const btnDefault = isDark
    ? 'bg-black/70 hover:bg-slate-800 text-slate-200 border-slate-700/80'
    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
  const btnIcon = `p-1.5 rounded border shadow-sm transition active:scale-95 ${isDark ? 'bg-black/70 hover:bg-slate-800 text-slate-300 border-slate-700/80' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'}`

  return (
    <div className={`w-full border-b z-10 shrink-0 flex flex-col ${isDark ? 'bg-[#0a0f1c] border-[#1a2333]' : 'bg-slate-100 border-slate-200'}`}>

      {/* ── Top row: Image controls (only visible when image is loaded) ── */}
      {loadedImage && (
        <div className={`${rowBase} border-b ${isDark ? 'border-[#1a2333] bg-[#060a13]' : 'border-slate-200 bg-white'}`}>

          {/* Image icon label */}
          <div className="flex items-center gap-1.5 mr-1">
            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Imagem</span>
          </div>

          <div className={divider} />

          {/* Toggle Adjust */}
          <button
            onClick={() => onToggleImageAdjust(!imageAdjustMode)}
            className={`${btnBase} ${
              imageAdjustMode
                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 font-semibold'
                : isDark
                  ? 'bg-black/70 hover:bg-slate-800 text-amber-400 border-slate-700/80'
                  : 'bg-white hover:bg-slate-50 text-amber-600 border-slate-300'
            }`}
            title={imageAdjustMode ? 'Bloquear e passar controle para o grafo' : 'Ajustar escala e posição da imagem'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              {imageAdjustMode ? (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </>
              ) : (
                <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
              )}
            </svg>
            {imageAdjustMode ? 'Ajustando Imagem' : 'Ajustar Imagem'}
          </button>

          {/* Zoom + / - */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onZoomImage(1.15)}
              className={btnIcon}
              title="Aumentar zoom da imagem"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <button
              onClick={() => onZoomImage(0.85)}
              className={btnIcon}
              title="Diminuir zoom da imagem"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
          </div>

          {/* Fit / Enquadrar */}
          <button
            onClick={onResetImageBounds}
            className={`${btnBase} ${btnDefault}`}
            title="Ajustar imagem aos limites da visão atual"
          >
            Enquadrar
          </button>

          {/* Calibrar */}
          <button
            onClick={onStartCalibrate}
            className={`${btnBase} ${
              calibrateMode
                ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 font-semibold animate-pulse'
                : isDark
                  ? 'bg-black/70 hover:bg-slate-800 text-purple-400 border-slate-700/80'
                  : 'bg-white hover:bg-slate-50 text-purple-600 border-slate-300'
            }`}
            title={calibrateMode ? 'Modo calibração ativo — clique 3 pontos na imagem' : 'Calibrar imagem: definir 3 pontos de referência'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            {calibrateMode ? 'Calibrando...' : 'Calibrar'}
          </button>

          <div className={divider} />

          {/* Opacity */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Opacidade:</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={imageOpacity ?? 0.5}
              onChange={(e) => onChangeImageOpacity(parseFloat(e.target.value))}
              className="w-20 h-1.5 accent-blue-500 cursor-pointer"
              title={`Opacidade: ${Math.round((imageOpacity ?? 0.5) * 100)}%`}
            />
            <span className={`font-mono text-[10px] w-7 text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {Math.round((imageOpacity ?? 0.5) * 100)}%
            </span>
          </div>

          <div className={divider} />

          {/* Remove image */}
          <button
            onClick={onRemoveImage}
            className={`${btnIcon} ${isDark ? 'hover:bg-red-900/60 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
            title="Remover imagem"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Bottom row: Graph controls + Telemetry ── */}
      <div className={`${rowBase} justify-between`}>
        <div className="flex items-center gap-2">
          <button className={`${btnBase} ${btnDefault}`} onClick={onResetZoom}>
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 2v6h6" />
              <path d="M21 12A9 9 0 0 0 6 5.3L3 8" />
              <path d="M21 22v-6h-6" />
              <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
            </svg>
            Redefinir zoom
          </button>

          <button
            className={`${btnBase} ${
              placementMode
                ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 animate-pulse'
                : btnDefault
            }`}
            title={placementMode ? 'Clique no gráfico para posicionar' : 'Adicionar Nós'}
            onClick={onAddNode}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            {placementMode ? 'Posicionando...' : 'Adicionar Nós'}
          </button>

          <button
            className={`${btnBase} ${
              hasEnoughNodes
                ? btnDefault
                : isDark
                  ? 'bg-black/40 text-slate-500 border-slate-700/40 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
            title={hasEnoughNodes ? 'Construir arestas na ordem da tabela' : 'Adicione pelo menos 2 nós'}
            onClick={onBuildEdges}
            disabled={!hasEnoughNodes}
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="6" cy="6" r="2.5" />
              <circle cx="18" cy="18" r="2.5" />
              <line x1="8" x2="16" y1="8" y2="16" />
            </svg>
            + Construir Arestas
          </button>
        </div>

        {/* Telemetry */}
        <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded border shadow-sm text-[11px] font-mono ${isDark ? 'bg-black/70 border-slate-700/80 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
          {calibrateMode ? (
            <span className="text-purple-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping inline-block" />
              Modo Calibração
            </span>
          ) : imageAdjustMode ? (
            <span className="text-amber-500 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
              Modo Ajuste Imagem
            </span>
          ) : (
            <>
              <span>
                Io: <strong className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{cursorK}</strong> <span className="font-normal">mA</span>
              </span>
              <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>|</span>
              <span>
                U: <strong className="text-blue-500 font-semibold">{cursorU}</strong> <span className="font-normal">V</span>
              </span>
              <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>|</span>
              <span>
                Zoom: <strong className="text-blue-500">{zoomLevel}</strong>
              </span>
              <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>|</span>
              <span>
                Arestas: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{edgeCount}</strong>
              </span>
            </>
          )}
        </div>
      </div>

    </div>
  )
}

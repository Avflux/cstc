import { useTheme } from '../contexts/ThemeContext'

export default function GraphToolbar({
  onResetZoom, onResetGraph, onAddNode, onBuildEdges,
  cursorK, cursorU, zoomLevel,
  placementMode, nodeCount, edgeCount,
}) {
  const { isDark } = useTheme()
  const hasEnoughNodes = nodeCount >= 2

  return (
    <div className={`w-full border-b px-4 py-2.5 flex items-center justify-between z-10 shrink-0 ${isDark ? 'bg-[#0a0f1c] border-[#1a2333]' : 'bg-slate-100 border-slate-200'}`}>
      <div className="flex items-center gap-2">
        <button
          className={`px-3 py-1.5 rounded text-xs font-medium border shadow-sm transition flex items-center gap-1.5 active:scale-95 ${isDark ? 'bg-black/70 hover:bg-slate-800 text-slate-200 border-slate-700/80' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'}`}
          onClick={onResetZoom}
        >
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 2v6h6" />
            <path d="M21 12A9 9 0 0 0 6 5.3L3 8" />
            <path d="M21 22v-6h-6" />
            <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
          </svg>
          Redefinir zoom
        </button>

        <button
          className={`px-3 py-1.5 rounded text-xs font-medium border shadow-sm transition flex items-center gap-1.5 active:scale-95 ${isDark ? 'bg-black/70 hover:bg-slate-800 text-slate-200 border-slate-700/80' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'}`}
          onClick={onResetGraph}
        >
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          Resetar grafo
        </button>

        <button
          className={`px-3 py-1.5 rounded text-xs font-medium border shadow-sm transition flex items-center gap-1.5 ${
            placementMode
              ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 animate-pulse'
              : isDark
                ? 'bg-black/70 hover:bg-slate-800 text-slate-200 border-slate-700/80 active:scale-95'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 active:scale-95'
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
          className={`px-3 py-1.5 rounded text-xs font-medium border shadow-sm transition flex items-center gap-1.5 ${
            hasEnoughNodes
              ? isDark
                ? 'bg-black/70 hover:bg-slate-800 text-slate-200 border-slate-700/80 active:scale-95'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 active:scale-95'
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
        <span>
          K: <strong className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{cursorK}</strong> <span className="font-normal">mA</span>
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
      </div>
    </div>
  )
}

import { useTheme } from '../contexts/ThemeContext'

function ThemeToggleButton() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      className={`p-1.5 rounded-md transition flex items-center justify-center ${isDark ? 'text-amber-300 hover:bg-[#1d293d]' : 'text-amber-500 hover:bg-slate-200'} border ${isDark ? 'border-[#26354f]' : 'border-slate-300'}`}
      title="Alternar tema Claro/Escuro"
      onClick={toggleTheme}
    >
      {isDark ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" x2="12" y1="1" y2="3" />
          <line x1="12" x2="12" y1="21" y2="23" />
          <line x1="4.22" x2="5.64" y1="4.22" y2="5.64" />
          <line x1="18.36" x2="19.78" y1="18.36" y2="19.78" />
          <line x1="1" x2="3" y1="12" y2="12" />
          <line x1="21" x2="23" y1="12" y2="12" />
          <line x1="4.22" x2="5.64" y1="19.78" y2="18.36" />
          <line x1="18.36" x2="19.78" y1="5.64" y2="4.22" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}

export default function Header({ onImageUpload, onExport, onDetectCurve, isDetecting }) {
  const { isDark } = useTheme()

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err))
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <header className={`w-full border-b px-4 py-2.5 flex items-center justify-between shadow-sm z-20 shrink-0 ${isDark ? 'bg-[#0e1422] border-[#1a2333]' : 'bg-white border-slate-200'}`}>
      {/* Left branding & system title */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${isDark ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="18" r="3" />
            <line x1="9" x2="15" y1="6" y2="6" />
            <line x1="6" x2="6" y1="9" y2="15" />
            <line x1="18" x2="18" y1="9" y2="15" />
            <line x1="8.5" x2="15.5" y1="8.5" y2="15.5" />
          </svg>
        </div>
        <div>
          <h1 className={`text-base font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Topologia e Medições Elétricas
          </h1>
          <p className={`text-xs hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            U(V) × Io(mA)
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5">
        <button
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border ${isDark ? 'bg-[#162032] hover:bg-[#1f2d45] border-[#26354f] text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'}`}
          title="Carregar imagem de topologia"
          onClick={onImageUpload}
        >
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="hidden lg:inline">Carregar Imagem</span>
        </button>

        {/* Botão: Detectar Curva via OpenCV */}
        <button
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 border ${
            isDetecting
              ? 'bg-cyan-700 border-cyan-500 text-white animate-pulse cursor-wait'
              : isDark
                ? 'bg-[#0b1e2e] hover:bg-[#112d42] border-[#1a4060] text-cyan-300'
                : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-700'
          }`}
          title="Escolher imagem, informar a cor da linha e a quantidade de pontos para detecção via OpenCV (backend)"
          onClick={onDetectCurve}
          disabled={isDetecting}
        >
          {/* Ícone: scan / olho */}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="hidden lg:inline">
            {isDetecting ? 'Detectando...' : 'Detectar Curva (CV)'}
          </span>
        </button>

        <button
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 border ${isDark ? 'bg-[#162032] hover:bg-[#1f2d45] border-[#26354f] text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'}`}
          title="Exportar dados técnicos (CSV)"
          onClick={onExport}
        >
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          <span className="hidden lg:inline">Exportar Relatório</span>
        </button>

        <button
          className={`p-1.5 rounded-md transition border ${isDark ? 'text-slate-300 hover:bg-[#1d293d] border-[#26354f]' : 'text-slate-600 hover:bg-slate-200 border-slate-300'}`}
          title="Alternar tela cheia"
          onClick={handleFullscreen}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" x2="14" y1="3" y2="10" />
            <line x1="3" x2="10" y1="21" y2="14" />
          </svg>
        </button>

        <ThemeToggleButton />
      </div>
    </header>
  )
}

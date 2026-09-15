import { useTheme } from '../contexts/ThemeContext'

export default function TelemetrySummary({ avgVoltage, peakCurrent, activeNodes, frequency, imbalance }) {
  const { isDark } = useTheme()

  return (
    <div className={`p-3 border-t flex flex-col gap-2 ${isDark ? 'bg-[#090e18] border-[#1a2333]' : 'bg-slate-50 border-slate-200'}`} data-purpose="telemetry-summary">
      <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <span>Resumo Técnico</span>
        <span className="text-blue-500 text-[10px] flex items-center gap-1 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Operação Estável
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className={`p-2 rounded border ${isDark ? 'bg-[#111928] border-[#1d293d]' : 'bg-white border-slate-200'}`}>
          <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Média U(V)</span>
          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{avgVoltage}</span>
        </div>
        <div className={`p-2 rounded border ${isDark ? 'bg-[#111928] border-[#1d293d]' : 'bg-white border-slate-200'}`}>
          <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pico K(mA)</span>
          <span className="text-xs font-mono font-bold text-blue-500 dark:text-blue-400">{peakCurrent}</span>
        </div>
        <div className={`p-2 rounded border ${isDark ? 'bg-[#111928] border-[#1d293d]' : 'bg-white border-slate-200'}`}>
          <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Nós Ativos</span>
          <span className="text-xs font-mono font-bold text-blue-400">{activeNodes}</span>
        </div>
      </div>
      <div className={`flex items-center justify-between pt-1 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        <span>
          Frequência: <strong className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{frequency}</strong>
        </span>
        <span>
          Desbalanço: <strong className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{imbalance}</strong>
        </span>
      </div>
    </div>
  )
}

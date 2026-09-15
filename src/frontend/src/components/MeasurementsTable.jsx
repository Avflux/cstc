import { useTheme } from '../contexts/ThemeContext'

export default function MeasurementsTable({ data, onHighlightNode, onDeleteNode }) {
  const { isDark } = useTheme()

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-left text-xs border-collapse" id="measurementsTable">
        <thead className={`sticky top-0 border-b shadow-sm z-10 select-none ${isDark ? 'bg-[#111a2c] text-slate-300 border-[#24334c]' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
          <tr>
            <th className={`py-2 px-3 font-semibold tracking-wider ${isDark ? 'border-r border-[#223147]' : 'border-r border-slate-300'}`} scope="col">
              <div className="flex items-center justify-between">
                <span>Pontos Medição</span>
                <span className="text-[10px] text-slate-400">ID</span>
              </div>
            </th>
            <th className={`py-2 px-3 font-semibold text-right tracking-wider w-[28%] ${isDark ? 'border-r border-[#223147]' : 'border-r border-slate-300'}`} scope="col">
              <span>U(V)</span>
            </th>
            <th className={`py-2 px-3 font-semibold text-right tracking-wider w-[28%] ${onDeleteNode ? 'border-r border-transparent' : ''}`} scope="col">
              <span>Io(mA)</span>
            </th>
            {onDeleteNode && (
              <th className="py-2 px-2 text-center w-8" scope="col">
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className={`divide-y font-mono text-xs ${isDark ? 'divide-[#192438] text-slate-300 bg-[#0c121e]' : 'divide-slate-200 text-slate-800 bg-white'}`}>
          {data.length === 0 ? (
            <tr>
              <td colSpan={onDeleteNode ? 4 : 3} className={`py-8 text-center italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Nenhum ponto registrado. Ative "Adicionar Nós" e clique no gráfico.
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={row.id + index}
                className={`group cursor-pointer transition-colors border-b ${isDark ? 'hover:bg-[#162136] border-[#1a2538]' : 'hover:bg-blue-50 border-slate-200'}`}
                style={{ height: 34 }}
                onClick={() => onHighlightNode && onHighlightNode(index)}
              >
                <td className={`py-2 px-3 flex items-center gap-1.5 truncate ${isDark ? 'border-r border-[#1d2a3f]' : 'border-r border-slate-200'}`}>
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className={`font-medium truncate transition ${isDark ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`}>
                    {row.id}
                  </span>
                </td>
                <td className={`py-2 px-3 text-right font-mono font-semibold ${isDark ? 'border-r border-[#1d2a3f] text-slate-200' : 'border-r border-slate-200 text-slate-700'}`}>
                  {row.u}
                </td>
                <td className={`py-2 px-3 text-right font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {row.k}
                </td>
                {onDeleteNode && (
                  <td className="py-2 px-1 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDeleteNode(index)}
                      className={`p-1 rounded opacity-0 group-hover:opacity-100 transition ${isDark ? 'hover:bg-red-950 text-red-400' : 'hover:bg-red-100 text-red-600'}`}
                      title="Excluir este ponto"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                        <line x1="18" x2="6" y1="6" y2="18" />
                        <line x1="6" x2="18" y1="6" y2="18" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

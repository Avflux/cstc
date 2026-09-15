import { useTheme } from '../contexts/ThemeContext'

export default function MeasurementsTable({ data, onHighlightNode }) {
  const { isDark } = useTheme()

  // 12 rows × ~33px each = 396px visible area
  const ROW_HEIGHT = 33
  const VISIBLE_ROWS = 12
  const TABLE_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT

  return (
    <div
      className="overflow-y-auto"
      style={{ height: TABLE_HEIGHT, maxHeight: TABLE_HEIGHT }}
    >
      <table className="w-full text-left text-xs border-collapse" id="measurementsTable">
        <thead className={`sticky top-0 border-b shadow-sm z-10 select-none ${isDark ? 'bg-[#111a2c] text-slate-300 border-[#24334c]' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
          <tr>
            <th className={`py-2 px-3 font-semibold tracking-wider w-[40%] ${isDark ? 'border-r border-[#223147]' : 'border-r border-slate-300'}`} scope="col">
              <div className="flex items-center justify-between">
                <span>Pontos Medição</span>
                <span className="text-[10px] text-slate-400">ID</span>
              </div>
            </th>
            <th className={`py-2 px-3 font-semibold text-right tracking-wider w-[30%] ${isDark ? 'border-r border-[#223147]' : 'border-r border-slate-300'}`} scope="col">
              <span>U(V)</span>
            </th>
            <th className="py-2 px-3 font-semibold text-right tracking-wider w-[30%]" scope="col">
              <span>K(mA)</span>
            </th>
          </tr>
        </thead>
        <tbody className={`divide-y font-mono text-xs ${isDark ? 'divide-[#192438] text-slate-300 bg-[#0c121e]' : 'divide-slate-200 text-slate-800 bg-white'}`}>
          {data.length === 0 ? (
            <tr>
              <td colSpan={3} className={`py-8 text-center italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Nenhum ponto encontrado para o filtro.
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={row.id + index}
                className={`group cursor-pointer transition-colors border-b ${isDark ? 'hover:bg-[#162136] border-[#1a2538]' : 'hover:bg-blue-50 border-slate-200'}`}
                style={{ height: ROW_HEIGHT }}
                onClick={() => onHighlightNode(index)}
              >
                <td className={`py-2 px-3 flex items-center gap-1.5 truncate ${isDark ? 'border-r border-[#1d2a3f]' : 'border-r border-slate-200'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className={`font-medium truncate transition ${isDark ? 'text-slate-200 group-hover:text-blue-500' : 'text-slate-800 group-hover:text-blue-600'}`}>
                    {row.id}
                  </span>
                </td>
                <td className={`py-2 px-3 text-right font-mono font-semibold ${isDark ? 'border-r border-[#1d2a3f] text-slate-200' : 'border-r border-slate-200 text-slate-700'}`}>
                  {row.u}
                </td>
                <td className={`py-2 px-3 text-right font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {row.k}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

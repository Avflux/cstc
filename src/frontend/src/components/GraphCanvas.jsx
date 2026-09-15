import { useRef, useEffect, useCallback } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { defaultView } from '../data/initialData'

const MARGIN = { left: 56, right: 24, top: 18, bottom: 50 }

function calculateDynamicStep(range, targetTicks) {
  const rawStep = range / targetTicks
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const residual = rawStep / magnitude
  let niceFactor
  if (residual <= 1.5) niceFactor = 1
  else if (residual <= 3.5) niceFactor = 2
  else if (residual <= 7.5) niceFactor = 5
  else niceFactor = 10
  return niceFactor * magnitude
}

function formatNumber(val, step) {
  if (step >= 1) return Math.round(val).toString()
  const decimals = Math.min(3, Math.max(1, Math.ceil(-Math.log10(step))))
  return val.toFixed(decimals)
}

export default function GraphCanvas({
  nodes, edges, highlightedNodeIndex,
  onHighlightNode, onCursorMove, onZoomChange, triggerRedraw,
  placementMode, onPlaceNode,
  loadedImage,
}) {
  const canvasRef = useRef(null)
  const wrapperRef = useRef(null)
  const viewRef = useRef({ ...defaultView })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const hasDraggedRef = useRef(false)
  const { isDark } = useTheme()

  const worldToScreen = useCallback((kVal, uVal, rect) => {
    const view = viewRef.current
    const plotW = rect.width - MARGIN.left - MARGIN.right
    const plotH = rect.height - MARGIN.top - MARGIN.bottom
    const sx = MARGIN.left + ((kVal - view.kMin) / (view.kMax - view.kMin)) * plotW
    const sy = MARGIN.top + (plotH - ((uVal - view.uMin) / (view.uMax - view.uMin)) * plotH)
    return { x: sx, y: sy }
  }, [])

  const screenToWorld = useCallback((sx, sy, rect) => {
    const view = viewRef.current
    const plotW = rect.width - MARGIN.left - MARGIN.right
    const plotH = rect.height - MARGIN.top - MARGIN.bottom
    const kVal = view.kMin + ((sx - MARGIN.left) / plotW) * (view.kMax - view.kMin)
    const uVal = view.uMin + ((plotH - (sy - MARGIN.top)) / plotH) * (view.uMax - view.uMin)
    return { k: kVal, u: uVal }
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const ctx = canvas.getContext('2d')
    const view = viewRef.current
    const rect = wrapper.getBoundingClientRect()
    const w = rect.width; const h = rect.height
    if (w <= 0 || h <= 0) return

    const plotW = w - MARGIN.left - MARGIN.right
    const plotH = h - MARGIN.top - MARGIN.bottom

    // Background
    ctx.fillStyle = isDark ? '#05070d' : '#f8fafc'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = isDark ? '#020408' : '#ffffff'
    ctx.fillRect(MARGIN.left, MARGIN.top, plotW, plotH)

    // Clip to plot area for image and graph elements
    ctx.save()
    ctx.beginPath()
    ctx.rect(MARGIN.left, MARGIN.top, plotW, plotH)
    ctx.clip()

    // Draw loaded image as background (stretched to plot area)
    if (loadedImage) {
      ctx.globalAlpha = 0.5
      ctx.drawImage(loadedImage, MARGIN.left, MARGIN.top, plotW, plotH)
      ctx.globalAlpha = 1.0
    }

    // Grid (drawn on top of image)
    const gridSubColor = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)'
    const gridMajorColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.09)'
    const axisBorderColor = isDark ? '#263347' : '#94a3b8'
    const tickColor = isDark ? '#64748b' : '#64748b'
    const labelColor = isDark ? '#94a3b8' : '#475569'
    const edgeColor = isDark ? 'rgba(59, 130, 246, 0.45)' : 'rgba(37, 99, 235, 0.45)'

    const targetTicksX = Math.max(4, Math.floor(plotW / 85))
    const targetTicksY = Math.max(4, Math.floor(plotH / 50))
    const kSpan = view.kMax - view.kMin
    const uSpan = view.uMax - view.uMin
    const stepK = calculateDynamicStep(kSpan, targetTicksX)
    const stepU = calculateDynamicStep(uSpan, targetTicksY)
    const subStepK = stepK / 5; const subStepU = stepU / 5

    // Minor subgrid
    ctx.lineWidth = 0.5; ctx.strokeStyle = gridSubColor
    const subStartK = Math.floor(view.kMin / subStepK) * subStepK
    const subEndK = Math.ceil(view.kMax / subStepK) * subStepK
    for (let vk = subStartK; vk <= subEndK; vk += subStepK) {
      const pt = worldToScreen(vk, 0, rect)
      if (pt.x >= MARGIN.left && pt.x <= MARGIN.left + plotW) {
        ctx.beginPath(); ctx.moveTo(pt.x, MARGIN.top); ctx.lineTo(pt.x, MARGIN.top + plotH); ctx.stroke()
      }
    }
    const subStartU = Math.floor(view.uMin / subStepU) * subStepU
    const subEndU = Math.ceil(view.uMax / subStepU) * subStepU
    for (let vu = subStartU; vu <= subEndU; vu += subStepU) {
      const pt = worldToScreen(0, vu, rect)
      if (pt.y >= MARGIN.top && pt.y <= MARGIN.top + plotH) {
        ctx.beginPath(); ctx.moveTo(MARGIN.left, pt.y); ctx.lineTo(MARGIN.left + plotW, pt.y); ctx.stroke()
      }
    }

    // Major grid lines K
    const startK = Math.floor(view.kMin / stepK) * stepK
    const endK = Math.ceil(view.kMax / stepK) * stepK
    for (let vk = startK; vk <= endK + stepK * 0.01; vk += stepK) {
      const pt = worldToScreen(vk, 0, rect)
      if (pt.x >= MARGIN.left && pt.x <= MARGIN.left + plotW) {
        ctx.beginPath(); ctx.strokeStyle = gridMajorColor; ctx.lineWidth = 1; ctx.moveTo(pt.x, MARGIN.top); ctx.lineTo(pt.x, MARGIN.top + plotH); ctx.stroke()
      }
    }

    // Major grid lines U
    const startU = Math.floor(view.uMin / stepU) * stepU
    const endU = Math.ceil(view.uMax / stepU) * stepU
    for (let vu = startU; vu <= endU + stepU * 0.01; vu += stepU) {
      const pt = worldToScreen(0, vu, rect)
      if (pt.y >= MARGIN.top && pt.y <= MARGIN.top + plotH) {
        ctx.beginPath(); ctx.strokeStyle = gridMajorColor; ctx.lineWidth = 1; ctx.moveTo(MARGIN.left, pt.y); ctx.lineTo(MARGIN.left + plotW, pt.y); ctx.stroke()
      }
    }

    // Edges
    edges.forEach(([i, j]) => {
      const n1 = nodes[i]; const n2 = nodes[j]
      if (!n1 || !n2) return
      const p1 = worldToScreen(n1.k, n1.u, rect)
      const p2 = worldToScreen(n2.k, n2.u, rect)
      ctx.beginPath(); ctx.strokeStyle = edgeColor; ctx.lineWidth = 1.5
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke()
    })

    // Nodes
    nodes.forEach((node, idx) => {
      const pt = worldToScreen(node.k, node.u, rect)
      const isActive = highlightedNodeIndex === idx

      ctx.beginPath(); ctx.arc(pt.x, pt.y, isActive ? 14 : 7, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(59, 130, 246, 0.25)'; ctx.fill()

      ctx.beginPath(); ctx.arc(pt.x, pt.y, isActive ? 6 : 4, 0, Math.PI * 2)
      ctx.fillStyle = '#3b82f6'; ctx.fill(); ctx.lineWidth = 1.5
      ctx.strokeStyle = isDark ? '#020408' : '#ffffff'; ctx.stroke()

      ctx.font = '10px "JetBrains Mono", monospace'
      ctx.fillStyle = isDark ? '#93c5fd' : '#1d4ed8'
      ctx.textAlign = 'left'
      ctx.fillText(node.id, pt.x + 7, pt.y - 4)
    })

    ctx.restore() // end plot clip

    // Ticks & Labels (drawn outside clip area)
    ctx.font = '10px "JetBrains Mono", monospace'

    // X Ticks & Labels (K)
    for (let vk = startK; vk <= endK + stepK * 0.01; vk += stepK) {
      const pt = worldToScreen(vk, 0, rect)
      if (pt.x >= MARGIN.left && pt.x <= MARGIN.left + plotW) {
        ctx.beginPath(); ctx.strokeStyle = tickColor; ctx.lineWidth = 1.2; ctx.moveTo(pt.x, MARGIN.top + plotH); ctx.lineTo(pt.x, MARGIN.top + plotH + 5); ctx.stroke()
        ctx.fillStyle = labelColor; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillText(formatNumber(vk, stepK), pt.x, MARGIN.top + plotH + 8)
      }
    }
    for (let vk = subStartK; vk <= subEndK; vk += subStepK) {
      const pt = worldToScreen(vk, 0, rect)
      if (pt.x >= MARGIN.left && pt.x <= MARGIN.left + plotW) {
        ctx.beginPath(); ctx.strokeStyle = tickColor; ctx.lineWidth = 0.8; ctx.moveTo(pt.x, MARGIN.top + plotH); ctx.lineTo(pt.x, MARGIN.top + plotH + 3); ctx.stroke()
      }
    }

    // Y Ticks & Labels (U)
    for (let vu = startU; vu <= endU + stepU * 0.01; vu += stepU) {
      const pt = worldToScreen(0, vu, rect)
      if (pt.y >= MARGIN.top && pt.y <= MARGIN.top + plotH) {
        ctx.beginPath(); ctx.strokeStyle = tickColor; ctx.lineWidth = 1.2; ctx.moveTo(MARGIN.left - 5, pt.y); ctx.lineTo(MARGIN.left, pt.y); ctx.stroke()
        ctx.fillStyle = labelColor; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
        ctx.fillText(formatNumber(vu, stepU), MARGIN.left - 8, pt.y)
      }
    }
    for (let vu = subStartU; vu <= subEndU; vu += subStepU) {
      const pt = worldToScreen(0, vu, rect)
      if (pt.y >= MARGIN.top && pt.y <= MARGIN.top + plotH) {
        ctx.beginPath(); ctx.strokeStyle = tickColor; ctx.lineWidth = 0.8; ctx.moveTo(MARGIN.left - 3, pt.y); ctx.lineTo(MARGIN.left, pt.y); ctx.stroke()
      }
    }

    // Axis frame (outside clip)
    ctx.strokeStyle = axisBorderColor; ctx.lineWidth = 1.5
    ctx.strokeRect(MARGIN.left, MARGIN.top, plotW, plotH)

    // Axis labels
    ctx.fillStyle = isDark ? '#94a3b8' : '#334155'
    ctx.font = '600 11px "JetBrains Mono", monospace'
    ctx.save(); ctx.translate(14, MARGIN.top + plotH / 2); ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('U (V)', 0, 0)
    ctx.restore()
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText('K (mA)', MARGIN.left + plotW / 2, MARGIN.top + plotH + 26)
  }, [nodes, edges, highlightedNodeIndex, isDark, worldToScreen, loadedImage])

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const r = wrapper.getBoundingClientRect()
      canvas.width = r.width * dpr; canvas.height = r.height * dpr
      const ctx = canvas.getContext('2d')
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr)
      draw()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [draw])

  useEffect(() => { draw() }, [draw, triggerRedraw])

  // Mouse interactions
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const handleMouseDown = (e) => {
      isDraggingRef.current = true
      hasDraggedRef.current = false
      dragStartRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e) => {
      const rect = wrapper.getBoundingClientRect()
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const coords = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, rect)
        onCursorMove(coords.k.toFixed(1), coords.u.toFixed(1))
      }

      if (!isDraggingRef.current) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasDraggedRef.current = true
      dragStartRef.current = { x: e.clientX, y: e.clientY }

      const plotW = rect.width - MARGIN.left - MARGIN.right
      const plotH = rect.height - MARGIN.top - MARGIN.bottom
      const spanK = viewRef.current.kMax - viewRef.current.kMin
      const spanU = viewRef.current.uMax - viewRef.current.uMin
      viewRef.current.kMin -= (dx / plotW) * spanK
      viewRef.current.kMax -= (dx / plotW) * spanK
      viewRef.current.uMin += (dy / plotH) * spanU
      viewRef.current.uMax += (dy / plotH) * spanU
      draw()
    }

    const handleMouseUp = (e) => {
      isDraggingRef.current = false
      if (hasDraggedRef.current) return

      const rect = wrapper.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      if (placementMode) {
        if (sx >= MARGIN.left && sx <= rect.width - MARGIN.right && sy >= MARGIN.top && sy <= rect.height - MARGIN.bottom) {
          const world = screenToWorld(sx, sy, rect)
          onPlaceNode(world.k, world.u)
        }
      }
    }

    const handleWheel = (e) => {
      e.preventDefault()
      const rect = wrapper.getBoundingClientRect()
      const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top
      const worldAnchor = screenToWorld(mouseX, mouseY, rect)
      const zoomFactor = e.deltaY < 0 ? 0.88 : 1.14
      const v = viewRef.current
      v.kMin = worldAnchor.k + (v.kMin - worldAnchor.k) * zoomFactor
      v.kMax = worldAnchor.k + (v.kMax - worldAnchor.k) * zoomFactor
      v.uMin = worldAnchor.u + (v.uMin - worldAnchor.u) * zoomFactor
      v.uMax = worldAnchor.u + (v.uMax - worldAnchor.u) * zoomFactor
      const defaultSpanK = defaultView.kMax - defaultView.kMin
      onZoomChange(Math.round((defaultSpanK / (v.kMax - v.kMin)) * 100))
      draw()
    }

    wrapper.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    wrapper.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      wrapper.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      wrapper.removeEventListener('wheel', handleWheel)
    }
  }, [draw, screenToWorld, onCursorMove, onZoomChange, placementMode, onPlaceNode])

  const resetZoom = useCallback(() => {
    viewRef.current = { ...defaultView }
    onZoomChange(100); draw()
  }, [draw, onZoomChange])

  const resetGraph = useCallback(() => {
    viewRef.current = { ...defaultView }
    onZoomChange(100); onHighlightNode(null); draw()
  }, [draw, onZoomChange, onHighlightNode])

  const highlightNode = useCallback((idx) => {
    if (idx === null || idx < nodes.length) {
      onHighlightNode(idx)
      if (idx !== null) {
        const t = nodes[idx]
        const spanK = (viewRef.current.kMax - viewRef.current.kMin) / 2
        const spanU = (viewRef.current.uMax - viewRef.current.uMin) / 2
        viewRef.current.kMin = t.k - spanK; viewRef.current.kMax = t.k + spanK
        viewRef.current.uMin = t.u - spanU; viewRef.current.uMax = t.u + spanU
        onCursorMove(t.k.toFixed(1), t.u.toFixed(1))
        draw()
      }
    }
  }, [nodes, onHighlightNode, onCursorMove, draw])

  return { resetZoom, resetGraph, highlightNode, canvasRef, wrapperRef }
}

export function GraphCanvasView({ canvasRef, wrapperRef, nodeCount, edgeCount, nodes, placementMode, loadedImage, onRemoveImage }) {
  const { isDark } = useTheme()

  return (
    <div className={`relative w-full h-full flex-1 ${isDark ? 'bg-[#05070d]' : 'bg-slate-100'}`} ref={wrapperRef} style={{ minHeight: 0 }}>
      {/* Legend */}
      <div className="absolute top-4 left-16 z-10 flex items-center gap-2.5 px-2.5 py-1 text-xs pointer-events-none select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <span className={`font-mono text-[11px] ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>{nodeCount} nós</span>
        </div>
        <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>—</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-3 h-0.5 inline-block ${isDark ? 'bg-slate-300' : 'bg-slate-500'}`} />
          <span className={`font-mono text-[11px] ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>{edgeCount} arestas</span>
        </div>
      </div>

      {/* Placement mode banner */}
      {placementMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-blue-600/90 text-white text-xs font-semibold shadow-lg backdrop-blur-sm flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          Clique para posicionar nós — pressione <kbd className="px-1.5 py-0.5 rounded bg-white/20 font-mono text-[10px]">Esc</kbd> para sair
        </div>
      )}

      {/* Image loaded indicator + remove button */}
      {loadedImage && (
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold shadow-lg backdrop-blur-sm flex items-center gap-2 ${isDark ? 'bg-slate-800/90 text-slate-300 border border-slate-600/50' : 'bg-white/90 text-slate-600 border border-slate-300'}`}>
            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Imagem de referência carregada
          </div>
          <button
            onClick={onRemoveImage}
            className={`p-1.5 rounded-lg shadow-lg backdrop-blur-sm transition ${isDark ? 'bg-red-900/80 hover:bg-red-800 text-red-300 border border-red-600/50' : 'bg-red-50/90 hover:bg-red-100 text-red-600 border border-red-200'}`}
            title="Remover imagem"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className={`w-full h-full block ${placementMode ? 'cursor-crosshair' : 'graph-canvas'}`} />
    </div>
  )
}

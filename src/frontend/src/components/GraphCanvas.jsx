import { useRef, useEffect, useCallback } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { defaultView } from '../data/initialData'

const MARGIN = { left: 60, right: 28, top: 28, bottom: 52 }

function formatCursorCoord(val) {
  if (val >= 100) return val.toFixed(1)
  if (val >= 10) return val.toFixed(2)
  return val.toFixed(3)
}

export default function GraphCanvas({
  nodes, edges, highlightedNodeIndex,
  onHighlightNode, onCursorMove, onZoomChange, triggerRedraw,
  placementMode, onPlaceNode,
  loadedImage,
  imageAdjustMode,
  imageOpacity = 0.5,
}) {
  const canvasRef = useRef(null)
  const wrapperRef = useRef(null)
  const viewRef = useRef({ ...defaultView })
  const imageBoundsRef = useRef(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const hasDraggedRef = useRef(false)
  const { isDark } = useTheme()

  // Initialize or reset image bounds when image is loaded
  useEffect(() => {
    if (loadedImage && !imageBoundsRef.current) {
      imageBoundsRef.current = { ...viewRef.current }
    } else if (!loadedImage) {
      imageBoundsRef.current = null
    }
  }, [loadedImage])

  // Log-log coordinate transformations
  const worldToScreen = useCallback((kVal, uVal, rect) => {
    const view = viewRef.current
    const plotW = rect.width - MARGIN.left - MARGIN.right
    const plotH = rect.height - MARGIN.top - MARGIN.bottom

    const logKMin = Math.log10(Math.max(1e-6, view.kMin))
    const logKMax = Math.log10(Math.max(1e-6, view.kMax))
    const logUMin = Math.log10(Math.max(1e-6, view.uMin))
    const logUMax = Math.log10(Math.max(1e-6, view.uMax))

    const logK = Math.log10(Math.max(1e-6, kVal))
    const logU = Math.log10(Math.max(1e-6, uVal))

    const sx = MARGIN.left + ((logK - logKMin) / (logKMax - logKMin)) * plotW
    const sy = MARGIN.top + (plotH - ((logU - logUMin) / (logUMax - logUMin)) * plotH)
    return { x: sx, y: sy }
  }, [])

  const screenToWorld = useCallback((sx, sy, rect) => {
    const view = viewRef.current
    const plotW = rect.width - MARGIN.left - MARGIN.right
    const plotH = rect.height - MARGIN.top - MARGIN.bottom

    const logKMin = Math.log10(Math.max(1e-6, view.kMin))
    const logKMax = Math.log10(Math.max(1e-6, view.kMax))
    const logUMin = Math.log10(Math.max(1e-6, view.uMin))
    const logUMax = Math.log10(Math.max(1e-6, view.uMax))

    const logK = logKMin + ((sx - MARGIN.left) / plotW) * (logKMax - logKMin)
    const logU = logUMin + ((plotH - (sy - MARGIN.top)) / plotH) * (logUMax - logUMin)
    return { k: Math.pow(10, logK), u: Math.pow(10, logU) }
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

    // Clip to plot area for image, grid, and graph elements
    ctx.save()
    ctx.beginPath()
    ctx.rect(MARGIN.left, MARGIN.top, plotW, plotH)
    ctx.clip()

    // Draw loaded image as background anchored to world coordinates
    if (loadedImage) {
      if (!imageBoundsRef.current) {
        imageBoundsRef.current = { ...view }
      }
      const ib = imageBoundsRef.current
      const pTL = worldToScreen(ib.kMin, ib.uMax, rect)
      const pBR = worldToScreen(ib.kMax, ib.uMin, rect)
      const imgX = pTL.x
      const imgY = pTL.y
      const imgW = pBR.x - pTL.x
      const imgH = pBR.y - pTL.y

      ctx.globalAlpha = imageOpacity ?? 0.5
      ctx.drawImage(loadedImage, imgX, imgY, imgW, imgH)
      ctx.globalAlpha = 1.0

      // In Image Adjust mode, draw a dashed bounding box around the image
      if (imageAdjustMode) {
        ctx.save()
        ctx.strokeStyle = '#f59e0b' // Amber
        ctx.lineWidth = 2
        ctx.setLineDash([6, 4])
        ctx.strokeRect(imgX, imgY, imgW, imgH)
        ctx.restore()
      }
    }

    // Grid colors
    const gridSubColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.07)'
    const gridMajorColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.22)'
    const axisBorderColor = isDark ? '#263347' : '#94a3b8'
    const tickColor = isDark ? '#64748b' : '#64748b'
    const labelColor = isDark ? '#94a3b8' : '#475569'
    const edgeColor = isDark ? 'rgba(59, 130, 246, 0.65)' : 'rgba(37, 99, 235, 0.65)'

    const logKMin = Math.log10(Math.max(1e-6, view.kMin))
    const logKMax = Math.log10(Math.max(1e-6, view.kMax))
    const logUMin = Math.log10(Math.max(1e-6, view.uMin))
    const logUMax = Math.log10(Math.max(1e-6, view.uMax))

    const minDecadeK = Math.floor(logKMin)
    const maxDecadeK = Math.ceil(logKMax)
    const minDecadeU = Math.floor(logUMin)
    const maxDecadeU = Math.ceil(logUMax)

    // Minor subgrid lines X (2, 3, ..., 9 per decade)
    ctx.lineWidth = 0.5
    ctx.strokeStyle = gridSubColor
    for (let d = minDecadeK; d <= maxDecadeK; d++) {
      const base = Math.pow(10, d)
      for (let m = 2; m <= 9; m++) {
        const val = m * base
        if (val < view.kMin || val > view.kMax) continue
        const pt = worldToScreen(val, 1, rect)
        if (pt.x >= MARGIN.left && pt.x <= MARGIN.left + plotW) {
          ctx.beginPath(); ctx.moveTo(pt.x, MARGIN.top); ctx.lineTo(pt.x, MARGIN.top + plotH); ctx.stroke()
        }
      }
    }

    // Minor subgrid lines Y (2, 3, ..., 9 per decade)
    for (let d = minDecadeU; d <= maxDecadeU; d++) {
      const base = Math.pow(10, d)
      for (let m = 2; m <= 9; m++) {
        const val = m * base
        if (val < view.uMin || val > view.uMax) continue
        const pt = worldToScreen(1, val, rect)
        if (pt.y >= MARGIN.top && pt.y <= MARGIN.top + plotH) {
          ctx.beginPath(); ctx.moveTo(MARGIN.left, pt.y); ctx.lineTo(MARGIN.left + plotW, pt.y); ctx.stroke()
        }
      }
    }

    // Major grid lines X (10^d: 1, 10, 100, 1000, 10000)
    ctx.lineWidth = 1
    ctx.strokeStyle = gridMajorColor
    for (let d = minDecadeK; d <= maxDecadeK; d++) {
      const val = Math.pow(10, d)
      if (val < view.kMin * 0.999 || val > view.kMax * 1.001) continue
      const pt = worldToScreen(val, 1, rect)
      if (pt.x >= MARGIN.left && pt.x <= MARGIN.left + plotW) {
        ctx.beginPath(); ctx.moveTo(pt.x, MARGIN.top); ctx.lineTo(pt.x, MARGIN.top + plotH); ctx.stroke()
      }
    }

    // Major grid lines Y (10^d: 1, 10, 100, 1000, 10000)
    for (let d = minDecadeU; d <= maxDecadeU; d++) {
      const val = Math.pow(10, d)
      if (val < view.uMin * 0.999 || val > view.uMax * 1.001) continue
      const pt = worldToScreen(1, val, rect)
      if (pt.y >= MARGIN.top && pt.y <= MARGIN.top + plotH) {
        ctx.beginPath(); ctx.moveTo(MARGIN.left, pt.y); ctx.lineTo(MARGIN.left + plotW, pt.y); ctx.stroke()
      }
    }

    // Edges
    edges.forEach(([i, j]) => {
      const n1 = nodes[i]; const n2 = nodes[j]
      if (!n1 || !n2) return
      const p1 = worldToScreen(n1.k, n1.u, rect)
      const p2 = worldToScreen(n2.k, n2.u, rect)
      ctx.beginPath(); ctx.strokeStyle = edgeColor; ctx.lineWidth = 2
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke()
    })

    // Nodes
    nodes.forEach((node, idx) => {
      const pt = worldToScreen(node.k, node.u, rect)
      const isActive = highlightedNodeIndex === idx

      ctx.beginPath(); ctx.arc(pt.x, pt.y, isActive ? 14 : 7, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(59, 130, 246, 0.25)'; ctx.fill()

      ctx.beginPath(); ctx.arc(pt.x, pt.y, isActive ? 6 : 4, 0, Math.PI * 2)
      ctx.fillStyle = '#2563eb'; ctx.fill(); ctx.lineWidth = 1.5
      ctx.strokeStyle = isDark ? '#020408' : '#ffffff'; ctx.stroke()

      ctx.font = '10px "JetBrains Mono", monospace'
      ctx.fillStyle = isDark ? '#93c5fd' : '#1d4ed8'
      ctx.textAlign = 'left'
      ctx.fillText(node.id, pt.x + 7, pt.y - 4)
    })

    ctx.restore() // end plot clip

    // Ticks & Labels (drawn outside clip area)
    ctx.font = '600 10px "JetBrains Mono", monospace'

    // X Minor Ticks
    for (let d = minDecadeK; d <= maxDecadeK; d++) {
      const base = Math.pow(10, d)
      for (let m = 2; m <= 9; m++) {
        const val = m * base
        if (val < view.kMin || val > view.kMax) continue
        const pt = worldToScreen(val, 1, rect)
        if (pt.x >= MARGIN.left && pt.x <= MARGIN.left + plotW) {
          ctx.beginPath(); ctx.strokeStyle = tickColor; ctx.lineWidth = 0.8
          ctx.moveTo(pt.x, MARGIN.top + plotH); ctx.lineTo(pt.x, MARGIN.top + plotH + 3); ctx.stroke()
        }
      }
    }

    // X Major Ticks & Labels (1, 10, 100, 1000, 10000)
    for (let d = minDecadeK; d <= maxDecadeK; d++) {
      const val = Math.pow(10, d)
      if (val < view.kMin * 0.999 || val > view.kMax * 1.001) continue
      const pt = worldToScreen(val, 1, rect)
      if (pt.x >= MARGIN.left - 1 && pt.x <= MARGIN.left + plotW + 1) {
        ctx.beginPath(); ctx.strokeStyle = tickColor; ctx.lineWidth = 1.4
        ctx.moveTo(pt.x, MARGIN.top + plotH); ctx.lineTo(pt.x, MARGIN.top + plotH + 5); ctx.stroke()
        ctx.fillStyle = labelColor; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillText(val >= 1 ? val.toString() : val.toFixed(Math.abs(d)), pt.x, MARGIN.top + plotH + 7)
      }
    }

    // Y Minor Ticks
    for (let d = minDecadeU; d <= maxDecadeU; d++) {
      const base = Math.pow(10, d)
      for (let m = 2; m <= 9; m++) {
        const val = m * base
        if (val < view.uMin || val > view.uMax) continue
        const pt = worldToScreen(1, val, rect)
        if (pt.y >= MARGIN.top && pt.y <= MARGIN.top + plotH) {
          ctx.beginPath(); ctx.strokeStyle = tickColor; ctx.lineWidth = 0.8
          ctx.moveTo(MARGIN.left - 3, pt.y); ctx.lineTo(MARGIN.left, pt.y); ctx.stroke()
        }
      }
    }

    // Y Major Ticks & Labels (1, 10, 100, 1000, 10000)
    for (let d = minDecadeU; d <= maxDecadeU; d++) {
      const val = Math.pow(10, d)
      if (val < view.uMin * 0.999 || val > view.uMax * 1.001) continue
      const pt = worldToScreen(1, val, rect)
      if (pt.y >= MARGIN.top - 1 && pt.y <= MARGIN.top + plotH + 1) {
        ctx.beginPath(); ctx.strokeStyle = tickColor; ctx.lineWidth = 1.4
        ctx.moveTo(MARGIN.left - 5, pt.y); ctx.lineTo(MARGIN.left, pt.y); ctx.stroke()
        ctx.fillStyle = labelColor; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
        ctx.fillText(val >= 1 ? val.toString() : val.toFixed(Math.abs(d)), MARGIN.left - 8, pt.y)
      }
    }

    // Axis frame
    ctx.strokeStyle = axisBorderColor; ctx.lineWidth = 1.5
    ctx.strokeRect(MARGIN.left, MARGIN.top, plotW, plotH)

    // Chart Title (Curva de Excitação Típica)
    ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b'
    ctx.font = '700 12px Inter, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ctx.fillText('Curva de Excitação Típica', MARGIN.left + plotW / 2, MARGIN.top - 6)

    // Axis labels
    ctx.fillStyle = isDark ? '#94a3b8' : '#334155'
    ctx.font = '600 11px "JetBrains Mono", monospace'
    ctx.save(); ctx.translate(14, MARGIN.top + plotH / 2); ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('U(V)', 0, 0)
    ctx.restore()
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText('Io(mA)', MARGIN.left + plotW / 2, MARGIN.top + plotH + 26)
  }, [nodes, edges, highlightedNodeIndex, isDark, worldToScreen, loadedImage, imageAdjustMode, imageOpacity])

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

  // Mouse interactions (Log scale)
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const mouseDownPosRef = { x: 0, y: 0 }

    const handleMouseDown = (e) => {
      if (e.button !== 0 && e.button !== 1) return
      isDraggingRef.current = true
      hasDraggedRef.current = false
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      mouseDownPosRef.x = e.clientX
      mouseDownPosRef.y = e.clientY
    }

    const handleMouseMove = (e) => {
      const rect = wrapper.getBoundingClientRect()
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const coords = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, rect)
        onCursorMove(formatCursorCoord(coords.k), formatCursorCoord(coords.u))
      }

      if (!isDraggingRef.current) return
      const totalDist = Math.hypot(e.clientX - mouseDownPosRef.x, e.clientY - mouseDownPosRef.y)
      if (totalDist > 5) hasDraggedRef.current = true

      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      dragStartRef.current = { x: e.clientX, y: e.clientY }

      // When placing nodes, prevent graph panning on left-drag so clicks are not displaced
      if (placementMode && !imageAdjustMode) return

      const plotW = rect.width - MARGIN.left - MARGIN.right
      const plotH = rect.height - MARGIN.top - MARGIN.bottom

      if (imageAdjustMode && loadedImage && imageBoundsRef.current) {
        // Pan image in log space
        const ib = imageBoundsRef.current
        const curLogKMin = Math.log10(Math.max(1e-6, viewRef.current.kMin))
        const curLogKMax = Math.log10(Math.max(1e-6, viewRef.current.kMax))
        const curLogUMin = Math.log10(Math.max(1e-6, viewRef.current.uMin))
        const curLogUMax = Math.log10(Math.max(1e-6, viewRef.current.uMax))

        const dLogK = (dx / plotW) * (curLogKMax - curLogKMin)
        const dLogU = (dy / plotH) * (curLogUMax - curLogUMin)

        const imgLogKMin = Math.log10(Math.max(1e-6, ib.kMin)) + dLogK
        const imgLogKMax = Math.log10(Math.max(1e-6, ib.kMax)) + dLogK
        const imgLogUMin = Math.log10(Math.max(1e-6, ib.uMin)) - dLogU
        const imgLogUMax = Math.log10(Math.max(1e-6, ib.uMax)) - dLogU

        ib.kMin = Math.pow(10, imgLogKMin)
        ib.kMax = Math.pow(10, imgLogKMax)
        ib.uMin = Math.pow(10, imgLogUMin)
        ib.uMax = Math.pow(10, imgLogUMax)
        draw()
      } else {
        // Pan graph in log space
        const curLogKMin = Math.log10(Math.max(1e-6, viewRef.current.kMin))
        const curLogKMax = Math.log10(Math.max(1e-6, viewRef.current.kMax))
        const curLogUMin = Math.log10(Math.max(1e-6, viewRef.current.uMin))
        const curLogUMax = Math.log10(Math.max(1e-6, viewRef.current.uMax))

        const dLogK = (dx / plotW) * (curLogKMax - curLogKMin)
        const dLogU = (dy / plotH) * (curLogUMax - curLogUMin)

        viewRef.current.kMin = Math.pow(10, curLogKMin - dLogK)
        viewRef.current.kMax = Math.pow(10, curLogKMax - dLogK)
        viewRef.current.uMin = Math.pow(10, curLogUMin + dLogU)
        viewRef.current.uMax = Math.pow(10, curLogUMax + dLogU)
        draw()
      }
    }

    const handleMouseUp = (e) => {
      isDraggingRef.current = false
      const totalDist = Math.hypot(e.clientX - mouseDownPosRef.x, e.clientY - mouseDownPosRef.y)
      const isClick = totalDist < 8

      const rect = wrapper.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      if ((placementMode || e.shiftKey) && !imageAdjustMode && isClick) {
        if (sx >= MARGIN.left && sx <= rect.width - MARGIN.right && sy >= MARGIN.top && sy <= rect.height - MARGIN.bottom) {
          const world = screenToWorld(sx, sy, rect)
          onPlaceNode(world.k, world.u)
        }
      }
    }

    const handleWheel = (e) => {
      e.preventDefault()
      const rect = wrapper.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const worldAnchor = screenToWorld(mouseX, mouseY, rect)

      if (imageAdjustMode && loadedImage && imageBoundsRef.current) {
        // Zoom image around mouse anchor in log space
        const imgScale = e.deltaY < 0 ? 1.08 : 0.925
        const ib = imageBoundsRef.current
        const logAnchorK = Math.log10(Math.max(1e-6, worldAnchor.k))
        const logAnchorU = Math.log10(Math.max(1e-6, worldAnchor.u))

        const imgLogKMin = logAnchorK - (logAnchorK - Math.log10(Math.max(1e-6, ib.kMin))) * imgScale
        const imgLogKMax = logAnchorK + (Math.log10(Math.max(1e-6, ib.kMax)) - logAnchorK) * imgScale
        const imgLogUMin = logAnchorU - (logAnchorU - Math.log10(Math.max(1e-6, ib.uMin))) * imgScale
        const imgLogUMax = logAnchorU + (Math.log10(Math.max(1e-6, ib.uMax)) - logAnchorU) * imgScale

        ib.kMin = Math.pow(10, imgLogKMin)
        ib.kMax = Math.pow(10, imgLogKMax)
        ib.uMin = Math.pow(10, imgLogUMin)
        ib.uMax = Math.pow(10, imgLogUMax)
        draw()
      } else {
        // Zoom graph in log space
        const zoomFactor = e.deltaY < 0 ? 0.88 : 1.14
        const v = viewRef.current
        const logAnchorK = Math.log10(Math.max(1e-6, worldAnchor.k))
        const logAnchorU = Math.log10(Math.max(1e-6, worldAnchor.u))

        const curLogKMin = Math.log10(Math.max(1e-6, v.kMin))
        const curLogKMax = Math.log10(Math.max(1e-6, v.kMax))
        const curLogUMin = Math.log10(Math.max(1e-6, v.uMin))
        const curLogUMax = Math.log10(Math.max(1e-6, v.uMax))

        const newLogKMin = logAnchorK + (curLogKMin - logAnchorK) * zoomFactor
        const newLogKMax = logAnchorK + (curLogKMax - logAnchorK) * zoomFactor
        const newLogUMin = logAnchorU + (curLogUMin - logAnchorU) * zoomFactor
        const newLogUMax = logAnchorU + (curLogUMax - logAnchorU) * zoomFactor

        v.kMin = Math.pow(10, newLogKMin)
        v.kMax = Math.pow(10, newLogKMax)
        v.uMin = Math.pow(10, newLogUMin)
        v.uMax = Math.pow(10, newLogUMax)

        const defaultDecadesK = Math.log10(defaultView.kMax) - Math.log10(defaultView.kMin)
        const currentDecadesK = newLogKMax - newLogKMin
        onZoomChange(Math.round((defaultDecadesK / currentDecadesK) * 100))
        draw()
      }
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
  }, [draw, screenToWorld, onCursorMove, onZoomChange, placementMode, onPlaceNode, imageAdjustMode, loadedImage])

  const resetZoom = useCallback(() => {
    viewRef.current = { ...defaultView }
    onZoomChange(100); draw()
  }, [draw, onZoomChange])

  const resetGraph = useCallback(() => {
    viewRef.current = { ...defaultView }
    onZoomChange(100); onHighlightNode(null); draw()
  }, [draw, onZoomChange, onHighlightNode])

  const resetImageBounds = useCallback(() => {
    imageBoundsRef.current = { ...viewRef.current }
    draw()
  }, [draw])

  const zoomImage = useCallback((factor) => {
    if (!imageBoundsRef.current) {
      imageBoundsRef.current = { ...viewRef.current }
    }
    const ib = imageBoundsRef.current
    const logKMin = Math.log10(Math.max(1e-6, ib.kMin))
    const logKMax = Math.log10(Math.max(1e-6, ib.kMax))
    const logUMin = Math.log10(Math.max(1e-6, ib.uMin))
    const logUMax = Math.log10(Math.max(1e-6, ib.uMax))

    const centerLogK = (logKMin + logKMax) / 2
    const centerLogU = (logUMin + logUMax) / 2

    ib.kMin = Math.pow(10, centerLogK - (centerLogK - logKMin) * factor)
    ib.kMax = Math.pow(10, centerLogK + (logKMax - centerLogK) * factor)
    ib.uMin = Math.pow(10, centerLogU - (centerLogU - logUMin) * factor)
    ib.uMax = Math.pow(10, centerLogU + (logUMax - centerLogU) * factor)
    draw()
  }, [draw])

  const highlightNode = useCallback((idx) => {
    if (idx === null || idx < nodes.length) {
      onHighlightNode(idx)
      if (idx !== null) {
        const t = nodes[idx]
        const logK = Math.log10(Math.max(1e-6, t.k))
        const logU = Math.log10(Math.max(1e-6, t.u))
        const logSpanK = (Math.log10(viewRef.current.kMax) - Math.log10(viewRef.current.kMin)) / 2
        const logSpanU = (Math.log10(viewRef.current.uMax) - Math.log10(viewRef.current.uMin)) / 2
        viewRef.current.kMin = Math.pow(10, logK - logSpanK)
        viewRef.current.kMax = Math.pow(10, logK + logSpanK)
        viewRef.current.uMin = Math.pow(10, logU - logSpanU)
        viewRef.current.uMax = Math.pow(10, logU + logSpanU)
        onCursorMove(formatCursorCoord(t.k), formatCursorCoord(t.u))
        draw()
      }
    }
  }, [nodes, onHighlightNode, onCursorMove, draw])

  return { resetZoom, resetGraph, resetImageBounds, zoomImage, highlightNode, canvasRef, wrapperRef }
}

export function GraphCanvasView({
  canvasRef, wrapperRef, nodeCount, edgeCount, nodes,
  placementMode, loadedImage, onRemoveImage,
  imageAdjustMode, onToggleImageAdjust,
  imageOpacity, onChangeImageOpacity,
  onResetImageBounds, onZoomImage,
}) {
  const { isDark } = useTheme()

  const cursorClass = placementMode
    ? 'cursor-crosshair'
    : imageAdjustMode
      ? 'cursor-move'
      : 'graph-canvas'

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

      {/* Image adjustment mode banner */}
      {imageAdjustMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-amber-600/95 text-white text-xs font-semibold shadow-lg backdrop-blur-sm flex items-center gap-3">
          <svg className="w-4 h-4 shrink-0 text-amber-200" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
          </svg>
          <span>Modo Ajuste de Imagem — Arraste para mover (pan) e use a roda do mouse para redimensionar</span>
          <button
            onClick={() => onToggleImageAdjust(false)}
            className="px-2.5 py-1 rounded bg-white text-amber-900 font-bold text-[11px] shadow hover:bg-amber-100 active:scale-95 transition"
          >
            Bloquear no Grafo (Esc)
          </button>
        </div>
      )}

      {/* Image loaded floating toolbar widget */}
      {loadedImage && (
        <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100%-2rem)]">
          <div className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg backdrop-blur-md flex items-center gap-2.5 ${
            isDark ? 'bg-slate-900/95 text-slate-200 border border-slate-700/80' : 'bg-white/95 text-slate-700 border border-slate-300'
          }`}>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-[11px] font-semibold hidden sm:inline">Imagem</span>
            </div>

            <div className={`h-4 w-px ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

            {/* Toggle Image Adjust (Pan/Zoom) */}
            <button
              onClick={() => onToggleImageAdjust(!imageAdjustMode)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
                imageAdjustMode
                  ? 'bg-amber-600 hover:bg-amber-500 text-white font-bold'
                  : isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/60'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
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
              {imageAdjustMode ? 'Bloquear no Grafo' : 'Ajustar Imagem'}
            </button>

            {/* Image zoom in / zoom out buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onZoomImage(1.15)}
                className={`p-1 rounded text-[11px] transition active:scale-95 ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                }`}
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
                className={`p-1 rounded text-[11px] transition active:scale-95 ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                }`}
                title="Diminuir zoom da imagem"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </button>
            </div>

            {/* Reset / Fit to Plot button */}
            <button
              onClick={onResetImageBounds}
              className={`px-2 py-1 rounded text-[11px] transition active:scale-95 ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
              }`}
              title="Ajustar aos limites da visão atual"
            >
              Enquadrar
            </button>

            <div className={`h-4 w-px ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

            {/* Opacity slider */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Opacidade:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={imageOpacity ?? 0.5}
                onChange={(e) => onChangeImageOpacity(parseFloat(e.target.value))}
                className="w-14 h-1.5 accent-blue-500 cursor-pointer"
                title={`Opacidade: ${Math.round((imageOpacity ?? 0.5) * 100)}%`}
              />
              <span className="font-mono text-[10px] w-6 text-right">{Math.round((imageOpacity ?? 0.5) * 100)}%</span>
            </div>

            <div className={`h-4 w-px ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

            {/* Remove button */}
            <button
              onClick={onRemoveImage}
              className={`p-1 rounded transition ${isDark ? 'hover:bg-red-900/60 text-red-400' : 'hover:bg-red-100 text-red-600'}`}
              title="Remover imagem"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className={`w-full h-full block ${cursorClass}`} />
    </div>
  )
}

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
  calibrateMode,
  calibPoints,
  onCalibClick,
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

    // Draw calibration points if in calibrate mode
    if (calibrateMode && calibPoints && calibPoints.length > 0) {
      const labels = ['O', 'X', 'Y']
      const colors = ['#ef4444', '#10b981', '#3b82f6']
      calibPoints.forEach((pt, i) => {
        // Cross hair
        ctx.save()
        ctx.strokeStyle = colors[i]
        ctx.lineWidth = 2
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(pt.sx - 10, pt.sy)
        ctx.lineTo(pt.sx + 10, pt.sy)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(pt.sx, pt.sy - 10)
        ctx.lineTo(pt.sx, pt.sy + 10)
        ctx.stroke()
        // Circle
        ctx.beginPath()
        ctx.arc(pt.sx, pt.sy, 6, 0, Math.PI * 2)
        ctx.strokeStyle = colors[i]
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = colors[i] + '40'
        ctx.fill()
        // Label
        ctx.fillStyle = colors[i]
        ctx.font = 'bold 12px "JetBrains Mono", monospace'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'bottom'
        ctx.fillText(labels[i], pt.sx + 8, pt.sy - 4)
        ctx.restore()
      })

      // Draw lines connecting O->X and O->Y if we have enough points
      if (calibPoints.length >= 2) {
        ctx.save()
        ctx.setLineDash([4, 3])
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#ef4444'
        ctx.beginPath()
        ctx.moveTo(calibPoints[0].sx, calibPoints[0].sy)
        ctx.lineTo(calibPoints[1].sx, calibPoints[1].sy)
        ctx.stroke()
        if (calibPoints.length === 3) {
          ctx.strokeStyle = '#ef4444'
          ctx.beginPath()
          ctx.moveTo(calibPoints[0].sx, calibPoints[0].sy)
          ctx.lineTo(calibPoints[2].sx, calibPoints[2].sy)
          ctx.stroke()
        }
        ctx.restore()
      }
    }

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
  }, [nodes, edges, highlightedNodeIndex, isDark, worldToScreen, loadedImage, imageAdjustMode, imageOpacity, calibrateMode, calibPoints])

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

      // In calibrate mode, don't pan
      if (calibrateMode) return

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

      // Handle calibration click
      if (calibrateMode && isClick) {
        if (sx >= MARGIN.left && sx <= rect.width - MARGIN.right && sy >= MARGIN.top && sy <= rect.height - MARGIN.bottom) {
          onCalibClick && onCalibClick(sx, sy)
        }
        return
      }

      if ((placementMode || e.shiftKey) && !imageAdjustMode && isClick) {
        if (sx >= MARGIN.left && sx <= rect.width - MARGIN.right && sy >= MARGIN.top && sy <= rect.height - MARGIN.bottom) {
          const world = screenToWorld(sx, sy, rect)
          onPlaceNode(world.k, world.u)
        }
      }
    }

    const handleWheel = (e) => {
      e.preventDefault()
      // Don't zoom while in calibrate mode
      if (calibrateMode) return

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
  }, [draw, screenToWorld, onCursorMove, onZoomChange, placementMode, onPlaceNode, imageAdjustMode, loadedImage, calibrateMode, onCalibClick])

  const resetZoom = useCallback(() => {
    viewRef.current = { ...defaultView }
    onZoomChange(100); draw()
  }, [draw, onZoomChange])

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

  /**
   * Apply calibration: given 3 screen points (O, X, Y) and their real world values,
   * recompute imageBoundsRef so the image aligns to the graph.
   *
   * O = origin point on the image (e.g. kMin_img, uMin_img)
   * X = point on the X axis of the image at known kX value, same U as O
   * Y = point on the Y axis of the image at known uY value, same K as O
   *
   * The image spans from (kO, uO) at pixel O to a computed max based on the scale ratio.
   */
  const applyCalibration = useCallback((calibPoints, realValues) => {
    // calibPoints: [{sx,sy}, {sx,sy}, {sx,sy}]  (O, X, Y) in canvas screen coords
    // realValues: { kO, uO, kX, uY }
    // O — origin point on the image at world (kO, uO)
    // X — point on same horizontal row as O at world (kX, uO)  [defines X scale]
    // Y — point on same vertical column as O at world (kO, uY) [defines Y scale]

    if (!loadedImage || !imageBoundsRef.current) return

    const wrapper = wrapperRef.current
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()

    const pO = calibPoints[0]  // screen pos of origin
    const pX = calibPoints[1]  // screen pos of X-axis reference
    const pY = calibPoints[2]  // screen pos of Y-axis reference

    const { kO, uO, kX, uY } = realValues

    // Log-space real-world distances
    const logSpanK_real = Math.log10(Math.max(1e-6, kX)) - Math.log10(Math.max(1e-6, kO))
    const logSpanU_real = Math.log10(Math.max(1e-6, uY)) - Math.log10(Math.max(1e-6, uO))

    // Screen pixel distances between calibration points
    const pixelSpanX = pX.sx - pO.sx   // horizontal pixels from O to X (should be positive)
    const pixelSpanY = pO.sy - pY.sy   // vertical pixels from O to Y (pY is above pO so this should be positive)

    if (Math.abs(pixelSpanX) < 2 || Math.abs(pixelSpanY) < 2) return // degenerate — points too close

    // Screen pixels per log unit
    const screenPixPerLogK = pixelSpanX / logSpanK_real
    const screenPixPerLogU = pixelSpanY / logSpanU_real

    // Current rendered image bounding box on screen
    const ib = imageBoundsRef.current
    const screenImgTL = worldToScreen(ib.kMin, ib.uMax, rect)
    const screenImgBR = worldToScreen(ib.kMax, ib.uMin, rect)
    const screenImgW = Math.max(1, screenImgBR.x - screenImgTL.x)
    const screenImgH = Math.max(1, screenImgBR.y - screenImgTL.y)

    // Log ranges the full image spans after calibration
    const newImgLogK_range = screenImgW / screenPixPerLogK
    const newImgLogU_range = screenImgH / screenPixPerLogU

    // Anchor: point O in screen space tells us where world (kO, uO) maps to.
    // Within the image, O is at offset (pO.sx - screenImgTL.x, pO.sy - screenImgTL.y).
    // Fraction of image width/height where O sits:
    const fracOx = (pO.sx - screenImgTL.x) / screenImgW
    const fracOy = (pO.sy - screenImgTL.y) / screenImgH

    const logKO = Math.log10(Math.max(1e-6, kO))
    const logUO = Math.log10(Math.max(1e-6, uO))

    // kMin of image = kO - (fraction of image to the left of O) * logK range
    const newImgLogKMin = logKO - fracOx * newImgLogK_range
    const newImgLogKMax = newImgLogKMin + newImgLogK_range

    // uMin of image = uO - (fraction of image below O) * logU range
    // fracOy is downward (0=top, 1=bottom), so fraction below O = (1 - fracOy)
    // But wait: uMax is at TOP (y=screenImgTL.y), uMin is at BOTTOM (y=screenImgBR.y)
    // So fracOy = 0 means O is at uMax, fracOy = 1 means O is at uMin.
    // Fraction of U range above O = fracOy (in log terms O is fracOy * range from uMax)
    // logUO = logUMax - fracOy * newImgLogU_range
    // => logUMax = logUO + fracOy * newImgLogU_range
    const newImgLogUMax = logUO + fracOy * newImgLogU_range
    const newImgLogUMin = newImgLogUMax - newImgLogU_range

    imageBoundsRef.current = {
      kMin: Math.pow(10, newImgLogKMin),
      kMax: Math.pow(10, newImgLogKMax),
      uMin: Math.pow(10, newImgLogUMin),
      uMax: Math.pow(10, newImgLogUMax),
    }

    draw()
  }, [loadedImage, worldToScreen, draw])

  return { resetZoom, resetImageBounds, zoomImage, highlightNode, applyCalibration, canvasRef, wrapperRef }
}


// ─── GraphCanvasView ──────────────────────────────────────────────────────────
export function GraphCanvasView({
  canvasRef, wrapperRef, nodeCount, edgeCount, nodes,
  placementMode, loadedImage, onRemoveImage,
  imageAdjustMode, onToggleImageAdjust,
  imageOpacity, onChangeImageOpacity,
  onResetImageBounds, onZoomImage,
  calibrateMode, calibPoints, onCancelCalibrate,
}) {
  const { isDark } = useTheme()

  const cursorClass = calibrateMode
    ? 'cursor-crosshair'
    : placementMode
      ? 'cursor-crosshair'
      : imageAdjustMode
        ? 'cursor-move'
        : 'graph-canvas'

  return (
    <div className={`relative w-full h-full flex-1 ${isDark ? 'bg-[#05070d]' : 'bg-slate-100'}`} ref={wrapperRef} style={{ minHeight: 0 }}>
      {/* Legend */}
      <div className="absolute top-8 left-16 z-10 flex items-center gap-2.5 px-2.5 py-1 text-xs pointer-events-none select-none">
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

      {/* Calibrate mode banner */}
      {calibrateMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-purple-700/95 text-white text-xs font-semibold shadow-lg backdrop-blur-sm flex items-center gap-3">
          <svg className="w-4 h-4 shrink-0 text-purple-200" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span>
            Modo Calibração — Clique os 3 pontos de referência na imagem&nbsp;
            {calibPoints.length === 0 && <strong className="text-red-300">① Origem (O)</strong>}
            {calibPoints.length === 1 && <strong className="text-emerald-300">② Eixo X</strong>}
            {calibPoints.length === 2 && <strong className="text-blue-300">③ Eixo Y</strong>}
            {calibPoints.length === 3 && <strong className="text-yellow-300">✓ Preencha os valores →</strong>}
          </span>
          <button
            onClick={onCancelCalibrate}
            className="px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] shadow active:scale-95 transition"
          >
            Esc
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className={`w-full h-full block ${cursorClass}`} />
    </div>
  )
}

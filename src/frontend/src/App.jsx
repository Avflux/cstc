import { useState, useEffect } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import Header from './components/Header'
import GraphToolbar from './components/GraphToolbar'
import GraphCanvas, { GraphCanvasView } from './components/GraphCanvas'
import MeasurementsSidebar from './components/MeasurementsSidebar'
import { initialNodes, initialEdges } from './data/initialData'

let nodeCounter = 0

function formatCoordVal(val) {
  if (val >= 100) return val.toFixed(1)
  if (val >= 10) return val.toFixed(2)
  return val.toFixed(3)
}

function AppContent() {
  const [nodes, setNodes] = useState(() => JSON.parse(JSON.stringify(initialNodes)))
  const [edges, setEdges] = useState(() => JSON.parse(JSON.stringify(initialEdges)))
  const [highlightedNodeIndex, setHighlightedNodeIndex] = useState(null)
  const [cursorK, setCursorK] = useState('0.0')
  const [cursorU, setCursorU] = useState('0.0')
  const [zoomLevel, setZoomLevel] = useState('100%')
  const [triggerRedraw, setTriggerRedraw] = useState(0)
  const [placementMode, setPlacementMode] = useState(false)
  const [loadedImage, setLoadedImage] = useState(null)
  const [imageAdjustMode, setImageAdjustMode] = useState(false)
  const [imageOpacity, setImageOpacity] = useState(0.5)
  const [calibrateMode, setCalibrateMode] = useState(false)
  const [calibPoints, setCalibPoints] = useState([])

  const measurements = nodes.map((node) => ({
    id: `${node.id} - ${node.label}`,
    u: formatCoordVal(node.u),
    k: formatCoordVal(node.k),
    rawU: node.u,
    rawK: node.k,
    bay1: false,
  }))

  // handlePlaceNode and handleCalibClick are declared as regular functions
  // so they hoist above the GraphCanvas() hook call below.
  function handlePlaceNode(k, u) {
    nodeCounter++
    const newNode = {
      id: `N${nodeCounter.toString().padStart(2, '0')}`,
      label: `Ponto ${nodeCounter}`,
      k: parseFloat(k),
      u: parseFloat(u),
      bay1: false,
    }
    setNodes((prev) => [...prev, newNode])
    setTriggerRedraw((n) => n + 1)
  }

  function handleCalibClick(sx, sy) {
    setCalibPoints((prev) => {
      if (prev.length >= 3) return prev
      return [...prev, { sx, sy }]
    })
  }

  const graphControls = GraphCanvas({
    nodes, edges, highlightedNodeIndex,
    onHighlightNode: setHighlightedNodeIndex,
    onCursorMove: (k, u) => { setCursorK(k); setCursorU(u) },
    onZoomChange: (z) => setZoomLevel(z + '%'),
    triggerRedraw,
    placementMode, onPlaceNode: handlePlaceNode,
    loadedImage,
    imageAdjustMode,
    imageOpacity,
    calibrateMode,
    calibPoints,
    onCalibClick: handleCalibClick,
  })

  const handleResetZoom = graphControls.resetZoom

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (placementMode) setPlacementMode(false)
        if (imageAdjustMode) setImageAdjustMode(false)
        if (calibrateMode) { setCalibrateMode(false); setCalibPoints([]) }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [placementMode, imageAdjustMode, calibrateMode])

  const togglePlacementMode = () => {
    if (!placementMode && imageAdjustMode) {
      setImageAdjustMode(false)
    }
    setPlacementMode((prev) => !prev)
  }

  const toggleImageAdjustMode = (val) => {
    const nextVal = typeof val === 'boolean' ? val : !imageAdjustMode
    if (nextVal && placementMode) {
      setPlacementMode(false)
    }
    setImageAdjustMode(nextVal)
  }

  const startCalibrate = () => {
    if (!loadedImage) return
    setPlacementMode(false)
    setImageAdjustMode(false)
    setCalibPoints([])
    setCalibrateMode(true)
  }

  const cancelCalibrate = () => {
    setCalibrateMode(false)
    setCalibPoints([])
  }

  const applyCalibrate = (realValues) => {
    graphControls.applyCalibration(calibPoints, realValues)
    setCalibrateMode(false)
    setCalibPoints([])
    setTriggerRedraw((n) => n + 1)
  }

  function handleAddManualMeasurement(u, io) {
    nodeCounter++
    const newNode = {
      id: `N${nodeCounter.toString().padStart(2, '0')}`,
      label: `Ponto ${nodeCounter}`,
      k: parseFloat(io),
      u: parseFloat(u),
      bay1: false,
    }
    setNodes((prev) => [...prev, newNode])
    setTriggerRedraw((n) => n + 1)
  }

  function handleDeleteNode(idx) {
    setNodes((prev) => prev.filter((_, i) => i !== idx))
    setEdges((prev) =>
      prev
        .filter(([i, j]) => i !== idx && j !== idx)
        .map(([i, j]) => [i > idx ? i - 1 : i, j > idx ? j - 1 : j])
    )
    setHighlightedNodeIndex(null)
    setTriggerRedraw((n) => n + 1)
  }

  function handleBuildEdges() {
    if (nodes.length < 2) return
    const newEdges = []
    for (let i = 0; i < nodes.length - 1; i++) {
      newEdges.push([i, i + 1])
    }
    setEdges(newEdges)
    setTriggerRedraw((n) => n + 1)
  }

  const handleHighlightFromTable = (idx) => {
    if (idx < nodes.length) graphControls.highlightNode(idx)
  }

  // Image upload
  const handleImageUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
        const reader = new FileReader()
        reader.onload = (ev) => {
          const img = new Image()
          img.onload = () => {
            setLoadedImage(img)
            setImageAdjustMode(true) // Automatically activate adjust mode to allow initial fitting
            setTriggerRedraw((n) => n + 1)
          }
          img.src = ev.target.result
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const handleRemoveImage = () => {
    setLoadedImage(null)
    setImageAdjustMode(false)
    setCalibrateMode(false)
    setCalibPoints([])
    setTriggerRedraw((n) => n + 1)
  }

  const handleExport = () => {
    let csv = 'data:text/csv;charset=utf-8,Pontos Medicao,U(V),Io(mA)\n'
    measurements.forEach((r) => { csv += `"${r.id}",${r.u},${r.k}\n` })
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csv))
    link.setAttribute('download', 'medicoes_curva_excitacao.csv')
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  return (
    <div className="h-screen max-h-screen w-screen max-w-screen overflow-hidden flex flex-col font-sans select-none bg-slate-50 text-slate-800 dark:bg-[#080c14] dark:text-slate-100 transition-colors duration-200">
      <Header
        onImageUpload={handleImageUpload}
        onExport={handleExport}
      />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ minHeight: 0 }}>
        {/* Left - Graph */}
        <section className="flex-1 lg:w-[68%] xl:w-[72%] flex flex-col overflow-hidden border-r border-slate-200 dark:border-[#1a2333] dark:bg-slate-900 bg-slate-200" style={{ minHeight: 0 }}>
          <GraphToolbar
            onResetZoom={handleResetZoom}
            onAddNode={togglePlacementMode}
            onBuildEdges={handleBuildEdges}
            cursorK={cursorK}
            cursorU={cursorU}
            zoomLevel={zoomLevel}
            placementMode={placementMode}
            nodeCount={nodes.length}
            edgeCount={edges.length}
            imageAdjustMode={imageAdjustMode}
            calibrateMode={calibrateMode}
            loadedImage={loadedImage}
            onToggleImageAdjust={toggleImageAdjustMode}
            onZoomImage={graphControls.zoomImage}
            onResetImageBounds={graphControls.resetImageBounds}
            imageOpacity={imageOpacity}
            onChangeImageOpacity={setImageOpacity}
            onRemoveImage={handleRemoveImage}
            onStartCalibrate={startCalibrate}
          />
          <GraphCanvasView
            canvasRef={graphControls.canvasRef}
            wrapperRef={graphControls.wrapperRef}
            nodeCount={nodes.length}
            edgeCount={edges.length}
            nodes={nodes}
            placementMode={placementMode}
            loadedImage={loadedImage}
            onRemoveImage={handleRemoveImage}
            imageAdjustMode={imageAdjustMode}
            onToggleImageAdjust={toggleImageAdjustMode}
            imageOpacity={imageOpacity}
            onChangeImageOpacity={setImageOpacity}
            onResetImageBounds={graphControls.resetImageBounds}
            onZoomImage={graphControls.zoomImage}
            calibrateMode={calibrateMode}
            calibPoints={calibPoints}
            onCancelCalibrate={cancelCalibrate}
            onApplyCalibrate={applyCalibrate}
          />
        </section>

        {/* Right - Sidebar */}
        <MeasurementsSidebar
          measurements={measurements}
          onHighlightNode={handleHighlightFromTable}
          onDeleteNode={handleDeleteNode}
          onAddMeasurement={handleAddManualMeasurement}
          calibrateMode={calibrateMode}
          calibPoints={calibPoints}
          onCancelCalibrate={cancelCalibrate}
          onApplyCalibrate={applyCalibrate}
        />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

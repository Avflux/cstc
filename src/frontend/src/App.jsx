import { useState, useEffect } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import Header from './components/Header'
import GraphToolbar from './components/GraphToolbar'
import GraphCanvas, { GraphCanvasView } from './components/GraphCanvas'
import MeasurementsSidebar from './components/MeasurementsSidebar'
import { initialNodes, initialEdges } from './data/initialData'

let nodeCounter = 0

function AppContent() {
  const [nodes, setNodes] = useState(() => JSON.parse(JSON.stringify(initialNodes)))
  const [edges, setEdges] = useState(() => JSON.parse(JSON.stringify(initialEdges)))
  const [highlightedNodeIndex, setHighlightedNodeIndex] = useState(null)
  const [cursorK, setCursorK] = useState('0.0')
  const [cursorU, setCursorU] = useState('226.0')
  const [zoomLevel, setZoomLevel] = useState('100%')
  const [triggerRedraw, setTriggerRedraw] = useState(0)

  const [placementMode, setPlacementMode] = useState(false)

  const measurements = nodes.map((node) => ({
    id: `${node.id} - ${node.label}`,
    u: node.u.toFixed(1),
    k: node.k.toFixed(1),
    bay1: false,
  }))

  const graphControls = GraphCanvas({
    nodes, edges, highlightedNodeIndex,
    onHighlightNode: setHighlightedNodeIndex,
    onCursorMove: (k, u) => { setCursorK(k); setCursorU(u) },
    onZoomChange: (z) => setZoomLevel(z + '%'),
    triggerRedraw,
    placementMode, onPlaceNode: handlePlaceNode,
  })

  const handleResetZoom = graphControls.resetZoom

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setPlacementMode(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleResetGraph = () => {
    setNodes([]); setEdges([]); nodeCounter = 0
    setHighlightedNodeIndex(null); setPlacementMode(false)
    graphControls.resetGraph()
  }

  const togglePlacementMode = () => {
    setPlacementMode((prev) => !prev)
  }

  function handlePlaceNode(k, u) {
    nodeCounter++
    const newNode = {
      id: `N${nodeCounter.toString().padStart(2, '0')}`,
      label: `Ponto ${nodeCounter}`,
      k: parseFloat(k.toFixed(1)),
      u: parseFloat(u.toFixed(1)),
      bay1: false,
    }
    setNodes((prev) => [...prev, newNode])
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

  const handleImageUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = (e) => {
      if (e.target.files && e.target.files[0]) alert('Imagem selecionada: ' + e.target.files[0].name)
    }
    input.click()
  }

  const handleExport = () => {
    let csv = 'data:text/csv;charset=utf-8,Pontos Medicao,U(V),K(mA)\n'
    measurements.forEach((r) => { csv += `"${r.id}",${r.u},${r.k}\n` })
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csv))
    link.setAttribute('download', 'medicoes_subestacao_bay1.csv')
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  return (
    <div className="h-screen max-h-screen w-screen max-w-screen overflow-hidden flex flex-col font-sans select-none bg-slate-50 text-slate-800 dark:bg-[#080c14] dark:text-slate-100 transition-colors duration-200">
      <Header onImageUpload={handleImageUpload} onExport={handleExport} />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ minHeight: 0 }}>
        {/* Left - Graph */}
        <section className="flex-1 lg:w-[68%] xl:w-[72%] flex flex-col overflow-hidden border-r border-slate-200 dark:border-[#1a2333] dark:bg-slate-900 bg-slate-200" style={{ minHeight: 0 }}>
          <GraphToolbar
            onResetZoom={handleResetZoom}
            onResetGraph={handleResetGraph}
            onAddNode={togglePlacementMode}
            onBuildEdges={handleBuildEdges}
            cursorK={cursorK}
            cursorU={cursorU}
            zoomLevel={zoomLevel}
            placementMode={placementMode}
            nodeCount={nodes.length}
            edgeCount={edges.length}
          />
          <GraphCanvasView
            canvasRef={graphControls.canvasRef}
            wrapperRef={graphControls.wrapperRef}
            nodeCount={nodes.length}
            edgeCount={edges.length}
            nodes={nodes}
            placementMode={placementMode}
          />
        </section>

        {/* Right - Sidebar */}
        <MeasurementsSidebar
          measurements={measurements}
          onHighlightNode={handleHighlightFromTable}
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

(async function () {
  const graphEl = document.getElementById("network-graph")
  const controlsEl = document.getElementById("network-controls")
  const searchEl = document.getElementById("network-search")

  if (!graphEl || !controlsEl) return

  const res = await fetch("/static/contentIndex.json")
  const index = await res.json()

  function getType(slug) {
    if (slug.startsWith("04-Персонажи/Игроки/")) return "player"
    if (slug.startsWith("04-Персонажи/НПС/Живы/")) return "npc_alive"
    if (slug.startsWith("04-Персонажи/НПС/Мертвы/")) return "npc_dead"
    if (slug.startsWith("05-Фракции/")) return "faction"
    if (slug.startsWith("06-Локации/")) return "location"
    if (slug.startsWith("03-Серии/")) return "episode"
    if (slug.startsWith("07-События/")) return "event"
    if (slug.startsWith("02-Сезоны/")) return "season"
    if (slug.startsWith("01-Хроники/")) return "chronicle"
    if (slug.startsWith("08-Справка/")) return "reference"
    if (slug === "index") return "index"
    return "other"
  }

  function getColor(type) {
    switch (type) {
      case "player":
        return "#2563eb" // игроки
      case "npc_alive":
        return "#60a5fa" // НПС живые
      case "npc_dead":
        return "#9ca3af" // НПС мёртвые
      case "faction":
        return "#ef4444"
      case "location":
        return "#22c55e"
      case "episode":
        return "#f59e0b"
      case "event":
        return "#a855f7"
      case "season":
        return "#f97316"
      case "chronicle":
        return "#06b6d4"
      case "reference":
        return "#6b7280"
      case "index":
        return "#111827"
      default:
        return "#6b7280"
    }
  }

  const rawNodes = []
  const existingIds = new Set()

  for (const [slug, page] of Object.entries(index)) {
    existingIds.add(slug)
    const type = getType(slug)
    rawNodes.push({
      id: slug,
      label: page.title || slug,
      type,
      color: getColor(type),
    })
  }

  const rawLinks = []
  const seenLinks = new Set()

  for (const [slug, page] of Object.entries(index)) {
    for (const link of page.links || []) {
      if (!existingIds.has(link)) continue
      if (slug === link) continue

      const key = `${slug}→${link}`
      if (seenLinks.has(key)) continue
      seenLinks.add(key)

      rawLinks.push({
        source: slug,
        target: link,
      })
    }
  }

  const adjacency = new Map()
  rawNodes.forEach((n) => adjacency.set(n.id, new Set()))
  rawLinks.forEach((l) => {
    adjacency.get(l.source)?.add(l.target)
    adjacency.get(l.target)?.add(l.source)
  })

  const state = {
    types: {
      player: true,
      npc_alive: true,
      npc_dead: true,
      faction: true,
      location: true,
      episode: false,
      event: false,
      season: false,
      chronicle: false,
      reference: false,
      index: false,
      other: false,
    },
    selectedNodeId: null,
    search: "",
  }

  controlsEl.innerHTML = `
    <label><input type="checkbox" data-type="player" checked> Игроки</label>
    <label><input type="checkbox" data-type="npc_alive" checked> НПС живые</label>
    <label><input type="checkbox" data-type="npc_dead" checked> НПС мёртвые</label>
    <label><input type="checkbox" data-type="faction" checked> Фракции</label>
    <label><input type="checkbox" data-type="location" checked> Локации</label>
    <label><input type="checkbox" data-type="episode"> Серии</label>
    <label><input type="checkbox" data-type="event"> События</label>
    <label><input type="checkbox" data-type="season"> Сезоны</label>
    <label><input type="checkbox" data-type="chronicle"> Хроники</label>
    <label><input type="checkbox" data-type="reference"> Справка</label>
  `

  let highlightNodeIds = new Set()
  let highlightLinkKeys = new Set()

  function linkKey(link) {
    const s = typeof link.source === "object" ? link.source.id : link.source
    const t = typeof link.target === "object" ? link.target.id : link.target
    return `${s}→${t}`
  }

  function rebuildHighlights() {
    highlightNodeIds = new Set()
    highlightLinkKeys = new Set()

    if (!state.selectedNodeId) return

    highlightNodeIds.add(state.selectedNodeId)

    const neighbors = adjacency.get(state.selectedNodeId) || new Set()
    neighbors.forEach((n) => highlightNodeIds.add(n))

    for (const l of rawLinks) {
      if (l.source === state.selectedNodeId || l.target === state.selectedNodeId) {
        highlightLinkKeys.add(`${l.source}→${l.target}`)
      }
    }
  }

  function getVisibleGraph() {
    const activeTypes = new Set(
      Object.entries(state.types)
        .filter(([, value]) => value)
        .map(([type]) => type)
    )

    let nodes = rawNodes.filter((n) => activeTypes.has(n.type))

    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase()

      const foundNode = nodes.find((n) =>
        n.label.toLowerCase().includes(q)
      )

      if (foundNode) {
        const neighbors = adjacency.get(foundNode.id) || new Set()
        nodes = nodes.filter(
          (n) => n.id === foundNode.id || neighbors.has(n.id)
        )
      } else {
        nodes = []
      }
    }

    if (state.selectedNodeId) {
      const neighbors = adjacency.get(state.selectedNodeId) || new Set()
      nodes = nodes.filter(
        (n) => n.id === state.selectedNodeId || neighbors.has(n.id)
      )
    }

    const visibleIds = new Set(nodes.map((n) => n.id))
    const links = rawLinks.filter(
      (l) => visibleIds.has(l.source) && visibleIds.has(l.target)
    )

    return {
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    }
  }

  const graph = ForceGraph()(graphEl)
    .width(graphEl.clientWidth)
    .height(graphEl.clientHeight)
    .backgroundColor("#ffffff")
    .nodeId("id")
    .nodeLabel((node) => `${node.label} (${node.type})`)
    .nodeVal((node) => {
      if (state.selectedNodeId === node.id) return 8
      if (highlightNodeIds.has(node.id)) return 6
      return 4
    })
    .nodeCanvasObject((node, ctx, globalScale) => {
      const isSelected = state.selectedNodeId === node.id
      const isHighlighted = highlightNodeIds.has(node.id)
      const isDimmed = state.selectedNodeId && !isHighlighted

      const radius = isSelected ? 8 : isHighlighted ? 6 : 4

      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)

      if (isSelected) {
        ctx.fillStyle = "#111111"
      } else if (isDimmed) {
        ctx.fillStyle = "#d1d5db"
      } else {
        ctx.fillStyle = node.color
      }

      ctx.fill()

      const fontSize = Math.max(10 / globalScale, 4)
      if (globalScale >= 2.2) {
        ctx.font = `${fontSize}px Sans-Serif`
        ctx.fillStyle = isDimmed ? "#9ca3af" : "#222222"
        ctx.fillText(node.label, node.x + 8, node.y + 3)
      }
    })
    .linkColor((link) => {
      if (!state.selectedNodeId) return "rgba(120,120,120,0.25)"
      return highlightLinkKeys.has(linkKey(link))
        ? "rgba(0,0,0,0.8)"
        : "rgba(200,200,200,0.15)"
    })
    .linkWidth((link) => (highlightLinkKeys.has(linkKey(link)) ? 2.5 : 1))
    .cooldownTicks(120)
    .onNodeClick((node) => {
      state.selectedNodeId = node.id
      rebuildHighlights()
      render()
      setTimeout(() => {
        graph.centerAt(node.x, node.y, 400)
        graph.zoom(2.5, 400)
      }, 50)
    })
    .onBackgroundClick(() => {
      state.selectedNodeId = null
      rebuildHighlights()
      render()
      setTimeout(() => graph.zoomToFit(400, 80), 50)
    })
    .onEngineStop(() => {
      if (!state.selectedNodeId) {
        graph.zoomToFit(400, 80)
      }
    })

  function render() {
    rebuildHighlights()
    const visible = getVisibleGraph()
    graph.graphData(visible)

    setTimeout(() => {
      if (!state.selectedNodeId) graph.zoomToFit(400, 80)
    }, 100)
  }

  controlsEl.querySelectorAll("input[type=checkbox]").forEach((input) => {
    input.addEventListener("change", (e) => {
      const type = e.target.dataset.type
      state.types[type] = e.target.checked
      state.selectedNodeId = null
      rebuildHighlights()
      render()
    })
  })

  if (searchEl) {
    searchEl.addEventListener("input", (e) => {
      state.search = e.target.value || ""
      state.selectedNodeId = null
      rebuildHighlights()
      render()
    })
  }

  window.addEventListener("resize", () => {
    graph.width(graphEl.clientWidth)
    graph.height(graphEl.clientHeight)
    setTimeout(() => graph.zoomToFit(400, 80), 100)
  })

  render()
})()
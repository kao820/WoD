(function () {
  let initializedFor = null

  function initNetworkGraph() {
    const graphEl = document.getElementById("network-graph")
    const controlsEl = document.getElementById("network-controls")
    const searchEl = document.getElementById("network-search")

    if (!graphEl || !controlsEl) return
    if (initializedFor === graphEl) return
    initializedFor = graphEl

    let didInitialZoom = false
    let userMovedNode = false

    // Determine whether the site is in dark mode by checking the `dark` class on the html element.
    const isDarkMode = document.documentElement.classList.contains("dark")
    // Colour palette tuned for dark/light modes. We use brighter colours for
    // dark mode so text and lines remain readable against the dark background.
    const style = {
      linkNormal: isDarkMode ? "rgba(150,150,150,0.3)" : "rgba(120,120,120,0.25)",
      linkHighlight: isDarkMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.8)",
      textNormal: isDarkMode ? "#e5e7eb" : "#222222",
      textDim: isDarkMode ? "#94a3b8" : "#9ca3af",
      nodeSelected: isDarkMode ? "#facc15" : "#111111",
      nodeDim: isDarkMode ? "rgba(255,255,255,0.3)" : "#e5e7eb",
    }

    fetch(new URL("static/contentIndex.json", window.location.href))
      .then((res) => res.json())
      .then((index) => {
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
            case "player": return "#2563eb"
            case "npc_alive": return "#60a5fa"
            case "npc_dead": return "#9ca3af"
            case "faction": return "#ef4444"
            case "location": return "#22c55e"
            case "episode": return "#f59e0b"
            case "event": return "#a855f7"
            case "season": return "#f97316"
            case "chronicle": return "#06b6d4"
            case "reference": return "#6b7280"
            case "index": return "#111827"
            default: return "#6b7280"
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
          isolatedMode: true,
        }

        controlsEl.innerHTML = `
          <label style="display:flex; gap:8px; align-items:flex-start; white-space:nowrap;"><input type="checkbox" data-type="player" checked> <span>Игроки</span></label>
          <label style="display:flex; gap:8px; align-items:flex-start; white-space:nowrap;"><input type="checkbox" data-type="npc_alive" checked> <span>НПС живые</span></label>
          <label style="display:flex; gap:8px; align-items:flex-start; white-space:nowrap;"><input type="checkbox" data-type="npc_dead" checked> <span>НПС мёртвые</span></label>
          <label style="display:flex; gap:8px; align-items:flex-start; white-space:nowrap;"><input type="checkbox" data-type="faction" checked> <span>Фракции</span></label>
          <label style="display:flex; gap:8px; align-items:flex-start; white-space:nowrap;"><input type="checkbox" data-type="location" checked> <span>Локации</span></label>
          <label style="display:flex; gap:8px; align-items:flex-start; white-space:nowrap;"><input type="checkbox" data-type="episode"> <span>Серии</span></label>
          <label style="display:flex; gap:8px; align-items:flex-start; white-space:nowrap;"><input type="checkbox" data-type="event"> <span>События</span></label>
          <label style="display:flex; gap:8px; align-items:flex-start; white-space:nowrap;"><input type="checkbox" data-type="season"> <span>Сезоны</span></label>
          <label style="display:flex; gap:8px; align-items:flex-start; white-space:nowrap;"><input type="checkbox" data-type="chronicle"> <span>Хроники</span></label>
          <label style="display:flex; gap:8px; align-items:flex-start; white-space:nowrap;"><input type="checkbox" data-type="reference"> <span>Справка</span></label>
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

        function getBaseFilteredNodes() {
          const activeTypes = new Set(
            Object.entries(state.types)
              .filter(([, value]) => value)
              .map(([type]) => type)
          )

          return rawNodes.filter((n) => activeTypes.has(n.type))
        }

        function getVisibleGraph() {
          let nodes = getBaseFilteredNodes()

          if (state.search.trim()) {
            const q = state.search.trim().toLowerCase()
            const foundNode = nodes.find((n) => n.label.toLowerCase().includes(q))

            if (foundNode) {
              const neighbors = adjacency.get(foundNode.id) || new Set()
              nodes = nodes.filter(
                (n) => n.id === foundNode.id || neighbors.has(n.id)
              )
            } else {
              nodes = []
            }
          }

          if (state.selectedNodeId && state.isolatedMode) {
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
          .backgroundColor(getComputedStyle(graphEl).backgroundColor || "#111827")
          .nodeId("id")
          .nodeLabel((node) => `${node.label} (${node.type})`)
          .nodeVal((node) => {
            if (state.selectedNodeId === node.id) return 5.2
            if (highlightNodeIds.has(node.id)) return 4.2
            return 2.8
          })
          .nodeCanvasObject((node, ctx, globalScale) => {
            const isSelected = state.selectedNodeId === node.id
            const isHighlighted = highlightNodeIds.has(node.id)
            const isDimmed = !state.isolatedMode && state.selectedNodeId && !isHighlighted

            const radius = isSelected ? 5.2 : isHighlighted ? 4.2 : 2.8

            ctx.beginPath()
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)

            if (isSelected) {
              ctx.fillStyle = style.nodeSelected
            } else if (isDimmed) {
              ctx.fillStyle = style.nodeDim
            } else {
              ctx.fillStyle = node.color
            }

            ctx.fill()

            const fontSize = Math.max(10 / globalScale, 4)
            if (globalScale >= 6 || isSelected) {
              ctx.font = `${fontSize}px Sans-Serif`
              ctx.fillStyle = isDimmed ? style.textDim : style.textNormal
              ctx.fillText(node.label, node.x + 8, node.y + 3)
            }
          })
          .linkColor((link) => {
            if (!state.selectedNodeId) return style.linkNormal
            return highlightLinkKeys.has(linkKey(link))
              ? style.linkHighlight
              : style.linkNormal
          })
          .linkWidth((link) => (highlightLinkKeys.has(linkKey(link)) ? 2.5 : 1))
          .cooldownTicks(320)
          .d3AlphaDecay(0.018)
          .d3VelocityDecay(0.45)
          .onNodeClick((node) => {
            state.selectedNodeId = node.id
            rebuildHighlights()
            render()
            setTimeout(() => {
              graph.centerAt(node.x, node.y, 400)
              graph.zoom(2.2, 400)
            }, 50)
          })
          .onNodeDrag(() => {
            userMovedNode = true
          })
          .onNodeDragEnd(() => {
            userMovedNode = true
          })
          .onBackgroundClick(() => {
            state.selectedNodeId = null
            rebuildHighlights()
            render()
            setTimeout(() => {
              if (!userMovedNode) graph.zoomToFit(500, 140)
            }, 50)
          })
          .onEngineStop(() => {
            if (!didInitialZoom && !state.selectedNodeId && !userMovedNode) {
              didInitialZoom = true
              graph.zoomToFit(500, 140)
            }
          })

        function render() {
          rebuildHighlights()
          const visible = getVisibleGraph()
          graph.graphData(visible)

          setTimeout(() => {
            if (!didInitialZoom && !state.selectedNodeId && !userMovedNode) {
              graph.zoomToFit(500, 140)
              didInitialZoom = true
            }
          }, 120)
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
          setTimeout(() => {
            if (!state.selectedNodeId && !userMovedNode) {
              graph.zoomToFit(500, 140)
            }
          }, 100)
        })

        render()
      })
      .catch((err) => {
        console.error("Ошибка инициализации карты связей:", err)
      })
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNetworkGraph)
  } else {
    initNetworkGraph()
  }

  window.addEventListener("pageshow", initNetworkGraph)

  // Quartz dispatches a custom "nav" event on SPA navigations. Listen for this
  // event so we can re-initialize the graph when navigating between pages
  // without requiring a full reload. See Quartz docs:
  // https://quartz.jzhao.xyz/advanced/creating-components#scripts-and-interactivity
  document.addEventListener("nav", initNetworkGraph)

  const observer = new MutationObserver(() => {
    if (document.getElementById("network-graph")) {
      initNetworkGraph()
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
})()

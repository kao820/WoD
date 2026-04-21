;(function () {
  let initializedGraphEl = null
  let mutationObserverStarted = false

  function initNetworkGraph() {
    removeLegacyThemeToggle()
    removeLegacyExpandButtons()

    const graphEl = document.getElementById("network-graph")
    const topLayoutEl = document.getElementById("network-top-layout")
    const searchEl = document.getElementById("network-search")
    const fitButton = document.getElementById("network-fit-button")
    const expandIcon = document.getElementById("network-expand-icon")
    const collapseIcon = document.getElementById("network-collapse-icon")
    const resetButton = document.getElementById("network-reset-button")
    const resetColorsButton = document.getElementById("network-reset-colors-button")

    if (
      !graphEl ||
      !topLayoutEl ||
      !searchEl ||
      !fitButton ||
      !expandIcon ||
      !collapseIcon ||
      !resetButton ||
      !resetColorsButton
    )
      return
    if (initializedGraphEl === graphEl) return
    initializedGraphEl = graphEl

    if (typeof ForceGraph !== "function") {
      console.error("ForceGraph не загрузился.")
      return
    }

    function removeLegacyThemeToggle() {
      const legacyToggleSelectors = [
        "label.network-theme-toggle",
        "label[for='network-theme-checkbox']",
        "#network-theme-checkbox",
      ]

      const legacyNodes = document.querySelectorAll(legacyToggleSelectors.join(","))
      legacyNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        const wrap = node.closest("label.network-theme-toggle")
        if (wrap) {
          wrap.remove()
          return
        }
        node.remove()
      })
    }

    function removeLegacyExpandButtons() {
      const toolbar = document.querySelector(".network-toolbar")
      if (!(toolbar instanceof HTMLElement)) return

      const legacyExpandButtons = Array.from(toolbar.querySelectorAll("button")).filter(
        (button) =>
          button.id === "network-expand-button" || button.textContent?.trim() === "Развернуть",
      )

      legacyExpandButtons.forEach((button) => button.remove())
    }

    let graph = null
    let resizeFitTimer = null
    let userMovedNode = false
    let style = computeStyle()

    const RESET_FIT_PADDING = 24
    const RESIZE_FIT_PADDING = 28

    const DEFAULT_SETTINGS = {
      charge: 130,
      linkDistance: 78,
      linkStrength: 105,
      labelThreshold: 120,
      nodeScale: 100,
      lineWidth: 100,
    }

    const STRUCTURAL_SETTINGS = {
      charge: 16,
      linkDistance: 34,
      linkStrength: 185,
      labelThreshold: 125,
      nodeScale: 100,
      lineWidth: 100,
    }

    const CONTROL_COLUMNS = [
      [
        { type: "player", label: "Игроки (живые)" },
        { type: "player_dead", label: "Игроки (мёртвые)" },
        { type: "npc_alive", label: "НПС (живые)" },
        { type: "npc_dead", label: "НПС (мёртвые)" },
      ],
      [
        { type: "faction", label: "Фракции" },
        { type: "location", label: "Локации" },
        { type: "reference", label: "Справка" },
      ],
      [
        { type: "timeline", label: "Хронология" },
        { type: "season", label: "Сезоны" },
        { type: "episode", label: "Серии" },
        { type: "tag", label: "Теги" },
      ],
    ]

    const SETTING_DEFS = [
      {
        key: "charge",
        label: "Сила отталкивания",
        min: 5,
        max: 400,
        step: 1,
        format: (value) => `-${value}`,
      },
      {
        key: "linkDistance",
        label: "Расстояние узлов",
        min: 20,
        max: 180,
        step: 1,
        format: (value) => `${value}`,
      },
      {
        key: "linkStrength",
        label: "Сила связи",
        min: 20,
        max: 220,
        step: 1,
        format: (value) => `${(value / 100).toFixed(2)}`,
      },
      {
        key: "labelThreshold",
        label: "Порог подписей",
        min: 80,
        max: 220,
        step: 1,
        format: (value) => `${(value / 100).toFixed(2)}`,
      },
      {
        key: "nodeScale",
        label: "Размер узлов",
        min: 50,
        max: 220,
        step: 1,
        format: (value) => `${(value / 100).toFixed(2)}x`,
      },
      {
        key: "lineWidth",
        label: "Толщина линий",
        min: 45,
        max: 240,
        step: 1,
        format: (value) => `${(value / 100).toFixed(2)}x`,
      },
    ]

    const settings = { ...DEFAULT_SETTINGS }
    let themeDefaultColors = getThemeDefaultColors()
    const colorMap = { ...themeDefaultColors }

    const state = {
      types: {
        player: true,
        player_dead: true,
        npc_alive: true,
        npc_dead: true,
        faction: true,
        location: true,
        reference: true,
        timeline: true,
        season: true,
        episode: true,
        tag: false,
        campaign_hub: true,
        index: false,
        other: false,
      },
      selectedNodeId: null,
      hoveredNodeId: null,
      search: "",
      isolatedMode: true,
    }

    const ui = {
      controlsEl: null,
      forcesLayoutEl: null,
      settingInputs: {},
      settingValues: {},
      settingsGridEl: null,
    }

    function clearResizeFitTimer() {
      if (resizeFitTimer) {
        clearTimeout(resizeFitTimer)
        resizeFitTimer = null
      }
    }

    function isDarkTheme() {
      const savedTheme = document.documentElement.getAttribute("saved-theme")
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      return savedTheme === "dark" || (!savedTheme && prefersDark)
    }

    function computeStyle() {
      const dark = isDarkTheme()

      return {
        linkNormal: dark ? "rgba(200,200,200,0.26)" : "rgba(120,120,120,0.22)",
        textNormal: dark ? "#f1f5f9" : "#222222",
        textDim: dark ? "#94a3af" : "#9ca3af",
        nodeSelected: dark ? "#f8fafc" : "#111111",
        nodeDim: dark ? "rgba(255,255,255,0.35)" : "#d1d5db",
      }
    }

    function getNeutralThemeColor() {
      return isDarkTheme() ? "#94a3b8" : "#94a3af"
    }

    function getThemeDefaultColors() {
      const neutral = getNeutralThemeColor()

      return {
        campaign_hub: neutral,
        player: neutral,
        player_dead: neutral,
        npc_alive: neutral,
        npc_dead: neutral,
        faction: neutral,
        location: neutral,
        reference: neutral,
        timeline: neutral,
        season: neutral,
        episode: neutral,
        tag: neutral,
        index: neutral,
        other: neutral,
      }
    }

    function buildTopPanels() {
      topLayoutEl.replaceChildren()

      const controlsPanel = document.createElement("div")
      controlsPanel.className = "network-panel"

      const controlsTitle = document.createElement("div")
      controlsTitle.className = "network-panel-title"
      controlsTitle.textContent = "Группировка и цвета"

      const controlsEl = document.createElement("div")
      controlsEl.id = "network-controls"
      controlsEl.className = "network-controls-grid"

      controlsPanel.appendChild(controlsTitle)
      controlsPanel.appendChild(controlsEl)

      const settingsPanel = document.createElement("div")
      settingsPanel.className = "network-panel"

      const settingsTitle = document.createElement("div")
      settingsTitle.className = "network-panel-title"
      settingsTitle.textContent = "Настройки графа"

      const forcesLayoutEl = document.createElement("div")
      forcesLayoutEl.id = "network-forces-layout"
      forcesLayoutEl.className = "network-forces-layout"

      settingsPanel.appendChild(settingsTitle)
      settingsPanel.appendChild(forcesLayoutEl)

      topLayoutEl.appendChild(controlsPanel)
      topLayoutEl.appendChild(settingsPanel)

      ui.controlsEl = controlsEl
      ui.forcesLayoutEl = forcesLayoutEl
    }

    function buildControls() {
      ui.controlsEl.replaceChildren()

      CONTROL_COLUMNS.forEach((column) => {
        const columnEl = document.createElement("div")
        columnEl.className = "network-controls-column"

        column.forEach((item) => {
          const rowEl = document.createElement("div")
          rowEl.className = "network-control-row"

          const toggle = document.createElement("button")
          toggle.type = "button"
          toggle.className = `network-toggle${state.types[item.type] ? " is-on" : ""}`
          toggle.dataset.type = item.type
          toggle.setAttribute("aria-label", item.label)
          toggle.setAttribute("aria-pressed", state.types[item.type] ? "true" : "false")
          toggle.title = item.label
          const toggleThumb = document.createElement("span")
          toggleThumb.className = "network-toggle-thumb"
          toggle.appendChild(toggleThumb)

          const label = document.createElement("button")
          label.type = "button"
          label.className = "network-control-label"
          label.dataset.type = item.type
          label.textContent = item.label
          label.style.background = "transparent"
          label.style.border = "0"
          label.style.padding = "0"
          label.style.margin = "0"
          label.style.textAlign = "left"
          label.style.color = "inherit"
          label.title = item.label

          const colorWrap = document.createElement("div")
          colorWrap.className = "network-color-picker"

          const colorDot = document.createElement("span")
          colorDot.className = "network-color-dot"
          colorDot.style.background = colorMap[item.type] || getNeutralThemeColor()

          const colorInput = document.createElement("input")
          colorInput.type = "color"
          colorInput.className = "network-color-input"
          colorInput.dataset.colorType = item.type
          colorInput.value = colorMap[item.type] || getNeutralThemeColor()
          colorInput.setAttribute("aria-label", `Цвет: ${item.label}`)
          colorInput.title = `Цвет: ${item.label}`

          colorWrap.appendChild(colorDot)
          colorWrap.appendChild(colorInput)

          rowEl.appendChild(toggle)
          rowEl.appendChild(label)
          rowEl.appendChild(colorWrap)
          columnEl.appendChild(rowEl)
        })

        ui.controlsEl.appendChild(columnEl)
      })
    }

    function buildForcesPanel() {
      ui.forcesLayoutEl.replaceChildren()
      ui.settingInputs = {}
      ui.settingValues = {}

      const settingsGridEl = document.createElement("div")
      settingsGridEl.className = "network-settings-grid"

      SETTING_DEFS.forEach((item) => {
        const settingEl = document.createElement("div")
        settingEl.className = "network-setting"

        const label = document.createElement("label")
        label.htmlFor = `network-setting-${item.key}`
        label.textContent = item.label

        const row = document.createElement("div")
        row.className = "network-setting-row"

        const input = document.createElement("input")
        input.type = "range"
        input.id = `network-setting-${item.key}`
        input.min = String(item.min)
        input.max = String(item.max)
        input.step = String(item.step)
        input.dataset.settingKey = item.key

        const valueEl = document.createElement("span")
        valueEl.className = "network-setting-value"

        row.appendChild(input)
        row.appendChild(valueEl)
        settingEl.appendChild(label)
        settingEl.appendChild(row)
        settingsGridEl.appendChild(settingEl)

        ui.settingInputs[item.key] = input
        ui.settingValues[item.key] = valueEl
      })

      ui.forcesLayoutEl.appendChild(settingsGridEl)
      ui.settingsGridEl = settingsGridEl
    }

    function updateSettingLabels() {
      SETTING_DEFS.forEach((item) => {
        const valueEl = ui.settingValues[item.key]
        if (valueEl) {
          valueEl.textContent = item.format(settings[item.key])
        }
      })
    }

    function syncSettingInputs() {
      SETTING_DEFS.forEach((item) => {
        const input = ui.settingInputs[item.key]
        if (input) {
          input.value = String(settings[item.key])
        }
      })
      updateSettingLabels()
    }

    function getActiveTypes() {
      return new Set(
        Object.entries(state.types)
          .filter(([, enabled]) => enabled)
          .map(([type]) => type),
      )
    }

    function shouldIncludeCampaignHub(activeTypes) {
      return activeTypes.has("timeline") || activeTypes.has("season") || activeTypes.has("episode")
    }

    function isStructuralOnly(activeTypes) {
      return (
        activeTypes.size > 0 &&
        [...activeTypes].every((type) => ["timeline", "season", "episode"].includes(type))
      )
    }

    function applyPresetForActiveTypes() {
      const activeTypes = getActiveTypes()
      const preset = isStructuralOnly(activeTypes) ? STRUCTURAL_SETTINGS : DEFAULT_SETTINGS

      settings.charge = preset.charge
      settings.linkDistance = preset.linkDistance
      settings.linkStrength = preset.linkStrength
      settings.labelThreshold = preset.labelThreshold

      syncSettingInputs()
    }

    function getNodeColor(node) {
      return colorMap[node.type] || themeDefaultColors[node.type] || getNeutralThemeColor()
    }

    function normalizeTag(tag) {
      return String(tag || "")
        .trim()
        .replace(/^#/, "")
        .replace(/^tags\//, "")
        .replace(/\\/g, "/")
    }

    function normalizeSlug(slug) {
      let value = String(slug || "").trim()
      try {
        value = decodeURIComponent(value)
      } catch (_) {
        // noop
      }

      return value
        .replace(/\\/g, "/")
        .replace(/^\/+|\/+$/g, "")
        .replace(/#.*$/, "")
        .replace(/\/index$/i, "/index")
        .toLowerCase()
    }

    function normalizeSlugLoose(slug) {
      return normalizeSlug(slug)
        .split("/")
        .map((segment) => stripOrderingPrefix(segment))
        .join("/")
    }

    function getPageTags(page) {
      const result = new Set()

      const directTags = Array.isArray(page?.tags) ? page.tags : []
      directTags.forEach((tag) => {
        const normalized = normalizeTag(tag)
        if (normalized) result.add(normalized)
      })

      const fmTagsRaw = page?.frontmatter?.tags
      if (Array.isArray(fmTagsRaw)) {
        fmTagsRaw.forEach((tag) => {
          const normalized = normalizeTag(tag)
          if (normalized) result.add(normalized)
        })
      } else if (typeof fmTagsRaw === "string") {
        const normalized = normalizeTag(fmTagsRaw)
        if (normalized) result.add(normalized)
      }

      return [...result]
    }

    const host = window.location.hostname
    let basePath = ""

    if (host.endsWith("github.io")) {
      const segs = window.location.pathname.split("/").filter(Boolean)
      basePath = segs.length > 0 ? `/${segs[0]}` : ""
    }

    const contentIndexUrl = `${basePath}/static/contentIndex.json`

    fetch(contentIndexUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Не удалось загрузить ${contentIndexUrl}: ${res.status}`)
        }
        return res.json()
      })
      .then((index) => {
        function isCampaignHub(slug, page) {
          return (page?.title || "").trim().toLowerCase() === "кампании"
        }

        function getType(slug, page) {
          if (isCampaignHub(slug, page)) return "campaign_hub"

          if (
            slug.startsWith("04-Персонажи/Игроки/Живы/") ||
            slug.startsWith("04 Персонажи/Игроки/Живы/")
          )
            return "player"

          if (
            slug.startsWith("04-Персонажи/Игроки/Мертвы/") ||
            slug.startsWith("04 Персонажи/Игроки/Мертвы/")
          )
            return "player_dead"

          if (
            slug.startsWith("04-Персонажи/НПС/Живы/") ||
            slug.startsWith("04 Персонажи/НПС/Живы/")
          )
            return "npc_alive"

          if (
            slug.startsWith("04-Персонажи/НПС/Мертвы/") ||
            slug.startsWith("04 Персонажи/НПС/Мертвы/")
          )
            return "npc_dead"

          if (slug.startsWith("05-Фракции/") || slug.startsWith("05 Фракции/")) return "faction"
          if (slug.startsWith("06-Локации/") || slug.startsWith("06 Локации/")) return "location"
          if (slug.startsWith("07-События/") || slug.startsWith("07 События/")) return "event"
          if (slug.startsWith("08-Справка/") || slug.startsWith("08 Справка/")) return "reference"
          if (slug.startsWith("01-Хронология/") || slug.startsWith("01 Хронология/"))
            return "timeline"
          if (slug.startsWith("02-Сезоны/") || slug.startsWith("02 Сезоны/")) return "season"
          if (slug.startsWith("03-Серии/") || slug.startsWith("03 Серии/")) return "episode"
          if (slug === "index") return "index"

          return "other"
        }

        const rawNodes = []
        const existingIds = new Set()
        const canonicalByNormalized = new Map()

        for (const [slug, page] of Object.entries(index)) {
          existingIds.add(slug)
          canonicalByNormalized.set(normalizeSlug(slug), slug)
          canonicalByNormalized.set(normalizeSlugLoose(slug), slug)
          rawNodes.push({
            id: slug,
            label: stripOrderingPrefix(page.title || slug),
            type: getType(slug, page),
          })
        }

        if (!existingIds.has("index")) {
          canonicalByNormalized.set(normalizeSlug("index"), "index")
          canonicalByNormalized.set(normalizeSlugLoose("index"), "index")
          rawNodes.push({
            id: "index",
            label: "Мир Тьмы LRS",
            type: "index",
          })
          existingIds.add("index")
        }

        const rawLinks = []
        const seenLinks = new Set()

        function collectFrontmatterLinkCandidates(value, acc = []) {
          if (Array.isArray(value)) {
            value.forEach((item) => collectFrontmatterLinkCandidates(item, acc))
            return acc
          }
          if (value && typeof value === "object") {
            Object.values(value).forEach((item) => collectFrontmatterLinkCandidates(item, acc))
            return acc
          }
          if (typeof value === "string") {
            acc.push(value)
          }
          return acc
        }

        for (const [slug, page] of Object.entries(index)) {
          const sourceId = canonicalByNormalized.get(normalizeSlug(slug)) || slug
          const directLinks = Array.isArray(page.links) ? page.links : []
          const fmLinks = collectFrontmatterLinkCandidates(page.frontmatter || {})
          const candidateLinks = [...directLinks, ...fmLinks]

          for (const link of candidateLinks) {
            const normalizedLink = normalizeSlug(link)
            const normalizedLinkLoose = normalizeSlugLoose(link)
            const targetId =
              canonicalByNormalized.get(normalizedLink) ||
              canonicalByNormalized.get(normalizedLinkLoose)
            if (!targetId || sourceId === targetId) continue

            const forward = `${sourceId}→${targetId}`
            const reverse = `${targetId}→${sourceId}`

            if (seenLinks.has(forward) || seenLinks.has(reverse)) continue

            seenLinks.add(forward)
            rawLinks.push({ source: sourceId, target: targetId })
          }
        }

        const structuralSyntheticLinks = []
        const seasonNodes = rawNodes.filter((node) => node.type === "season")
        const episodeNodes = rawNodes.filter((node) => node.type === "episode")

        if (seasonNodes.length > 0 && episodeNodes.length > 0) {
          const neighborsById = new Map()
          rawNodes.forEach((node) => neighborsById.set(node.id, new Set()))
          rawLinks.forEach((link) => {
            neighborsById.get(link.source)?.add(link.target)
            neighborsById.get(link.target)?.add(link.source)
          })

          episodeNodes.forEach((episode) => {
            const episodeNeighbors = neighborsById.get(episode.id) || new Set()
            const alreadyLinkedToSeason = [...episodeNeighbors].some((neighborId) => {
              const neighborNode = rawNodes.find((node) => node.id === neighborId)
              return neighborNode?.type === "season"
            })
            if (alreadyLinkedToSeason) return

            let bestSeasonId = null
            let bestOverlap = 0

            seasonNodes.forEach((season) => {
              const seasonNeighbors = neighborsById.get(season.id) || new Set()
              let overlap = 0
              episodeNeighbors.forEach((id) => {
                if (seasonNeighbors.has(id)) overlap += 1
              })
              if (overlap > bestOverlap) {
                bestOverlap = overlap
                bestSeasonId = season.id
              }
            })

            if (bestSeasonId && bestOverlap > 0) {
              structuralSyntheticLinks.push({ source: episode.id, target: bestSeasonId })
            }
          })
        }

        const tagNodeMap = new Map()
        const rawTagLinks = []
        const seenTagLinks = new Set()

        for (const [slug, page] of Object.entries(index)) {
          const pageTags = getPageTags(page)

          pageTags.forEach((tag) => {
            const tagId = `tag:${tag}`

            if (!tagNodeMap.has(tagId)) {
              tagNodeMap.set(tagId, {
                id: tagId,
                label: `#${tag}`,
                type: "tag",
              })
            }

            const linkKey = `${slug}→${tagId}`
            if (!seenTagLinks.has(linkKey)) {
              seenTagLinks.add(linkKey)
              rawTagLinks.push({ source: slug, target: tagId })
            }
          })
        }

        const rawTagNodes = [...tagNodeMap.values()]
        const allNodes = [...rawNodes, ...rawTagNodes]

        const nodeById = new Map(allNodes.map((n) => [n.id, n]))
        const adjacency = new Map()
        const nodeDegrees = new Map()

        const ROOT_NODE_CANDIDATES = new Set(["index", "00-index"])
        const ROOT_NODE_TITLE = "мир тьмы lrs"
        const rootNode = allNodes.find(
          (node) =>
            ROOT_NODE_CANDIDATES.has(node.id) ||
            node.label.trim().toLowerCase() === ROOT_NODE_TITLE,
        )
        const rootNodeId = rootNode?.id || null

        const syntheticRootLinks = []
        if (rootNodeId) {
          const rootDegree = rawLinks.reduce((acc, link) => {
            return link.source === rootNodeId || link.target === rootNodeId ? acc + 1 : acc
          }, 0)

          if (rootDegree === 0) {
            const timelineNodes = rawNodes.filter((node) => node.type === "timeline")
            timelineNodes.forEach((targetNode) => {
              const targetId = targetNode.id
              syntheticRootLinks.push({ source: rootNodeId, target: targetId })
            })
          }
        }

        const allLinks = [
          ...rawLinks,
          ...structuralSyntheticLinks,
          ...rawTagLinks,
          ...syntheticRootLinks,
        ]

        allNodes.forEach((n) => adjacency.set(n.id, new Set()))
        allLinks.forEach((l) => {
          adjacency.get(l.source)?.add(l.target)
          adjacency.get(l.target)?.add(l.source)
        })
        allNodes.forEach((n) => {
          nodeDegrees.set(n.id, adjacency.get(n.id)?.size || 0)
        })

        let highlightNodeIds = new Set()
        let highlightLinkKeys = new Set()
        let activeFocusNodeId = null
        const nodeStateById = new Map()

        function linkKey(link) {
          const sourceId = typeof link.source === "object" ? link.source.id : link.source
          const targetId = typeof link.target === "object" ? link.target.id : link.target
          return `${sourceId}→${targetId}`
        }

        function rebuildHighlights() {
          highlightNodeIds = new Set()
          highlightLinkKeys = new Set()
          activeFocusNodeId = state.hoveredNodeId || state.selectedNodeId

          if (!activeFocusNodeId) return

          highlightNodeIds.add(activeFocusNodeId)
          const neighbors = adjacency.get(activeFocusNodeId) || new Set()
          neighbors.forEach((id) => highlightNodeIds.add(id))

          allLinks.forEach((l) => {
            if (l.source === activeFocusNodeId || l.target === activeFocusNodeId) {
              highlightLinkKeys.add(`${l.source}→${l.target}`)
              highlightLinkKeys.add(`${l.target}→${l.source}`)
            }
          })
        }

        function saveNodeState() {
          if (!graph) return
          const currentNodes = graph.graphData()?.nodes || []
          currentNodes.forEach((node) => {
            if (!node?.id) return
            nodeStateById.set(node.id, {
              x: node.x,
              y: node.y,
              vx: node.vx,
              vy: node.vy,
              fx: node.fx,
              fy: node.fy,
            })
          })
        }

        function getBaseFilteredNodes() {
          const activeTypes = getActiveTypes()

          return allNodes.filter((node) => {
            if (node.id === rootNodeId) {
              return true
            }
            if (node.type === "campaign_hub") {
              return shouldIncludeCampaignHub(activeTypes)
            }
            return activeTypes.has(node.type)
          })
        }

        function getVisibleGraph() {
          let nodes = getBaseFilteredNodes()

          if (state.search.trim()) {
            const q = state.search.trim().toLowerCase()
            const found = nodes.find((n) => n.label.toLowerCase().includes(q))

            if (found) {
              const neighbors = adjacency.get(found.id) || new Set()
              nodes = nodes.filter((n) => n.id === found.id || neighbors.has(n.id))
            } else {
              nodes = []
            }
          }

          if (state.selectedNodeId && state.isolatedMode) {
            const neighbors = adjacency.get(state.selectedNodeId) || new Set()
            nodes = nodes.filter((n) => n.id === state.selectedNodeId || neighbors.has(n.id))
          }

          const visibleNodeIds = new Set(nodes.map((n) => n.id))
          if (rootNodeId && !visibleNodeIds.has(rootNodeId)) {
            const rootOriginal = nodeById.get(rootNodeId)
            const hasAnyConnectedVisibleNode =
              rootOriginal &&
              (adjacency.get(rootNodeId) || new Set()).size > 0 &&
              [...(adjacency.get(rootNodeId) || new Set())].some((id) => visibleNodeIds.has(id))

            if (hasAnyConnectedVisibleNode) {
              nodes = [...nodes, rootOriginal]
            }
          }

          const visibleIds = new Set(nodes.map((n) => n.id))
          const links = allLinks.filter((l) => visibleIds.has(l.source) && visibleIds.has(l.target))

          return {
            nodes: nodes.map((n) => {
              const prevState = nodeStateById.get(n.id) || {}
              const baseNode = { ...n, ...prevState }
              if (n.id === rootNodeId) {
                return { ...baseNode, fx: 0, fy: 0 }
              }
              return baseNode
            }),
            links: links.map((l) => ({ ...l })),
          }
        }

        function applyForces() {
          if (!graph) return

          graph.cooldownTicks(220)
          graph.d3AlphaDecay(0.03)
          graph.d3VelocityDecay(0.34)

          const chargeForce = graph.d3Force("charge")
          if (chargeForce) {
            chargeForce.strength(-settings.charge)
          }

          const linkForce = graph.d3Force("link")
          if (linkForce) {
            linkForce.distance((link) => {
              const sourceId = typeof link.source === "object" ? link.source.id : link.source
              const targetId = typeof link.target === "object" ? link.target.id : link.target

              const sourceNode = nodeById.get(sourceId)
              const targetNode = nodeById.get(targetId)

              const structural =
                sourceNode?.type === "campaign_hub" ||
                targetNode?.type === "campaign_hub" ||
                sourceNode?.type === "timeline" ||
                targetNode?.type === "timeline" ||
                sourceNode?.type === "season" ||
                targetNode?.type === "season" ||
                sourceNode?.type === "episode" ||
                targetNode?.type === "episode"

              const tagLink = sourceNode?.type === "tag" || targetNode?.type === "tag"

              if (tagLink) {
                return Math.max(18, Math.round(settings.linkDistance * 0.78))
              }

              return structural
                ? Math.max(20, Math.round(settings.linkDistance * 0.82))
                : settings.linkDistance
            })

            linkForce.strength((link) => {
              const sourceId = typeof link.source === "object" ? link.source.id : link.source
              const targetId = typeof link.target === "object" ? link.target.id : link.target

              const sourceNode = nodeById.get(sourceId)
              const targetNode = nodeById.get(targetId)

              const tagLink = sourceNode?.type === "tag" || targetNode?.type === "tag"

              return tagLink
                ? Math.max(0.15, (settings.linkStrength / 100) * 0.9)
                : settings.linkStrength / 100
            })
          }

          const collideForce = graph.d3Force("collide")
          if (collideForce) {
            collideForce.radius((node) => {
              const scale = settings.nodeScale / 100
              const degreeRadius = (5 + Math.sqrt(nodeDegrees.get(node.id) || 0) * 2) * scale
              const typeBonus = node.type === "campaign_hub" ? 3 : node.type === "tag" ? -1.5 : 0
              return Math.max(7, degreeRadius + typeBonus)
            })
            collideForce.strength(0.92)
            collideForce.iterations(2)
          }

          const centerForce = graph.d3Force("center")
          if (centerForce && typeof centerForce.strength === "function") {
            centerForce.strength(0.08)
          }
        }

        function fitGraph(ms = 700, padding = RESET_FIT_PADDING) {
          const visible = getVisibleGraph()
          if (!graph || !visible.nodes.length) return

          requestAnimationFrame(() => {
            graph.zoomToFit(ms, padding)
          })
        }

        function refreshGraphWithCurrentSettings(shouldFit = false) {
          applyForces()
          graph.d3ReheatSimulation()
          graph.graphData(graph.graphData())

          if (shouldFit && !state.selectedNodeId) {
            setTimeout(() => {
              fitGraph(500, RESET_FIT_PADDING)
            }, 80)
          }
        }

        function redrawGraphWithoutSimulationReset() {
          if (!graph) return

          if (typeof graph.refresh === "function") {
            graph.refresh()
            return
          }

          if (typeof graph.nodeCanvasObject === "function") {
            graph.nodeCanvasObject(graph.nodeCanvasObject())
            graph.linkColor(graph.linkColor())
            graph.linkWidth(graph.linkWidth())
            return
          }

          if (
            typeof graph.pauseAnimation === "function" &&
            typeof graph.resumeAnimation === "function"
          ) {
            graph.pauseAnimation()
            graph.resumeAnimation()
            return
          }

          graph.graphData(graph.graphData())
        }

        function redrawGraphWithoutSimulationReset() {
          if (!graph) return

          if (typeof graph.refresh === "function") {
            graph.refresh()
            return
          }

          if (typeof graph.nodeCanvasObject === "function") {
            graph.nodeCanvasObject(graph.nodeCanvasObject())
            graph.linkColor(graph.linkColor())
            graph.linkWidth(graph.linkWidth())
            return
          }

          if (
            typeof graph.pauseAnimation === "function" &&
            typeof graph.resumeAnimation === "function"
          ) {
            graph.pauseAnimation()
            graph.resumeAnimation()
            return
          }

          graph.graphData(graph.graphData())
        }

        function render() {
          saveNodeState()
          rebuildHighlights()
          const visible = getVisibleGraph()
          graph.graphData(visible)
          applyForces()
          graph.d3ReheatSimulation()
        }

        function rerenderControlsOnly() {
          buildControls()
        }

        buildTopPanels()
        buildControls()
        buildForcesPanel()
        applyPresetForActiveTypes()

        graph = ForceGraph()(graphEl)
          .width(graphEl.clientWidth)
          .height(graphEl.clientHeight)
          .backgroundColor("rgba(0,0,0,0)")
          .nodeId("id")
          .nodeLabel((node) => node.label)
          .nodeRelSize(4)
          .nodeVal((node) => {
            const scale = settings.nodeScale / 100
            const degreeRadius = (3.4 + Math.sqrt(nodeDegrees.get(node.id) || 0) * 1.35) * scale
            if (node.id === rootNodeId) {
              return Math.max(7.2, degreeRadius * 1.25)
            }
            if (node.type === "tag") {
              return Math.max(2.4, degreeRadius * 0.72)
            }
            return degreeRadius
          })
          .nodeCanvasObject((node, ctx, globalScale) => {
            const isSelected = state.selectedNodeId === node.id
            const isHighlighted = highlightNodeIds.has(node.id)
            const focusNodeId = state.hoveredNodeId || state.selectedNodeId
            const isDimmed = focusNodeId && !isHighlighted
            const isCampaignHub = node.type === "campaign_hub"
            const isTag = node.type === "tag"
            const scale = settings.nodeScale / 100
            const isRootNode = node.id === rootNodeId
            const baseRadius = (3.4 + Math.sqrt(nodeDegrees.get(node.id) || 0) * 1.35) * scale

            const radius = isRootNode
              ? Math.max(7.2, baseRadius * 1.25)
              : isTag
                ? Math.max(2.4, baseRadius * 0.72)
                : baseRadius

            ctx.beginPath()
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)

            if (isSelected) {
              ctx.fillStyle = style.nodeSelected
            } else if (isDimmed) {
              ctx.fillStyle = style.nodeDim
            } else {
              ctx.fillStyle = getNodeColor(node)
            }

            ctx.fill()

            const threshold = settings.labelThreshold / 100
            const showLabel =
              isRootNode ||
              isCampaignHub ||
              globalScale >= threshold ||
              (isTag && globalScale >= Math.max(1.15, threshold))

            if (showLabel) {
              const fontSize = Math.max((isTag ? 10 : 12) / globalScale, isTag ? 4.2 : 4.7)
              ctx.font = `${fontSize}px Sans-Serif`
              ctx.fillStyle = isDimmed ? style.textDim : style.textNormal
              ctx.textAlign = "left"
              ctx.textBaseline = "middle"
              ctx.fillText(node.label, node.x + radius + 5, node.y)
            }
          })
          .linkColor((link) => {
            const hasFocus = Boolean(state.hoveredNodeId || state.selectedNodeId)
            if (!hasFocus) return style.linkNormal
            return highlightLinkKeys.has(linkKey(link))
              ? style.linkNormal
              : isDarkTheme()
                ? "rgba(148,163,184,0.09)"
                : "rgba(100,116,139,0.12)"
          })
          .linkWidth((link) => {
            const sourceId = typeof link.source === "object" ? link.source.id : link.source
            const targetId = typeof link.target === "object" ? link.target.id : link.target
            const sourceNode = nodeById.get(sourceId)
            const targetNode = nodeById.get(targetId)
            const tagLink = sourceNode?.type === "tag" || targetNode?.type === "tag"

            if (highlightLinkKeys.has(linkKey(link))) {
              return (tagLink ? 0.72 : 0.92) * (settings.lineWidth / 100)
            }
            return (tagLink ? 0.36 : 0.52) * (settings.lineWidth / 100)
          })
          .cooldownTicks(220)
          .d3AlphaDecay(0.03)
          .d3VelocityDecay(0.34)
          .onNodeClick((node) => {
            state.selectedNodeId = state.selectedNodeId === node.id ? null : node.id
            state.hoveredNodeId = null
            rebuildHighlights()
            render()
          })
          .onNodeHover((node) => {
            const nextHoveredId = node?.id || null
            if (state.hoveredNodeId === nextHoveredId) return
            state.hoveredNodeId = nextHoveredId
            rebuildHighlights()
            redrawGraphWithoutSimulationReset()
          })
          .onNodeDrag(() => {
            userMovedNode = true
          })
          .onNodeDragEnd(() => {
            userMovedNode = true
          })
          .onBackgroundClick(() => {
            if (!state.selectedNodeId && !state.hoveredNodeId) return
            if (!state.selectedNodeId && state.hoveredNodeId) {
              state.hoveredNodeId = null
              rebuildHighlights()
              redrawGraphWithoutSimulationReset()
              return
            }
            state.selectedNodeId = null
            state.hoveredNodeId = null
            rebuildHighlights()
            saveNodeState()
            const visible = getVisibleGraph()
            graph.graphData(visible)
            applyForces()
          })

        applyForces()
        syncSettingInputs()
        render()

        ui.controlsEl.addEventListener("click", (event) => {
          const target = event.target
          if (!(target instanceof HTMLElement)) return

          const toggleTarget = target.closest("[data-type]")
          if (!toggleTarget) return

          const type = toggleTarget.dataset.type
          if (!type || !(type in state.types)) return

          state.types[type] = !state.types[type]
          state.selectedNodeId = null
          state.hoveredNodeId = null
          userMovedNode = false

          rerenderControlsOnly()
          applyPresetForActiveTypes()
          rebuildHighlights()
          render()

          setTimeout(() => {
            fitGraph(650, RESET_FIT_PADDING)
          }, 100)
        })

        ui.controlsEl.addEventListener("input", (event) => {
          const target = event.target
          if (!(target instanceof HTMLInputElement)) return
          if (target.type !== "color") return

          const type = target.dataset.colorType
          if (!type) return

          colorMap[type] = target.value

          const wrap = target.closest(".network-color-picker")
          const dot = wrap ? wrap.querySelector(".network-color-dot") : null
          if (dot instanceof HTMLElement) {
            dot.style.background = target.value
          }

          graph.graphData(graph.graphData())
        })

        ui.settingsGridEl.addEventListener("input", (event) => {
          const target = event.target
          if (!(target instanceof HTMLInputElement)) return
          if (target.type !== "range") return

          const key = target.dataset.settingKey
          if (!key || !(key in settings)) return

          settings[key] = Number(target.value)
          updateSettingLabels()

          if (key === "labelThreshold") {
            graph.graphData(graph.graphData())
            return
          }

          refreshGraphWithCurrentSettings(false)
        })

        fitButton.addEventListener("click", () => {
          fitGraph(600, RESET_FIT_PADDING)
        })

        const expandGraph = () => {
          if (graphEl.classList.contains("is-expanded")) return
          graphEl.classList.add("is-expanded")
          document.body.classList.add("network-expanded")
          graph.width(graphEl.clientWidth)
          graph.height(graphEl.clientHeight)
          fitGraph(450, RESET_FIT_PADDING)
        }

        const collapseGraph = () => {
          if (!graphEl.classList.contains("is-expanded")) return
          graphEl.classList.remove("is-expanded")
          document.body.classList.remove("network-expanded")
          graph.width(graphEl.clientWidth)
          graph.height(graphEl.clientHeight)
        }

        expandIcon.addEventListener("click", expandGraph)
        collapseIcon.addEventListener("click", collapseGraph)

        resetButton.addEventListener("click", () => {
          applyPresetForActiveTypes()
          refreshGraphWithCurrentSettings(true)
        })

        resetColorsButton.addEventListener("click", () => {
          themeDefaultColors = getThemeDefaultColors()

          Object.keys(colorMap).forEach((key) => {
            delete colorMap[key]
          })
          Object.assign(colorMap, themeDefaultColors)

          rerenderControlsOnly()
          graph.graphData(graph.graphData())
        })

        searchEl.addEventListener("input", (event) => {
          state.search = event.target.value || ""
          state.selectedNodeId = null
          state.hoveredNodeId = null
          rebuildHighlights()
          render()

          setTimeout(() => {
            if (!userMovedNode) {
              fitGraph(650, RESET_FIT_PADDING)
            }
          }, 100)
        })

        window.addEventListener("resize", () => {
          const currentGraphEl = document.getElementById("network-graph")
          if (!currentGraphEl || !graph) return

          clearResizeFitTimer()
          graph.width(currentGraphEl.clientWidth)
          graph.height(currentGraphEl.clientHeight)
          applyForces()

          resizeFitTimer = setTimeout(() => {
            if (!state.selectedNodeId && !userMovedNode) {
              fitGraph(450, RESIZE_FIT_PADDING)
            }
          }, 180)
        })

        document.addEventListener("keydown", (event) => {
          if (event.key !== "Escape") return
          if (!graphEl.classList.contains("is-expanded")) return
          collapseGraph()
        })

        document.addEventListener("themechange", () => {
          style = computeStyle()
          themeDefaultColors = getThemeDefaultColors()
          if (graph) {
            render()
          }
        })

        setTimeout(() => {
          fitGraph(700, RESET_FIT_PADDING)
        }, 120)
      })
      .catch((error) => {
        console.error("Ошибка инициализации карты связей:", error)
      })
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNetworkGraph)
  } else {
    initNetworkGraph()
  }

  window.addEventListener("pageshow", initNetworkGraph)
  document.addEventListener("nav", initNetworkGraph)

  if (!mutationObserverStarted) {
    const observer = new MutationObserver(() => {
      if (document.getElementById("network-graph")) {
        initNetworkGraph()
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
    mutationObserverStarted = true
  }
})()
function stripOrderingPrefix(label) {
  return String(label || "").replace(/^(?:[0-9]+|[A-Za-zА-Яа-я]{2,}[0-9]+)\s*[-._]?\s*/, "")
}

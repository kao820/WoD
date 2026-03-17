(function () {
  // предотвращаем повторную инициализацию графа
  let initializedFor = null;

  function initNetworkGraph() {
    const graphEl = document.getElementById("network-graph");
    const controlsEl = document.getElementById("network-controls");
    const searchEl = document.getElementById("network-search");
    if (!graphEl || !controlsEl) return;
    if (initializedFor === graphEl) return;
    initializedFor = graphEl;

    let didInitialZoom = false;
    let userMovedNode = false;

    // Определяем тёмную тему через атрибут saved-theme или prefers-color-scheme
    function computeStyle() {
      const savedTheme = document.documentElement.getAttribute("saved-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDarkMode = savedTheme === "dark" || (!savedTheme && prefersDark);
      return {
        linkNormal: isDarkMode ? "rgba(200,200,200,0.35)" : "rgba(120,120,120,0.25)",
        linkHighlight: isDarkMode ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.8)",
        textNormal: isDarkMode ? "#f1f5f9" : "#222222",
        textDim: isDarkMode ? "#94a3af" : "#9ca3af",
        nodeSelected: isDarkMode ? "#fbbf24" : "#111111",
        nodeDim: isDarkMode ? "rgba(255,255,255,0.35)" : "#e5e7eb",
      };
    }

    let style = computeStyle();

    // Формируем базовый путь для статических файлов на GitHub Pages
    const host = window.location.hostname;
    let basePath = "";
    if (host.endsWith("github.io")) {
      const segs = window.location.pathname.split("/").filter((s) => s.length > 0);
      basePath = segs.length > 0 ? `/${segs[0]}` : "";
    }
    const contentIndexUrl = `${basePath}/static/contentIndex.json`;

    fetch(contentIndexUrl)
      .then((res) => res.json())
      .then((index) => {
        // Определяем тип узла по slug
        function getType(slug) {
          if (slug.startsWith("04-Персонажи/Игроки/")) return "player";
          if (slug.startsWith("04-Персонажи/НПС/Живы/")) return "npc_alive";
          if (slug.startsWith("04-Персонажи/НПС/Мертвы/")) return "npc_dead";
          if (slug.startsWith("05-Фракции/")) return "faction";
          if (slug.startsWith("06-Локации/")) return "location";
          if (slug.startsWith("03-Серии/")) return "episode";
          if (slug.startsWith("07-События/")) return "event";
          if (slug.startsWith("02-Сезоны/")) return "season";
          if (slug.startsWith("01-Хроники/")) return "chronicle";
          if (slug.startsWith("08-Справка/")) return "reference";
          if (slug === "index") return "index";
          return "other";
        }

        // Цвет узла
        function getColor(type) {
          switch (type) {
            case "player": return "#2563eb";
            case "npc_alive": return "#60a5fa";
            case "npc_dead": return "#9ca3af";
            case "faction": return "#ef4444";
            case "location": return "#22c55e";
            case "episode": return "#f59e0b";
            case "event": return "#a855f7";
            case "season": return "#f97316";
            case "chronicle": return "#06b6d4";
            case "reference": return "#6b7280";
            case "index": return "#111827";
            default: return "#6b7280";
          }
        }

        // Строим список узлов
        const rawNodes = [];
        const existingIds = new Set();
        for (const [slug, page] of Object.entries(index)) {
          existingIds.add(slug);
          const type = getType(slug);
          rawNodes.push({
            id: slug,
            label: page.title || slug,
            type,
            color: getColor(type),
          });
        }

        // Строим список ссылок
        const rawLinks = [];
        const seenLinks = new Set();
        for (const [slug, page] of Object.entries(index)) {
          for (const link of page.links || []) {
            if (!existingIds.has(link) || slug === link) continue;
            const key = `${slug}→${link}`;
            if (seenLinks.has(key)) continue;
            seenLinks.add(key);
            rawLinks.push({ source: slug, target: link });
          }
        }

        // Матрица смежности
        const adjacency = new Map();
        rawNodes.forEach((n) => adjacency.set(n.id, new Set()));
        rawLinks.forEach((l) => {
          adjacency.get(l.source)?.add(l.target);
          adjacency.get(l.target)?.add(l.source);
        });

        // Начальное состояние
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
        };

        // Заполняем панель фильтров
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
        `;

        // Выделенные узлы и ссылки
        let highlightNodeIds = new Set();
        let highlightLinkKeys = new Set();

        function linkKey(link) {
          const s = typeof link.source === "object" ? link.source.id : link.source;
          const t = typeof link.target === "object" ? link.target.id : link.target;
          return `${s}→${t}`;
        }

        // Пересчёт выделений
        function rebuildHighlights() {
          highlightNodeIds = new Set();
          highlightLinkKeys = new Set();
          if (!state.selectedNodeId) return;
          highlightNodeIds.add(state.selectedNodeId);
          const neighbors = adjacency.get(state.selectedNodeId) || new Set();
          neighbors.forEach((n) => highlightNodeIds.add(n));
          for (const l of rawLinks) {
            if (l.source === state.selectedNodeId || l.target === state.selectedNodeId) {
              highlightLinkKeys.add(`${l.source}→${l.target}`);
            }
          }
        }

        function getBaseFilteredNodes() {
          const activeTypes = new Set(
            Object.entries(state.types)
              .filter(([, value]) => value)
              .map(([type]) => type)
          );
          return rawNodes.filter((n) => activeTypes.has(n.type));
        }

        function getVisibleGraph() {
          let nodes = getBaseFilteredNodes();
          if (state.search.trim()) {
            const q = state.search.trim().toLowerCase();
            const foundNode = nodes.find((n) => n.label.toLowerCase().includes(q));
            if (foundNode) {
              const neighbors = adjacency.get(foundNode.id) || new Set();
              nodes = nodes.filter(
                (n) => n.id === foundNode.id || neighbors.has(n.id)
              );
            } else {
              nodes = [];
            }
          }
          if (state.selectedNodeId && state.isolatedMode) {
            const neighbors = adjacency.get(state.selectedNodeId) || new Set();
            nodes = nodes.filter(
              (n) => n.id === state.selectedNodeId || neighbors.has(n.id)
            );
          }
          const visibleIds = new Set(nodes.map((n) => n.id));
          const links = rawLinks.filter(
            (l) => visibleIds.has(l.source) && visibleIds.has(l.target)
          );
          return {
            nodes: nodes.map((n) => ({ ...n })),
            links: links.map((l) => ({ ...l })),
          };
        }

        // Инициализация графа force-graph
        const graph = ForceGraph()(graphEl)
          .width(graphEl.clientWidth)
          .height(graphEl.clientHeight)
          .backgroundColor(
            getComputedStyle(graphEl).backgroundColor || "#111827"
          )
          .nodeId("id")
          .nodeLabel((node) => `${node.label} (${node.type})`)
          .nodeVal((node) => {
            if (state.selectedNodeId === node.id) return 5.2;
            if (highlightNodeIds.has(node.id)) return 4.2;
            return 2.8;
          })
          .nodeCanvasObject((node, ctx, globalScale) => {
            const isSelected = state.selectedNodeId === node.id;
            const isHighlighted = highlightNodeIds.has(node.id);
            const isDimmed =
              !state.isolatedMode && state.selectedNodeId && !isHighlighted;
            const radius = isSelected ? 5.2 : isHighlighted ? 4.2 : 2.8;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            if (isSelected) {
              ctx.fillStyle = style.nodeSelected;
            } else if (isDimmed) {
              ctx.fillStyle = style.nodeDim;
            } else {
              ctx.fillStyle = node.color;
            }
            ctx.fill();
            const fontSize = Math.max(10 / globalScale, 4);
            if (globalScale >= 6 || isSelected) {
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.fillStyle = isDimmed ? style.textDim : style.textNormal;
              ctx.fillText(node.label, node.x + 8, node.y + 3);
            }
          })
          .linkColor((link) => {
            if (!state.selectedNodeId) return style.linkNormal;
            return highlightLinkKeys.has(linkKey(link))
              ? style.linkHighlight
              : style.linkNormal;
          })
          .linkWidth((link) => (highlightLinkKeys.has(linkKey(link)) ? 2.5 : 1))
          .cooldownTicks(320)
          .d3AlphaDecay(0.018)
          .d3VelocityDecay(0.45)
          .onNodeClick((node) => {
            state.selectedNodeId = node.id;
            rebuildHighlights();
            render();
            setTimeout(() => {
              graph.centerAt(node.x, node.y, 400);
              graph.zoom(2.2, 400);
            }, 50);
          })
          .onNodeDrag(() => {
            userMovedNode = true;
          })
          .onNodeDragEnd(() => {
            userMovedNode = true;
          })
          .onBackgroundClick(() => {
            state.selectedNodeId = null;
            rebuildHighlights();
            render();
            setTimeout(() => {
              if (!userMovedNode) graph.zoomToFit(500, 140);
            }, 50);
          })
          .onEngineStop(() => {
            if (!didInitialZoom && !state.selectedNodeId && !userMovedNode) {
              didInitialZoom = true;
              graph.zoomToFit(500, 140);
            }
          });

        function render() {
          rebuildHighlights();
          const visible = getVisibleGraph();
          graph.graphData(visible);
          setTimeout(() => {
            if (!didInitialZoom && !state.selectedNodeId && !userMovedNode) {
              graph.zoomToFit(500, 140);
              didInitialZoom = true;
            }
          }, 120);
        }

        // Фильтры типов
        controlsEl
          .querySelectorAll("input[type=checkbox]")
          .forEach((input) => {
            input.addEventListener("change", (e) => {
              const type = e.target.dataset.type;
              state.types[type] = e.target.checked;
              state.selectedNodeId = null;
              rebuildHighlights();
              render();
            });
          });

        // Поиск
        if (searchEl) {
          searchEl.addEventListener("input", (e) => {
            state.search = e.target.value || "";
            state.selectedNodeId = null;
            rebuildHighlights();
            render();
          });
        }

        // Масштабирование при resize
        window.addEventListener("resize", () => {
          graph.width(graphEl.clientWidth);
          graph.height(graphEl.clientHeight);
          setTimeout(() => {
            if (!state.selectedNodeId && !userMovedNode) {
              graph.zoomToFit(500, 140);
            }
          }, 100);
        });

        // Обновление стиля при смене темы
        document.addEventListener("themechange", () => {
          style = computeStyle();
          render();
        });

        render();

        // === полноэкранный режим ===
        const fullBtn = document.getElementById("network-fullscreen-btn");
        if (fullBtn) {
          fullBtn.addEventListener("click", () => {
            // если уже в полноэкранном режиме — ничего не делаем
            if (document.fullscreenElement) return;
            // запрашиваем полноэкранный режим для контейнера графа
            graphEl.requestFullscreen().then(() => {
              // растягиваем граф на весь экран
              graphEl.style.width = "100vw";
              graphEl.style.height = "100vh";
              setTimeout(() => {
                graph.width(graphEl.clientWidth);
                graph.height(graphEl.clientHeight);
                graph.zoomToFit(200, 100);
              }, 100);
            });
          });
        }
        // при выходе из полноэкранного режима возвращаем размеры
        document.addEventListener("fullscreenchange", () => {
          if (!document.fullscreenElement) {
            graphEl.style.width = "";
            graphEl.style.height = "";
            graph.width(graphEl.clientWidth);
            graph.height(graphEl.clientHeight);
            graph.zoomToFit(200, 100);
          }
        });
        // === конец полноэкранного режима ===
      })
      .catch((err) => {
        console.error("Ошибка инициализации карты связей:", err);
      });
  }

  // Инициализируем граф при различных событиях
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNetworkGraph);
  } else {
    initNetworkGraph();
  }
  window.addEventListener("pageshow", initNetworkGraph);
  document.addEventListener("nav", initNetworkGraph);

  // Подстраховка на случай динамического появления графа
  const observer = new MutationObserver(() => {
    if (document.getElementById("network-graph")) {
      initNetworkGraph();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();

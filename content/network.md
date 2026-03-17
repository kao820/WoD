title: Карта связей
<style> .network-shell { max-width: 920px; margin: 0 auto; padding: 8px 24px 20px 24px; box-sizing: border-box; position: relative; z-index: 2; } .network-toolbar { margin: 10px 0 14px 0; } .network-search { display: block; width: 100%; max-width: 360px; padding: 10px 12px; border: 1px solid #cfcfcf; border-radius: 10px; font-size: 14px; box-sizing: border-box; } .network-controls { display: grid; grid-template-columns: 1fr; gap: 8px 12px; margin: 0 0 14px 0; font-size: 14px; line-height: 1.35; position: relative; z-index: 3; } .network-controls label { display: flex; align-items: center; gap: 8px; cursor: pointer; white-space: nowrap; user-select: none; min-width: 0; } .network-controls input { margin: 0; flex: 0 0 auto; } .network-graph { height: 380px; width: 100%; border: 1px solid #ddd; border-radius: 12px; /* Use a transparent background so that dark/light theme colors show through */ background: transparent; overflow: hidden; box-sizing: border-box; } @media (min-width: 760px) { .network-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); } } @media (min-width: 1040px) { .network-controls { grid-template-columns: repeat(3, minmax(0, 1fr)); } } </style> <div class="network-shell"> <div class="network-toolbar"> <input id="network-search" class="network-search" type="text" placeholder="Поиск по узлам..." /> </div> <div id="network-controls" class="network-controls"></div> <div id="network-graph" class="network-graph"></div> </div> <!-- Load force-graph library. The custom network.js script is injected globally via the NetworkScript component. --> <script src="https://unpkg.com/force-graph"></script> <script> (function () {
  // Чтобы не инициализировать граф дважды
  let initializedFor = null;

  // Основная функция инициализации
  function initNetworkGraph() {
    const graphEl = document.getElementById("network-graph");
    const controlsEl = document.getElementById("network-controls");
    const searchEl = document.getElementById("network-search");

    if (!graphEl || !controlsEl) return;
    if (initializedFor === graphEl) return;
    initializedFor = graphEl;

    let didInitialZoom = false;
    let userMovedNode = false;

    // Определяем, активна ли тёмная тема
    const isDarkMode = document.documentElement.classList.contains("dark");
    // Параметры цвета для светлой и тёмной тем
    const style = {
      linkNormal: isDarkMode ? "rgba(200,200,200,0.35)" : "rgba(120,120,120,0.25)",
      linkHighlight: isDarkMode ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.8)",
      textNormal: isDarkMode ? "#f1f5f9" : "#222222",
      textDim: isDarkMode ? "#cbd5e1" : "#9ca3af",
      nodeSelected: isDarkMode ? "#fbbf24" : "#111111",
      nodeDim: isDarkMode ? "rgba(255,255,255,0.35)" : "#e5e7eb",
    };

    // Формируем базовый путь к статическим файлам для GitHub Pages
    const host = window.location.hostname;
    let basePath = "";
    if (host.endsWith("github.io")) {
      const segs = window.location.pathname.split("/").filter((s) => s.length > 0);
      basePath = segs.length > 0 ? `/${segs[0]}` : "";
    }
    const contentIndexUrl = `${basePath}/static/contentIndex.json`;

    // Загружаем индекс контента и строим граф
    fetch(contentIndexUrl)
      .then((res) => res.json())
      .then((index) => {
        // Функция для определения типа узла по его slug
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

        // Цвет узла в зависимости от типа
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

        // Собираем список узлов
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

        // Собираем список связей
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

        // Структура смежности для поиска соседних узлов
        const adjacency = new Map();
        rawNodes.forEach((n) => adjacency.set(n.id, new Set()));
        rawLinks.forEach((l) => {
          adjacency.get(l.source)?.add(l.target);
          adjacency.get(l.target)?.add(l.source);
        });

        // Первоначальное состояние фильтров и выделений
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

        // Заполняем панель чекбоксов
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

        // Текущие выделенные узлы и связи
        let highlightNodeIds = new Set();
        let highlightLinkKeys = new Set();

        function linkKey(link) {
          const s = typeof link.source === "object" ? link.source.id : link.source;
          const t = typeof link.target === "object" ? link.target.id : link.target;
          return `${s}→${t}`;
        }

        // Пересчитываем выделения при клике или поиске
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
              nodes = nodes.filter((n) => n.id === foundNode.id || neighbors.has(n.id));
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

        // Создаём граф через библиотеку force-graph
        const graph = ForceGraph()(graphEl)
          .width(graphEl.clientWidth)
          .height(graphEl.clientHeight)
          .backgroundColor(getComputedStyle(graphEl).backgroundColor || "#111827")
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
            const isDimmed = !state.isolatedMode && state.selectedNodeId && !isHighlighted;

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
            return highlightLinkKeys.has(linkKey(link)) ? style.linkHighlight : style.linkNormal;
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
          .onNodeDrag(() => { userMovedNode = true; })
          .onNodeDragEnd(() => { userMovedNode = true; })
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

        // Чекбоксы фильтров
        controlsEl.querySelectorAll("input[type=checkbox]").forEach((input) => {
          input.addEventListener("change", (e) => {
            const type = e.target.dataset.type;
            state.types[type] = e.target.checked;
            state.selectedNodeId = null;
            rebuildHighlights();
            render();
          });
        });

        // Поле поиска
        if (searchEl) {
          searchEl.addEventListener("input", (e) => {
            state.search = e.target.value || "";
            state.selectedNodeId = null;
            rebuildHighlights();
            render();
          });
        }

        // Изменение размеров окна
        window.addEventListener("resize", () => {
          graph.width(graphEl.clientWidth);
          graph.height(graphEl.clientHeight);
          setTimeout(() => {
            if (!state.selectedNodeId && !userMovedNode) {
              graph.zoomToFit(500, 140);
            }
          }, 100);
        });

        render();
      })
      .catch((err) => {
        console.error("Ошибка инициализации карты связей:", err);
      });
  }

  // Инициализация при различных событиях
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNetworkGraph);
  } else {
    initNetworkGraph();
  }
  window.addEventListener("pageshow", initNetworkGraph);
  document.addEventListener("nav", initNetworkGraph);

  // На случай динамического появления #network-graph в DOM
  const observer = new MutationObserver(() => {
    if (document.getElementById("network-graph")) {
      initNetworkGraph();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})(); </script>

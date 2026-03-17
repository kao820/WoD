(function () {
  let initializedFor = null;

  function initNetworkGraph() {
    const graphEl = document.getElementById("network-graph");
    const controlsEl = document.getElementById("network-controls");
    const searchEl = document.getElementById("network-search");

    if (!graphEl || !controlsEl) return;
    if (initializedFor === graphEl) return;
    initializedFor = graphEl;

    let graph = null;
    let userMovedNode = false;
    let resizeFitTimer = null;

    const RESET_FIT_PADDING = 24;
    const RESIZE_FIT_PADDING = 26;
    const CLICK_ZOOM = 2.2;

    function clearResizeFitTimer() {
      if (resizeFitTimer) {
        clearTimeout(resizeFitTimer);
        resizeFitTimer = null;
      }
    }

    function computeStyle() {
      const savedTheme = document.documentElement.getAttribute("saved-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDarkMode = savedTheme === "dark" || (!savedTheme && prefersDark);

      return {
        linkNormal: isDarkMode ? "rgba(200,200,200,0.26)" : "rgba(120,120,120,0.22)",
        linkDim: isDarkMode ? "rgba(200,200,200,0.08)" : "rgba(120,120,120,0.08)",
        linkHover: isDarkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.72)",
        linkSelected: isDarkMode ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.8)",
        textNormal: isDarkMode ? "#f1f5f9" : "#222222",
        textDim: isDarkMode ? "#94a3af" : "#9ca3af",
        nodeSelected: isDarkMode ? "#fbbf24" : "#111111",
        nodeHover: isDarkMode ? "#e2e8f0" : "#111111",
        nodeDim: isDarkMode ? "rgba(255,255,255,0.18)" : "#d1d5db",
      };
    }

    let style = computeStyle();

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
        function getType(slug) {
          if (slug === "00-Индексы/Кампании" || slug === "00 Индексы/Кампании" || slug.endsWith("/Кампании")) {
            return "campaign_hub";
          }
          if (slug.startsWith("04-Персонажи/Игроки/") || slug.startsWith("04 Персонажи/Игроки/")) return "player";
          if (slug.startsWith("04-Персонажи/НПС/Живы/") || slug.startsWith("04 Персонажи/НПС/Живы/")) return "npc_alive";
          if (slug.startsWith("04-Персонажи/НПС/Мертвы/") || slug.startsWith("04 Персонажи/НПС/Мертвы/")) return "npc_dead";
          if (slug.startsWith("05-Фракции/") || slug.startsWith("05 Фракции/")) return "faction";
          if (slug.startsWith("06-Локации/") || slug.startsWith("06 Локации/")) return "location";
          if (slug.startsWith("03-Серии/") || slug.startsWith("03 Серии/")) return "episode";
          if (slug.startsWith("07-События/") || slug.startsWith("07 События/")) return "event";
          if (slug.startsWith("02-Сезоны/") || slug.startsWith("02 Сезоны/")) return "season";
          if (slug.startsWith("01-Хронология/") || slug.startsWith("01 Хронология/")) return "timeline";
          if (slug.startsWith("08-Справка/") || slug.startsWith("08 Справка/")) return "reference";
          if (slug === "index") return "index";
          return "other";
        }

        function getColor(type) {
          switch (type) {
            case "campaign_hub": return "#8b5cf6";
            case "player": return "#2563eb";
            case "npc_alive": return "#60a5fa";
            case "npc_dead": return "#9ca3af";
            case "faction": return "#ef4444";
            case "location": return "#22c55e";
            case "episode": return "#f59e0b";
            case "event": return "#a855f7";
            case "season": return "#f97316";
            case "timeline": return "#06b6d4";
            case "reference": return "#6b7280";
            case "index": return "#111827";
            default: return "#6b7280";
          }
        }

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

        const rawLinks = [];
        const seenLinks = new Set();

        for (const [slug, page] of Object.entries(index)) {
          for (const link of page.links || []) {
            if (!existingIds.has(link) || slug === link) continue;

            const directKey = `${slug}→${link}`;
            const reverseKey = `${link}→${slug}`;
            if (seenLinks.has(directKey) || seenLinks.has(reverseKey)) continue;

            seenLinks.add(directKey);
            rawLinks.push({ source: slug, target: link });
          }
        }

        const adjacency = new Map();
        rawNodes.forEach((n) => adjacency.set(n.id, new Set()));
        rawLinks.forEach((l) => {
          adjacency.get(l.source)?.add(l.target);
          adjacency.get(l.target)?.add(l.source);
        });

        const state = {
          types: {
            player: true,
            npc_alive: true,
            npc_dead: true,
            faction: true,
            location: true,
            episode: true,
            event: true,
            season: true,
            timeline: true,
            reference: true,
            index: false,
            other: false,
            campaign_hub: true,
          },
          selectedNodeId: null,
          hoveredNodeId: null,
          search: "",
          isolatedMode: true,
        };

        controlsEl.innerHTML = `
          <label><input type="checkbox" data-type="player" checked> Игроки</label>
          <label><input type="checkbox" data-type="npc_alive" checked> НПС живые</label>
          <label><input type="checkbox" data-type="npc_dead" checked> НПС мёртвые</label>
          <label><input type="checkbox" data-type="faction" checked> Фракции</label>
          <label><input type="checkbox" data-type="location" checked> Локации</label>
          <label><input type="checkbox" data-type="episode" checked> Серии</label>
          <label><input type="checkbox" data-type="event" checked> События</label>
          <label><input type="checkbox" data-type="season" checked> Сезоны</label>
          <label><input type="checkbox" data-type="timeline" checked> Хронология</label>
          <label><input type="checkbox" data-type="reference" checked> Справка</label>
        `;

        let highlightNodeIds = new Set();
        let highlightLinkKeys = new Set();
        let hoverNodeIds = new Set();
        let hoverLinkKeys = new Set();

        function linkKey(link) {
          const s = typeof link.source === "object" ? link.source.id : link.source;
          const t = typeof link.target === "object" ? link.target.id : link.target;
          return `${s}→${t}`;
        }

        function shouldIncludeCampaignHub(activeTypes) {
          return activeTypes.has("timeline") || activeTypes.has("season") || activeTypes.has("episode");
        }

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
              highlightLinkKeys.add(`${l.target}→${l.source}`);
            }
          }
        }

        function rebuildHoverState() {
          hoverNodeIds = new Set();
          hoverLinkKeys = new Set();

          if (!state.hoveredNodeId || state.selectedNodeId) return;

          hoverNodeIds.add(state.hoveredNodeId);
          const neighbors = adjacency.get(state.hoveredNodeId) || new Set();
          neighbors.forEach((n) => hoverNodeIds.add(n));

          for (const l of rawLinks) {
            if (l.source === state.hoveredNodeId || l.target === state.hoveredNodeId) {
              hoverLinkKeys.add(`${l.source}→${l.target}`);
              hoverLinkKeys.add(`${l.target}→${l.source}`);
            }
          }
        }

        function getActiveTypes() {
          return new Set(
            Object.entries(state.types)
              .filter(([, value]) => value)
              .map(([type]) => type)
          );
        }

        function getBaseFilteredNodes() {
          const activeTypes = getActiveTypes();
          let nodes = rawNodes.filter((n) => activeTypes.has(n.type));

          if (shouldIncludeCampaignHub(activeTypes)) {
            nodes = rawNodes.filter((n) => activeTypes.has(n.type) || n.type === "campaign_hub");
          }

          return nodes;
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
            nodes = nodes.filter((n) => n.id === state.selectedNodeId || neighbors.has(n.id));
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

        function getForceProfile() {
          const activeTypes = [...getActiveTypes()];
          const structuralOnly =
            activeTypes.length > 0 &&
            activeTypes.every((type) => ["episode", "season", "timeline"].includes(type));

          if (structuralOnly) {
            return {
              charge: -70,
              baseDistance: 58,
              importantDistance: 72,
              linkStrength: 1.2,
              collideRadius: 11,
              collideStrength: 0.9,
              centerStrength: 0.14,
            };
          }

          return {
            charge: -220,
            baseDistance: 90,
            importantDistance: 118,
            linkStrength: 0.6,
            collideRadius: 18,
            collideStrength: 0.95,
            centerStrength: 0.05,
          };
        }

        function applyForces() {
          const profile = getForceProfile();

          const chargeForce = graph.d3Force("charge");
          if (chargeForce) chargeForce.strength(profile.charge);

          const linkForce = graph.d3Force("link");
          if (linkForce) {
            linkForce.distance((link) => {
              const sourceId = typeof link.source === "object" ? link.source.id : link.source;
              const targetId = typeof link.target === "object" ? link.target.id : link.target;

              const sourceNode = rawNodes.find((n) => n.id === sourceId);
              const targetNode = rawNodes.find((n) => n.id === targetId);

              const important =
                sourceNode?.type === "campaign_hub" ||
                targetNode?.type === "campaign_hub" ||
                sourceNode?.type === "episode" ||
                targetNode?.type === "episode" ||
                sourceNode?.type === "season" ||
                targetNode?.type === "season" ||
                sourceNode?.type === "timeline" ||
                targetNode?.type === "timeline" ||
                sourceNode?.type === "faction" ||
                targetNode?.type === "faction" ||
                sourceNode?.type === "location" ||
                targetNode?.type === "location";

              return important ? profile.importantDistance : profile.baseDistance;
            });
            linkForce.strength(profile.linkStrength);
          }

          const collideForce = graph.d3Force("collide");
          if (collideForce) {
            collideForce.radius((node) => {
              if (state.selectedNodeId === node.id) return 28;
              if (highlightNodeIds.has(node.id)) return 23;
              if (node.type === "campaign_hub") return 22;
              return profile.collideRadius;
            });
            collideForce.strength(profile.collideStrength);
            collideForce.iterations(2);
          }

          const centerForce = graph.d3Force("center");
          if (centerForce && typeof centerForce.strength === "function") {
            centerForce.strength(profile.centerStrength);
          }
        }

        function fitGraph(ms = 700, padding = RESET_FIT_PADDING) {
          const visible = getVisibleGraph();
          if (!graph || !visible.nodes.length) return;

          requestAnimationFrame(() => {
            graph.zoomToFit(ms, padding);
          });
        }

        function isNodeDimmed(nodeId) {
          if (state.selectedNodeId) {
            return !highlightNodeIds.has(nodeId);
          }
          if (state.hoveredNodeId) {
            return !hoverNodeIds.has(nodeId);
          }
          return false;
        }

        function isLinkDimmed(link) {
          if (state.selectedNodeId) {
            return !highlightLinkKeys.has(linkKey(link));
          }
          if (state.hoveredNodeId) {
            return !hoverLinkKeys.has(linkKey(link));
          }
          return false;
        }

        function isNodeEmphasized(nodeId) {
          if (state.selectedNodeId) return highlightNodeIds.has(nodeId);
          if (state.hoveredNodeId) return hoverNodeIds.has(nodeId);
          return false;
        }

        graph = ForceGraph()(graphEl)
          .width(graphEl.clientWidth)
          .height(graphEl.clientHeight)
          .backgroundColor(getComputedStyle(graphEl).backgroundColor || "#111827")
          .nodeId("id")
          .nodeLabel((node) => `${node.label}`)
          .nodeRelSize(4)
          .nodeVal((node) => {
            if (node.type === "campaign_hub") return 5.4;
            if (state.selectedNodeId === node.id) return 6.4;
            if (highlightNodeIds.has(node.id)) return 5.2;
            if (hoverNodeIds.has(node.id)) return 4.8;
            return 3.5;
          })
          .nodeCanvasObject((node, ctx, globalScale) => {
            const isSelected = state.selectedNodeId === node.id;
            const isHovered = state.hoveredNodeId === node.id && !state.selectedNodeId;
            const emphasized = isNodeEmphasized(node.id);
            const dimmed = isNodeDimmed(node.id);
            const isCampaignHub = node.type === "campaign_hub";

            let radius = isCampaignHub ? 5.4 : 3.5;
            if (isSelected) radius = 6.4;
            else if (emphasized) radius = Math.max(radius, 5.0);
            else if (isHovered) radius = Math.max(radius, 5.0);

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);

            if (isSelected) {
              ctx.fillStyle = style.nodeSelected;
            } else if (isHovered) {
              ctx.fillStyle = style.nodeHover;
            } else if (dimmed) {
              ctx.fillStyle = style.nodeDim;
            } else {
              ctx.fillStyle = node.color;
            }
            ctx.fill();

            let showLabel = false;
            if (state.selectedNodeId) {
              showLabel =
                isSelected ||
                emphasized ||
                globalScale >= 1.18;
            } else if (state.hoveredNodeId) {
              showLabel =
                isHovered ||
                emphasized ||
                globalScale >= 1.24;
            } else {
              showLabel =
                isCampaignHub ||
                globalScale >= 1.2;
            }

            if (showLabel) {
              const fontSize = Math.max(12 / globalScale, 4.7);
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.fillStyle = dimmed ? style.textDim : style.textNormal;
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(node.label, node.x + radius + 5, node.y);
            }
          })
          .linkColor((link) => {
            if (state.selectedNodeId) {
              return highlightLinkKeys.has(linkKey(link)) ? style.linkSelected : style.linkDim;
            }
            if (state.hoveredNodeId) {
              return hoverLinkKeys.has(linkKey(link)) ? style.linkHover : style.linkDim;
            }
            return style.linkNormal;
          })
          .linkWidth((link) => {
            if (state.selectedNodeId) {
              return highlightLinkKeys.has(linkKey(link)) ? 2.2 : 0.65;
            }
            if (state.hoveredNodeId) {
              return hoverLinkKeys.has(linkKey(link)) ? 1.8 : 0.5;
            }
            return 0.82;
          })
          .cooldownTicks(220)
          .d3AlphaDecay(0.03)
          .d3VelocityDecay(0.34)
          .onNodeHover((node) => {
            const newHoveredId = node ? node.id : null;
            if (state.hoveredNodeId === newHoveredId) return;
            state.hoveredNodeId = newHoveredId;
            rebuildHoverState();
            graph.refresh();
          })
          .onNodeClick((node) => {
            state.selectedNodeId = node.id;
            rebuildHighlights();
            rebuildHoverState();
            applyForces();
            render();

            setTimeout(() => {
              graph.centerAt(node.x, node.y, 450);
              graph.zoom(CLICK_ZOOM, 450);
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
            state.hoveredNodeId = null;
            rebuildHighlights();
            rebuildHoverState();
            applyForces();
            render();

            setTimeout(() => {
              if (!userMovedNode) {
                fitGraph(650, RESET_FIT_PADDING);
              }
            }, 50);
          });

        graph.d3Force("charge");
        graph.d3Force("link");
        graph.d3Force("center");
        graph.d3Force("collide");

        applyForces();

        function render() {
          rebuildHighlights();
          rebuildHoverState();
          const visible = getVisibleGraph();
          graph.graphData(visible);
          applyForces();
          graph.d3ReheatSimulation();
        }

        controlsEl.querySelectorAll("input[type=checkbox]").forEach((input) => {
          input.addEventListener("change", (e) => {
            const type = e.target.dataset.type;
            state.types[type] = e.target.checked;
            state.selectedNodeId = null;
            state.hoveredNodeId = null;
            rebuildHighlights();
            rebuildHoverState();
            applyForces();
            render();

            setTimeout(() => {
              if (!userMovedNode) {
                fitGraph(650, RESET_FIT_PADDING);
              }
            }, 100);
          });
        });

        if (searchEl) {
          searchEl.addEventListener("input", (e) => {
            state.search = e.target.value || "";
            state.selectedNodeId = null;
            state.hoveredNodeId = null;
            rebuildHighlights();
            rebuildHoverState();
            applyForces();
            render();

            setTimeout(() => {
              if (!userMovedNode) {
                fitGraph(650, RESET_FIT_PADDING);
              }
            }, 100);
          });
        }

        window.addEventListener("resize", () => {
          clearResizeFitTimer();
          graph.width(graphEl.clientWidth);
          graph.height(graphEl.clientHeight);
          applyForces();

          resizeFitTimer = setTimeout(() => {
            if (!state.selectedNodeId && !userMovedNode) {
              fitGraph(450, RESIZE_FIT_PADDING);
            }
          }, 180);
        });

        document.addEventListener("themechange", () => {
          style = computeStyle();
          graph.refresh();
        });

        render();
      })
      .catch((err) => {
        console.error("Ошибка инициализации карты связей:", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNetworkGraph);
  } else {
    initNetworkGraph();
  }

  window.addEventListener("pageshow", initNetworkGraph);
  document.addEventListener("nav", initNetworkGraph);

  const observer = new MutationObserver(() => {
    if (document.getElementById("network-graph")) {
      initNetworkGraph();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
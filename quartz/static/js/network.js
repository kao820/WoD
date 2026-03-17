(function () {
  let initializedGraphEl = null;
  let mutationObserverStarted = false;

  function initNetworkGraph() {
    const graphEl = document.getElementById("network-graph");
    const controlsEl = document.getElementById("network-controls");
    const forcesLayoutEl = document.getElementById("network-forces-layout");
    const searchEl = document.getElementById("network-search");

    if (!graphEl || !controlsEl || !forcesLayoutEl) return;
    if (initializedGraphEl === graphEl) return;
    initializedGraphEl = graphEl;

    if (typeof ForceGraph !== "function") {
      console.error("ForceGraph не загрузился.");
      return;
    }

    let graph = null;
    let resizeFitTimer = null;
    let userMovedNode = false;
    let style = computeStyle();

    const RESET_FIT_PADDING = 24;
    const RESIZE_FIT_PADDING = 28;
    const CLICK_ZOOM = 2.15;

    const DEFAULT_SETTINGS = {
      charge: 130,
      linkDistance: 78,
      linkStrength: 105,
      labelThreshold: 120,
    };

    const STRUCTURAL_SETTINGS = {
      charge: 16,
      linkDistance: 34,
      linkStrength: 185,
      labelThreshold: 125,
    };

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
        { type: "event", label: "События" },
        { type: "reference", label: "Справка" },
      ],
      [
        { type: "timeline", label: "Хронология" },
        { type: "season", label: "Сезоны" },
        { type: "episode", label: "Серии" },
      ],
    ];

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
        label: "Расстояние между узлами",
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
    ];

    const settings = { ...DEFAULT_SETTINGS };
    let themeDefaultColors = getThemeDefaultColors();
    const colorMap = { ...themeDefaultColors };

    const state = {
      types: {
        player: true,
        player_dead: true,
        npc_alive: true,
        npc_dead: true,
        faction: true,
        location: true,
        event: true,
        reference: true,
        timeline: true,
        season: true,
        episode: true,
        campaign_hub: true,
        index: false,
        other: false,
      },
      selectedNodeId: null,
      search: "",
      isolatedMode: true,
    };

    const ui = {
      settingInputs: {},
      settingValues: {},
      settingsGridEl: null,
      fitButton: null,
      resetButton: null,
      resetColorsButton: null,
    };

    function clearResizeFitTimer() {
      if (resizeFitTimer) {
        clearTimeout(resizeFitTimer);
        resizeFitTimer = null;
      }
    }

    function isDarkTheme() {
      const savedTheme = document.documentElement.getAttribute("saved-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      return savedTheme === "dark" || (!savedTheme && prefersDark);
    }

    function computeStyle() {
      const dark = isDarkTheme();

      return {
        linkNormal: dark ? "rgba(200,200,200,0.26)" : "rgba(120,120,120,0.22)",
        linkSelected: dark ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.8)",
        textNormal: dark ? "#f1f5f9" : "#222222",
        textDim: dark ? "#94a3af" : "#9ca3af",
        nodeSelected: dark ? "#f8fafc" : "#111111",
        nodeDim: dark ? "rgba(255,255,255,0.35)" : "#d1d5db",
      };
    }

    function getNeutralThemeColor() {
      return isDarkTheme() ? "#94a3b8" : "#94a3af";
    }

    function getThemeDefaultColors() {
      const neutral = getNeutralThemeColor();

      return {
        campaign_hub: neutral,
        player: neutral,
        player_dead: neutral,
        npc_alive: neutral,
        npc_dead: neutral,
        faction: neutral,
        location: neutral,
        event: neutral,
        reference: neutral,
        timeline: neutral,
        season: neutral,
        episode: neutral,
        index: neutral,
        other: neutral,
      };
    }

    function buildControls() {
      controlsEl.replaceChildren();

      CONTROL_COLUMNS.forEach((column) => {
        const columnEl = document.createElement("div");
        columnEl.className = "network-controls-column";

        column.forEach((item) => {
          const rowEl = document.createElement("div");
          rowEl.className = "network-control-row";

          const toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = `network-toggle${state.types[item.type] ? " is-on" : ""}`;
          toggle.dataset.type = item.type;
          toggle.setAttribute("aria-label", item.label);
          toggle.setAttribute("aria-pressed", state.types[item.type] ? "true" : "false");
          toggle.title = item.label;

          const label = document.createElement("button");
          label.type = "button";
          label.className = "network-control-label";
          label.dataset.type = item.type;
          label.textContent = item.label;
          label.style.background = "transparent";
          label.style.border = "0";
          label.style.padding = "0";
          label.style.margin = "0";
          label.style.textAlign = "left";
          label.style.color = "inherit";
          label.title = item.label;

          const colorWrap = document.createElement("div");
          colorWrap.className = "network-color-picker";

          const colorDot = document.createElement("span");
          colorDot.className = "network-color-dot";
          colorDot.style.background = colorMap[item.type] || getNeutralThemeColor();

          const colorInput = document.createElement("input");
          colorInput.type = "color";
          colorInput.className = "network-color-input";
          colorInput.dataset.colorType = item.type;
          colorInput.value = colorMap[item.type] || getNeutralThemeColor();
          colorInput.setAttribute("aria-label", `Цвет: ${item.label}`);
          colorInput.title = `Цвет: ${item.label}`;

          colorWrap.appendChild(colorDot);
          colorWrap.appendChild(colorInput);

          rowEl.appendChild(toggle);
          rowEl.appendChild(label);
          rowEl.appendChild(colorWrap);
          columnEl.appendChild(rowEl);
        });

        controlsEl.appendChild(columnEl);
      });
    }

    function buildForcesPanel() {
      forcesLayoutEl.replaceChildren();
      ui.settingInputs = {};
      ui.settingValues = {};

      const settingsGridEl = document.createElement("div");
      settingsGridEl.className = "network-settings-grid";

      SETTING_DEFS.forEach((item) => {
        const settingEl = document.createElement("div");
        settingEl.className = "network-setting";

        const label = document.createElement("label");
        label.htmlFor = `network-setting-${item.key}`;
        label.textContent = item.label;

        const row = document.createElement("div");
        row.className = "network-setting-row";

        const input = document.createElement("input");
        input.type = "range";
        input.id = `network-setting-${item.key}`;
        input.min = String(item.min);
        input.max = String(item.max);
        input.step = String(item.step);
        input.dataset.settingKey = item.key;

        const valueEl = document.createElement("span");
        valueEl.className = "network-setting-value";

        row.appendChild(input);
        row.appendChild(valueEl);
        settingEl.appendChild(label);
        settingEl.appendChild(row);
        settingsGridEl.appendChild(settingEl);

        ui.settingInputs[item.key] = input;
        ui.settingValues[item.key] = valueEl;
      });

      const actionsEl = document.createElement("div");
      actionsEl.className = "network-settings-actions";

      const fitButton = document.createElement("button");
      fitButton.type = "button";
      fitButton.textContent = "Вписать в область";

      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.textContent = "Сбросить настройки";

      const resetColorsButton = document.createElement("button");
      resetColorsButton.type = "button";
      resetColorsButton.textContent = "Сбросить цвета";

      actionsEl.appendChild(fitButton);
      actionsEl.appendChild(resetButton);
      actionsEl.appendChild(resetColorsButton);

      forcesLayoutEl.appendChild(settingsGridEl);
      forcesLayoutEl.appendChild(actionsEl);

      ui.settingsGridEl = settingsGridEl;
      ui.fitButton = fitButton;
      ui.resetButton = resetButton;
      ui.resetColorsButton = resetColorsButton;
    }

    function updateSettingLabels() {
      SETTING_DEFS.forEach((item) => {
        const valueEl = ui.settingValues[item.key];
        if (valueEl) {
          valueEl.textContent = item.format(settings[item.key]);
        }
      });
    }

    function syncSettingInputs() {
      SETTING_DEFS.forEach((item) => {
        const input = ui.settingInputs[item.key];
        if (input) {
          input.value = String(settings[item.key]);
        }
      });
      updateSettingLabels();
    }

    function getActiveTypes() {
      return new Set(
        Object.entries(state.types)
          .filter(([, enabled]) => enabled)
          .map(([type]) => type)
      );
    }

    function shouldIncludeCampaignHub(activeTypes) {
      return activeTypes.has("timeline") || activeTypes.has("season") || activeTypes.has("episode");
    }

    function isStructuralOnly(activeTypes) {
      return (
        activeTypes.size > 0 &&
        [...activeTypes].every((type) => ["timeline", "season", "episode"].includes(type))
      );
    }

    function applyPresetForActiveTypes() {
      const activeTypes = getActiveTypes();
      const preset = isStructuralOnly(activeTypes) ? STRUCTURAL_SETTINGS : DEFAULT_SETTINGS;

      settings.charge = preset.charge;
      settings.linkDistance = preset.linkDistance;
      settings.linkStrength = preset.linkStrength;
      settings.labelThreshold = preset.labelThreshold;

      syncSettingInputs();
    }

    function getNodeColor(node) {
      return colorMap[node.type] || themeDefaultColors[node.type] || getNeutralThemeColor();
    }

    const host = window.location.hostname;
    let basePath = "";

    if (host.endsWith("github.io")) {
      const segs = window.location.pathname.split("/").filter(Boolean);
      basePath = segs.length > 0 ? `/${segs[0]}` : "";
    }

    const contentIndexUrl = `${basePath}/static/contentIndex.json`;

    fetch(contentIndexUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Не удалось загрузить ${contentIndexUrl}: ${res.status}`);
        }
        return res.json();
      })
      .then((index) => {
        function isCampaignHub(slug, page) {
          return (page?.title || "").trim().toLowerCase() === "кампании";
        }

        function getType(slug, page) {
          if (isCampaignHub(slug, page)) return "campaign_hub";

          if (
            slug.startsWith("04-Персонажи/Игроки/Живы/") ||
            slug.startsWith("04 Персонажи/Игроки/Живы/")
          ) return "player";

          if (
            slug.startsWith("04-Персонажи/Игроки/Мертвы/") ||
            slug.startsWith("04 Персонажи/Игроки/Мертвы/")
          ) return "player_dead";

          if (
            slug.startsWith("04-Персонажи/НПС/Живы/") ||
            slug.startsWith("04 Персонажи/НПС/Живы/")
          ) return "npc_alive";

          if (
            slug.startsWith("04-Персонажи/НПС/Мертвы/") ||
            slug.startsWith("04 Персонажи/НПС/Мертвы/")
          ) return "npc_dead";

          if (slug.startsWith("05-Фракции/") || slug.startsWith("05 Фракции/")) return "faction";
          if (slug.startsWith("06-Локации/") || slug.startsWith("06 Локации/")) return "location";
          if (slug.startsWith("07-События/") || slug.startsWith("07 События/")) return "event";
          if (slug.startsWith("08-Справка/") || slug.startsWith("08 Справка/")) return "reference";
          if (slug.startsWith("01-Хронология/") || slug.startsWith("01 Хронология/")) return "timeline";
          if (slug.startsWith("02-Сезоны/") || slug.startsWith("02 Сезоны/")) return "season";
          if (slug.startsWith("03-Серии/") || slug.startsWith("03 Серии/")) return "episode";
          if (slug === "index") return "index";

          return "other";
        }

        const rawNodes = [];
        const existingIds = new Set();

        for (const [slug, page] of Object.entries(index)) {
          existingIds.add(slug);
          rawNodes.push({
            id: slug,
            label: page.title || slug,
            type: getType(slug, page),
          });
        }

        const rawLinks = [];
        const seenLinks = new Set();

        for (const [slug, page] of Object.entries(index)) {
          for (const link of page.links || []) {
            if (!existingIds.has(link) || slug === link) continue;

            const forward = `${slug}→${link}`;
            const reverse = `${link}→${slug}`;

            if (seenLinks.has(forward) || seenLinks.has(reverse)) continue;

            seenLinks.add(forward);
            rawLinks.push({ source: slug, target: link });
          }
        }

        const nodeById = new Map(rawNodes.map((n) => [n.id, n]));
        const adjacency = new Map();

        rawNodes.forEach((n) => adjacency.set(n.id, new Set()));
        rawLinks.forEach((l) => {
          adjacency.get(l.source)?.add(l.target);
          adjacency.get(l.target)?.add(l.source);
        });

        let highlightNodeIds = new Set();
        let highlightLinkKeys = new Set();

        function linkKey(link) {
          const sourceId = typeof link.source === "object" ? link.source.id : link.source;
          const targetId = typeof link.target === "object" ? link.target.id : link.target;
          return `${sourceId}→${targetId}`;
        }

        function rebuildHighlights() {
          highlightNodeIds = new Set();
          highlightLinkKeys = new Set();

          if (!state.selectedNodeId) return;

          highlightNodeIds.add(state.selectedNodeId);
          const neighbors = adjacency.get(state.selectedNodeId) || new Set();
          neighbors.forEach((id) => highlightNodeIds.add(id));

          rawLinks.forEach((l) => {
            if (l.source === state.selectedNodeId || l.target === state.selectedNodeId) {
              highlightLinkKeys.add(`${l.source}→${l.target}`);
              highlightLinkKeys.add(`${l.target}→${l.source}`);
            }
          });
        }

        function getBaseFilteredNodes() {
          const activeTypes = getActiveTypes();

          return rawNodes.filter((node) => {
            if (node.type === "campaign_hub") {
              return shouldIncludeCampaignHub(activeTypes);
            }
            return activeTypes.has(node.type);
          });
        }

        function getVisibleGraph() {
          let nodes = getBaseFilteredNodes();

          if (state.search.trim()) {
            const q = state.search.trim().toLowerCase();
            const found = nodes.find((n) => n.label.toLowerCase().includes(q));

            if (found) {
              const neighbors = adjacency.get(found.id) || new Set();
              nodes = nodes.filter((n) => n.id === found.id || neighbors.has(n.id));
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

        function applyForces() {
          if (!graph) return;

          graph.cooldownTicks(220);
          graph.d3AlphaDecay(0.03);
          graph.d3VelocityDecay(0.34);

          const chargeForce = graph.d3Force("charge");
          if (chargeForce) {
            chargeForce.strength(-settings.charge);
          }

          const linkForce = graph.d3Force("link");
          if (linkForce) {
            linkForce.distance((link) => {
              const sourceId = typeof link.source === "object" ? link.source.id : link.source;
              const targetId = typeof link.target === "object" ? link.target.id : link.target;

              const sourceNode = nodeById.get(sourceId);
              const targetNode = nodeById.get(targetId);

              const structural =
                sourceNode?.type === "campaign_hub" ||
                targetNode?.type === "campaign_hub" ||
                sourceNode?.type === "timeline" ||
                targetNode?.type === "timeline" ||
                sourceNode?.type === "season" ||
                targetNode?.type === "season" ||
                sourceNode?.type === "episode" ||
                targetNode?.type === "episode";

              return structural
                ? Math.max(20, Math.round(settings.linkDistance * 0.82))
                : settings.linkDistance;
            });

            linkForce.strength(settings.linkStrength / 100);
          }

          const collideForce = graph.d3Force("collide");
          if (collideForce) {
            collideForce.radius((node) => {
              if (state.selectedNodeId === node.id) return 28;
              if (highlightNodeIds.has(node.id)) return 23;
              if (node.type === "campaign_hub") return 14;
              return 12;
            });
            collideForce.strength(0.92);
            collideForce.iterations(2);
          }

          const centerForce = graph.d3Force("center");
          if (centerForce && typeof centerForce.strength === "function") {
            centerForce.strength(0.08);
          }
        }

        function fitGraph(ms = 700, padding = RESET_FIT_PADDING) {
          const visible = getVisibleGraph();
          if (!graph || !visible.nodes.length) return;

          requestAnimationFrame(() => {
            graph.zoomToFit(ms, padding);
          });
        }

        function refreshGraphWithCurrentSettings(shouldFit = false) {
          applyForces();
          graph.d3ReheatSimulation();
          graph.graphData(graph.graphData());

          if (shouldFit && !state.selectedNodeId) {
            setTimeout(() => {
              fitGraph(500, RESET_FIT_PADDING);
            }, 80);
          }
        }

        function render() {
          rebuildHighlights();
          const visible = getVisibleGraph();
          graph.graphData(visible);
          applyForces();
          graph.d3ReheatSimulation();
        }

        function rerenderControlsOnly() {
          buildControls();
        }

        buildControls();
        buildForcesPanel();
        applyPresetForActiveTypes();

        graph = ForceGraph()(graphEl)
          .width(graphEl.clientWidth)
          .height(graphEl.clientHeight)
          .backgroundColor("rgba(0,0,0,0)")
          .nodeId("id")
          .nodeLabel((node) => node.label)
          .nodeRelSize(4)
          .nodeVal((node) => {
            if (node.type === "campaign_hub") return 5.2;
            if (state.selectedNodeId === node.id) return 6.2;
            if (highlightNodeIds.has(node.id)) return 5.1;
            return 3.5;
          })
          .nodeCanvasObject((node, ctx, globalScale) => {
            const isSelected = state.selectedNodeId === node.id;
            const isHighlighted = highlightNodeIds.has(node.id);
            const isDimmed = state.selectedNodeId && !isHighlighted;
            const isCampaignHub = node.type === "campaign_hub";

            const radius = isSelected ? 6.2 : isHighlighted ? 5.1 : isCampaignHub ? 5.2 : 3.5;

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);

            if (isSelected) {
              ctx.fillStyle = style.nodeSelected;
            } else if (isDimmed) {
              ctx.fillStyle = style.nodeDim;
            } else {
              ctx.fillStyle = getNodeColor(node);
            }

            ctx.fill();

            const threshold = settings.labelThreshold / 100;
            let showLabel = false;

            if (state.selectedNodeId) {
              showLabel = isSelected || isHighlighted || globalScale >= Math.max(1.05, threshold);
            } else {
              showLabel = isCampaignHub || globalScale >= threshold;
            }

            if (showLabel) {
              const fontSize = Math.max(12 / globalScale, 4.7);
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.fillStyle = isDimmed ? style.textDim : style.textNormal;
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(node.label, node.x + radius + 5, node.y);
            }
          })
          .linkColor((link) => {
            if (!state.selectedNodeId) return style.linkNormal;
            return highlightLinkKeys.has(linkKey(link)) ? style.linkSelected : style.linkNormal;
          })
          .linkWidth((link) => (highlightLinkKeys.has(linkKey(link)) ? 2.1 : 0.82))
          .cooldownTicks(220)
          .d3AlphaDecay(0.03)
          .d3VelocityDecay(0.34)
          .onNodeClick((node) => {
            state.selectedNodeId = node.id;
            rebuildHighlights();
            render();

            setTimeout(() => {
              if (typeof node.x === "number" && typeof node.y === "number") {
                graph.centerAt(node.x, node.y, 450);
                graph.zoom(CLICK_ZOOM, 450);
              }
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
              if (!userMovedNode) {
                fitGraph(650, RESET_FIT_PADDING);
              }
            }, 50);
          });

        applyForces();
        syncSettingInputs();
        render();

        controlsEl.addEventListener("click", (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;

          const toggleTarget = target.closest("[data-type]");
          if (!toggleTarget) return;

          const type = toggleTarget.dataset.type;
          if (!type || !(type in state.types)) return;

          state.types[type] = !state.types[type];
          state.selectedNodeId = null;
          userMovedNode = false;

          rerenderControlsOnly();
          applyPresetForActiveTypes();
          rebuildHighlights();
          render();

          setTimeout(() => {
            fitGraph(650, RESET_FIT_PADDING);
          }, 100);
        });

        controlsEl.addEventListener("input", (event) => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement)) return;
          if (target.type !== "color") return;

          const type = target.dataset.colorType;
          if (!type) return;

          colorMap[type] = target.value;

          const wrap = target.closest(".network-color-picker");
          const dot = wrap ? wrap.querySelector(".network-color-dot") : null;
          if (dot instanceof HTMLElement) {
            dot.style.background = target.value;
          }

          graph.graphData(graph.graphData());
        });

        ui.settingsGridEl.addEventListener("input", (event) => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement)) return;
          if (target.type !== "range") return;

          const key = target.dataset.settingKey;
          if (!key || !(key in settings)) return;

          settings[key] = Number(target.value);
          updateSettingLabels();

          if (key === "labelThreshold") {
            graph.graphData(graph.graphData());
            return;
          }

          refreshGraphWithCurrentSettings(false);
        });

        ui.fitButton.addEventListener("click", () => {
          fitGraph(600, RESET_FIT_PADDING);
        });

        ui.resetButton.addEventListener("click", () => {
          applyPresetForActiveTypes();
          refreshGraphWithCurrentSettings(true);
        });

        ui.resetColorsButton.addEventListener("click", () => {
          themeDefaultColors = getThemeDefaultColors();

          Object.keys(colorMap).forEach((key) => {
            delete colorMap[key];
          });
          Object.assign(colorMap, themeDefaultColors);

          rerenderControlsOnly();
          graph.graphData(graph.graphData());
        });

        if (searchEl) {
          searchEl.addEventListener("input", (event) => {
            state.search = event.target.value || "";
            state.selectedNodeId = null;
            rebuildHighlights();
            render();

            setTimeout(() => {
              if (!userMovedNode) {
                fitGraph(650, RESET_FIT_PADDING);
              }
            }, 100);
          });
        }

        window.addEventListener("resize", () => {
          const currentGraphEl = document.getElementById("network-graph");
          if (!currentGraphEl || !graph) return;

          clearResizeFitTimer();
          graph.width(currentGraphEl.clientWidth);
          graph.height(currentGraphEl.clientHeight);
          applyForces();

          resizeFitTimer = setTimeout(() => {
            if (!state.selectedNodeId && !userMovedNode) {
              fitGraph(450, RESIZE_FIT_PADDING);
            }
          }, 180);
        });

        document.addEventListener("themechange", () => {
          style = computeStyle();
          themeDefaultColors = getThemeDefaultColors();
          if (graph) {
            render();
          }
        });

        setTimeout(() => {
          fitGraph(700, RESET_FIT_PADDING);
        }, 120);
      })
      .catch((error) => {
        console.error("Ошибка инициализации карты связей:", error);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNetworkGraph);
  } else {
    initNetworkGraph();
  }

  window.addEventListener("pageshow", initNetworkGraph);
  document.addEventListener("nav", initNetworkGraph);

  if (!mutationObserverStarted) {
    const observer = new MutationObserver(() => {
      if (document.getElementById("network-graph")) {
        initNetworkGraph();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    mutationObserverStarted = true;
  }
})();
---
title: Карта связей
---

<style>
  .network-shell {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    padding: 8px 18px 24px;
    box-sizing: border-box;
  }

  .network-toolbar {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) repeat(4, max-content);
    gap: 8px;
    align-items: center;
    margin: 10px 0 14px;
  }

  .network-search {
    display: block;
    width: 100%;
    min-width: 0;
    padding: 9px 12px;
    border: 1px solid #cfcfcf;
    border-radius: 10px;
    font-size: 14px;
    box-sizing: border-box;
    background: var(--light, #fff);
    color: inherit;
  }

  .network-toolbar-button {
    border: 1px solid #cfcfcf;
    border-radius: 10px;
    background: transparent;
    padding: 9px 14px;
    font-size: 14px;
    line-height: 1.2;
    color: inherit;
    cursor: pointer;
    box-sizing: border-box;
    white-space: nowrap;
  }

  .network-top-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(300px, 0.82fr);
    gap: 16px;
    align-items: stretch;
    margin-bottom: 14px;
  }

  .network-panel {
    margin: 0;
    border: 1px solid #ddd;
    border-radius: 12px;
    padding: 14px 14px 12px;
    box-sizing: border-box;
    overflow: hidden;
    min-width: 0;
    height: 100%;
  }

  .network-panel-title {
    font-weight: 700;
    margin: 0 0 10px;
    font-size: 15px;
    line-height: 1.2;
  }

  .network-controls-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px 14px;
    align-items: start;
    width: 100%;
  }

  .network-controls-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    width: 100%;
  }

  .network-control-row {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) 20px;
    align-items: center;
    gap: 8px;
    min-width: 0;
    width: 100%;
  }

  .network-toggle {
    width: 18px;
    height: 18px;
    border: 1px solid #8d99a6;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    position: relative;
    padding: 0;
    box-sizing: border-box;
  }

  .network-toggle.is-on {
    background: #2f5f76;
    border-color: #2f5f76;
  }

  .network-toggle.is-on::after {
    content: "✓";
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -56%);
    color: #ffffff;
    font-size: 12px;
    line-height: 1;
    font-weight: 700;
    text-shadow: 0 0 1px rgba(0, 0, 0, 0.35);
  }

  .network-control-label {
    min-width: 0;
    font-size: 12px;
    line-height: 1.15;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: none;
  }

  .network-color-picker {
    position: relative;
    width: 20px;
    height: 20px;
    justify-self: end;
    flex: 0 0 auto;
  }

  .network-color-dot {
    display: block;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.22);
    box-sizing: border-box;
    pointer-events: none;
  }

  .network-color-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    border: 0;
    padding: 0;
    margin: 0;
  }

  .network-color-input::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  .network-color-input::-webkit-color-swatch {
    border: 0;
  }

  .network-forces-layout {
    display: block;
    width: 100%;
  }

  .network-settings-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 12px;
    width: 100%;
  }

  .network-setting {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    width: 100%;
  }

  .network-setting label {
    font-size: 12px;
    line-height: 1.15;
  }

  .network-setting-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 40px;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .network-setting input[type="range"] {
    width: 100%;
    margin: 0;
  }

  .network-setting-value {
    min-width: 40px;
    text-align: right;
    font-size: 12px;
    color: #666;
    white-space: nowrap;
  }

  .network-graph {
    width: 100%;
    min-height: 360px;
    height: 36vh;
    border: 1px solid #ddd;
    border-radius: 12px;
    background: transparent;
    overflow: hidden;
    box-sizing: border-box;
  }

  .network-graph.is-expanded {
    position: fixed;
    inset: 4vh 4vw;
    width: 92vw;
    height: 92vh;
    z-index: 100002;
    background: var(--light, #fff);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.25);
  }

  body.network-expanded {
    overflow: hidden;
  }

  body.network-expanded::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: 100001;
    backdrop-filter: blur(4px);
    background: rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 1100px) {
    .network-toolbar {
      grid-template-columns: 1fr;
    }

    .network-top-layout {
      grid-template-columns: 1fr;
    }

    .network-controls-grid {
      grid-template-columns: 1fr;
    }

    .network-settings-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

<div class="network-shell">
  <div class="network-toolbar">
    <input
      id="network-search"
      class="network-search"
      type="text"
      placeholder="Поиск по узлам..."
      autocomplete="off"
    />
    <button id="network-fit-button" class="network-toolbar-button" type="button">Вписать в область</button>
    <button id="network-expand-button" class="network-toolbar-button" type="button">Развернуть</button>
    <button id="network-reset-button" class="network-toolbar-button" type="button">Сбросить настройки</button>
    <button id="network-reset-colors-button" class="network-toolbar-button" type="button">Сбросить цвета</button>
  </div>

  <div id="network-top-layout" class="network-top-layout"></div>

  <div id="network-graph" class="network-graph"></div>
</div>

<script src="https://unpkg.com/force-graph"></script>
<script src="../static/js/network.js"></script>

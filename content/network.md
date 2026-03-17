---
title: Карта связей
---

<style>
  .network-shell {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 8px 24px 24px;
    box-sizing: border-box;
  }

  .network-toolbar {
    margin: 10px 0 14px;
  }

  .network-search {
    display: block;
    width: 100%;
    max-width: 380px;
    padding: 10px 12px;
    border: 1px solid #cfcfcf;
    border-radius: 10px;
    font-size: 14px;
    box-sizing: border-box;
    background: var(--light, #fff);
    color: inherit;
  }

  .network-panel {
    margin: 0 0 14px;
    border: 1px solid #ddd;
    border-radius: 12px;
    padding: 14px;
    box-sizing: border-box;
    overflow: hidden;
  }

  .network-panel-title {
    font-weight: 600;
    margin: 0 0 12px;
    font-size: 16px;
    line-height: 1.2;
  }

  .network-controls-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px 28px;
    align-items: start;
    width: 100%;
  }

  .network-controls-column {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    width: 100%;
  }

  .network-control-row {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) 28px;
    align-items: center;
    gap: 12px;
    min-width: 0;
    width: 100%;
  }

  .network-toggle {
    width: 20px;
    height: 20px;
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
    content: "";
    position: absolute;
    left: 6px;
    top: 2px;
    width: 5px;
    height: 10px;
    border: solid #ffffff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .network-control-label {
    min-width: 0;
    font-size: 14px;
    line-height: 1.2;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: none;
  }

  .network-color-picker {
    position: relative;
    width: 28px;
    height: 28px;
    justify-self: end;
  }

  .network-color-dot {
    display: block;
    width: 28px;
    height: 28px;
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
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px 20px;
    align-items: start;
    width: 100%;
  }

  .network-settings-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px 18px;
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
    font-size: 14px;
    line-height: 1.25;
  }

  .network-setting-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 56px;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .network-setting input[type="range"] {
    width: 100%;
    margin: 0;
  }

  .network-setting-value {
    min-width: 56px;
    text-align: right;
    font-size: 13px;
    color: #666;
    white-space: nowrap;
  }

  .network-settings-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  .network-settings-actions button {
    border: 1px solid #cfcfcf;
    border-radius: 10px;
    background: transparent;
    padding: 9px 12px;
    font-size: 14px;
    cursor: pointer;
    text-align: left;
    color: inherit;
    width: 100%;
    box-sizing: border-box;
  }

  .network-graph {
    width: 100%;
    min-height: 720px;
    height: 72vh;
    border: 1px solid #ddd;
    border-radius: 12px;
    background: transparent;
    overflow: hidden;
    box-sizing: border-box;
  }

  @media (min-width: 760px) {
    .network-controls-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .network-forces-layout {
      grid-template-columns: minmax(0, 2fr) 260px;
    }

    .network-settings-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
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
  </div>

  <section class="network-panel">
    <div class="network-panel-title">Группировка и цвета</div>
    <div id="network-controls" class="network-controls-grid"></div>
  </section>

  <section class="network-panel">
    <div class="network-panel-title">Настройки графа</div>
    <div id="network-forces-layout" class="network-forces-layout"></div>
  </section>

  <div id="network-graph" class="network-graph"></div>
</div>

<script src="https://unpkg.com/force-graph"></script>
<script src="../static/js/network.js"></script>
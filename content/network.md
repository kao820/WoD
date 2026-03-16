---
title: Карта связей
---

<style>
  .network-shell {
    max-width: 920px;
    margin: 0 auto;
    padding: 8px 24px 20px 24px;
    box-sizing: border-box;
    position: relative;
    z-index: 2;
  }

  .network-toolbar {
    margin: 10px 0 14px 0;
  }

  .network-search {
    display: block;
    width: 100%;
    max-width: 360px;
    padding: 10px 12px;
    border: 1px solid #cfcfcf;
    border-radius: 10px;
    font-size: 14px;
    box-sizing: border-box;
  }

  .network-controls {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px 12px;
    margin: 0 0 14px 0;
    font-size: 14px;
    line-height: 1.35;
    position: relative;
    z-index: 3;
  }

  .network-controls label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
    min-width: 0;
  }

  .network-controls input {
    margin: 0;
    flex: 0 0 auto;
  }

  .network-graph {
    height: 380px;
    width: 100%;
    border: 1px solid #ddd;
    border-radius: 12px;
    background: #fff;
    overflow: hidden;
    box-sizing: border-box;
  }

  @media (min-width: 760px) {
    .network-controls {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 1040px) {
    .network-controls {
      grid-template-columns: repeat(3, minmax(0, 1fr));
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
    />
  </div>

  <div id="network-controls" class="network-controls"></div>

  <div id="network-graph" class="network-graph"></div>
</div>

<script src="https://unpkg.com/force-graph"></script>
<script src="./static/js/network.js?v=10"></script>

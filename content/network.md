title: Карта связей
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
    background: transparent;
    overflow: hidden;
    box-sizing: border-box;
  }
  /* Кнопка разворачивания графа */
  .network-fullscreen-btn {
    position: absolute;
    right: 12px;
    top: 12px;
    background: var(--lightgray);
    border: 1px solid var(--gray);
    border-radius: 6px;
    padding: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 4;
  }
  .network-fullscreen-btn svg {
    width: 18px;
    height: 18px;
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
  <!-- Кнопка для разворачивания графа -->
  <button id="network-fullscreen-btn" class="network-fullscreen-btn" aria-label="Развернуть граф">
    <svg viewBox="0 0 55 55" fill="currentColor">
      <path d="M49,0c-3.309,0-6,2.691-6,6c0,1.035,0.263,2.009,0.726,2.86l-9.829,9.829C32.542,17.634,30.846,17,29,17
               s-3.542,0.634-4.898,1.688l-7.669-7.669C16.785,10.424,17,9.74,17,9c0-2.206-1.794-4-4-4S9,6.794,9,9s1.794,4,4,4
               c0.74,0,1.424-0.215,2.019-0.567l7.669,7.669C21.634,21.458,21,23.154,21,25s0.634,3.542,1.688,4.897L10.024,42.562
               C8.958,41.595,7.549,41,6,41c-3.309,0-6,2.691-6,6s2.691,6,6,6s6-2.691,6-6c0-1.035-0.263-2.009-0.726-2.86l12.829-12.829
               c1.106,0.86,2.44,1.436,3.898,1.619v10.16c-2.833,0.478-5,2.942-5,5.91c0,3.309,2.691,6,6,6s6-2.691,6-6
               c0-2.967-2.167-5.431-5-5.91v-10.16c1.458-0.183,2.792-0.759,3.898-1.619l7.669,7.669C41.215,39.576,41,40.26,41,41
               c0,2.206,1.794,4,4,4s4-1.794,4-4s-1.794-4-4-4c-0.74,0-1.424,0.215-2.019,0.567l-7.669-7.669C36.366,28.542,37,26.846,37,25
               s-0.634-3.542-1.688-4.897l9.665-9.665C46.042,11.405,47.451,12,49,12c3.309,0,6-2.691,6-6S52.309,0,49,0z"/>
    </svg>
  </button>

  <div class="network-toolbar">
    <input id="network-search" class="network-search" type="text" placeholder="Поиск по узлам..." />
  </div>
  <div id="network-controls" class="network-controls"></div>
  <div id="network-graph" class="network-graph"></div>
</div>

<!-- Подключаем библиотеку force-graph и наш скрипт network.js -->
<script src="https://unpkg.com/force-graph"></script>
<script src="static/js/network.js"></script>

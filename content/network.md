title: Карта связей
<style>
  /* ... существующие стили ... */

  /* Кнопка полноэкранного режима */
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
</style>

<div class="network-shell">
  <!-- Кнопка полноэкранного режима -->
  <button id="network-fullscreen-btn" class="network-fullscreen-btn" aria-label="Развернуть граф">
    <!-- SVG-иконка (скопирована из стандартного графа) -->
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

  <!-- существующее содержимое -->
  <div class="network-toolbar">
    <input id="network-search" class="network-search" type="text" placeholder="Поиск по узлам..." />
  </div>
  <div id="network-controls" class="network-controls"></div>
  <div id="network-graph" class="network-graph"></div>
</div>

<script src="https://unpkg.com/force-graph"></script>
<script src="static/js/network.js"></script>

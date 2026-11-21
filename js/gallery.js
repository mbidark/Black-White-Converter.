(() => {
  'use strict';
  const state = {
    items: [],
    filtered: [],
    selected: new Set(),
    selectMode: false,
    search: '',
    sort: 'newest',
    liveInverted: new Set(),
    layout: 'grid',
  };
  const listeners = [];
  let bulkZipBusy = false;
  const galleryEmpty = document.getElementById('galleryEmpty');
  const homeEmpty = document.getElementById('empty');

  const getObjectUrl = (item) => {
    if (!item._previewUrl) item._previewUrl = URL.createObjectURL(item.thumbBlob || item.blob);
    return item._previewUrl;
  };

  const fmtSize = (n) => U.formatBytes(n);

  function buildCard(item) {
    const card = document.createElement('article');
    card.className = 'card' + (state.selected.has(item.id) ? ' selected' : '');
    card.dataset.id = item.id;

    const sel = document.createElement('button');
    sel.className = 'card-select';
    sel.type = 'button';
    sel.setAttribute('aria-label', `${state.selected.has(item.id) ? 'Deselect' : 'Select'} ${item.filename}`);
    sel.setAttribute('aria-pressed', String(state.selected.has(item.id)));
    sel.innerHTML = '<svg class="icon"><use href="#i-check"/></svg>';
    sel.addEventListener('click', (e) => { e.stopPropagation(); toggleSelect(item.id); });
    card.appendChild(sel);

    const head = document.createElement('div');
    head.className = 'card-head';
    const name = document.createElement('div');
    name.className = 'filename';
    name.textContent = item.originalName || item.filename;
    name.title = `${item.originalName || item.filename} — ${fmtSize(item.size)}`;
    const remove = document.createElement('button');
    remove.className = 'remove';
    remove.type = 'button';
    remove.title = 'Delete';
    remove.innerHTML = '<svg class="icon"><use href="#i-x"/></svg>';
    remove.addEventListener('click', (e) => { e.stopPropagation(); window.MbiApp.deleteItem(item.id); });
    head.append(name, remove);

    const preview = document.createElement('div');
    preview.className = 'preview';
    const img = document.createElement('img');
    img.src = getObjectUrl(item);
    img.alt = item.originalName || item.filename;
    img.loading = 'lazy';
    img.style.filter = state.liveInverted.has(item.id) ? 'invert(1)' : '';
    preview.appendChild(img);
    preview.addEventListener('click', () => {
      if (state.selectMode) toggleSelect(item.id);
      else window.MbiLightbox.open(item.id);
    });

    const label = document.createElement('div');
    label.className = 'preview-label';
    label.innerHTML = `<span>${item.width} × ${item.height}</span><span class="meta-right"><svg class="icon"><use href="#i-invert"/></svg>${fmtSize(item.size)}</span>`;

    const foot = document.createElement('div');
    foot.className = 'card-foot';
    const invert = document.createElement('button');
    invert.className = 'btn small';
    invert.type = 'button';
    invert.setAttribute('aria-pressed', String(state.liveInverted.has(item.id)));
    invert.title = state.liveInverted.has(item.id) ? 'Restore original appearance' : 'Invert image';
    invert.innerHTML = `<svg class="icon"><use href="#i-invert"/></svg> ${state.liveInverted.has(item.id) ? 'Restore' : 'Invert'}`;
    invert.addEventListener('click', (e) => { e.stopPropagation(); toggleLiveInvert(item.id); });
    const dl = document.createElement('button');
    dl.className = 'btn small';
    dl.type = 'button';
    dl.innerHTML = '<svg class="icon"><use href="#i-download"/></svg> Download';
    dl.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const download = await getDownload(item);
        U.downloadBlob(download.blob, download.filename);
        window.MbiUI.toast(`Downloading ${download.filename}`);
      } catch (err) { window.MbiUI.toast(`Download failed: ${err.message}`, true); }
    });
    foot.append(invert, dl);

    card.append(head, preview, label, foot);
    return card;
  }

  function applyFiltersAndSort() {
    const q = state.search.trim().toLowerCase();
    let list = state.items.filter((it) => {
      if (q && !(it.originalName || '').toLowerCase().includes(q) && !(it.filename || '').toLowerCase().includes(q)) return false;
      return true;
    });
    const cmp = {
      newest: (a, b) => b.createdAt - a.createdAt,
      oldest: (a, b) => a.createdAt - b.createdAt,
      'name-asc': (a, b) => (a.filename || '').localeCompare(b.filename || ''),
      'name-desc': (a, b) => (b.filename || '').localeCompare(a.filename || ''),
      'size-desc': (a, b) => (b.size || 0) - (a.size || 0),
      'size-asc': (a, b) => (a.size || 0) - (b.size || 0),
    }[state.sort] || ((a, b) => b.createdAt - a.createdAt);
    list = list.slice().sort(cmp);
    state.filtered = list;
  }

  function render() {
    applyFiltersAndSort();
    const el = document.getElementById('galleryFull');
    el.innerHTML = '';
    if (state.filtered.length === 0) {
      el.appendChild(galleryEmpty);
      galleryEmpty.hidden = false;
    } else {
      const frag = document.createDocumentFragment();
      state.filtered.forEach((it) => frag.appendChild(buildCard(it)));
      el.appendChild(frag);
    }
    // Also render main gallery (active/invert view) with full unfiltered list
    const main = document.getElementById('gallery');
    main.innerHTML = '';
    if (state.items.length === 0) {
      main.appendChild(homeEmpty);
      homeEmpty.hidden = false;
    } else {
      const frag = document.createDocumentFragment();
      state.items.forEach((it) => frag.appendChild(buildCard(it)));
      main.appendChild(frag);
    }
    homeEmpty.hidden = state.items.length > 0;

    document.getElementById('gallery').classList.toggle('list-layout', state.layout === 'list');
    document.getElementById('galleryFull').classList.toggle('list-layout', state.layout === 'list');

    updateBulkBar();
    updateSelectMode();
    updateCounters();
    listeners.forEach((fn) => fn());
  }

  function updateCounters() {
    const empty = state.items.length === 0;
    const busy = window.MbiApp?.isBusy?.() || false;
    const badge = document.getElementById('galleryBadge');
    if (badge) badge.textContent = state.items.length;
    const count = document.getElementById('count');
    if (count) count.innerHTML = `<strong>${state.items.length}</strong> image${state.items.length === 1 ? '' : 's'} saved`;
    const stat = document.getElementById('statProcessed');
    if (stat) stat.textContent = state.items.length;
    const size = state.items.reduce((s, i) => s + (i.size || 0), 0);
    const statS = document.getElementById('statStorage');
    if (statS) statS.textContent = U.formatBytes(size);
    const toggle = document.getElementById('viewToggle');
    if (toggle) toggle.hidden = empty;
    const clear = document.getElementById('clearBtn');
    const clearDb = document.getElementById('clearDbBtn');
    const zip = document.getElementById('zipBtn');
    if (clear) clear.disabled = empty || busy;
    if (clearDb) clearDb.disabled = empty || busy;
    if (zip) zip.disabled = empty || busy;
  }

  function updateBulkBar() {
    const count = `${state.selected.size} selected`;
    [
      { bar: 'bulkActions', button: 'selectModeBtn', count: 'bulkCount', zip: 'bulkZipBtn', del: 'bulkDelBtn' },
      { bar: 'homeBulkActions', button: 'homeSelectModeBtn', count: 'homeBulkCount', zip: 'homeBulkZipBtn', del: 'homeBulkDelBtn' },
    ].forEach((ids) => {
      const bar = document.getElementById(ids.bar);
      const button = document.getElementById(ids.button);
      if (!bar || !button) return;
      bar.hidden = !state.selectMode;
      button.hidden = state.selectMode;
      document.getElementById(ids.count).textContent = count;
      document.getElementById(ids.zip).disabled = state.selected.size === 0;
      button.disabled = state.items.length === 0;
      if (ids.del) document.getElementById(ids.del).disabled = state.selected.size === 0;
    });
  }

  function updateSelectMode() {
    document.body.classList.toggle('select-mode', state.selectMode);
  }

  function toggleSelectMode(force) {
    state.selectMode = typeof force === 'boolean' ? force : !state.selectMode;
    if (!state.selectMode) state.selected.clear();
    render();
  }

  function toggleSelect(id) {
    if (state.selected.has(id)) state.selected.delete(id);
    else state.selected.add(id);
    render();
  }

  function toggleLiveInvert(id) {
    if (state.liveInverted.has(id)) state.liveInverted.delete(id);
    else state.liveInverted.add(id);
    render();
  }

  async function getDownload(item) {
    if (!state.liveInverted.has(item.id)) return { blob: item.blob, filename: item.filename };
    const result = await window.MbiProcessor.applyFiltersToBlob(item.blob, { invert: true });
    const base = item.filename.replace(/\.[^.]+$/, '') + '_inverted';
    const filename = U.uniqueName(base, state.items.map((image) => image.filename));
    return { blob: result.blob, filename };
  }

  async function bulkDelete() {
    if (!state.selected.size) return;
    if (bulkZipBusy) {
      window.MbiUI.toast('Wait until the selected ZIP finishes before deleting images.', true);
      return;
    }
    if (window.MbiApp.isBusy()) {
      window.MbiUI.toast('Wait until the current operation finishes before deleting images.', true);
      return;
    }
    if (!confirm(`Delete ${state.selected.size} image(s) permanently?`)) return;
    const failed = [];
    window.MbiUI.showLoading('Deleting selected images…');
    try {
      for (const id of [...state.selected]) {
        try {
          await window.MbiDB.deleteImage(id);
        } catch (err) {
          console.error(`Could not delete image ${id}:`, err);
          failed.push(id);
          continue;
        }
        const idx = state.items.findIndex((i) => i.id === id);
        if (idx !== -1) { const [it] = state.items.splice(idx, 1); if (it._previewUrl) URL.revokeObjectURL(it._previewUrl); }
        state.liveInverted.delete(id);
        state.selected.delete(id);
      }
    } finally {
      window.MbiUI.hideLoading();
    }
    if (failed.length === 0) state.selectMode = false;
    window.MbiUI.toast(failed.length ? `${failed.length} image(s) could not be deleted; selection kept for retry.` : 'Deleted selected images.', failed.length > 0);
    render();
  }

  async function bulkZip() {
    if (!state.selected.size) return;
    if (bulkZipBusy) return;
    if (window.MbiApp.isBusy()) {
      window.MbiUI.toast('Wait until the current operation finishes before building a ZIP.', true);
      return;
    }
    if (typeof JSZip === 'undefined') { window.MbiUI.toast('ZIP unavailable.', true); return; }
    bulkZipBusy = true;
    window.MbiUI.showLoading('Building ZIP…');
    try {
      const zip = new JSZip();
      for (const id of [...state.selected]) {
        const item = state.items.find((it) => it.id === id);
        if (!item) continue;
        const download = await getDownload(item);
        zip.file(download.filename, download.blob);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      U.downloadBlob(blob, 'mbi-dark-selected.zip');
      window.MbiUI.toast('ZIP download started.');
    } catch (e) {
      console.error('Selected ZIP failed:', e);
      window.MbiUI.toast(`ZIP failed: ${e.message}`, true);
    }
    finally { bulkZipBusy = false; window.MbiUI.hideLoading(); }
  }

  /* Public API */
  window.MbiGallery = {
    state,
    setItems(items) {
      state.items = items;
      const itemIds = new Set(items.map((item) => item.id));
      state.liveInverted.forEach((id) => { if (!itemIds.has(id)) state.liveInverted.delete(id); });
      state.selected.forEach((id) => { if (!itemIds.has(id)) state.selected.delete(id); });
      if (state.selected.size === 0) state.selectMode = false;
      render();
    },
    addItem(item) { state.items.unshift(item); render(); },
    removeItem(id) {
      const idx = state.items.findIndex((i) => i.id === id);
      if (idx !== -1) { const [it] = state.items.splice(idx, 1); if (it._previewUrl) URL.revokeObjectURL(it._previewUrl); }
      state.selected.delete(id);
      state.liveInverted.delete(id);
      render();
    },
    render,
    toggleSelectMode,
    bulkDelete,
    bulkZip,
    getItems: () => state.items,
    getSelected: () => [...state.selected],
    setLayout(layout) {
      state.layout = layout;
      document.querySelectorAll('.view-toggle-btn').forEach((button) => button.classList.toggle('active', button.dataset.layout === layout));
      render();
    },
    setSearch(q) { state.search = q; render(); },
    setSort(s) { state.sort = s; render(); },
    toggleLiveInvert,
    isLiveInverted: (id) => state.liveInverted.has(id),
    getDownload,
    onUpdate(fn) { listeners.push(fn); },
  };
})();

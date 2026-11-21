(() => {
  'use strict';
  const state = { ids: [], index: 0, zoom: 1, panX: 0, panY: 0, imageUrl: null, pointerId: null, pointerX: 0, pointerY: 0 };
  let closeTimer = null;

  function el(id) { return document.getElementById(id); }

  function open(id) {
    const items = window.MbiGallery.getItems();
    state.ids = items.map((i) => i.id);
    state.index = state.ids.indexOf(id);
    if (state.index === -1) return;
    clearTimeout(closeTimer);
    closeTimer = null;
    const lb = el('lightbox');
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('show'));
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    state.pointerId = null;
    render();
    document.body.style.overflow = 'hidden';
  }

  function close() {
    const lb = el('lightbox');
    lb.classList.remove('show');
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      lb.hidden = true;
      if (el('editor').hidden) document.body.style.overflow = '';
    }, 220);
    if (state.imageUrl) {
      URL.revokeObjectURL(state.imageUrl);
      state.imageUrl = null;
    }
  }

  function getCurrentItem() {
    const id = state.ids[state.index];
    return window.MbiGallery.getItems().find((i) => i.id === id);
  }

  function render() {
    const item = getCurrentItem();
    if (!item) return;
    const loading = el('lightboxLoading');
    loading.hidden = false;
    const img = el('lightboxImg');
    img.alt = item.filename;
    applyTransform();
    if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
    const url = URL.createObjectURL(item.blob);
    state.imageUrl = url;
    img.src = url;
    img.onload = () => {
      loading.hidden = true;
      if (state.imageUrl === url) {
        URL.revokeObjectURL(url);
        state.imageUrl = null;
      }
    };
    img.onerror = () => {
      if (state.imageUrl !== url) return;
      loading.hidden = true;
      URL.revokeObjectURL(url);
      state.imageUrl = null;
      window.MbiUI.toast('Could not preview this image.', true);
    };
    el('lightboxName').textContent = item.filename;
    el('lightboxDims').textContent = `${item.width} × ${item.height} · ${U.formatBytes(item.size)}`;
    const inverted = window.MbiGallery.isLiveInverted(item.id);
    img.style.filter = inverted ? 'invert(1)' : '';
    const invertButton = el('lightboxInvert');
    invertButton.setAttribute('aria-pressed', String(inverted));
    invertButton.title = inverted ? 'Restore original appearance' : 'Invert image';
    invertButton.setAttribute('aria-label', invertButton.title);
    invertButton.lastChild.textContent = inverted ? ' Restore' : ' Invert';
  }

  function prev() {
    state.index = (state.index - 1 + state.ids.length) % state.ids.length;
    resetZoom();
    render();
  }
  function next() {
    state.index = (state.index + 1) % state.ids.length;
    resetZoom();
    render();
  }

  function applyTransform() {
    const img = el('lightboxImg');
    img.style.transform = `translate3d(${state.panX}px, ${state.panY}px, 0) scale(${state.zoom})`;
    el('lightboxStage').classList.toggle('is-zoomed', state.zoom > 1);
    el('lightboxStage').classList.toggle('is-panning', state.pointerId !== null);
  }

  function setZoom(zoom, anchorX, anchorY) {
    const nextZoom = Math.max(0.25, Math.min(5, zoom));
    const stage = el('lightboxStage');
    const oldZoom = state.zoom;
    if (anchorX != null && anchorY != null) {
      const rect = stage.getBoundingClientRect();
      const x = anchorX - rect.left - stage.clientWidth / 2;
      const y = anchorY - rect.top - stage.clientHeight / 2;
      state.panX = x - (x - state.panX) * nextZoom / oldZoom;
      state.panY = y - (y - state.panY) * nextZoom / oldZoom;
    } else {
      state.panX *= nextZoom / oldZoom;
      state.panY *= nextZoom / oldZoom;
    }
    state.zoom = nextZoom;
    if (state.zoom <= 1) {
      state.panX = 0;
      state.panY = 0;
    }
    applyTransform();
  }

  function resetZoom() {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    state.pointerId = null;
    applyTransform();
  }

  function invertCurrent() {
    const item = getCurrentItem();
    if (!item) return;
    window.MbiGallery.toggleLiveInvert(item.id);
    render();
  }

  function bind() {
    el('lightboxClose').addEventListener('click', close);
    el('lightboxBackdrop').addEventListener('click', close);
    el('lightboxPrev').addEventListener('click', prev);
    el('lightboxNext').addEventListener('click', next);
    el('lightboxZoomIn').addEventListener('click', () => setZoom(state.zoom + 0.25));
    el('lightboxZoomOut').addEventListener('click', () => setZoom(state.zoom - 0.25));
    const stage = el('lightboxStage');
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      setZoom(state.zoom * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    }, { passive: false });
    stage.addEventListener('pointerdown', (e) => {
      if (state.zoom <= 1 || e.button !== 0) return;
      state.pointerId = e.pointerId;
      state.pointerX = e.clientX - state.panX;
      state.pointerY = e.clientY - state.panY;
      stage.setPointerCapture(e.pointerId);
      applyTransform();
      e.preventDefault();
    });
    stage.addEventListener('pointermove', (e) => {
      if (state.pointerId !== e.pointerId) return;
      state.panX = e.clientX - state.pointerX;
      state.panY = e.clientY - state.pointerY;
      applyTransform();
    });
    const stopPanning = (e) => {
      if (state.pointerId !== e.pointerId) return;
      state.pointerId = null;
      applyTransform();
    };
    stage.addEventListener('pointerup', stopPanning);
    stage.addEventListener('pointercancel', stopPanning);
    stage.addEventListener('lostpointercapture', stopPanning);
    el('lightboxDownload').addEventListener('click', async () => {
      const item = getCurrentItem();
      if (item) try {
        const download = await window.MbiGallery.getDownload(item);
        U.downloadBlob(download.blob, download.filename);
        window.MbiUI.toast(`Downloading ${download.filename}`);
      } catch (err) { window.MbiUI.toast(`Download failed: ${err.message}`, true); }
    });
    el('lightboxInvert').addEventListener('click', invertCurrent);
    el('lightboxEdit').addEventListener('click', () => {
      const item = getCurrentItem();
      if (item) { close(); window.MbiEditor.open(item); }
    });
    el('lightboxDelete').addEventListener('click', async () => {
      const item = getCurrentItem();
      if (!item) return;
      if (!confirm(`Delete "${item.filename}" permanently?`)) return;
      const deleted = await window.MbiApp.deleteItem(item.id);
      if (!deleted) return;
      if (state.ids.length <= 1) { close(); return; }
      state.ids.splice(state.index, 1);
      if (state.index >= state.ids.length) state.index = state.ids.length - 1;
      render();
    });

    document.addEventListener('keydown', (e) => {
      if (el('lightbox').hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    });
  }

  window.MbiLightbox = { open, close, bind };
})();

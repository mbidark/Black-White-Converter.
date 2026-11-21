(() => {
  'use strict';
  function bind() {
    document.addEventListener('keydown', (e) => {
      const palette = document.getElementById('commandPalette');
      const editor = document.getElementById('editor');
      const lightbox = document.getElementById('lightbox');
      if (e.key === 'Escape') {
        if (!palette.hidden) window.MbiCommandPalette.close();
        else if (!editor.hidden) window.MbiEditor.close();
        else if (!lightbox.hidden) window.MbiLightbox.close();
        return;
      }

      if (!editor.hidden && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) window.MbiEditor.redo();
        else window.MbiEditor.undo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        if (!palette.hidden) window.MbiCommandPalette.close();
        document.getElementById('fileInput').click();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!palette.hidden) window.MbiCommandPalette.close();
        document.getElementById('zipBtn').click();
        return;
      }

      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (inInput) return;
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey &&
        lightbox.hidden && editor.hidden && palette.hidden) {
        e.preventDefault();
        window.MbiRouter.switchTo('settings');
        requestAnimationFrame(() => document.getElementById('keyboardShortcuts').scrollIntoView({ behavior: 'smooth', block: 'center' }));
        return;
      }
    });
  }
  window.MbiShortcuts = { bind };
})();

(() => {
  'use strict';
  let customCursorEnabled = false;
  let cursorFrame = 0;
  let latestPointer = null;

  function bindCustomCursor() {
    const cursor = document.getElementById('customCursor');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const setEnabled = (enabled) => {
      customCursorEnabled = enabled;
      document.documentElement.classList.toggle('custom-cursor-enabled', enabled);
      document.documentElement.classList.remove('custom-cursor-active');
      cursor.classList.remove('is-visible', 'is-clicking');
      latestPointer = null;
      if (enabled) cursorFrame = 0;
    };

    document.addEventListener('pointermove', (event) => {
      if (!customCursorEnabled || event.pointerType === 'touch') return;
      const target = event.target instanceof Element ? event.target : null;
      const isTextEntry = target?.closest('input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
      if (isTextEntry) {
        latestPointer = null;
        document.documentElement.classList.remove('custom-cursor-active');
        cursor.classList.remove('is-visible');
        return;
      }

      latestPointer = { x: event.clientX, y: event.clientY };
      if (!cursorFrame) {
        cursorFrame = requestAnimationFrame(() => {
          cursorFrame = 0;
          if (!customCursorEnabled || !latestPointer) return;
          cursor.style.setProperty('--cursor-x', `${latestPointer.x}px`);
          cursor.style.setProperty('--cursor-y', `${latestPointer.y}px`);
          cursor.classList.add('is-visible');
          document.documentElement.classList.add('custom-cursor-active');
        });
      }
    });
    document.addEventListener('pointerdown', () => {
      if (customCursorEnabled) cursor.classList.add('is-clicking');
    });
    document.addEventListener('pointerup', () => cursor.classList.remove('is-clicking'));
    document.addEventListener('pointercancel', () => cursor.classList.remove('is-clicking'));
    document.addEventListener('pointerout', (event) => {
      if (customCursorEnabled && !event.relatedTarget) {
        latestPointer = null;
        document.documentElement.classList.remove('custom-cursor-active');
        cursor.classList.remove('is-visible');
      }
    });
    window.addEventListener('blur', () => {
      latestPointer = null;
      document.documentElement.classList.remove('custom-cursor-active');
      cursor.classList.remove('is-visible', 'is-clicking');
    });
    return {
      toggle() {
        if (!finePointer.matches) {
          window.MbiUI.toast('Custom cursor requires a mouse or trackpad.', true);
          return;
        }
        setEnabled(!customCursorEnabled);
        window.MbiUI.toast(`Custom cursor: ${customCursorEnabled ? 'On' : 'Off'}`);
      },
    };
  }

  function bind() {
    const customCursor = bindCustomCursor();
    document.addEventListener('keydown', (e) => {
      const palette = document.getElementById('commandPalette');
      const editor = document.getElementById('editor');
      const lightbox = document.getElementById('lightbox');
      if (e.ctrlKey && e.altKey && !e.metaKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        customCursor.toggle();
        return;
      }
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

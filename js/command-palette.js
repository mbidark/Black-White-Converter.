(() => {
  'use strict';
  const commands = [];
  let filtered = [];
  let activeIndex = 0;
  let closeTimer = null;
  let focusTimer = null;
  let isOpen = false;

  function register(cmd) { commands.push(cmd); }

  function open() {
    const cp = document.getElementById('commandPalette');
    clearTimeout(closeTimer);
    clearTimeout(focusTimer);
    isOpen = true;
    cp.hidden = false;
    requestAnimationFrame(() => cp.classList.add('show'));
    const input = document.getElementById('commandInput');
    input.value = '';
    filtered = commands.slice();
    activeIndex = 0;
    render();
    focusTimer = setTimeout(() => input.focus(), 50);
  }

  function close() {
    const cp = document.getElementById('commandPalette');
    if (!isOpen) return;
    isOpen = false;
    clearTimeout(focusTimer);
    clearTimeout(closeTimer);
    cp.classList.remove('show');
    closeTimer = setTimeout(() => { cp.hidden = true; }, 220);
  }

  function render() {
    const list = document.getElementById('commandList');
    list.innerHTML = '';
    if (filtered.length === 0) {
      list.innerHTML = '<div class="command-empty">No commands found.</div>';
      return;
    }
    filtered.forEach((cmd, i) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'command-item' + (i === activeIndex ? ' active' : '');
      item.dataset.index = i;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(i === activeIndex));
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.classList.add('icon');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', `#${cmd.icon}`);
      icon.appendChild(use);
      const title = document.createElement('span');
      title.className = 'command-item-title';
      title.textContent = cmd.title;
      item.append(icon, title);
      if (cmd.shortcut) {
        const shortcut = document.createElement('kbd');
        shortcut.textContent = cmd.shortcut;
        item.appendChild(shortcut);
      }
      list.appendChild(item);
    });
  }

  function setActiveIndex(index) {
    activeIndex = index;
    document.querySelectorAll('#commandList .command-item').forEach((item, i) => {
      const active = i === activeIndex;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
  }

  function filter(q) {
    const query = q.toLowerCase().trim();
    filtered = commands.filter((c) => c.title.toLowerCase().includes(query));
    activeIndex = 0;
    render();
  }

  function bind() {
    document.getElementById('commandBtn').addEventListener('click', open);
    document.getElementById('commandModifierHint').textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
    document.getElementById('commandBackdrop').addEventListener('click', close);
    document.getElementById('commandInput').addEventListener('input', (e) => filter(e.target.value));
    const list = document.getElementById('commandList');
    list.setAttribute('role', 'listbox');
    list.addEventListener('click', (e) => {
      const item = e.target.closest?.('.command-item');
      if (!item || !list.contains(item)) return;
      const command = filtered[Number(item.dataset.index)];
      if (!command) return;
      close();
      command.run();
    });
    list.addEventListener('pointerover', (e) => {
      const item = e.target.closest?.('.command-item');
      if (item && list.contains(item)) setActiveIndex(Number(item.dataset.index));
    });
    document.getElementById('commandInput').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(filtered.length - 1, activeIndex + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(0, activeIndex - 1); render(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const command = filtered[activeIndex];
        close();
        command?.run();
      }
      else if (e.key === 'Escape') { close(); }
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
        e.preventDefault();
        e.stopPropagation();
        if (!isOpen) open();
        else close();
      }
    }, true);
  }

  window.MbiCommandPalette = { register, open, close, bind };
})();

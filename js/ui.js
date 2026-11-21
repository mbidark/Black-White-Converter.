(() => {
  'use strict';
  let loadingTimer = null;
  const stack = () => document.getElementById('toastStack');

  function toast(message, isError = false) {
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' error' : '');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', isError ? 'assertive' : 'polite');
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.classList.add('icon');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', isError ? '#i-alert' : '#i-check');
    icon.appendChild(use);
    const text = document.createElement('span');
    text.textContent = message;
    el.append(icon, text);
    stack().appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2800);
  }

  function showLoading(text = 'Loading…') {
    clearTimeout(loadingTimer);
    const o = document.getElementById('loadingOverlay');
    document.getElementById('loadingText').textContent = text;
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add('show'));
  }
  function hideLoading() {
    const o = document.getElementById('loadingOverlay');
    o.classList.remove('show');
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => {
      if (!o.classList.contains('show')) o.hidden = true;
    }, 260);
  }

  function setPillStatus(type, text) {
    const p = document.getElementById('statusPill');
    p.classList.remove('busy', 'error');
    if (type === 'busy') p.classList.add('busy');
    if (type === 'error') p.classList.add('error');
    document.getElementById('statusPillText').textContent = text;
  }

  function setStatus(text) { document.getElementById('statusText').textContent = text; }
  function showProgress(show) {
    const p = document.getElementById('progress');
    p.classList.toggle('show', show);
    if (!show) document.getElementById('progressBar').style.width = '0%';
  }
  function setProgress(pct) {
    document.getElementById('progressBar').style.width = `${U.clamp(pct, 0, 100)}%`;
  }

  window.MbiUI = { toast, showLoading, hideLoading, setPillStatus, setStatus, showProgress, setProgress };
})();

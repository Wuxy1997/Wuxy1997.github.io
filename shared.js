'use strict';
// The shell the homepage and the blog pages share: block dissolve, theme, HUD and page changes.
window.Shell = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const raf = (f) => requestAnimationFrame(f);
  const store = {
    get(area, k) { try { return area.getItem(k); } catch (e) { return null; } },
    set(area, k, v) { try { area.setItem(k, v); } catch (e) { /* private window */ } },
  };

  const hash12 = (x, y) => {
    const fract = (v) => v - Math.floor(v);
    let a = fract(x * .1031), b = fract(y * .1031), c = fract(x * .1031);
    const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
    a += d; b += d; c += d;
    return fract((a + b) * c);
  };

  // The film's block dissolve: 22 rows of cells whose order is noise leaning from top to bottom.
  const FX = (() => {
    const canvas = $('#fx');
    const c = canvas.getContext('2d');
    let cells = [], size = 40, dpr = 1;
    function layout() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      size = innerHeight / 22;
      const cols = Math.ceil(innerWidth / size);
      cells = [];
      for (let r = 0; r < 22; r++) {
        for (let k = 0; k < cols; k++) {
          const n = hash12(k + 3, r + 3) * .65 + (r / 22) * .35;
          cells.push([k * size, r * size, (n + .18) / 1.36]);
        }
      }
    }
    function paint(on, color) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, innerWidth, innerHeight);
      c.fillStyle = color;
      c.beginPath();
      for (const cell of cells) if (on(cell[2])) c.rect(cell[0], cell[1], size + .5, size + .5);
      c.fill();
    }
    // dir 1 fills the screen with blocks, dir -1 clears them.
    function run(dir, ms, color) {
      return new Promise((done) => {
        if (document.hidden) { paint(() => dir > 0, color); done(); return; }
        const t0 = performance.now();
        const frame = (now) => {
          const k = Math.min(1, (now - t0) / ms) * .76 + .12;
          paint((t) => (dir > 0 ? t <= k : t > k), color);
          if (k >= .88) { paint(() => dir > 0, color); done(); } else raf(frame);
        };
        raf(frame);
      });
    }
    layout();
    addEventListener('resize', layout);
    return { run, cover: (color) => paint(() => true, color), clear: () => paint(() => false, '#000') };
  })();

  const ink = () => getComputedStyle(root).getPropertyValue('--i').trim();

  function applyTheme(name) {
    root.dataset.theme = name;
    const btn = $('#theme');
    $('span', btn).textContent = name === 'void' ? 'PAPER' : 'VOID';
    btn.setAttribute('aria-label', name === 'void' ? '切换到米色纸面' : '切换到深色');
    $('meta[name=theme-color]').content = name === 'void' ? '#14120f' : '#d3cdb8';
    const css = getComputedStyle(root);
    const get = (k) => css.getPropertyValue(k).trim();
    if (typeof Backdrop !== 'undefined' && Backdrop) Backdrop.setTheme({ paper: get('--p'), ink: get('--i'), ember: get('--e'), void: name === 'void' });
  }

  async function toggleTheme() {
    const next = root.dataset.theme === 'void' ? 'paper' : 'void';
    store.set(localStorage, 'wuxy-theme', next);
    if (calm) { applyTheme(next); return; }
    await FX.run(1, 220, ink());
    applyTheme(next);
    await FX.run(-1, 300, ink());
  }

  function hud() {
    const clock = $('#clock');
    const tick = () => {
      clock.textContent = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai', hour12: false }) + ' UTC+8';
    };
    tick();
    setInterval(tick, 1000);

    const facts = JSON.parse($('#facts').textContent);
    const ticker = $('#ticker');
    let at = 0;
    ticker.textContent = facts[0];
    if (!calm) setInterval(() => { at = (at + 1) % facts.length; ticker.textContent = facts[at]; }, 4200);

    if (!canHover) return;
    const cross = $('.cross');
    const [crossX, crossY] = [$('i', cross), $('b', cross)];
    const coord = $('#coord');
    let pending = null;
    addEventListener('pointermove', (e) => {
      if (!pending) raf(() => {
        crossX.style.transform = `translateY(${pending.y}px)`;
        crossY.style.transform = `translateX(${pending.x}px)`;
        coord.textContent = `X ${String(pending.x).padStart(4, '0')} Y ${String(pending.y).padStart(4, '0')}`;
        cross.classList.add('on');
        pending = null;
      });
      pending = { x: Math.round(e.clientX), y: Math.round(e.clientY) };
    }, { passive: true });
    document.addEventListener('pointerleave', () => cross.classList.remove('on'));
  }

  // Per-character titles and staggered children.
  function reveal() {
    $$('.chars').forEach((el) => {
      const text = el.textContent;
      el.setAttribute('aria-label', text);
      el.innerHTML = [...text].map((ch, i) => `<span style="--n:${i}" aria-hidden="true">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
    });
    $$('.stagger').forEach((list) => [...list.children].forEach((el, i) => el.style.setProperty('--n', i)));
  }

  // Links inside the site dissolve out, and the next page dissolves in.
  function pages() {
    if (root.classList.contains('transit')) {
      FX.cover(ink());
      root.classList.remove('transit');
      FX.run(-1, 360, ink());
    }
    addEventListener('pageshow', (e) => { if (e.persisted) FX.clear(); });
    if (calm) return;
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      FX.run(1, 240, ink()).then(() => {
        store.set(sessionStorage, 'wuxy-transit', '1');
        location.href = url.href;
      });
    });
  }

  function start() {
    applyTheme(root.dataset.theme === 'void' ? 'void' : 'paper');
    $('#theme').addEventListener('click', toggleTheme);
    hud();
    reveal();
    pages();
  }

  return { $, $$, root, calm, canHover, store, FX, ink, start };
})();

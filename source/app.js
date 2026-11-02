'use strict';
// Routing, block-dissolve transitions and the HUD. Every section is plain HTML first:
// without this script they simply stack, and all links still work.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    return { run };
  })();

  const ink = () => getComputedStyle(root).getPropertyValue('--i').trim();

  // Routing
  const views = $$('.view');
  const tabs = $$('.tab');
  const ids = views.map((v) => v.id);
  let active = null, moving = false, wanted = null;
  const fromHash = () => (ids.includes(location.hash.slice(1)) ? location.hash.slice(1) : ids[0]);
  const anchorOf = (view) => $('[data-anchor]', view);

  function replay(view) {
    view.classList.remove('enter');
    void view.offsetWidth;
    if (!calm) view.classList.add('enter');
  }

  function show(id) {
    active = id;
    views.forEach((v) => { v.hidden = v.id !== id; });
    tabs.forEach((t) => {
      if (t.getAttribute('href') === `#${id}`) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
    const index = ids.indexOf(id);
    $('#sector').textContent = `SECTOR ${String(index + 1).padStart(2, '0')} / ${String(ids.length).padStart(2, '0')}`;
    const view = views[index];
    replay(view);
    if (Backdrop) Backdrop.shape(index, anchorOf(view));
  }

  async function go(id) {
    if (id === active) return;
    if (calm) { show(id); scrollTo(0, 0); return; }
    if (moving) { wanted = id; return; }
    moving = true;
    await FX.run(1, 260, ink());
    show(id);
    scrollTo(0, 0);
    await FX.run(-1, 340, ink());
    moving = false;
    if (wanted && wanted !== active) { const next = wanted; wanted = null; go(next); } else wanted = null;
  }

  addEventListener('hashchange', () => {
    go(fromHash());
    $(`#${fromHash()}`).focus({ preventScroll: true });
  });
  views.forEach((v) => v.setAttribute('tabindex', '-1'));

  // Per-character titles and staggered children.
  $$('.chars').forEach((el) => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.innerHTML = [...text].map((ch, i) => `<span style="--n:${i}" aria-hidden="true">${ch}</span>`).join('');
  });
  $$('.stagger').forEach((list) => [...list.children].forEach((el, i) => el.style.setProperty('--n', i)));

  // Projects: the cursor selects as in a game menu; touch and keyboard select by press.
  const items = $$('.item');
  const canHover = matchMedia('(hover:hover) and (pointer:fine)').matches;
  function select(item) {
    items.forEach((it) => {
      const on = it === item;
      it.classList.toggle('on', on);
      $('.row', it).setAttribute('aria-expanded', String(on));
    });
  }
  items.forEach((item, i) => {
    const row = $('.row', item);
    row.addEventListener('click', () => select(item));
    if (canHover) row.addEventListener('pointerenter', () => select(item));
    row.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const next = items[(i + step + items.length) % items.length];
      select(next);
      $('.row', next).focus();
    });
  });

  // Log filter
  const filters = $$('.filters button');
  filters.forEach((btn) => btn.addEventListener('click', () => {
    filters.forEach((b) => { b.classList.toggle('on', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
    $$('.log').forEach((row) => { row.hidden = !!btn.dataset.cat && row.dataset.cat !== btn.dataset.cat; });
  }));

  // HUD
  const clock = $('#clock');
  const tick = () => {
    clock.textContent = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai', hour12: false }) + ' UTC+8';
  };
  tick();
  setInterval(tick, 1000);

  const facts = JSON.parse($('#facts').textContent);
  const ticker = $('#ticker');
  let factAt = 0;
  ticker.textContent = facts[0];
  if (!calm) setInterval(() => { factAt = (factAt + 1) % facts.length; ticker.textContent = facts[factAt]; }, 4200);

  const cross = $('.cross');
  const [crossX, crossY] = [$('i', cross), $('b', cross)];
  const coord = $('#coord');
  let pending = null;
  if (canHover) {
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

  // Theme
  const themeBtn = $('#theme');
  function applyTheme(name) {
    root.dataset.theme = name;
    $('span', themeBtn).textContent = name === 'void' ? 'PAPER' : 'VOID';
    themeBtn.setAttribute('aria-label', name === 'void' ? '切换到米色纸面' : '切换到深色');
    $('meta[name=theme-color]').content = name === 'void' ? '#14120f' : '#d3cdb8';
    const css = getComputedStyle(root);
    const get = (k) => css.getPropertyValue(k).trim();
    if (Backdrop) Backdrop.setTheme({ paper: get('--p'), ink: get('--i'), ember: get('--e'), void: name === 'void' });
  }
  async function toggleTheme() {
    const next = root.dataset.theme === 'void' ? 'paper' : 'void';
    store.set(localStorage, 'wuxy-theme', next);
    if (calm) { applyTheme(next); return; }
    await FX.run(1, 220, ink());
    applyTheme(next);
    await FX.run(-1, 300, getComputedStyle(root).getPropertyValue('--i').trim());
  }
  themeBtn.addEventListener('click', toggleTheme);

  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const at = ids.indexOf(active);
    if (/^[1-4]$/.test(e.key)) location.hash = ids[+e.key - 1];
    else if (e.key === 'ArrowRight') location.hash = ids[(at + 1) % ids.length];
    else if (e.key === 'ArrowLeft') location.hash = ids[(at - 1 + ids.length) % ids.length];
  });

  // Boot: real numbers, short, once per session, any input skips it.
  async function boot() {
    const log = $('#bootlog');
    const lines = ['MEMORY CHECK ............ OK', 'MOUNT /RECORD ........... OK', ...facts.slice(0, 3).map((f) => `${f}`), 'ALL SYSTEMS NOMINAL'];
    let skip = false;
    const stop = () => { skip = true; };
    addEventListener('pointerdown', stop, { once: true });
    addEventListener('keydown', stop, { once: true });
    for (const line of lines) {
      if (skip) break;
      log.textContent += `${line}\n`;
      await new Promise((r) => setTimeout(r, 130));
    }
    await FX.run(1, 240, '#0b0a08');
    root.classList.remove('boot');
    store.set(sessionStorage, 'wuxy-booted', '1');
    await FX.run(-1, 620, '#0b0a08');
  }

  // Start
  applyTheme(root.dataset.theme === 'void' ? 'void' : 'paper');
  const first = fromHash();
  views.forEach((v) => { v.hidden = v.id !== first; });
  if (Backdrop) Backdrop.start(calm);
  show(first);
  if (root.classList.contains('boot')) boot().then(() => replay(views[ids.indexOf(active)]));
})();

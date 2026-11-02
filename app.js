'use strict';
// Homepage: routing, project menu, log filter and the boot sequence. Every section is plain HTML
// first: without this script they simply stack, and all links still work.
(() => {
  const { $, $$, root, calm, canHover, store, FX, ink } = Shell;

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

  // Projects: the cursor selects as in a game menu; touch and keyboard select by press.
  const items = $$('.item');
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
    const facts = JSON.parse($('#facts').textContent);
    const lines = ['MEMORY CHECK ............ OK', 'MOUNT /RECORD ........... OK', ...facts.slice(0, 3), 'ALL SYSTEMS NOMINAL'];
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
  Shell.start();
  const first = fromHash();
  views.forEach((v) => { v.hidden = v.id !== first; });
  if (Backdrop) Backdrop.start(calm);
  show(first);
  if (root.classList.contains('boot')) boot().then(() => replay(views[ids.indexOf(active)]));
})();

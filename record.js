'use strict';
// Blog pages: backdrop, outline tracking and code blocks.
(() => {
  const { $, $$, calm } = Shell;
  Shell.start();

  const canvas = $('#gl');
  if (typeof Backdrop !== 'undefined' && Backdrop) {
    Backdrop.start(calm);
    Backdrop.shape(+canvas.dataset.shape || 0, $('[data-anchor]'));
  }
  if (!calm) document.body.classList.add('enter');

  // Language label and copy button on every code block.
  $$('figure.highlight').forEach((fig) => {
    const lang = [...fig.classList].find((c) => c !== 'highlight') || 'code';
    const bar = document.createElement('div');
    bar.className = 'code-bar';
    bar.innerHTML = `<span>${lang}</span><button type="button">COPY</button>`;
    fig.prepend(bar);
    const btn = $('button', bar);
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText($('td.code pre', fig)?.innerText ?? fig.innerText);
        btn.textContent = 'COPIED';
      } catch (e) {
        btn.textContent = 'FAILED';
      }
      setTimeout(() => { btn.textContent = 'COPY'; }, 1400);
    });
  });

  // Keep the outline on the heading being read.
  const links = $$('.outline a');
  const targets = links.map((a) => {
    try { return document.getElementById(decodeURIComponent(a.hash.slice(1))); } catch (e) { return null; }
  });
  if (links.length && 'IntersectionObserver' in window) {
    const seen = new Set();
    const mark = () => {
      let at = -1;
      targets.forEach((t, i) => { if (t && seen.has(t)) at = at < 0 ? i : at; });
      if (at < 0) return;
      links.forEach((a, i) => { if (i === at) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    };
    const io = new IntersectionObserver((list) => {
      list.forEach((e) => { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      mark();
    }, { rootMargin: '-90px 0px -66% 0px' });
    targets.forEach((t) => t && io.observe(t));
  }
})();

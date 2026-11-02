'use strict';
/* global hexo */
// Helpers for the record theme: reading stats, page metadata and generated ornaments.

const fract = (v) => v - Math.floor(v);
const hash12 = (x, y) => {
  let a = fract(x * .1031), b = fract(y * .1031), c = fract(x * .1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fract((a + b) * c);
};

const pad = (n, w = 3) => String(n).padStart(w, '0');
const EMOJI = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*/gu;

function plainText(html) {
  return String(html || '')
    .replace(/<figure[\s\S]*?<\/figure>/g, ' ')
    .replace(/<h1[\s\S]*?<\/h1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(EMOJI, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Colour emoji fight the monochrome page: show them in grey, leaving code and attributes alone.
hexo.extend.filter.register('after_post_render', (data) => {
  data.content = data.content.replace(/<figure[\s\S]*?<\/figure>|<code[\s\S]*?<\/code>|<[^>]+>|[^<]+/g, (part) => (
    part[0] === '<' ? part : part.replace(EMOJI, (m) => `<span class="emo">${m}</span>`)
  ));
  return data;
});

hexo.extend.helper.register('pad', pad);

hexo.extend.helper.register('clean_toc', (html) => html.replace(
  /(<span class="toc-text">)([\s\S]*?)(<\/span>)/g,
  (m, open, text, close) => open + text.replace(EMOJI, '').trim() + close,
));

hexo.extend.helper.register('read_stats', (html) => {
  const text = plainText(html);
  const cjk = (text.match(/[㐀-鿿]/g) || []).length;
  const words = (text.replace(/[㐀-鿿]/g, ' ').match(/[A-Za-z0-9_]+/g) || []).length;
  const total = cjk + words;
  return { total, label: total >= 1000 ? `${(total / 1000).toFixed(1)}K` : String(total), minutes: Math.max(1, Math.round(total / 380)) };
});

hexo.extend.helper.register('entry_excerpt', (post, length = 84) => {
  const text = plainText(post.excerpt || post.content);
  return text.length > length ? `${text.slice(0, length)}…` : text;
});

hexo.extend.helper.register('barcode', (seed, w = 210, h = 30) => {
  let x = 0, i = 0, d = '';
  for (;;) {
    const bar = 1 + Math.floor(hash12(i, seed) * 3.4);
    const gap = 1 + Math.floor(hash12(i + 40, seed) * 3.4);
    if (x + bar > w) break;
    d += `M${x} 0h${bar}v${h}h-${bar}z`;
    x += bar + gap;
    i++;
  }
  return `<svg class="barcode" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor" d="${d}"/></svg>`;
});

hexo.extend.helper.register('doc_title', function () {
  const { page, config } = this;
  const site = config.author.split(' ')[0];
  if (page.category) return `${page.category} | 分类 | ${site}`;
  if (page.tag) return `${page.tag} | 标签 | ${site}`;
  if (page.archive) return `归档 | ${site}`;
  if (page.title) return `${page.title} | ${site}`;
  return `日志 | ${site}`;
});

// Index into the point-cloud shapes in gl.js: moon, lattice, sheets, signal.
hexo.extend.helper.register('doc_shape', function () {
  const { page } = this;
  if (page.layout === 'about' || page.type === 'about') return 0;
  if (page.archive || page.category || page.type === 'categories') return 1;
  if (page.tag || page.type === 'tags') return 3;
  return 2;
});

hexo.extend.helper.register('doc_facts', function () {
  const { posts, categories, tags } = this.site;
  const latest = posts.sort('date', -1).first();
  return JSON.stringify([
    `LOG ENTRIES ${pad(posts.length)}`,
    `LATEST ${this.date(latest.date, 'YYYY-MM-DD')}`,
    `CATEGORIES ${pad(categories.length)}`,
    `TAGS ${pad(tags.length)}`,
  ]);
});

// Year and month counts for the archive rail, newest first.
hexo.extend.helper.register('archive_tree', function () {
  const years = new Map();
  this.site.posts.sort('date', -1).forEach((post) => {
    const y = post.date.format('YYYY'), m = post.date.format('MM');
    if (!years.has(y)) years.set(y, { year: y, count: 0, months: new Map() });
    const entry = years.get(y);
    entry.count++;
    entry.months.set(m, (entry.months.get(m) || 0) + 1);
  });
  return [...years.values()].map((y) => ({ ...y, months: [...y.months.entries()].map(([month, count]) => ({ month, count })) }));
});

hexo.extend.generator.register('record_404', () => ({
  path: '404.html',
  data: { title: '404', type: 'notfound' },
  layout: ['404'],
}));

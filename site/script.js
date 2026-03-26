const INSTALL_CMD = 'npx skills add AntonPieper/ai-skills --skill android-development';

const copyBtn = document.getElementById('copy-install');
const copyMsg = document.getElementById('copy-feedback');
const summaryBar = document.getElementById('summary-bar');
const filters = document.getElementById('filters');
const runList = document.getElementById('run-list');

let activeFilter = 'all';
let scenarios = [];

/* ── Copy ─────────────────────────────────────────────────── */

copyBtn?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(INSTALL_CMD);
    copyMsg.textContent = 'Copied to clipboard.';
  } catch {
    copyMsg.textContent = 'Copy failed — the command is still visible above.';
  }
});

/* ── Helpers ──────────────────────────────────────────────── */

function badge(status) {
  const el = document.createElement('span');
  el.className = `badge badge-${status || 'unknown'}`;
  el.textContent = status || 'unknown';
  return el;
}

/* ── Summary ──────────────────────────────────────────────── */

function renderSummary(data) {
  if (!data?.summary || data.summary.total === 0) return;
  summaryBar.textContent = '';

  const items = [
    ['Runs', data.summary.total],
    ['Passed', data.summary.passed],
    ['Warnings', data.summary.warning],
    ['Failed', data.summary.failed],
    ['With Media', data.summary.withMedia],
  ];

  for (const [label, value] of items) {
    const card = document.createElement('div');
    card.className = 'metric';
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = String(value);
    card.append(span, strong);
    summaryBar.append(card);
  }
}

/* ── Filters ──────────────────────────────────────────────── */

function renderFilters() {
  const statuses = ['all', ...new Set(scenarios.map(s => s.status || 'unknown'))];
  filters.textContent = '';
  for (const s of statuses) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `fbtn${s === activeFilter ? ' active' : ''}`;
    btn.textContent = s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1);
    btn.addEventListener('click', () => { activeFilter = s; renderFilters(); renderRuns(); });
    filters.append(btn);
  }
}

/* ── Runs ─────────────────────────────────────────────────── */

function renderRuns() {
  runList.textContent = '';
  const visible = activeFilter === 'all'
    ? scenarios
    : scenarios.filter(s => (s.status || 'unknown') === activeFilter);

  if (visible.length === 0) {
    const card = document.createElement('article');
    card.className = 'run-card run-card--empty';
    card.innerHTML = '<h3>No runs match this filter.</h3><p>Try a different filter.</p>';
    runList.append(card);
    return;
  }

  for (const s of visible) {
    const card = document.createElement('article');
    card.className = 'run-card reveal visible';

    /* Header */
    const head = document.createElement('div');
    head.className = 'run-head';
    const titleWrap = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = s.title;
    const meta = document.createElement('p');
    meta.className = 'run-meta';
    meta.textContent = `${s.repoLabel || 'fixture'} · ${s.type || s.id}`;
    titleWrap.append(h3, meta);
    head.append(titleWrap, badge(s.status));
    card.append(head);

    /* Summary */
    if (s.summary) {
      const p = document.createElement('p');
      p.className = 'run-summary';
      p.textContent = s.summary;
      card.append(p);
    }

    /* Key findings */
    if (s.keyFindings?.length) {
      const ul = document.createElement('ul');
      ul.className = 'finding-list';
      for (const f of s.keyFindings) {
        const li = document.createElement('li');
        li.textContent = f;
        ul.append(li);
      }
      card.append(ul);
    }

    /* Media */
    if (s.primaryVideo || s.primaryImage) {
      const wrap = document.createElement('div');
      wrap.className = 'run-media';
      if (s.primaryVideo) {
        const video = document.createElement('video');
        video.controls = true; video.muted = true;
        video.preload = 'metadata'; video.playsInline = true;
        if (s.primaryVideoPoster) video.poster = s.primaryVideoPoster;
        const src = document.createElement('source');
        src.src = s.primaryVideo; src.type = 'video/mp4';
        video.append(src); wrap.append(video);
      }
      if (s.primaryImage) {
        const img = document.createElement('img');
        img.src = s.primaryImage;
        img.alt = `${s.title} screenshot`;
        img.loading = 'lazy';
        wrap.append(img);
      }
      card.append(wrap);
    }

    /* Report (expandable) */
    if (s.reportHtml) {
      const details = document.createElement('details');
      details.className = 'run-details';
      const summary = document.createElement('summary');
      summary.textContent = 'Full report';
      const body = document.createElement('article');
      body.className = 'markdown-body';
      body.innerHTML = s.reportHtml;
      details.append(summary, body);
      card.append(details);
    }

    /* Footer links */
    const foot = document.createElement('div');
    foot.className = 'run-foot';
    if (s.reportPath) {
      const a = document.createElement('a');
      a.href = s.reportPath; a.textContent = 'Raw markdown';
      foot.append(a);
    }
    if (s.resultPath) {
      const a = document.createElement('a');
      a.href = s.resultPath; a.textContent = 'result.json';
      foot.append(a);
    }
    card.append(foot);

    runList.append(card);
  }
}

/* ── Scroll reveal ────────────────────────────────────────── */

function setupReveal() {
  const els = document.querySelectorAll('.reveal:not(.visible)');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    }
  }, { threshold: 0.08 });
  els.forEach(el => obs.observe(el));
}

/* ── Load ─────────────────────────────────────────────────── */

async function init() {
  let data = null;
  try {
    const res = await fetch('./data/latest.json', { cache: 'no-store' });
    if (res.ok) data = await res.json();
  } catch { /* no data yet */ }

  if (data) {
    renderSummary(data);
    scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
    if (scenarios.length) {
      renderFilters();
      renderRuns();
    }
  }

  setupReveal();

  /* Initialize Lucide icons */
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

init();
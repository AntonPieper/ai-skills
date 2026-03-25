const copyButton = document.querySelector('[data-copy]');
const copyStatus = document.querySelector('#copy-status');

if (copyButton) {
  copyButton.addEventListener('click', async () => {
    const text = copyButton.getAttribute('data-copy');

    try {
      await navigator.clipboard.writeText(text);
      if (copyStatus) {
        copyStatus.textContent = 'Install command copied to clipboard.';
      }
    } catch {
      if (copyStatus) {
        copyStatus.textContent = 'Copy failed. The install command is visible in the install section.';
      }
    }
  });
}

const revealNodes = document.querySelectorAll('[data-reveal]');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    {
      threshold: 0.14,
    },
  );

  revealNodes.forEach((node) => observer.observe(node));
} else {
  revealNodes.forEach((node) => node.classList.add('is-visible'));
}

const snapshotTitle = document.querySelector('#snapshot-title');
const snapshotCopy = document.querySelector('#snapshot-copy');
const heroMetrics = document.querySelector('#hero-metrics');
const reportLink = document.querySelector('#report-link');
const workflowLink = document.querySelector('#workflow-link');
const matrixVisual = document.querySelector('#matrix-visual');
const scenarioVisual = document.querySelector('#scenario-visual');
const matrixGrid = document.querySelector('#matrix-grid');
const scenarioList = document.querySelector('#scenario-list');
const proofList = document.querySelector('#proof-list');
const showcaseGrid = document.querySelector('#showcase-grid');

const scenarioNames = {
  discovery: 'Root Discovery',
  tasks: 'Task Selection',
  modernization: 'Modernization',
  'ui-triage': 'UI Triage',
};

function fallbackSiteData() {
  return {
    headline: {
      pass_rate: 0,
      failed: 0,
      total_cases: 0,
      repos_covered: 0,
      scenarios_covered: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
    },
    coverage: {
      outputEvalCases: 0,
      triggerQueriesTotal: 0,
      triggerTrainQueries: 0,
      triggerValidationQueries: 0,
    },
    matrix: {
      repos: [],
      scenarios: [],
      cells: [],
    },
    scenario_stats: [],
    showcase: [],
    links: {},
  };
}

function statCard(label, value, tone = 'default') {
  const article = document.createElement('article');
  article.className = `metric-card metric-card-${tone}`;

  const labelNode = document.createElement('span');
  labelNode.className = 'metric-label';
  labelNode.textContent = label;

  const valueNode = document.createElement('strong');
  valueNode.className = 'metric-value';
  valueNode.textContent = value;

  article.append(labelNode, valueNode);
  return article;
}

function renderMetrics(data) {
  heroMetrics.replaceChildren(
    statCard('Pass rate', `${data.headline.pass_rate}%`, data.headline.failed > 0 ? 'warning' : 'success'),
    statCard('Cases', String(data.headline.total_cases)),
    statCard('Repos', String(data.headline.repos_covered)),
    statCard('Scenarios', String(data.headline.scenarios_covered)),
    statCard('Input tokens', data.headline.total_input_tokens.toLocaleString()),
    statCard('Output tokens', data.headline.total_output_tokens.toLocaleString()),
  );
}

function renderMatrix(data) {
  matrixGrid.replaceChildren();

  const repos = data.matrix.repos || [];
  const scenarios = data.matrix.scenarios || [];

  if (repos.length === 0 || scenarios.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No smoke matrix is published yet.';
    matrixGrid.append(empty);
    return;
  }

  for (const repo of repos) {
    const row = document.createElement('div');
    row.className = 'matrix-row';

    const label = document.createElement('div');
    label.className = 'matrix-label';
    label.textContent = repo;
    row.append(label);

    for (const scenario of scenarios) {
      const cellData = data.matrix.cells.find((cell) => cell.repo === repo && cell.scenario === scenario);
      const cell = document.createElement('div');
      cell.className = `matrix-cell matrix-cell-${(cellData?.result || 'missing').toLowerCase()}`;

      const heading = document.createElement('span');
      heading.className = 'matrix-cell-heading';
      heading.textContent = scenarioNames[scenario] || scenario;

      const detail = document.createElement('strong');
      detail.textContent = cellData?.result || 'MISSING';

      const meta = document.createElement('small');
      meta.textContent = cellData?.session_time || cellData?.exit_code || '';

      cell.append(heading, detail, meta);
      row.append(cell);
    }

    matrixGrid.append(row);
  }
}

function renderScenarioStats(data) {
  scenarioList.replaceChildren();

  for (const item of data.scenario_stats || []) {
    const row = document.createElement('div');
    row.className = 'scenario-row';

    const label = document.createElement('span');
    label.className = 'scenario-label';
    label.textContent = scenarioNames[item.scenario] || item.scenario;

    const value = document.createElement('strong');
    value.textContent = `${item.passed}/${item.total} passed`;

    row.append(label, value);
    scenarioList.append(row);
  }
}

function renderProof(data) {
  proofList.replaceChildren(
    statCard('Output eval cases', String(data.coverage.outputEvalCases)),
    statCard('Trigger queries', String(data.coverage.triggerQueriesTotal)),
    statCard('Train split', String(data.coverage.triggerTrainQueries)),
    statCard('Validation split', String(data.coverage.triggerValidationQueries)),
  );
}

function renderShowcase(data) {
  showcaseGrid.replaceChildren();

  if (!Array.isArray(data.showcase) || data.showcase.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No showcase data is published yet.';
    showcaseGrid.append(empty);
    return;
  }

  for (const item of data.showcase) {
    const card = document.createElement('article');
    card.className = 'showcase-card';
    card.setAttribute('data-reveal', '');

    const meta = document.createElement('div');
    meta.className = 'showcase-meta';

    const badge = document.createElement('span');
    badge.className = 'showcase-badge';
    badge.textContent = scenarioNames[item.scenario] || item.scenario;

    const repo = document.createElement('span');
    repo.className = 'showcase-repo';
    repo.textContent = item.repo_label;

    meta.append(badge, repo);

    const title = document.createElement('h3');
    title.textContent = item.headline;

    const summary = document.createElement('p');
    summary.className = 'showcase-summary';
    summary.textContent = item.summary;

    const highlights = document.createElement('ul');
    highlights.className = 'showcase-highlights';
    for (const point of item.highlights || []) {
      const li = document.createElement('li');
      li.textContent = point;
      highlights.append(li);
    }

    card.append(meta, title, summary, highlights);

    if (Array.isArray(item.commands) && item.commands.length > 0) {
      const commands = document.createElement('pre');
      commands.className = 'showcase-commands';
      commands.textContent = item.commands.join('\n');
      card.append(commands);
    }

    if (item.quote) {
      const quote = document.createElement('blockquote');
      quote.className = 'showcase-quote';
      quote.textContent = item.quote;
      card.append(quote);
    }

    if (item.repo_url) {
      const repoLink = document.createElement('a');
      repoLink.className = 'showcase-link';
      repoLink.href = item.repo_url;
      repoLink.target = '_blank';
      repoLink.rel = 'noreferrer';
      repoLink.textContent = 'Open sample repository';
      card.append(repoLink);
    }

    card.classList.add('is-visible');
    showcaseGrid.append(card);
  }
}

function applyLinks(data) {
  reportLink.classList.add('is-hidden');
  workflowLink.classList.add('is-hidden');

  if (data.links?.report) {
    reportLink.href = data.links.report;
    reportLink.classList.remove('is-hidden');
  }

  if (data.links?.workflow_run) {
    workflowLink.href = data.links.workflow_run;
    workflowLink.classList.remove('is-hidden');
  }
}

async function hydrate() {
  try {
    const response = await fetch('./data/latest.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('latest.json not available');
    }

    const data = await response.json();
    snapshotTitle.textContent = data.source === 'fallback'
      ? 'Waiting for the first published smoke snapshot.'
      : `${data.headline.passed}/${data.headline.total_cases} smoke cases passed`;

    snapshotCopy.textContent = data.source === 'fallback'
      ? 'The site is live, but no smoke-backed data has been published into Pages yet.'
      : `${data.headline.repos_covered} repositories across ${data.headline.scenarios_covered} scenarios, plus a separate showcase pass for the site.`;

    renderMetrics(data);
    renderMatrix(data);
    renderScenarioStats(data);
    renderProof(data);
    renderShowcase(data);
    applyLinks(data);

    if (data.visuals?.matrix) {
      matrixVisual.src = data.visuals.matrix;
    }

    if (data.visuals?.scenario_bars) {
      scenarioVisual.src = data.visuals.scenario_bars;
    }
  } catch {
    const data = fallbackSiteData();
    snapshotTitle.textContent = 'Smoke data is unavailable.';
    snapshotCopy.textContent = 'The site loaded, but the latest Pages data bundle could not be fetched.';
    renderMetrics(data);
    renderMatrix(data);
    renderScenarioStats(data);
    renderProof(data);
    renderShowcase(data);
    applyLinks(data);
  }
}

hydrate();
const fallbackData = {
  marketing: {
    installCommand: 'npx skills add AntonPieper/ai-skills --skill android-development',
    repositoryUrl: 'https://github.com/AntonPieper/ai-skills',
    skillUrl: 'https://github.com/AntonPieper/ai-skills/tree/main/skills/android/android-development',
    references: [
      {
        title: 'Setup and updates',
        href: 'https://github.com/AntonPieper/ai-skills/blob/main/skills/android/android-development/references/setup-update.md',
        body: 'Install JDK, Android SDK, adb, emulator tools, and keep the environment current.',
      },
      {
        title: 'Nested repo discovery',
        href: 'https://github.com/AntonPieper/ai-skills/blob/main/skills/android/android-development/references/nested-repo-discovery.md',
        body: 'Find the actual Android root in monorepos and sample catalogs before wasting tokens.',
      },
      {
        title: 'Build, lint, and test',
        href: 'https://github.com/AntonPieper/ai-skills/blob/main/skills/android/android-development/references/build-lint-test.md',
        body: 'Choose the smallest reliable Gradle commands for build, unit test, and connected test work.',
      },
      {
        title: 'On-device visual triage',
        href: 'https://github.com/AntonPieper/ai-skills/blob/main/skills/android/android-development/references/on-device-interaction-visual-testing.md',
        body: 'Keep UI debugging screenshot-first and bounded before opening XML or logcat.',
      },
      {
        title: 'Modernization guidance',
        href: 'https://github.com/AntonPieper/ai-skills/blob/main/skills/android/android-development/references/modernization.md',
        body: 'Ground upgrade work in concrete Gradle, AGP, Kotlin, namespace, and JDK signals.',
      },
    ],
  },
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warning: 0,
    fixtures: [],
    withMedia: 0,
  },
  scenarios: [],
  generatedAt: null,
};

const copyButton = document.querySelector('#copy-install');
const copyFeedback = document.querySelector('#copy-feedback');
const installCommandBlock = document.querySelector('#install-command-block');
const openSkillLink = document.querySelector('#open-skill-link');
const summaryMetrics = document.querySelector('#summary-metrics');
const runHeadline = document.querySelector('#run-headline');
const runSummary = document.querySelector('#run-summary');
const reportIndexLink = document.querySelector('#report-index-link');
const lastUpdated = document.querySelector('#last-updated');
const proofGrid = document.querySelector('#proof-grid');
const filters = document.querySelector('#filters');
const runList = document.querySelector('#run-list');
const referenceGrid = document.querySelector('#reference-grid');

let installCommand = fallbackData.marketing.installCommand;
let activeFilter = 'all';
let currentScenarios = [];

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

async function copyInstallCommand() {
  try {
    await navigator.clipboard.writeText(installCommand);
    copyFeedback.textContent = 'Install command copied.';
  } catch {
    copyFeedback.textContent = 'Copy failed. The install command is still visible on the page.';
  }
}

copyButton?.addEventListener('click', copyInstallCommand);

function formatDate(value) {
  if (!value) {
    return 'No published scenario bundle yet';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Latest bundle date unavailable';
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function createMetric(label, value) {
  const card = document.createElement('article');
  card.className = 'metric-card';

  const labelNode = document.createElement('span');
  labelNode.textContent = label;

  const valueNode = document.createElement('strong');
  valueNode.textContent = value;

  card.append(labelNode, valueNode);
  return card;
}

function createStatusBadge(status) {
  const badge = document.createElement('span');
  badge.className = `status-badge status-${status || 'unknown'}`;
  badge.textContent = status || 'unknown';
  return badge;
}

function createCommandItem(command) {
  const item = document.createElement('li');
  item.className = 'command-item';

  const title = document.createElement('strong');
  title.textContent = command.label || 'Command';

  const block = document.createElement('code');
  block.textContent = command.command;

  item.append(title, block);

  if (command.detail) {
    const detail = document.createElement('p');
    detail.textContent = command.detail;
    item.append(detail);
  }

  return item;
}

function createCheckItem(check) {
  const item = document.createElement('li');
  item.className = 'check-item';

  const row = document.createElement('div');
  row.className = 'check-row';
  row.append(createStatusBadge(check.status));

  const label = document.createElement('strong');
  label.textContent = check.label;
  row.append(label);

  item.append(row);

  if (check.detail) {
    const detail = document.createElement('p');
    detail.textContent = check.detail;
    item.append(detail);
  }

  return item;
}

function createMediaPreview(scenario) {
  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'run-media';

  if (scenario.primaryVideo) {
    const video = document.createElement('video');
    video.controls = true;
    video.muted = true;
    video.preload = 'metadata';
    video.playsInline = true;
    if (scenario.primaryVideoPoster) {
      video.poster = scenario.primaryVideoPoster;
    }

    const source = document.createElement('source');
    source.src = scenario.primaryVideo;
    source.type = scenario.media?.videos?.[0]?.mime || 'video/mp4';
    video.append(source);
    mediaWrap.append(video);
  }

  if (scenario.primaryImage) {
    const image = document.createElement('img');
    image.src = scenario.primaryImage;
    image.alt = `${scenario.title} preview`;
    image.loading = 'lazy';
    mediaWrap.append(image);
  }

  if (!scenario.primaryVideo && !scenario.primaryImage) {
    const empty = document.createElement('p');
    empty.className = 'empty-copy';
    empty.textContent = 'This scenario published no media assets.';
    mediaWrap.append(empty);
  }

  return mediaWrap;
}

function renderSummary(data) {
  summaryMetrics.textContent = '';
  summaryMetrics.append(
    createMetric('Scenario runs', String(data.summary.total)),
    createMetric('Passed', String(data.summary.passed)),
    createMetric('Warnings', String(data.summary.warning)),
    createMetric('Media bundles', String(data.summary.withMedia)),
  );

  if (data.summary.total > 0) {
    runHeadline.textContent = `${pluralize(data.summary.total, 'scenario run')} published from CI.`;
    runSummary.textContent = `${data.summary.passed} passed, ${data.summary.warning} warnings, and ${data.summary.failed} failed across ${pluralize(data.summary.fixtures.length || 0, 'fixture repository')}.`;
  }

  lastUpdated.textContent = `Updated ${formatDate(data.generatedAt)}`;
}

function renderReferences(data) {
  referenceGrid.textContent = '';

  for (const reference of data.marketing.references || []) {
    const card = document.createElement('a');
    card.className = 'reference-card reveal';
    card.href = reference.href;
    card.target = '_blank';
    card.rel = 'noreferrer';

    const title = document.createElement('strong');
    title.textContent = reference.title;

    const body = document.createElement('p');
    body.textContent = reference.body;

    card.append(title, body);
    referenceGrid.append(card);
  }
}

function renderProof(data) {
  proofGrid.textContent = '';
  const scenariosWithMedia = data.scenarios.filter((scenario) => scenario.primaryImage || scenario.primaryVideo);

  if (scenariosWithMedia.length === 0) {
    const card = document.createElement('article');
    card.className = 'proof-card proof-card-empty';

    const title = document.createElement('h3');
    title.textContent = 'No scenario media published yet.';

    const body = document.createElement('p');
    body.textContent = 'The first successful interaction run will appear here automatically.';

    card.append(title, body);
    proofGrid.append(card);
    return;
  }

  for (const scenario of scenariosWithMedia) {
    const card = document.createElement('article');
    card.className = 'proof-card';

    const topline = document.createElement('div');
    topline.className = 'proof-topline';
    topline.append(createStatusBadge(scenario.status));

    const repo = document.createElement('span');
    repo.textContent = scenario.repoLabel;
    topline.append(repo);

    const title = document.createElement('h3');
    title.textContent = scenario.title;

    const summary = document.createElement('p');
    summary.textContent = scenario.summary;

    card.append(topline, title, summary, createMediaPreview(scenario));
    proofGrid.append(card);
  }
}

function buildFilterButtons(scenarios) {
  const values = ['all', ...new Set(scenarios.map((scenario) => scenario.status || 'unknown'))];
  filters.textContent = '';

  for (const value of values) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `filter-button${value === activeFilter ? ' is-active' : ''}`;
    button.textContent = value === 'all' ? 'All runs' : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
    button.addEventListener('click', () => {
      activeFilter = value;
      buildFilterButtons(currentScenarios);
      renderRuns(currentScenarios);
    });
    filters.append(button);
  }
}

function renderRuns(scenarios) {
  runList.textContent = '';
  const visible = activeFilter === 'all'
    ? scenarios
    : scenarios.filter((scenario) => (scenario.status || 'unknown') === activeFilter);

  if (visible.length === 0) {
    const empty = document.createElement('article');
    empty.className = 'run-card empty-run';

    const title = document.createElement('h3');
    title.textContent = 'No runs match this filter.';

    const body = document.createElement('p');
    body.textContent = 'Switch the filter to see the other scenario outputs.';

    empty.append(title, body);
    runList.append(empty);
    return;
  }

  for (const scenario of visible) {
    const card = document.createElement('article');
    card.className = 'run-card reveal';

    const header = document.createElement('div');
    header.className = 'run-header';

    const textWrap = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = scenario.title;
    const meta = document.createElement('p');
    meta.className = 'run-meta';
    meta.textContent = `${scenario.repoLabel} · ${scenario.type}`;
    textWrap.append(title, meta);

    header.append(textWrap, createStatusBadge(scenario.status));

    const summary = document.createElement('p');
    summary.className = 'run-summary';
    summary.textContent = scenario.summary;

    const findings = document.createElement('ul');
    findings.className = 'finding-list';
    for (const finding of scenario.keyFindings || []) {
      const item = document.createElement('li');
      item.textContent = finding;
      findings.append(item);
    }

    const commandSection = document.createElement('details');
    commandSection.className = 'details-block';
    const commandSummary = document.createElement('summary');
    commandSummary.textContent = 'Commands and checks';
    commandSection.append(commandSummary);

    if ((scenario.commands || []).length > 0) {
      const commandList = document.createElement('ul');
      commandList.className = 'command-list';
      for (const command of scenario.commands) {
        commandList.append(createCommandItem(command));
      }
      commandSection.append(commandList);
    }

    if ((scenario.checks || []).length > 0) {
      const checkList = document.createElement('ul');
      checkList.className = 'check-list';
      for (const check of scenario.checks) {
        checkList.append(createCheckItem(check));
      }
      commandSection.append(checkList);
    }

    const markdownWrap = document.createElement('article');
    markdownWrap.className = 'markdown-body markdown-wrap';
    markdownWrap.innerHTML = scenario.reportHtml || '<p>No markdown report was bundled for this scenario.</p>';

    const footer = document.createElement('div');
    footer.className = 'run-footer';

    const reportLink = document.createElement('a');
    reportLink.className = 'inline-link';
    reportLink.href = scenario.reportPath;
    reportLink.textContent = 'Open raw markdown';

    const jsonLink = document.createElement('a');
    jsonLink.className = 'inline-link';
    jsonLink.href = scenario.resultPath;
    jsonLink.textContent = 'Open result.json';

    footer.append(reportLink, jsonLink);

    card.append(header, summary);
    if (findings.childElementCount > 0) {
      card.append(findings);
    }
    if (scenario.primaryImage || scenario.primaryVideo) {
      card.append(createMediaPreview(scenario));
    }
    card.append(commandSection, markdownWrap, footer);
    runList.append(card);
  }
}

async function loadData() {
  try {
    const response = await fetch('./data/latest.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch {
    return fallbackData;
  }
}

function revealOnScroll() {
  const nodes = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    nodes.forEach((node) => node.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12 });

  nodes.forEach((node) => observer.observe(node));
}

const data = await loadData();
installCommand = data.marketing?.installCommand || fallbackData.marketing.installCommand;
installCommandBlock.textContent = installCommand;
openSkillLink.href = data.marketing?.skillUrl || fallbackData.marketing.skillUrl;
reportIndexLink.href = './reports/latest/index.html';
currentScenarios = Array.isArray(data.scenarios) ? data.scenarios : [];

renderSummary(data);
renderProof(data);
renderReferences(data);
buildFilterButtons(currentScenarios);
renderRuns(currentScenarios);
revealOnScroll();
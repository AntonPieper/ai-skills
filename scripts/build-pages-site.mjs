import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoDir = path.resolve(__dirname, '..');
const siteDir = path.join(repoDir, 'site');
const githubMarkdownCss = path.join(repoDir, 'node_modules', 'github-markdown-css', 'github-markdown-light.css');

const outputDir = process.argv[2];
const runRoot = process.argv[3] || '';
const liveDataUrl = process.argv[4] || '';

if (!outputDir) {
  console.error('Usage: node scripts/build-pages-site.mjs <output-dir> [run-root] [live-data-url]');
  process.exit(1);
}

const marketing = {
  installCommand: 'npx skills add AntonPieper/ai-skills --skill android-development',
  repositoryUrl: 'https://github.com/AntonPieper/ai-skills',
  skillUrl: 'https://github.com/AntonPieper/ai-skills/tree/main/skills/android/android-development',
  hero: {
    title: 'Ground Android work in the next real command.',
    body: 'This skill is built for the moments where generic Android advice drifts: unknown repo roots, Gradle task selection, modernization risk, and UI triage on an emulator. It keeps the agent close to the real repo, the real device, and the proof it can actually show.',
    highlights: [
      {
        label: 'Root discovery',
        body: 'Find the actual Android project before doing anything expensive.',
      },
      {
        label: 'Task selection',
        body: 'Choose the smallest build, test, and device command that answers the question.',
      },
      {
        label: 'Visual triage',
        body: 'Start with screenshots and short recordings before opening XML or logs.',
      },
    ],
  },
  sellingPoints: [
    {
      title: 'Find the real Android root first.',
      body: 'Nested repos and sample catalogs make blind Gradle guesses expensive. The skill starts with the smallest discovery move and only widens the search when the repo actually demands it.',
    },
    {
      title: 'Pick the next safe Gradle command.',
      body: 'Build, lint, unit tests, and connected tests are kept separate so the next command is specific, reproducible, and cheap enough to trust.',
    },
    {
      title: 'Triage UI with screenshots before XML.',
      body: 'On-device debugging stays screenshot-first, video-aware, and bounded. XML and logcat become backup material instead of the first wall of context.',
    },
    {
      title: 'Keep modernization grounded.',
      body: 'Legacy Gradle, AGP, Kotlin, AndroidX, namespace, and JDK problems are treated as evidence-gathering work, not a blind upgrade script.',
    },
  ],
  prompts: [
    'Find the smallest Android project root here and tell me the first safe inspection command.',
    'Tell me the smallest Gradle commands for build, unit tests, and connected tests in this repo.',
    'Give me a screenshot-first Android UI triage plan that keeps XML and logs bounded.',
  ],
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
};

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/plain, text/markdown, text/html;q=0.9, application/json;q=0.8, */*;q=0.7',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

async function fetchJson(url) {
  const text = await fetchText(url);
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchBuffer(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function buildSchema() {
  const schema = structuredClone(defaultSchema);
  schema.tagNames = [...(schema.tagNames || []), 'video', 'source', 'figure', 'figcaption'];
  schema.attributes = {
    ...(schema.attributes || {}),
    a: [...(schema.attributes?.a || []), 'target', 'rel'],
    code: [...(schema.attributes?.code || []), ['className', /^language-./]],
    img: [...(schema.attributes?.img || []), 'loading', 'decoding'],
    video: [
      'aria-label',
      'controls',
      'loop',
      'muted',
      'playsinline',
      'poster',
      'preload',
      ['className'],
    ],
    source: ['src', 'type'],
  };
  return schema;
}

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, buildSchema())
  .use(rehypeStringify);

function rewriteScenarioAssetUrls(html, basePath) {
  return html
    .replaceAll(/(src|href|poster)="\.\/([^"]+)"/g, (_match, attr, assetPath) => `${attr}="${basePath}/${assetPath}"`)
    .replaceAll(/(src|href|poster)="(media\/[^"]+)"/g, (_match, attr, assetPath) => `${attr}="${basePath}/${assetPath}"`)
    .replaceAll(/(src|href|poster)="(raw\/[^"]+)"/g, (_match, attr, assetPath) => `${attr}="${basePath}/${assetPath}"`);
}

async function renderMarkdown(markdown, basePath) {
  const rendered = await markdownProcessor.process(markdown);
  return rewriteScenarioAssetUrls(String(rendered), basePath);
}

function withScenarioBase(basePath, assetPath) {
  if (!assetPath) {
    return null;
  }

  return `${basePath}/${String(assetPath).replace(/^\.\//, '')}`;
}

function toUrl(siteRootUrl, assetPath) {
  return new URL(String(assetPath).replace(/^\.\//, ''), siteRootUrl).toString();
}

async function writeRemoteAsset(siteRootUrl, assetPath, outputRoot) {
  const targetPath = path.join(outputRoot, assetPath.replace(/^\.\//, ''));
  const contents = await fetchBuffer(toUrl(siteRootUrl, assetPath));
  if (!contents) {
    return false;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, contents);
  return true;
}

function normalizeCommands(commands) {
  if (!Array.isArray(commands)) {
    return [];
  }

  return commands
    .map((entry) => {
      if (typeof entry === 'string') {
        return { label: 'Command', command: entry, status: 'info' };
      }

      return {
        label: entry.label || 'Command',
        command: entry.command || '',
        status: entry.status || 'info',
        detail: entry.detail || '',
      };
    })
    .filter((entry) => entry.command);
}

function normalizeChecks(checks) {
  if (!Array.isArray(checks)) {
    return [];
  }

  return checks.map((entry) => ({
    label: entry.label || 'Check',
    status: entry.status || 'info',
    detail: entry.detail || '',
  }));
}

async function loadScenarioRuns(runRootValue, outputRoot) {
  const scenarioRoot = path.join(runRootValue, 'scenarios');
  if (!runRootValue || !(await fileExists(scenarioRoot))) {
    return [];
  }

  const entries = await fs.readdir(scenarioRoot, { withFileTypes: true });
  const scenarios = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const scenarioDir = path.join(scenarioRoot, entry.name);
    const outputScenarioDir = path.join(outputRoot, 'reports', 'latest', 'scenarios', entry.name);
    const result = await readJson(path.join(scenarioDir, 'result.json'), {});
    const media = await readJson(path.join(scenarioDir, 'media', 'index.json'), { images: [], videos: [] });
    const reportMarkdown = await fs
      .readFile(path.join(scenarioDir, 'report.md'), 'utf8')
      .catch(() => 'No report was written for this scenario.');

    await fs.mkdir(path.dirname(outputScenarioDir), { recursive: true });
    await fs.cp(scenarioDir, outputScenarioDir, { recursive: true, force: true });

    const basePath = `./reports/latest/scenarios/${entry.name}`;
    const fixture = result.fixture || {};
    const repo = result.repo || {};

    scenarios.push({
      id: result.scenarioId || entry.name,
      slug: entry.name,
      title: result.title || entry.name,
      status: result.status || 'unknown',
      generatedAt: result.generatedAt || null,
      summary: result.summary || 'Scenario output is available in the report below.',
      type: result.type || result.scenarioId || entry.name,
      repoLabel: fixture.label || repo.label || 'Android fixture',
      repoUrl: fixture.repoUrl || repo.url || '',
      keyFindings: Array.isArray(result.keyFindings) ? result.keyFindings : [],
      checks: normalizeChecks(result.checks),
      commands: normalizeCommands(result.commands),
      reportHtml: await renderMarkdown(reportMarkdown, basePath),
      reportPath: `${basePath}/report.md`,
      resultPath: `${basePath}/result.json`,
      media,
      primaryImage: withScenarioBase(basePath, media.images?.[0]?.output),
      primaryVideo: withScenarioBase(basePath, media.videos?.[0]?.output),
      primaryVideoPoster: withScenarioBase(basePath, media.videos?.[0]?.poster),
    });
  }

  return scenarios.sort((left, right) => left.title.localeCompare(right.title));
}

async function loadPublishedScenarioRuns(liveDataUrlValue, outputRoot) {
  if (!liveDataUrlValue) {
    return null;
  }

  const published = await fetchJson(liveDataUrlValue);
  if (!published || !Array.isArray(published.scenarios) || published.scenarios.length === 0) {
    return published
      ? {
          generatedAt: published.generatedAt || new Date().toISOString(),
          scenarios: [],
        }
      : null;
  }

  const siteRootUrl = new URL('../', liveDataUrlValue);
  const scenarios = [];

  for (const scenario of published.scenarios) {
    const slug = scenario.slug || scenario.id;
    if (!slug || !scenario.reportPath || !scenario.resultPath) {
      continue;
    }

    const outputScenarioDir = path.join(outputRoot, 'reports', 'latest', 'scenarios', slug);
    await fs.mkdir(path.join(outputScenarioDir, 'media'), { recursive: true });

    const result = await fetchJson(toUrl(siteRootUrl, scenario.resultPath));
    const reportMarkdown = await fetchText(toUrl(siteRootUrl, scenario.reportPath));
    const media = await fetchJson(toUrl(siteRootUrl, `./reports/latest/scenarios/${slug}/media/index.json`)) || scenario.media || { images: [], videos: [] };

    if (!result || !reportMarkdown) {
      continue;
    }

    await Promise.all([
      fs.writeFile(path.join(outputScenarioDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`),
      fs.writeFile(path.join(outputScenarioDir, 'report.md'), reportMarkdown),
      fs.writeFile(path.join(outputScenarioDir, 'media', 'index.json'), `${JSON.stringify(media, null, 2)}\n`),
    ]);

    const assetPaths = new Set();
    assetPaths.add(`./reports/latest/scenarios/${slug}/media/index.json`);

    for (const image of media.images || []) {
      if (image.output) {
        assetPaths.add(`./reports/latest/scenarios/${slug}/${String(image.output).replace(/^\.\//, '')}`);
      }
    }

    for (const video of media.videos || []) {
      if (video.output) {
        assetPaths.add(`./reports/latest/scenarios/${slug}/${String(video.output).replace(/^\.\//, '')}`);
      }
      if (video.poster) {
        assetPaths.add(`./reports/latest/scenarios/${slug}/${String(video.poster).replace(/^\.\//, '')}`);
      }
    }

    await Promise.all([...assetPaths].map((assetPath) => writeRemoteAsset(siteRootUrl, assetPath, outputRoot)));

    const basePath = `./reports/latest/scenarios/${slug}`;
    scenarios.push({
      id: result.scenarioId || scenario.id || slug,
      slug,
      title: result.title || scenario.title || slug,
      status: result.status || scenario.status || 'unknown',
      generatedAt: result.generatedAt || scenario.generatedAt || null,
      summary: result.summary || scenario.summary || 'Scenario output is available in the report below.',
      type: result.type || scenario.type || result.scenarioId || slug,
      repoLabel: result.fixture?.label || scenario.repoLabel || 'Android fixture',
      repoUrl: result.fixture?.repoUrl || scenario.repoUrl || '',
      keyFindings: Array.isArray(result.keyFindings) ? result.keyFindings : [],
      checks: normalizeChecks(result.checks),
      commands: normalizeCommands(result.commands),
      reportHtml: await renderMarkdown(reportMarkdown, basePath),
      reportPath: `${basePath}/report.md`,
      resultPath: `${basePath}/result.json`,
      media,
      primaryImage: withScenarioBase(basePath, media.images?.[0]?.output),
      primaryVideo: withScenarioBase(basePath, media.videos?.[0]?.output),
      primaryVideoPoster: withScenarioBase(basePath, media.videos?.[0]?.poster),
    });
  }

  return {
    generatedAt: published.generatedAt || new Date().toISOString(),
    scenarios: scenarios.sort((left, right) => left.title.localeCompare(right.title)),
  };
}

function buildSummary(scenarios) {
  const total = scenarios.length;
  const passed = scenarios.filter((scenario) => scenario.status === 'passed').length;
  const failed = scenarios.filter((scenario) => scenario.status === 'failed').length;
  const warning = scenarios.filter((scenario) => scenario.status === 'warning').length;
  const fixtures = [...new Set(scenarios.map((scenario) => scenario.repoLabel))];

  return {
    total,
    passed,
    failed,
    warning,
    fixtures,
    withMedia: scenarios.filter((scenario) => scenario.media.images?.length || scenario.media.videos?.length).length,
  };
}

function buildReportIndex(payload) {
  const items = payload.scenarios
    .map((scenario) => {
      const repo = scenario.repoUrl
        ? `<a href="${scenario.repoUrl}">${scenario.repoLabel}</a>`
        : scenario.repoLabel;

      return `
      <article class="report-card">
        <div class="report-topline">
          <span class="report-status report-status-${scenario.status}">${scenario.status}</span>
          <span>${repo}</span>
        </div>
        <h2>${scenario.title}</h2>
        <p>${scenario.summary}</p>
        <p><a href="./scenarios/${scenario.slug}/report.md">Open markdown report</a> · <a href="./scenarios/${scenario.slug}/result.json">Open result.json</a></p>
      </article>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>android-development scenario runs</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f3ec;
      --card: #fffdf9;
      --ink: #17221c;
      --muted: #5a655f;
      --line: #d9d2c7;
      --green: #1d6b4a;
      --amber: #b56a16;
      --red: #a63d2f;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--ink); }
    main { width: min(980px, calc(100% - 2rem)); margin: 0 auto; padding: 3rem 0 4rem; }
    h1 { margin: 0 0 0.75rem; font-size: clamp(2rem, 5vw, 3.2rem); }
    p { line-height: 1.6; color: var(--muted); }
    .report-grid { display: grid; gap: 1rem; margin-top: 2rem; }
    .report-card { padding: 1.2rem; border: 1px solid var(--line); border-radius: 20px; background: var(--card); }
    .report-topline { display: flex; gap: 0.75rem; flex-wrap: wrap; font-size: 0.95rem; color: var(--muted); }
    .report-status { display: inline-flex; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 700; text-transform: capitalize; }
    .report-status-passed { color: var(--green); background: rgba(29, 107, 74, 0.1); }
    .report-status-warning { color: var(--amber); background: rgba(181, 106, 22, 0.12); }
    .report-status-failed { color: var(--red); background: rgba(166, 61, 47, 0.12); }
    a { color: var(--ink); }
  </style>
</head>
<body>
  <main>
    <p>android-development</p>
    <h1>Scenario run index</h1>
    <p>${payload.summary.total} scenario runs, ${payload.summary.passed} passed, ${payload.summary.warning} warnings, ${payload.summary.failed} failed.</p>
    <div class="report-grid">${items || '<p>No scenario runs were bundled with this build.</p>'}</div>
  </main>
</body>
</html>`;
}

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(path.join(outputDir, 'data'), { recursive: true });
await fs.mkdir(path.join(outputDir, 'assets'), { recursive: true });
await fs.mkdir(path.join(outputDir, 'reports', 'latest'), { recursive: true });

await Promise.all([
  fs.copyFile(path.join(siteDir, 'favicon.svg'), path.join(outputDir, 'favicon.svg')),
  fs.copyFile(path.join(siteDir, 'index.html'), path.join(outputDir, 'index.html')),
  fs.copyFile(path.join(siteDir, 'styles.css'), path.join(outputDir, 'styles.css')),
  fs.copyFile(path.join(siteDir, 'script.js'), path.join(outputDir, 'script.js')),
  fs.copyFile(githubMarkdownCss, path.join(outputDir, 'assets', 'github-markdown-light.css')),
]);

if (runRoot && (await fileExists(path.join(runRoot, 'skill-package.txt')))) {
  await fs.copyFile(path.join(runRoot, 'skill-package.txt'), path.join(outputDir, 'reports', 'latest', 'skill-package.txt'));
} else if (liveDataUrl) {
  await writeRemoteAsset(new URL('../', liveDataUrl), './reports/latest/skill-package.txt', outputDir);
}

const runRootScenarios = await loadScenarioRuns(runRoot, outputDir);
const publishedScenarios = runRootScenarios.length === 0
  ? await loadPublishedScenarioRuns(liveDataUrl, outputDir)
  : null;
const scenarios = runRootScenarios.length > 0
  ? runRootScenarios
  : (publishedScenarios?.scenarios || []);
const payload = {
  generatedAt: publishedScenarios?.generatedAt || new Date().toISOString(),
  marketing,
  summary: buildSummary(scenarios),
  scenarios,
};

await Promise.all([
  fs.writeFile(path.join(outputDir, 'data', 'latest.json'), `${JSON.stringify(payload, null, 2)}\n`),
  fs.writeFile(path.join(outputDir, 'reports', 'latest', 'index.html'), buildReportIndex(payload)),
]);

console.log(`Built site bundle in ${outputDir}`);

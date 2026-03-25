import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoDir = path.resolve(__dirname, '..');

const runRoot = process.argv[2];

if (!runRoot) {
  console.error('Usage: node scripts/render-android-smoke-report.mjs <run-root>');
  process.exit(1);
}

const summaryPath = path.join(runRoot, 'summary.tsv');
const skillPackagePath = path.join(runRoot, 'skill-package.txt');
const reportDir = path.join(runRoot, 'report');
const evalsDir = path.join(repoDir, 'validation', 'android-development', 'evals');

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseTsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const [headerLine, ...rowLines] = lines;
  const headers = headerLine.split('\t');

  return rowLines.map((line) => {
    const values = line.split('\t');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function buildHtmlTable(rows) {
  const body = rows
    .map(
      (row) => `
        <tr>
          <td>${row.repo}</td>
          <td>${row.scenario}</td>
          <td>${row.result}</td>
          <td>${row.exit_code}</td>
          <td>${row.total_usage || ''}</td>
          <td>${row.session_time || ''}</td>
          <td>${row.log_name}</td>
        </tr>`,
    )
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Repo</th>
          <th>Scenario</th>
          <th>Result</th>
          <th>Exit code</th>
          <th>Total usage</th>
          <th>Session time</th>
          <th>Log</th>
        </tr>
      </thead>
      <tbody>${body}
      </tbody>
    </table>`;
}

function buildMarkdownRows(rows) {
  const header = '| Repo | Scenario | Result | Exit code | Total usage | Session time | Log |';
  const separator = '| --- | --- | --- | --- | --- | --- | --- |';
  const body = rows.map((row) => `| ${row.repo} | ${row.scenario} | ${row.result} | ${row.exit_code} | ${row.total_usage || ''} | ${row.session_time || ''} | ${row.log_name} |`);
  return [header, separator, ...body].join('\n');
}

async function readEvalCounts() {
  const [evalsText, trainText, validationText] = await Promise.all([
    fs.readFile(path.join(evalsDir, 'evals.json'), 'utf8'),
    fs.readFile(path.join(evalsDir, 'trigger-queries.train.json'), 'utf8'),
    fs.readFile(path.join(evalsDir, 'trigger-queries.validation.json'), 'utf8'),
  ]);

  return {
    evalCases: JSON.parse(evalsText).evals.length,
    triggerTrainQueries: JSON.parse(trainText).length,
    triggerValidationQueries: JSON.parse(validationText).length,
  };
}

await fs.mkdir(reportDir, { recursive: true });

const hasSummary = await fileExists(summaryPath);
const evalCounts = await readEvalCounts();
const hasSkillPackage = await fileExists(skillPackagePath);

let markdown = '';
let html = '';
let summaryJson = {};

if (!hasSummary) {
  markdown = [
    '# Android Development Smoke',
    '',
    '- No summary.tsv was produced for this run.',
    '- The smoke step likely failed before report data was written.',
    '',
    '## Eval Inventory',
    '',
    `- Output-quality eval cases defined: ${evalCounts.evalCases}`,
    `- Trigger-train queries defined: ${evalCounts.triggerTrainQueries}`,
    `- Trigger-validation queries defined: ${evalCounts.triggerValidationQueries}`,
  ].join('\n');

  html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Android Development Smoke</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 2rem; line-height: 1.5; }
  </style>
</head>
<body>
  <h1>Android Development Smoke</h1>
  <p>No summary.tsv was produced for this run.</p>
  <ul>
    <li>Output-quality eval cases defined: ${evalCounts.evalCases}</li>
    <li>Trigger-train queries defined: ${evalCounts.triggerTrainQueries}</li>
    <li>Trigger-validation queries defined: ${evalCounts.triggerValidationQueries}</li>
  </ul>
</body>
</html>`;

  summaryJson = {
    runRoot,
    hasSummary: false,
    evalCounts,
  };
} else {
  const rows = parseTsv(await fs.readFile(summaryPath, 'utf8')).map((row) => ({
    ...row,
    exitCodeNumber: Number.parseInt(row.exit_code || '1', 10),
    result: Number.parseInt(row.exit_code || '1', 10) === 0 ? 'PASS' : 'FAIL',
    log_name: row.log_file ? path.basename(row.log_file) : '',
  }));

  const passed = rows.filter((row) => row.result === 'PASS').length;
  const failed = rows.length - passed;
  const failures = rows.filter((row) => row.result === 'FAIL');
  const repoCounts = [...new Set(rows.map((row) => row.repo))].map((repo) => {
    const repoRows = rows.filter((row) => row.repo === repo);
    return {
      repo,
      total: repoRows.length,
      failed: repoRows.filter((row) => row.result === 'FAIL').length,
    };
  });

  markdown = [
    '# Android Development Smoke',
    '',
    `- Total cases: ${rows.length}`,
    `- Passed: ${passed}`,
    `- Failed: ${failed}`,
    '',
    '## Matrix',
    '',
    buildMarkdownRows(rows),
    '',
    '## Coverage',
    '',
    `- Output-quality eval cases defined: ${evalCounts.evalCases}`,
    `- Trigger-train queries defined: ${evalCounts.triggerTrainQueries}`,
    `- Trigger-validation queries defined: ${evalCounts.triggerValidationQueries}`,
    '- These eval assets are inventoried here; they are not executed by this smoke workflow.',
  ];

  if (failures.length > 0) {
    markdown.push('', '## Failures', '');
    for (const row of failures) {
      markdown.push(`- ${row.repo}/${row.scenario} failed with exit code ${row.exit_code} (${row.log_name})`);
    }
  }

  if (hasSkillPackage) {
    markdown.push('', '## Artifacts', '', '- `skill-package.txt` is included in the uploaded artifact.', '- `report/index.html` can be published later with GitHub Pages if you want a browsable smoke dashboard.');
  }

  markdown = markdown.join('\n');

  const repoItems = repoCounts
    .map((item) => `<li><strong>${item.repo}</strong>: ${item.total - item.failed}/${item.total} passed</li>`)
    .join('');

  html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Android Development Smoke</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 2rem; line-height: 1.5; color: #1f2937; }
    table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
    th, td { border: 1px solid #d1d5db; padding: 0.5rem; text-align: left; }
    th { background: #f3f4f6; }
    code, pre { font-family: ui-monospace, SFMono-Regular, monospace; }
    .pass { color: #166534; }
    .fail { color: #991b1b; }
  </style>
</head>
<body>
  <h1>Android Development Smoke</h1>
  <ul>
    <li>Total cases: ${rows.length}</li>
    <li>Passed: <span class="pass">${passed}</span></li>
    <li>Failed: <span class="fail">${failed}</span></li>
  </ul>
  <h2>Matrix</h2>
  ${buildHtmlTable(rows)}
  <h2>Coverage</h2>
  <ul>
    <li>Output-quality eval cases defined: ${evalCounts.evalCases}</li>
    <li>Trigger-train queries defined: ${evalCounts.triggerTrainQueries}</li>
    <li>Trigger-validation queries defined: ${evalCounts.triggerValidationQueries}</li>
    <li>These eval assets are inventoried here; they are not executed by this smoke workflow.</li>
  </ul>
  <h2>By Repository</h2>
  <ul>${repoItems}</ul>
</body>
</html>`;

  summaryJson = {
    runRoot,
    hasSummary: true,
    counts: {
      total: rows.length,
      passed,
      failed,
    },
    evalCounts,
    rows: rows.map((row) => ({
      repo: row.repo,
      scenario: row.scenario,
      result: row.result,
      exit_code: row.exit_code,
      total_usage: row.total_usage,
      api_time: row.api_time,
      session_time: row.session_time,
      in_tokens: row.in_tokens,
      out_tokens: row.out_tokens,
      cached_tokens: row.cached_tokens,
      premium_requests: row.premium_requests,
      log_name: row.log_name,
    })),
  };
}

await Promise.all([
  fs.writeFile(path.join(reportDir, 'summary.md'), `${markdown}\n`),
  fs.writeFile(path.join(reportDir, 'summary.json'), `${JSON.stringify(summaryJson, null, 2)}\n`),
  fs.writeFile(path.join(reportDir, 'index.html'), html),
]);

if (process.env.GITHUB_STEP_SUMMARY) {
  await fs.writeFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

console.log(`Rendered smoke report in ${reportDir}`);
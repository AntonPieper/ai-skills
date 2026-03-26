import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const scenarioDir = process.argv[2];

if (!scenarioDir) {
  console.error('Usage: node scripts/process-android-scenario-artifacts.mjs <scenario-dir>');
  process.exit(1);
}

const rawDir = path.join(scenarioDir, 'raw');
const mediaDir = path.join(scenarioDir, 'media');
const manifestPath = path.join(mediaDir, 'index.json');

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function toRelative(filePath) {
  return `./${path.relative(scenarioDir, filePath).replaceAll(path.sep, '/')}`;
}

function normalizeAlt(name) {
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function processImage(fileName) {
  const inputPath = path.join(rawDir, fileName);
  const stem = path.parse(fileName).name;
  const outputPath = path.join(mediaDir, `${stem}.webp`);
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  await image
    .resize({ width: 1600, height: 1600, fit: sharp.fit.inside, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outputPath);

  return {
    kind: 'image',
    label: normalizeAlt(stem),
    input: toRelative(inputPath),
    output: toRelative(outputPath),
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  };
}

async function processVideo(fileName) {
  const inputPath = path.join(rawDir, fileName);
  const stem = path.parse(fileName).name;
  const outputPath = path.join(mediaDir, `${stem}.mp4`);
  const posterPngPath = path.join(mediaDir, `${stem}-poster.png`);
  const posterWebpPath = path.join(mediaDir, `${stem}-poster.webp`);

  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    inputPath,
    '-vf',
    'scale=1280:-2:force_original_aspect_ratio=decrease,fps=12',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '30',
    outputPath,
  ]);

  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    outputPath,
    '-vf',
    'thumbnail,scale=1280:-2:force_original_aspect_ratio=decrease',
    '-frames:v',
    '1',
    posterPngPath,
  ]);

  await sharp(posterPngPath)
    .webp({ quality: 82 })
    .toFile(posterWebpPath);

  await fs.rm(posterPngPath, { force: true });

  return {
    kind: 'video',
    label: normalizeAlt(stem),
    input: toRelative(inputPath),
    output: toRelative(outputPath),
    poster: toRelative(posterWebpPath),
    mime: 'video/mp4',
  };
}

await fs.mkdir(mediaDir, { recursive: true });

const entries = await fs.readdir(rawDir, { withFileTypes: true }).catch(() => []);
const images = [];
const videos = [];

for (const entry of entries) {
  if (!entry.isFile()) {
    continue;
  }

  const extension = path.extname(entry.name).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
    images.push(await processImage(entry.name));
    continue;
  }

  if (['.mp4', '.mov', '.m4v'].includes(extension)) {
    videos.push(await processVideo(entry.name));
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  scenarioDir: path.basename(scenarioDir),
  images,
  videos,
};

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

if (await fileExists(path.join(scenarioDir, 'result.json'))) {
  console.log(`Processed scenario media for ${scenarioDir}`);
} else {
  console.log(`Processed scenario media for ${scenarioDir} without a scenario result.json yet`);
}
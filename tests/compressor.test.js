import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { compressImage } from '../src/compressor.js';

const TEMP_DIR = path.resolve('test-temp');
const SAMPLE_PNG = path.join(TEMP_DIR, 'sample.png');

test.before(async () => {
  await fs.mkdir(TEMP_DIR, { recursive: true });

  // Generate a 200x200 sample uncompressed PNG image with geometric patterns
  const svgBuffer = Buffer.from(`
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#3b82f6" />
      <circle cx="100" cy="100" r="80" fill="#ef4444" />
      <text x="30" y="110" font-family="sans-serif" font-size="24" fill="#ffffff">SnapCompress</text>
    </svg>
  `);

  await sharp(svgBuffer).png().toFile(SAMPLE_PNG);
});

test.after(async () => {
  try {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup error
  }
});

test('compressImage converts PNG to WebP with size reduction', async () => {
  const result = await compressImage(SAMPLE_PNG, {
    format: 'webp',
    quality: 80,
    outputDir: path.join(TEMP_DIR, 'out-webp'),
  });

  assert.equal(result.skipped, false);
  assert.equal(result.outputFormat, 'webp');
  assert.ok(result.compressedBytes > 0);
  assert.ok(result.originalBytes > 0);

  // Verify the file was written to disk
  const stat = await fs.stat(result.outputPath);
  assert.equal(stat.size, result.compressedBytes);

  // Check it is a valid webp using Sharp metadata
  const meta = await sharp(result.outputPath).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 200);
  assert.equal(meta.height, 200);
});

test('compressImage converts to AVIF format', async () => {
  const result = await compressImage(SAMPLE_PNG, {
    format: 'avif',
    quality: 75,
    outputDir: path.join(TEMP_DIR, 'out-avif'),
  });

  assert.equal(result.skipped, false);
  assert.equal(result.outputFormat, 'avif');

  const meta = await sharp(result.outputPath).metadata();
  assert.ok(meta.format === 'avif' || meta.format === 'heif');
});

test('compressImage resizes image according to width constraint', async () => {
  const result = await compressImage(SAMPLE_PNG, {
    format: 'webp',
    width: 100,
    outputDir: path.join(TEMP_DIR, 'out-resize'),
  });

  const meta = await sharp(result.outputPath).metadata();
  assert.equal(meta.width, 100);
  assert.equal(meta.height, 100);
});

test('compressImage dryRun does not write to disk but reports savings', async () => {
  const outPath = path.join(TEMP_DIR, 'out-dry', 'sample.webp');
  const result = await compressImage(SAMPLE_PNG, {
    format: 'webp',
    dryRun: true,
    outputDir: path.join(TEMP_DIR, 'out-dry'),
  });

  assert.equal(result.isDryRun, true);
  assert.ok(result.compressedBytes > 0);

  // Verify file does NOT exist on disk
  await assert.rejects(async () => {
    await fs.stat(outPath);
  });
});

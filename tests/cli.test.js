import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const CLI_PATH = path.resolve('bin/snap-compress.js');
const CLI_TEMP_DIR = path.resolve('test-temp-cli');

test.before(async () => {
  await fs.mkdir(CLI_TEMP_DIR, { recursive: true });

  // Generate a test image for CLI execution
  const svg = '<svg width="150" height="150"><rect width="150" height="150" fill="#10b981"/></svg>';
  await sharp(Buffer.from(svg)).png().toFile(path.join(CLI_TEMP_DIR, 'box.png'));
});

test.after(async () => {
  try {
    await fs.rm(CLI_TEMP_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup error
  }
});

test('CLI --help displays usage and options', async () => {
  const { stdout } = await execFileAsync('node', [CLI_PATH, '--help']);
  assert.ok(stdout.includes('Usage: snap-compress'));
  assert.ok(stdout.includes('--format'));
  assert.ok(stdout.includes('--quality'));
});

test('CLI --version displays package version', async () => {
  const { stdout } = await execFileAsync('node', [CLI_PATH, '--version']);
  assert.ok(stdout.trim() === '1.0.0');
});

test('CLI runs in dry-run with --json output', async () => {
  const { stdout } = await execFileAsync('node', [
    CLI_PATH,
    CLI_TEMP_DIR,
    '--dry-run',
    '--json',
    '--format',
    'webp',
  ]);

  const parsed = JSON.parse(stdout);
  assert.ok(parsed.summary);
  assert.equal(parsed.summary.totalFiles, 1);
  assert.equal(parsed.summary.successful, 1);
  assert.equal(parsed.results[0].outputFormat, 'webp');
  assert.equal(parsed.results[0].isDryRun, true);
});

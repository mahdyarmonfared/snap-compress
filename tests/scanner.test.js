import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { discoverImages } from '../src/scanner.js';

const SCAN_DIR = path.resolve('test-temp-scanner');

test.before(async () => {
  await fs.mkdir(path.join(SCAN_DIR, 'subfolder'), { recursive: true });
  await fs.mkdir(path.join(SCAN_DIR, 'node_modules'), { recursive: true });

  // Create mock files
  await fs.writeFile(path.join(SCAN_DIR, 'root.png'), 'fake-image-bytes');
  await fs.writeFile(path.join(SCAN_DIR, 'subfolder', 'child.jpg'), 'fake-image-bytes');
  await fs.writeFile(path.join(SCAN_DIR, 'subfolder', 'readme.txt'), 'text file');
  await fs.writeFile(path.join(SCAN_DIR, 'node_modules', 'ignored.png'), 'should-be-ignored');
});

test.after(async () => {
  try {
    await fs.rm(SCAN_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup error
  }
});

test('discoverImages finds images in directory and subdirectories', async () => {
  const { files } = await discoverImages(SCAN_DIR, { recursive: true });

  const basenames = files.map((f) => path.basename(f));
  assert.ok(basenames.includes('root.png'));
  assert.ok(basenames.includes('child.jpg'));
  assert.ok(!basenames.includes('readme.txt'));
  assert.ok(!basenames.includes('ignored.png'));
});

test('discoverImages returns single file when targeting a file directly', async () => {
  const filePath = path.join(SCAN_DIR, 'root.png');
  const { files } = await discoverImages(filePath);

  assert.equal(files.length, 1);
  assert.equal(files[0], filePath);
});

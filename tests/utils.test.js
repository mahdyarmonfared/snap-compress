import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  isImageFile,
  calculateSavings,
  determineOutputPath,
  normalizeFormat,
} from '../src/utils.js';

test('formatBytes handles zero and edge cases', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(null), '0 B');
  assert.equal(formatBytes(NaN), '0 B');
  assert.equal(formatBytes(500), '500 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(1048576), '1 MB');
  assert.equal(formatBytes(1073741824), '1 GB');
});

test('isImageFile recognizes supported image extensions', () => {
  assert.equal(isImageFile('photo.png'), true);
  assert.equal(isImageFile('avatar.PNG'), true);
  assert.equal(isImageFile('wallpaper.jpg'), true);
  assert.equal(isImageFile('banner.jpeg'), true);
  assert.equal(isImageFile('graphic.webp'), true);
  assert.equal(isImageFile('asset.avif'), true);
  assert.equal(isImageFile('scan.tiff'), true);
  assert.equal(isImageFile('vector.svg'), true);

  // Non-images
  assert.equal(isImageFile('document.pdf'), false);
  assert.equal(isImageFile('index.html'), false);
  assert.equal(isImageFile('script.js'), false);
  assert.equal(isImageFile(''), false);
});

test('calculateSavings computes accurate byte diffs and percentages', () => {
  const result1 = calculateSavings(1000, 400);
  assert.equal(result1.savedBytes, 600);
  assert.equal(result1.percentSaved, 60);

  const result2 = calculateSavings(1000, 1000);
  assert.equal(result2.savedBytes, 0);
  assert.equal(result2.percentSaved, 0);

  const result3 = calculateSavings(0, 100);
  assert.equal(result3.savedBytes, 0);
  assert.equal(result3.percentSaved, 0);
});

test('normalizeFormat cleans extensions and aliases', () => {
  assert.equal(normalizeFormat('webp'), 'webp');
  assert.equal(normalizeFormat('.webp'), 'webp');
  assert.equal(normalizeFormat('jpg'), 'jpeg');
  assert.equal(normalizeFormat('.jpg'), 'jpeg');
  assert.equal(normalizeFormat('JPEG'), 'jpeg');
  assert.equal(normalizeFormat('AVIF'), 'avif');
});

test('determineOutputPath calculates correct output paths', () => {
  // In-place same directory with new format
  const out1 = determineOutputPath({
    inputPath: '/workspace/assets/hero.png',
    inputBaseDir: '/workspace/assets',
    targetFormat: 'webp',
    inPlace: true,
  });
  assert.equal(out1, '/workspace/assets/hero.webp');

  // To specified output directory preserving relative structure
  const out2 = determineOutputPath({
    inputPath: '/workspace/images/banners/summer.jpg',
    inputBaseDir: '/workspace/images',
    outputDir: '/workspace/dist',
    targetFormat: 'avif',
  });
  assert.equal(out2, '/workspace/dist/banners/summer.avif');
});

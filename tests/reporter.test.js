import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBatchSummary,
  renderTerminalTable,
  renderSummaryCard,
} from '../src/reporter.js';

test('calculateBatchSummary sums bytes and calculates percentages correctly', () => {
  const mockResults = [
    {
      originalBytes: 1000,
      compressedBytes: 400,
      percentSaved: 60,
      skipped: false,
    },
    {
      originalBytes: 2000,
      compressedBytes: 1000,
      percentSaved: 50,
      skipped: false,
    },
    {
      originalBytes: 500,
      compressedBytes: 500,
      percentSaved: 0,
      skipped: true,
      skipReason: 'no savings',
    },
  ];

  const summary = calculateBatchSummary(mockResults, 1200);

  assert.equal(summary.totalFiles, 3);
  assert.equal(summary.successful, 2);
  assert.equal(summary.skipped, 1);
  assert.equal(summary.failed, 0);
  assert.equal(summary.totalOriginalBytes, 3500);
  assert.equal(summary.totalCompressedBytes, 1900);
  assert.equal(summary.totalSavedBytes, 1600);
  assert.equal(summary.durationMs, 1200);
});

test('renderTerminalTable formats rows without throwing', () => {
  const mockResults = [
    {
      inputPath: '/images/hero.png',
      originalBytes: 10240,
      compressedBytes: 4096,
      originalFormat: 'png',
      outputFormat: 'webp',
      percentSaved: 60.0,
      skipped: false,
    },
  ];

  const tableStr = renderTerminalTable(mockResults, '/images');
  assert.ok(typeof tableStr === 'string');
  assert.ok(tableStr.includes('hero.png'));
  assert.ok(tableStr.includes('WEBP'));
});

test('renderSummaryCard outputs markdown/text summary with metrics', () => {
  const summary = {
    totalFiles: 5,
    successful: 4,
    skipped: 1,
    failed: 0,
    totalOriginalBytes: 204800,
    totalCompressedBytes: 102400,
    totalSavedBytes: 102400,
    totalPercentSaved: 50.0,
    durationMs: 450,
  };

  const card = renderSummaryCard(summary);
  assert.ok(card.includes('Total Files:'));
  assert.ok(card.includes('Space Reclaimed:'));
  assert.ok(card.includes('50%'));
});

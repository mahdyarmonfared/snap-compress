import path from 'node:path';
import chalk from 'chalk';
import Table from 'cli-table3';
import { formatBytes } from './utils.js';

/**
 * Compute overall batch statistics.
 * @param {Array<object>} results
 * @param {number} totalDurationMs
 * @returns {object}
 */
export function calculateBatchSummary(results, totalDurationMs = 0) {
  let totalOriginalBytes = 0;
  let totalCompressedBytes = 0;
  let successful = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of results) {
    if (item.error) {
      failed++;
    } else if (item.skipped) {
      skipped++;
      totalOriginalBytes += item.originalBytes;
      totalCompressedBytes += item.compressedBytes;
    } else {
      successful++;
      totalOriginalBytes += item.originalBytes;
      totalCompressedBytes += item.compressedBytes;
    }
  }

  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalCompressedBytes);
  const totalPercentSaved = totalOriginalBytes > 0
    ? Number(((totalSavedBytes / totalOriginalBytes) * 100).toFixed(1))
    : 0;

  return {
    totalFiles: results.length,
    successful,
    skipped,
    failed,
    totalOriginalBytes,
    totalCompressedBytes,
    totalSavedBytes,
    totalPercentSaved,
    durationMs: totalDurationMs,
  };
}

/**
 * Render a beautiful terminal table of compression results.
 * @param {Array<object>} results
 * @param {string} [baseDir='']
 * @returns {string}
 */
export function renderTerminalTable(results, baseDir = '') {
  const table = new Table({
    head: [
      chalk.cyan.bold('File'),
      chalk.cyan.bold('Orig Format'),
      chalk.cyan.bold('Orig Size'),
      chalk.cyan.bold('New Format'),
      chalk.cyan.bold('New Size'),
      chalk.cyan.bold('Saved'),
      chalk.cyan.bold('Status'),
    ],
    colAligns: ['left', 'center', 'right', 'center', 'right', 'right', 'left'],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const r of results) {
    const fileName = baseDir ? path.relative(baseDir, r.inputPath) : path.basename(r.inputPath);
    const origSize = formatBytes(r.originalBytes);

    if (r.error) {
      table.push([
        chalk.white(fileName),
        chalk.gray(r.originalFormat),
        origSize,
        chalk.gray('-'),
        chalk.gray('-'),
        chalk.gray('0%'),
        chalk.red(`✖ Error: ${r.error.slice(0, 30)}`),
      ]);
      continue;
    }

    if (r.skipped) {
      table.push([
        chalk.white(fileName),
        chalk.gray(r.originalFormat),
        origSize,
        chalk.gray(r.outputFormat),
        chalk.gray(formatBytes(r.compressedBytes)),
        chalk.gray('0%'),
        chalk.yellow(`⚠ Skipped (${r.skipReason || 'no savings'})`),
      ]);
      continue;
    }

    const newSize = formatBytes(r.compressedBytes);
    let savingsLabel = `${r.percentSaved}%`;
    if (r.percentSaved >= 50) {
      savingsLabel = chalk.green.bold(`-${savingsLabel}`);
    } else if (r.percentSaved > 0) {
      savingsLabel = chalk.green(`-${savingsLabel}`);
    } else {
      savingsLabel = chalk.yellow('0%');
    }

    const statusLabel = r.isDryRun
      ? chalk.blue('ℹ Simulated')
      : chalk.green('✔ Optimized');

    table.push([
      chalk.white(fileName),
      chalk.magenta(r.originalFormat.toUpperCase()),
      origSize,
      chalk.blue.bold(r.outputFormat.toUpperCase()),
      newSize,
      savingsLabel,
      statusLabel,
    ]);
  }

  return table.toString();
}

/**
 * Format summary banner.
 * @param {object} summary
 * @returns {string}
 */
export function renderSummaryCard(summary) {
  const lines = [
    '',
    chalk.bold.underline('📊 Compression Summary:'),
    `  • Total Files:        ${chalk.bold(summary.totalFiles)} (${chalk.green(`${summary.successful} optimized`)}, ${chalk.yellow(`${summary.skipped} skipped`)}, ${chalk.red(`${summary.failed} errors`)})`,
    `  • Original Size:      ${chalk.bold(formatBytes(summary.totalOriginalBytes))}`,
    `  • Compressed Size:    ${chalk.bold(formatBytes(summary.totalCompressedBytes))}`,
    `  • Space Reclaimed:    ${chalk.green.bold(formatBytes(summary.totalSavedBytes))} (${chalk.green.bold(`-${summary.totalPercentSaved}%`)})`,
    `  • Execution Time:     ${(summary.durationMs / 1000).toFixed(2)}s`,
    '',
  ];
  return lines.join('\n');
}

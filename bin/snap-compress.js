#!/usr/bin/env node

import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  discoverImages,
  compressImage,
  calculateBatchSummary,
  renderTerminalTable,
  renderSummaryCard,
  startWebServer,
} from '../src/index.js';

const program = new Command();

program
  .name('snap-compress')
  .description('⚡ Ultra-fast batch image compressor and WebP/AVIF converter powered by Sharp')
  .version('1.0.0')
  .argument('[target]', 'Image file or directory to compress (or "web" to launch GUI)', '.')
  .option('-o, --out <dir>', 'Output destination directory')
  .option('-f, --format <type>', 'Target format: webp, avif, jpeg, png, auto', 'webp')
  .option('-q, --quality <number>', 'Compression quality (1-100)', (v) => parseInt(v, 10), 80)
  .option('-l, --lossless', 'Enable lossless compression mode', false)
  .option('-e, --effort <number>', 'Compression CPU effort level (0-6)', (v) => parseInt(v, 10), 4)
  .option('-w, --width <px>', 'Resize to target width', (v) => parseInt(v, 10))
  .option('-h, --height <px>', 'Resize to target height', (v) => parseInt(v, 10))
  .option('-m, --max-size <px>', 'Constrain max width/height preserving ratio', (v) => parseInt(v, 10))
  .option('--fit <mode>', 'Resize fit strategy (inside, cover, contain, fill)', 'inside')
  .option('--in-place', 'Process images in-place (same directory)', false)
  .option('--backup', 'Create .orig backup when replacing files in-place', false)
  .option('--no-recursive', 'Do not search subdirectories recursively')
  .option('--keep-metadata', 'Retain EXIF, GPS, and color profile metadata', false)
  .option('--no-skip-larger', 'Do not skip output if compressed size is larger')
  .option('-d, --dry-run', 'Simulate compression and calculate savings without writing files', false)
  .option('-j, --json', 'Output results in JSON format for automated pipelines', false)
  .option('-s, --silent', 'Suppress table output and spinner', false)
  .option('--web [port]', 'Launch browser Web GUI interface locally');

program.parse(process.argv);

const options = program.opts();
const [targetArg] = program.args;
const target = targetArg || '.';

async function run() {
  if (options.web || target === 'web') {
    const port = typeof options.web === 'string' || typeof options.web === 'number'
      ? parseInt(options.web, 10)
      : 3005;
    await startWebServer({ port });
    return;
  }

  const overallStartTime = Date.now();

  if (options.quality < 1 || options.quality > 100) {
    console.error(chalk.red('✖ Error: Quality must be an integer between 1 and 100.'));
    process.exit(1);
  }

  const spinner = !options.json && !options.silent ? ora() : null;

  try {
    if (spinner) {
      spinner.start(`Scanning ${chalk.cyan(target)} for image assets...`);
    }

    const { baseDir, files } = await discoverImages(target, {
      recursive: options.recursive !== false,
    });

    if (files.length === 0) {
      if (spinner) {
        spinner.warn(chalk.yellow(`No supported image files found in ${target}.`));
      } else if (!options.silent && !options.json) {
        console.log(chalk.yellow(`No supported image files found in ${target}.`));
      }
      if (options.json) {
        console.log(JSON.stringify({ files: [], summary: { totalFiles: 0 } }, null, 2));
      }
      process.exit(0);
    }

    if (spinner) {
      spinner.text = `Found ${chalk.bold(files.length)} images. Compressing with ${chalk.cyan(options.format.toUpperCase())} (Q${options.quality})...`;
    }

    const results = [];
    const compressionOpts = {
      format: options.format,
      quality: options.quality,
      lossless: options.lossless,
      effort: options.effort,
      width: options.width,
      height: options.height,
      maxSize: options.maxSize,
      fit: options.fit,
      stripMetadata: !options.keepMetadata,
      outputDir: options.out ? path.resolve(options.out) : undefined,
      baseDir,
      inPlace: options.inPlace,
      backup: options.backup,
      skipIfLarger: options.skipLarger !== false,
      dryRun: options.dryRun,
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (spinner) {
        spinner.text = `[${i + 1}/${files.length}] Processing ${chalk.white(path.basename(file))}...`;
      }
      const res = await compressImage(file, compressionOpts);
      results.push(res);
    }

    const totalDurationMs = Date.now() - overallStartTime;
    const summary = calculateBatchSummary(results, totalDurationMs);

    if (spinner) {
      if (summary.failed > 0) {
        spinner.warn(chalk.yellow(`Finished with ${summary.failed} errors.`));
      } else {
        spinner.succeed(chalk.green(`Optimization complete for ${chalk.bold(summary.totalFiles)} images.`));
      }
    }

    if (options.json) {
      console.log(JSON.stringify({ options, summary, results }, null, 2));
      process.exit(summary.failed > 0 ? 1 : 0);
    }

    if (!options.silent) {
      console.log(renderTerminalTable(results, baseDir));
      console.log(renderSummaryCard(summary));
    }

    process.exit(summary.failed > 0 ? 1 : 0);
  } catch (err) {
    if (spinner) spinner.fail(chalk.red(`Fatal: ${err.message}`));
    else console.error(chalk.red(`Fatal: ${err.message}`));
    process.exit(1);
  }
}

run();

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { calculateSavings, normalizeFormat, determineOutputPath } from './utils.js';

/**
 * Configure Sharp pipeline for a specific format and options.
 * @param {sharp.Sharp} pipeline
 * @param {string} format
 * @param {object} options
 * @returns {sharp.Sharp}
 */
export function applyFormatSettings(pipeline, format, options = {}) {
  const {
    quality = 80,
    lossless = false,
    effort = 4,
  } = options;

  const target = normalizeFormat(format);

  switch (target) {
    case 'webp':
      return pipeline.webp({
        quality: lossless ? 100 : quality,
        lossless,
        effort: Math.min(Math.max(effort, 0), 6),
        smartSubsample: true,
      });

    case 'avif':
      return pipeline.avif({
        quality: lossless ? 100 : quality,
        lossless,
        effort: Math.min(Math.max(effort, 0), 9),
      });

    case 'jpeg':
    case 'jpg':
      return pipeline.jpeg({
        quality,
        mozjpeg: true,
        progressive: true,
      });

    case 'png':
      return pipeline.png({
        compressionLevel: 9,
        palette: !lossless,
        quality: lossless ? 100 : quality,
        adaptiveFiltering: true,
      });

    case 'tiff':
    case 'tif':
      return pipeline.tiff({
        quality,
        compression: 'deflate',
      });

    case 'gif':
      return pipeline.gif({
        effort: Math.min(Math.max(effort, 1), 10),
      });

    default:
      // Fallback to webp if unrecognized
      return pipeline.webp({ quality, lossless, effort });
  }
}

/**
 * Compress and optionally resize a single image file.
 *
 * @param {string} inputPath - Absolute or relative path to source image
 * @param {object} [options={}] - Compression and transformation options
 * @param {string} [options.format='webp'] - Desired output format ('webp', 'avif', 'jpeg', 'png', 'auto')
 * @param {number} [options.quality=80] - Output quality 1-100
 * @param {boolean} [options.lossless=false] - Lossless compression
 * @param {number} [options.effort=4] - CPU effort (0-6)
 * @param {number} [options.width] - Optional width constraint
 * @param {number} [options.height] - Optional height constraint
 * @param {number} [options.maxSize] - Max bounding box (width/height inside)
 * @param {string} [options.fit='inside'] - Resize fit
 * @param {boolean} [options.withoutEnlargement=true] - Never upscale
 * @param {boolean} [options.stripMetadata=true] - Remove EXIF/GPS tags
 * @param {string} [options.outputDir] - Destination folder
 * @param {string} [options.baseDir] - Scan base directory (for relative nesting)
 * @param {boolean} [options.inPlace=false] - Overwrite or place in same dir
 * @param {boolean} [options.skipIfLarger=true] - Skip writing if output is larger
 * @param {boolean} [options.dryRun=false] - Simulate without writing file
 * @param {boolean} [options.backup=false] - Create .orig backup if overwriting
 * @returns {Promise<object>} Compression result details
 */
export async function compressImage(inputPath, options = {}) {
  const startTime = Date.now();

  try {
    const inputStat = await fs.stat(inputPath);
    const originalBytes = inputStat.size;

    // Read original image metadata
    const instance = sharp(inputPath, { failOnError: false });
    const metadata = await instance.metadata();
    const originalFormat = metadata.format || path.extname(inputPath).slice(1);

    // Determine target format
    let targetFormat = options.format || 'webp';
    if (targetFormat === 'auto') {
      targetFormat = originalFormat;
    }
    targetFormat = normalizeFormat(targetFormat);

    // Determine output destination
    const resolvedOutput = determineOutputPath({
      inputPath,
      inputBaseDir: options.baseDir,
      outputDir: options.outputDir,
      targetFormat,
      inPlace: options.inPlace,
    });

    // Configure pipeline
    let pipeline = sharp(inputPath, { failOnError: false });

    // Handle Metadata
    if (!options.stripMetadata) {
      pipeline = pipeline.withMetadata();
    }

    // Handle Resizing
    const width = options.width || (options.maxSize ? options.maxSize : undefined);
    const height = options.height || (options.maxSize ? options.maxSize : undefined);

    if (width || height) {
      pipeline = pipeline.resize({
        width,
        height,
        fit: options.fit || 'inside',
        withoutEnlargement: options.withoutEnlargement !== false,
      });
    }

    // Apply format-specific encoding
    pipeline = applyFormatSettings(pipeline, targetFormat, options);

    // Process image to buffer to measure output size
    const compressedBuffer = await pipeline.toBuffer();
    const compressedBytes = compressedBuffer.length;
    const { savedBytes, percentSaved } = calculateSavings(originalBytes, compressedBytes);

    // Check if output is larger and user requested skipIfLarger
    const isLarger = compressedBytes >= originalBytes;
    if (isLarger && options.skipIfLarger && targetFormat === originalFormat) {
      return {
        inputPath,
        outputPath: resolvedOutput,
        originalBytes,
        compressedBytes: originalBytes,
        savedBytes: 0,
        percentSaved: 0,
        originalFormat,
        outputFormat: targetFormat,
        skipped: true,
        skipReason: 'Already optimized (compressed was larger)',
        durationMs: Date.now() - startTime,
      };
    }

    // If dry run, return results without writing to disk
    if (options.dryRun) {
      return {
        inputPath,
        outputPath: resolvedOutput,
        originalBytes,
        compressedBytes,
        savedBytes,
        percentSaved,
        originalFormat,
        outputFormat: targetFormat,
        skipped: false,
        isDryRun: true,
        durationMs: Date.now() - startTime,
      };
    }

    // Ensure output directory exists
    const outputDirectory = path.dirname(resolvedOutput);
    await fs.mkdir(outputDirectory, { recursive: true });

    // If backup requested and output will overwrite input
    if (options.backup && path.resolve(inputPath) === path.resolve(resolvedOutput)) {
      const backupPath = `${inputPath}.orig`;
      await fs.copyFile(inputPath, backupPath);
    }

    // Write file to destination
    await fs.writeFile(resolvedOutput, compressedBuffer);

    return {
      inputPath,
      outputPath: resolvedOutput,
      originalBytes,
      compressedBytes,
      savedBytes,
      percentSaved,
      originalFormat,
      outputFormat: targetFormat,
      skipped: false,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      inputPath,
      outputPath: null,
      originalBytes: 0,
      compressedBytes: 0,
      savedBytes: 0,
      percentSaved: 0,
      originalFormat: 'unknown',
      outputFormat: options.format || 'unknown',
      skipped: true,
      error: err.message,
      durationMs: Date.now() - startTime,
    };
  }
}

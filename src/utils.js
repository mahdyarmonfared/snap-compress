import path from 'node:path';

/**
 * Supported image extensions for discovery and processing.
 */
export const SUPPORTED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.tiff',
  '.tif',
  '.gif',
  '.svg',
]);

/**
 * Format bytes into human-readable strings (e.g., 1.45 MB).
 * @param {number} bytes
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);
  const formatted = parseFloat((bytes / Math.pow(k, index)).toFixed(dm));

  return `${formatted} ${sizes[index]}`;
}

/**
 * Check if a file path is a supported image based on its extension.
 * @param {string} filePath
 * @returns {boolean}
 */
export function isImageFile(filePath) {
  if (!filePath) return false;
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

/**
 * Calculate absolute saved bytes and percentage saved.
 * @param {number} originalBytes
 * @param {number} compressedBytes
 * @returns {{ savedBytes: number, percentSaved: number }}
 */
export function calculateSavings(originalBytes, compressedBytes) {
  if (!originalBytes || originalBytes <= 0) {
    return { savedBytes: 0, percentSaved: 0 };
  }
  const savedBytes = originalBytes - compressedBytes;
  const percentSaved = Number(((savedBytes / originalBytes) * 100).toFixed(1));
  return { savedBytes, percentSaved };
}

/**
 * Determine the destination output path for a processed image.
 *
 * @param {object} params
 * @param {string} params.inputPath - Full path to input file
 * @param {string} params.inputBaseDir - Base directory or root of scan
 * @param {string} [params.outputDir] - Destination folder (if any)
 * @param {string} [params.targetFormat='webp'] - Desired extension ('webp', 'avif', 'jpeg', 'png', 'auto')
 * @param {boolean} [params.inPlace=false] - Whether to write in-place
 * @returns {string}
 */
export function determineOutputPath({
  inputPath,
  inputBaseDir,
  outputDir,
  targetFormat = 'webp',
  inPlace = false,
}) {
  const parsed = path.parse(inputPath);
  const originalExt = parsed.ext.toLowerCase();

  let newExt = originalExt;
  if (targetFormat && targetFormat !== 'auto') {
    newExt = targetFormat.startsWith('.') ? targetFormat : `.${targetFormat}`;
    if (newExt === '.jpg') newExt = '.jpeg';
  }

  // In-place mode
  if (inPlace || !outputDir) {
    return path.join(parsed.dir, `${parsed.name}${newExt}`);
  }

  // Output directory specified: preserve relative path if input is inside base directory
  let relDir = '';
  if (inputBaseDir && inputPath.startsWith(inputBaseDir)) {
    const rel = path.relative(inputBaseDir, parsed.dir);
    relDir = rel;
  }

  return path.join(outputDir, relDir, `${parsed.name}${newExt}`);
}

/**
 * Normalize format string to standard sharp format names.
 * @param {string} format
 * @returns {string}
 */
export function normalizeFormat(format) {
  if (!format) return 'webp';
  const clean = format.toLowerCase().replace(/^\./, '');
  if (clean === 'jpg') return 'jpeg';
  return clean;
}

export { compressImage, applyFormatSettings } from './compressor.js';
export { discoverImages, DEFAULT_IGNORED_DIRS } from './scanner.js';
export { calculateBatchSummary, renderTerminalTable, renderSummaryCard } from './reporter.js';
export {
  formatBytes,
  isImageFile,
  calculateSavings,
  determineOutputPath,
  normalizeFormat,
  SUPPORTED_EXTENSIONS,
} from './utils.js';
export { startWebServer } from './server.js';


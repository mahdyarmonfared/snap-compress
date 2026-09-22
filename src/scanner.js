import fs from 'node:fs/promises';
import path from 'node:path';
import { isImageFile } from './utils.js';

/**
 * Directories that should always be ignored during traversal.
 */
export const DEFAULT_IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
]);

/**
 * Scan a file or directory for image assets.
 *
 * @param {string} targetPath - File or folder path
 * @param {object} [options={}]
 * @param {boolean} [options.recursive=true] - Search subfolders
 * @param {string[]} [options.ignoreDirs=[]] - Extra folder names to ignore
 * @returns {Promise<{ baseDir: string, files: string[] }>}
 */
export async function discoverImages(targetPath, options = {}) {
  const {
    recursive = true,
    ignoreDirs = [],
  } = options;

  const resolved = path.resolve(targetPath);
  const stats = await fs.stat(resolved);

  // If single file
  if (stats.isFile()) {
    if (isImageFile(resolved)) {
      return {
        baseDir: path.dirname(resolved),
        files: [resolved],
      };
    }
    return { baseDir: path.dirname(resolved), files: [] };
  }

  // If directory
  const files = [];
  const ignored = new Set([...DEFAULT_IGNORED_DIRS, ...ignoreDirs]);

  async function walk(currentDir) {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!ignored.has(entry.name) && recursive) {
          await walk(fullPath);
        }
      } else if (entry.isFile()) {
        if (isImageFile(entry.name)) {
          files.push(fullPath);
        }
      }
    }
  }

  await walk(resolved);

  // Sort files predictably
  files.sort();

  return {
    baseDir: resolved,
    files,
  };
}

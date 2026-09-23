import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_DIR = path.resolve(__dirname, '../web');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.heif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/**
 * Start the built-in SnapCompress Web UI server.
 * @param {object} [options={}]
 * @param {number} [options.port=3005] - Server listening port
 * @returns {Promise<http.Server>}
 */
export function startWebServer(options = {}) {
  const port = options.port || 3005;

  const server = http.createServer(async (req, res) => {
    try {
      const pathname = req.url.split('?')[0];

      // API Endpoint: GET /api/info
      if (req.method === 'GET' && pathname === '/api/info') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          name: 'snap-compress',
          version: '1.0.0',
          engine: 'Sharp (libvips)',
          port,
          supportedFormats: ['webp', 'avif', 'jpeg', 'png'],
          status: 'online',
        }));
        return;
      }

      // API Endpoint: POST /api/compress
      if (req.method === 'POST' && pathname === '/api/compress') {
        const chunks = [];
        req.on('data', (chunk) => {
          chunks.push(chunk);
        });
        req.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            if (buffer.length === 0) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Empty payload' }));
              return;
            }

            let inputBuffer;
            let format = 'webp';
            let quality = 80;
            let width = null;
            let height = null;
            let maxSize = null;

            const contentType = req.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
              const parsed = JSON.parse(buffer.toString('utf8'));
              inputBuffer = Buffer.from(parsed.imageBase64, 'base64');
              format = parsed.format || 'webp';
              quality = parseInt(parsed.quality, 10) || 80;
              width = parsed.width ? parseInt(parsed.width, 10) : null;
              height = parsed.height ? parseInt(parsed.height, 10) : null;
              maxSize = parsed.maxSize ? parseInt(parsed.maxSize, 10) : null;
            } else {
              inputBuffer = buffer;
              const searchParams = new URL(req.url, `http://localhost:${port}`).searchParams;
              if (searchParams.get('format')) format = searchParams.get('format');
              if (searchParams.get('quality')) quality = parseInt(searchParams.get('quality'), 10) || 80;
              if (searchParams.get('width')) width = parseInt(searchParams.get('width'), 10);
              if (searchParams.get('height')) height = parseInt(searchParams.get('height'), 10);
              if (searchParams.get('maxSize')) maxSize = parseInt(searchParams.get('maxSize'), 10);
            }

            let pipeline = sharp(inputBuffer);
            if (width || height) {
              pipeline = pipeline.resize(width || null, height || null, { fit: 'inside', withoutEnlargement: true });
            } else if (maxSize) {
              pipeline = pipeline.resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true });
            }

            if (format === 'avif') {
              pipeline = pipeline.avif({ quality });
            } else if (format === 'jpeg' || format === 'jpg') {
              pipeline = pipeline.jpeg({ quality, mozjpeg: true });
            } else if (format === 'png') {
              pipeline = pipeline.png({ quality });
            } else {
              pipeline = pipeline.webp({ quality });
            }

            const outputBuffer = await pipeline.toBuffer();
            const metadata = await sharp(outputBuffer).metadata();

            const actualFormat = (metadata.format === 'heif' || format === 'avif') ? 'avif' : (metadata.format || format);

            if (contentType.includes('application/json')) {
              const originalBytes = inputBuffer.length;
              const compressedBytes = outputBuffer.length;
              const savedBytes = Math.max(0, originalBytes - compressedBytes);
              const percentSaved = originalBytes > 0 ? Number(((savedBytes / originalBytes) * 100).toFixed(1)) : 0;

              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({
                originalBytes,
                compressedBytes,
                savedBytes,
                percentSaved,
                format: actualFormat,
                width: metadata.width,
                height: metadata.height,
                imageBase64: outputBuffer.toString('base64'),
              }));
            } else {
              const outMime = actualFormat === 'avif' ? 'image/avif' : (MIME_TYPES[`.${actualFormat}`] || MIME_TYPES[`.${metadata.format}`] || 'application/octet-stream');
              res.writeHead(200, {
                'Content-Type': outMime,
                'Content-Length': outputBuffer.length,
                'X-Original-Bytes': String(inputBuffer.length),
                'X-Compressed-Bytes': String(outputBuffer.length),
                'X-Width': String(metadata.width || 0),
                'X-Height': String(metadata.height || 0),
                'X-Format': String(actualFormat),
                'Access-Control-Expose-Headers': 'X-Original-Bytes, X-Compressed-Bytes, X-Width, X-Height, X-Format',
              });
              res.end(outputBuffer);
            }
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // Static file serving
      const urlPath = (pathname === '/' || pathname === '') ? '/index.html' : pathname;
      const filePath = path.join(WEB_DIR, urlPath);

      // Security check: prevent directory traversal
      if (!filePath.startsWith(WEB_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
      }

      const fileContent = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(fileContent);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log('');
      console.log(chalk.cyan.bold('⚡ SnapCompress Web UI is live!'));
      console.log(`  🌐 Local:   ${chalk.green.bold(`http://localhost:${port}`)}`);
      console.log(`  🔒 Mode:    ${chalk.white('100% Client-Side / Zero-Upload')}`);
      console.log(`  🛑 Stop:    ${chalk.gray('Press Ctrl+C to shutdown')}`);
      console.log('');
      resolve(server);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(chalk.yellow(`Port ${port} in use, trying ${port + 1}...`));
        resolve(startWebServer({ ...options, port: port + 1 }));
      } else {
        reject(err);
      }
    });
  });
}

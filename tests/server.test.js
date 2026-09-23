import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { startWebServer } from '../src/server.js';

test('startWebServer serves web UI on specified port', async () => {
  const testPort = 3899;
  const server = await startWebServer({ port: testPort });

  try {
    const res = await fetch(`http://localhost:${testPort}/`);
    assert.equal(res.status, 200);

    const contentType = res.headers.get('content-type');
    assert.ok(contentType.includes('text/html'));

    const html = await res.text();
    assert.ok(html.includes('SnapCompress'));
    assert.ok(html.includes('Output Format'));

    // Check style.css
    const cssRes = await fetch(`http://localhost:${testPort}/style.css`);
    assert.equal(cssRes.status, 200);

    // Check GET /api/info
    const infoRes = await fetch(`http://localhost:${testPort}/api/info`);
    assert.equal(infoRes.status, 200);
    const info = await infoRes.json();
    assert.equal(info.name, 'snap-compress');
    assert.equal(info.status, 'online');
    assert.ok(info.supportedFormats.includes('webp'));
    assert.ok(info.supportedFormats.includes('avif'));

    // Check POST /api/compress (JSON Base64 mode)
    const testPng = await sharp({
      create: {
        width: 120,
        height: 80,
        channels: 3,
        background: { r: 56, g: 189, b: 248 },
      },
    }).png().toBuffer();

    const compressRes = await fetch(`http://localhost:${testPort}/api/compress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: testPng.toString('base64'),
        format: 'webp',
        quality: 75,
      }),
    });
    assert.equal(compressRes.status, 200);
    const compressData = await compressRes.json();
    assert.equal(compressData.format, 'webp');
    assert.equal(compressData.width, 120);
    assert.equal(compressData.height, 80);
    assert.ok(compressData.compressedBytes > 0);
    assert.ok(compressData.imageBase64.length > 0);

    // Check 404
    const notFoundRes = await fetch(`http://localhost:${testPort}/non-existent-file.xyz`);
    assert.equal(notFoundRes.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

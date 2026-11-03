import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyLayerSizes } from './layer-size-writer.mjs';
import { applyInfoEmbed } from './info-embed-writer.mjs';
import { applyInfoArticle } from './info-article-writer.mjs';

const dataRepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../inter-geo-data');
const port = 8091;

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1048576) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer((req, res) => {
  const cleanPath = (req.url || '').split('?')[0].replace(/\/+$/, '');
  const isSize = cleanPath.endsWith('/layer-size');
  const isEmbed = cleanPath.endsWith('/info-embed');
  const isArticle = cleanPath.endsWith('/info-article');

  if (req.method === 'OPTIONS' && (isSize || isEmbed || isArticle)) {
    sendJson(res, 204, {});
    return;
  }
  if (req.method !== 'POST' || (!isSize && !isEmbed && !isArticle)) {
    sendJson(res, 404, { ok: false, error: 'not found' });
    return;
  }
  void readBody(req)
    .then((raw) => {
      const payload = raw ? JSON.parse(raw) : {};
      const result = isArticle
        ? applyInfoArticle(dataRepo, payload)
        : isEmbed
          ? applyInfoEmbed(dataRepo, payload)
          : applyLayerSizes(dataRepo, payload);
      sendJson(res, 200, result);
    })
    .catch((err) => {
      sendJson(res, 400, {
        ok: false,
        error: err instanceof Error ? err.message : 'failed',
        written: Boolean(err && err.written)
      });
    });
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.log(`[layer-size] already listening on 127.0.0.1:${port}`);
    process.exit(0);
  }
  console.error('[layer-size] failed to start', err);
  process.exit(1);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[layer-size] listening on 127.0.0.1:${port}`);
});

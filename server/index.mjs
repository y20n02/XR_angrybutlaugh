// Separate trusted runtime. Never bundle this file or its environment into Vite.
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { evaluate, getContext } from './evaluator.mjs';

export function createEvaluationServer(config = process.env, judge = evaluate) {
  const rates = new Map();
  return createServer(async (req, res) => {
    const origin = req.headers.origin;
    const allowed = (config.EVALUATION_ORIGINS || 'http://localhost:5173').split(',');
    if (origin && !allowed.includes(origin)) { res.writeHead(403).end(); return; }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Cache-Control', 'no-store');
    if (req.url !== '/api/evaluate') { res.writeHead(404).end(); return; }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'POST');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.writeHead(204).end(); return;
    }
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    const now = Date.now(), ip = req.socket.remoteAddress;
    for (const [key, entry] of rates) if (now - entry.start > 60000) rates.delete(key);
    const rate = rates.get(ip) ?? { start: now, count: 0 };
    rate.count++; rates.set(ip, rate);
    if (rate.count > 20) { res.writeHead(429).end(); return; }
    let raw = '';
    try {
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 4096) { res.writeHead(413).end(); return; }
      }
      let context;
      try { context = getContext(JSON.parse(raw)); } catch { res.writeHead(400).end(); return; }
      const verdict = await judge(context, config);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(verdict));
    } catch {
      // Provider errors may contain secrets. Return neither errors nor raw model output.
      res.writeHead(503, { 'Content-Type': 'application/json' }).end('{"error":"evaluation_unavailable"}');
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createEvaluationServer().listen(Number(process.env.EVALUATION_PORT || 8787), '127.0.0.1');
}

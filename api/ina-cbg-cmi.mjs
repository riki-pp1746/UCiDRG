import {calculateInaCbgTotals} from '../server/inaCbgTotals.mjs';

export default async function handler(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow','POST');
    res.statusCode = 405;
    return res.end(JSON.stringify({error:'Gunakan POST.'}));
  }
  if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') {
    res.statusCode = 403;
    return res.end(JSON.stringify({error:'Permintaan lintas situs ditolak.'}));
  }
  try {
    let body = req.body;
    if (body === undefined) {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 512_000) throw new Error('Body too large');
      }
      body = raw;
    }
    if (typeof body === 'string') body = JSON.parse(body);
    res.end(JSON.stringify({totals:calculateInaCbgTotals(body?.cohorts)}));
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({error:'Data agregat INA-CBG tidak valid.'}));
  }
}

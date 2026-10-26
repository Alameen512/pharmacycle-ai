const { z } = require('zod');
const config = require('../config');
const HttpError = require('../utils/httpError');

const isConfigured = () => Boolean(config.gemini.apiKey);

const fieldsSchema = z.object({
  name: z.string().nullable().optional(),
  strength: z.string().nullable().optional(),
  dosageForm: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  batchNumber: z.string().nullable().optional(),
  nafdacRegNo: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
});

const PROMPT =
  'Read this medicine package label. Return ONLY a JSON object with keys: name, strength (e.g. "500mg"), ' +
  'dosageForm (Tablet, Capsule, Syrup, Suspension, Injection, Cream, Ointment, Drops, Inhaler or Other), ' +
  'category (e.g. Antibiotic, Analgesic, Antimalarial), batchNumber, nafdacRegNo (the NAFDAC registration number if printed), ' +
  'expiryDate as YYYY-MM-DD (use the last day of the month if only month/year is printed). ' +
  'Use null for anything you cannot read. Do not guess.';

async function extractLabel({ image, mimeType }) {
  if (!isConfigured()) throw new HttpError(503, 'Server OCR is not configured (GEMINI_API_KEY missing).', 'OCR_NOT_CONFIGURED');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.gemini.model)}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.gemini.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: image } }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    });
  } catch (e) {
    throw new HttpError(e.name === 'AbortError' ? 504 : 502, 'Server OCR did not respond.', 'OCR_UNAVAILABLE');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new HttpError(502, `Server OCR returned an error (${res.status}).`, 'OCR_PROVIDER_ERROR');
  const data = await res.json();
  try {
    const text = data.candidates[0].content.parts[0].text;
    return fieldsSchema.parse(JSON.parse(text));
  } catch {
    throw new HttpError(502, 'Server OCR returned an unreadable result.', 'OCR_BAD_OUTPUT');
  }
}

module.exports = { isConfigured, extractLabel };

// Single adapter for the LLM provider (Groq, OpenAI-compatible). Swap providers here only.
const { z } = require('zod');
const config = require('../config');
const HttpError = require('../utils/httpError');

const isConfigured = () => Boolean(config.groq.apiKey);

const outputSchema = z.object({
  summary: z.string().min(1).max(1200),
  recommendations: z
    .array(
      z.object({
        medicine: z.string().min(1).max(160),
        action: z.string().min(1).max(300),
        reason: z.string().min(1).max(500),
        priority: z.enum(['high', 'medium', 'low']),
      })
    )
    .max(15),
});

async function generateJson({ system, user }) {
  if (!isConfigured()) throw new HttpError(503, 'AI insights are not configured on this server (GROQ_API_KEY missing).', 'AI_NOT_CONFIGURED');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  let res;
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groq.apiKey}` },
      body: JSON.stringify({
        model: config.groq.model,
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new HttpError(504, 'The AI provider took too long to respond. Try again.', 'AI_TIMEOUT');
    throw new HttpError(502, 'Could not reach the AI provider.', 'AI_UNREACHABLE');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429) throw new HttpError(429, 'The AI provider is rate-limiting requests. Wait a minute and retry.', 'AI_RATE_LIMITED');
  if (!res.ok) throw new HttpError(502, `The AI provider returned an error (${res.status}).`, 'AI_PROVIDER_ERROR');

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  let parsed;
  try {
    parsed = outputSchema.parse(JSON.parse(text));
  } catch {
    throw new HttpError(502, 'The AI returned an unusable answer. Try generating again.', 'AI_BAD_OUTPUT');
  }
  return { ...parsed, model: config.groq.model };
}

const SYSTEM_BASE =
  'You are an inventory analyst for a Nigerian community pharmacy. Use ONLY the data supplied. ' +
  'Give stock, expiry and purchasing guidance only. Never give diagnoses, treatment or patient-specific medical advice. ' +
  'Prices are in Nigerian naira. Respond with a single JSON object: ' +
  '{"summary": string, "recommendations": [{"medicine": string, "action": string, "reason": string, "priority": "high"|"medium"|"low"}]}. ' +
  'If the data does not support a recommendation, say so in the summary instead of guessing.';

module.exports = { isConfigured, generateJson, SYSTEM_BASE };

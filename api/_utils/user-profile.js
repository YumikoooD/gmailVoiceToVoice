/****************************************************************
 * Generate a behavioural profile from a set of sent e-mails.   *
 * Uses OpenAI GPT-4o for all heavy lifting and falls back to   *
 * lightweight heuristics only if every LLM call fails.         *
 ****************************************************************/

import fetch from 'node-fetch';

/* ------------------------------------------------------------- */
/* --------------  1.  Chunking & Sanitisation  ---------------- */
/* ------------------------------------------------------------- */

/** A very small HTML → text remover. */
function stripHtml(str = '') {
  return str.replace(/<[^>]+>/g, ' ');
}

/** Build ~4-5 KB ASCII chunks for the LLM. */
function chunkEmails(emails, maxChars = 4500, maxChunks = 5) {
  const chunks = [];
  let current = '';

  for (const email of emails) {
    const block = [
      `Subject: ${stripHtml(email.subject || '').slice(0, 200)}`,
      `From: ${email.from || ''}`,
      `To: ${Array.isArray(email.to) ? email.to.join(', ') : email.to || ''}`,
      'Body:',
      stripHtml(email.body || '').slice(0, 4000), // guard very long mails
      '---'
    ].join('\n');

    if (current.length + block.length > maxChars && current.length) {
      chunks.push(current);
      if (chunks.length === maxChunks) break;
      current = block;
    } else {
      current += block;
    }
  }
  if (current && chunks.length < maxChunks) chunks.push(current);
  return chunks;
}

/* ------------------------------------------------------------- */
/* --------------  2.  OpenAI helper (JSON only)  -------------- */
/* ------------------------------------------------------------- */

async function callOpenAI(messages, {
  model = 'gpt-4o-mini',
  temperature = 0.2
} = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method : 'POST',
    headers: {
      'Content-Type' : 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, temperature, messages })
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status} ${await response.text()}`);
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in OpenAI response');

  // Extract first {...} looking JSON object
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('JSON not found in LLM reply');

  return JSON.parse(match[0]);
}

/* ------------------------------------------------------------- */
/* --------------  3.  LLM-driven profile building  ------------ */
/* ------------------------------------------------------------- */

/** Request the LLM to create a profile for ONE chunk. */
async function analyseChunk(chunkText) {
  const system = `You are an AI that extracts user behavioural profiles ONLY in JSON.
Respond with strict JSON and nothing else.`;
  const user   = `Using the e-mails below, build a partial profile with these fields:
{
  name, profession, email, tone, signature,
  frequentContacts, coworkers, typicalAvailability,
  hobbies, commonEmailIntents, contacts,
  averageSentenceLength, frequentPhrases
}
E-mails:
${chunkText}`;

  return await callOpenAI([
    { role: 'system', content: system },
    { role: 'user',   content: user   }
  ]);
}

/** Ask the LLM to merge N partial profiles into one. */
async function aggregateProfiles(partials) {
  const system = `You are an AI that merges multiple partial user profiles into a single JSON profile.`;
  const user   = `Merge the following JSON snippets into ONE complete profile. 
Return JSON only, same schema.

${partials.map((p, i) => `### Profile ${i + 1}\n${JSON.stringify(p)}`).join('\n\n')}
`;

  return await callOpenAI([
    { role: 'system', content: system },
    { role: 'user',   content: user   }
  ]);
}

/* ------------------------------------------------------------- */
/* --------------  4.  Heuristic fallback helpers -------------- */
/* ------------------------------------------------------------- */

function detectTone(samples = []) {
  const formal    = ['regards', 'sincerely'];
  const friendly  = ['hey', 'hi', 'thanks', '!'];
  let f = 0, fr = 0;
  samples.forEach(t => {
    if (formal.some(w => t.toLowerCase().includes(w))) f += 1;
    if (friendly.some(w => t.toLowerCase().includes(w))) fr += 1;
  });
  if (f > fr)  return 'formal';
  if (fr > f)  return 'friendly and casual';
  return 'neutral';
}

function extractSignature(text = '') {
  const m = text.match(/(?:\n|^)(best|thanks|regards)[\s,–-]*\n([\s\S]{0,200})$/i);
  return m ? text.slice(m.index).trim() : '';
}

function avgSentenceLen(texts) {
  let words = 0, sents = 0;
  texts.forEach(t => {
    const ss = t.split(/(?<=[.!?])\s+/);
    sents += ss.length;
    ss.forEach(s => words += s.split(/\s+/).filter(Boolean).length);
  });
  return sents ? +(words / sents).toFixed(1) : 0;
}

/* ------------------------------------------------------------- */
/* ----------------  5.  PUBLIC API FUNCTION  ------------------ */
/* ------------------------------------------------------------- */

/**
 * Build a user profile from sent e-mails.
 * @param {Array<{subject:string, body:string, to:string|string[], from:string}>} emails
 * @return {Promise<{userProfile:object}>}
 */
export async function generateUserProfile(emails = []) {
  if (!emails.length) return { userProfile: {} };

  /* ----------  LLM multi-chunk pipeline  ---------- */
  try {
    const chunks   = chunkEmails(emails.slice(-1000));        // newest first
    const partials = [];

    // analyse first 3-5 chunks (depending on availability)
    for (const chunk of chunks.slice(0, 5)) {
      partials.push(await analyseChunk(chunk));
    }

    // aggregate
    const finalProfile = await aggregateProfiles(partials);
    return { userProfile: finalProfile };
  } catch (err) {
    console.error('LLM profile generation failed – fallback heuristics', err);
  }

  /* ----------  Heuristic emergency fallback  ---------- */
  const sampleBodies = emails.slice(-10).map(e => e.body || '');

  return {
    userProfile: {
      tone: detectTone(sampleBodies),
      signature: extractSignature(sampleBodies.find(b => b.trim()) || ''),
      averageSentenceLength: avgSentenceLen(sampleBodies)
    }
  };
} 
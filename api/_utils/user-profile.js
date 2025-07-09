// Utility to generate a behavioral profile from a list of sent emails
// Expected email object shape: {
//   to: string | string[],
//   subject: string,
//   body: string,
//   date?: string
// }
// All methods are heuristic-based and use no external dependencies so the
// function can run in a serverless environment.

// Extract a signature block (e.g. "Best,\nMikael") from the tail of the email
function extractSignature(text = "") {
  const match = text.match(/(?:\n|^)(best|thanks|cheers|regards)[\s,–-]*\n([\s\S]{0,200})$/i);
  if (!match) return "";
  return text.slice(match.index).trim();
}

// Very lightweight tone detection based on presence of common markers
function detectTone(samples = []) {
  const formalMarkers = ["Dear", "Regards", "Sincerely"];
  const friendlyMarkers = ["Hey", "Hi", "Thanks", "!"];

  let formal = 0;
  let friendly = 0;

  samples.forEach(t => {
    if (formalMarkers.some(m => t.includes(m))) formal += 1;
    if (friendlyMarkers.some(m => t.includes(m))) friendly += 1;
  });

  if (formal > friendly) return "formal";
  if (friendly > formal) return "friendly and casual";
  return "neutral";
}

// Classify an individual email into a high-level intent bucket
function classifyIntent(email) {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  if (/meet|call|schedule|availability/.test(text)) return "schedule a meeting";
  if (/follow up|just checking|ping/.test(text)) return "follow up";
  if (/attached|here is|share|link|document/.test(text)) return "share a document";
  if (/answer|respond|response|re:/.test(text)) return "respond to a question";
  if (/status|progress|update|checking in/.test(text)) return "check in / status update";
  return "other";
}

// Find human-readable availability patterns (e.g. "Thursday morning")
function findAvailabilitySpans(text) {
  const slots = [];
  const regex = /\b(?:mon|tues|wednes|thurs|fri|satur|sun)(?:day)?(?:\s+(?:mornings?|afternoons?|evenings?|\d{1,2}(?::\d{2})?\s*(?:am|pm)))?/gi;
  let match;
  while ((match = regex.exec(text))) {
    slots.push(match[0]);
  }
  return slots;
}

// Compute average sentence length in words
function calcAverageSentenceLength(texts = []) {
  let totalWords = 0;
  let totalSentences = 0;
  texts.forEach(t => {
    const sentences = t.split(/(?<=[.!?])\s+/);
    totalSentences += sentences.length;
    sentences.forEach(s => {
      totalWords += s.split(/\s+/).filter(Boolean).length;
    });
  });
  if (!totalSentences) return 0;
  return +(totalWords / totalSentences).toFixed(1);
}

// Extract top-N bigrams (two-word phrases)
function topBigrams(texts = [], limit = 3) {
  const counts = {};
  texts.forEach(t => {
    const words = t.toLowerCase().replace(/[^a-z0-9\s']/g, '').split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = words[i] + ' ' + words[i + 1];
      counts[bigram] = (counts[bigram] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .sort((a,b) => b[1]-a[1])
    .slice(0, limit)
    .map(([bg]) => bg);
}

// === LLM integration helpers ===
/**
 * Chunk emails into digestible pieces for the language model.
 * Currently concatenates the last N emails (subject + body) into ~4-5 KB chunks.
 * In the future we might switch to a token-aware splitter.
 */
function chunkEmails(emails, maxChars = 4500) {
  const chunks = [];
  let current = "";
  for (const email of emails) {
    const block = `Subject: ${email.subject || ''}\nBody: ${email.body || ''}\n---\n`;
    if (current.length + block.length > maxChars && current.length > 0) {
      chunks.push(current);
      current = block;
    } else {
      current += block;
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

import fetch from 'node-fetch';

/**
 * Call the LLM to analyse the user's emails and return a structured profile.
 * NOTE: This is a stub – plug in your preferred LLM provider here.
 * The function MUST be synchronous / promise-based and dependency-free so it
 * can run in a serverless function. Replace the body with your fetch() call.
 */
async function analyzeEmailsWithLLM(emailChunks) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set – skipping LLM profile generation");
    return null;
  }

  // Compose a single prompt containing the most recent chunk (keeps token cost low)
  const latestChunk = emailChunks[0];

  const systemPrompt = `You are an expert assistant that analyses a user's sent e-mails in order to build a behavioural profile.\n\nGiven a set of e-mail samples, extract the following fields as JSON (no commentary):\n{\n  name: string | "",\n  profession: string | "",\n  email: string | "",\n  tone: "formal" | "friendly and casual" | "neutral" | string,\n  signature: string | "",\n  frequentContacts: string[] (max 5),\n  coworkers: string[] (max 5),\n  typicalAvailability: string[] (phrases that describe when the user is usually available, max 5),\n  hobbies: string[] (max 5),\n  commonEmailIntents: string[] (max 5),\n  contacts: Array<{name: string, email: string}>,\n  averageSentenceLength: number,\n  frequentPhrases: string[] (max 3)\n}`;

  const userPrompt = `Here are sample emails separated by \"---\". Analyse and return the JSON profile described above.\n\n${latestChunk}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`OpenAI API error: ${response.status} – ${errTxt}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Expect the model to return pure JSON – attempt to parse first JSON object found
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const profile = JSON.parse(jsonMatch[0]);
    return profile;
  } catch (err) {
    console.error('LLM profile extraction failed:', err);
    return null;
  }
}

// Keep export name but change implementation
export async function generateUserProfile(emails = []) {
  // Empty input → empty profile
  if (!Array.isArray(emails) || emails.length === 0) {
    return { userProfile: {} };
  }

  /* -------------------------------------------------------------
   * 1. Prepare data & attempt LLM analysis
   * ----------------------------------------------------------- */
  const chunks = chunkEmails(emails.slice(-1000)); // last 1000 emails max
  let llmProfile = null;
  try {
    llmProfile = await analyzeEmailsWithLLM(chunks);
  } catch (err) {
    console.error("LLM analysis failed – falling back to heuristics", err);
  }

  // If we got a profile back, return it (ensure shape)
  if (llmProfile && typeof llmProfile === "object") {
    return { userProfile: llmProfile };
  }

  /* -------------------------------------------------------------
   * 2. Heuristic fallback – use existing lightweight detectors
   * ----------------------------------------------------------- */
  // Re-use previous heuristic logic that existed in this file
  // (detectTone, extractSignature, etc.)

  // 1. Tone and signature analysis using the last 10 emails (or fewer)
  const sampleBodies = emails.slice(-10).map(e => e.body || "");
  const tone = detectTone(sampleBodies);
  const signature = extractSignature(sampleBodies.reverse().find(b => b.trim()) || "");

  // 2. Frequent contacts (top 5)
  const contactCounts = {};
  emails.forEach(e => {
    const recipients = Array.isArray(e.to) ? e.to : [e.to];
    recipients.forEach(addr => {
      if (!addr) return;
      contactCounts[addr] = (contactCounts[addr] || 0) + 1;
    });
  });
  const frequentContacts = Object.entries(contactCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([addr]) => addr);

  // 3. Writing style stats
  const averageSentenceLength = calcAverageSentenceLength(sampleBodies);
  const frequentPhrases = topBigrams(sampleBodies, 3);

  return {
    userProfile: {
      tone,
      signature,
      frequentContacts,
      averageSentenceLength,
      frequentPhrases
    }
  };
} 
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

export function generateUserProfile(emails = []) {
  if (!Array.isArray(emails) || emails.length === 0) {
    return {
      userProfile: {
        name: "",
        tone: "",
        signature: "",
        frequentContacts: [],
        typicalAvailability: [],
        commonEmailIntents: []
      }
    };
  }

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

  // 3. Common email intents (ranked)
  const intentCounts = {};
  emails.forEach(e => {
    const intent = classifyIntent(e);
    intentCounts[intent] = (intentCounts[intent] || 0) + 1;
  });
  const commonEmailIntents = Object.entries(intentCounts)
    .filter(([intent]) => intent !== "other")
    .sort((a, b) => b[1] - a[1])
    .map(([intent]) => intent);

  // 4. Scheduling habits / availability
  const availabilityCounts = {};
  emails.forEach(e => {
    findAvailabilitySpans(`${e.subject} ${e.body}`).forEach(span => {
      const s = span.trim();
      availabilityCounts[s] = (availabilityCounts[s] || 0) + 1;
    });
  });
  const typicalAvailability = Object.entries(availabilityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slot]) => slot);

  // Attempt to infer the sender's name
  let name = "";
  // 1) From signature lines (e.g., "Best,\nMikael Sourati")
  const nameMatch = signature.match(/\n?([A-Z][a-z]+(?: [A-Z][a-z]+)+)/);
  if (nameMatch) {
    name = nameMatch[1].trim();
  } else {
    // 2) Fallback: most common display name from "from" headers of sent emails
    const fromNamesCount = {};
    emails.forEach(e => {
      if (!e.from) return;
      const displayMatch = e.from.match(/^\"?([^<\"]+)\"?\s*</) || e.from.match(/^([^<]+)\s*</);
      if (displayMatch) {
        const displayName = displayMatch[1].trim();
        if (displayName && displayName.includes(' ')) {
          fromNamesCount[displayName] = (fromNamesCount[displayName] || 0) + 1;
        }
      }
    });
    if (Object.keys(fromNamesCount).length) {
      name = Object.entries(fromNamesCount).sort((a,b) => b[1]-a[1])[0][0];
    }
  }

  /* -------- Profession / Job Title detection -------- */
  let profession = "";
  const jobTitleRegex = /(CEO|CTO|COO|CFO|Chief [A-Za-z ]+|Vice President|VP [A-Za-z ]+|Software Engineer|Engineer|Developer|Product Manager|Marketing Manager|Sales Manager|Data Scientist|Designer|Founder|Co[- ]Founder|Consultant|Analyst|Director|Lead [A-Za-z ]+|Principal [A-Za-z ]+)/i;
  const searchLines = [];
  if (signature) searchLines.push(...signature.split(/\n|\r/).map(l=>l.trim()));
  // Also scan first 2 lines of each email body for titles like email footers might appear at top in replies
  emails.slice(-10).forEach(e => {
    const firstLines = (e.body || '').split(/\n|\r/).slice(0,3);
    searchLines.push(...firstLines.map(l=>l.trim()))
  });
  const titleLine = searchLines.find(l => jobTitleRegex.test(l));
  if (titleLine) profession = titleLine.match(jobTitleRegex)[0];

  /* -------- Coworker detection -------- */
  let coworkers = [];
  try {
    // Infer user's primary email domain from first "from" field that looks like an email
    const fromEmail = emails.map(e => e.from).find(f => /@/.test(f)) || "";
    const domainMatch = fromEmail.match(/@([A-Za-z0-9.-]+)/);
    if (domainMatch) {
      const domain = domainMatch[1].toLowerCase();
      coworkers = frequentContacts.filter(c => c.toLowerCase().includes(`@${domain}`));
    }
  } catch {}

  /* -------- Hobby detection (very heuristic) -------- */
  const hobbyKeywords = [
    "football","soccer","basketball","tennis","golf","running","cycling","hiking","climbing",
    "cooking","baking","travel","photography","reading","books","music","guitar","piano",
    "gaming","video games","board games","movies","films","art","painting","yoga","gym"
  ];
  const hobbyCounts = {};
  emails.forEach(e => {
    const text = `${e.subject} ${e.body}`.toLowerCase();
    hobbyKeywords.forEach(h => {
      if (text.includes(h)) {
        hobbyCounts[h] = (hobbyCounts[h] || 0) + 1;
      }
    });
  });
  const hobbies = Object.entries(hobbyCounts)
    .sort((a,b) => b[1]-a[1])
    .slice(0,5)
    .map(([h]) => h);

  /* -------- Primary email address -------- */
  let primaryEmail = "";
  const emailCounts = {};
  emails.forEach(e => {
    if (!e.from) return;
    const emailMatch = e.from.match(/<([^>]+)>/) || e.from.match(/([^\s]+@[^\s]+)/);
    if (emailMatch) {
      const em = emailMatch[1] || emailMatch[0];
      emailCounts[em] = (emailCounts[em] || 0) + 1;
    }
  });
  if (Object.keys(emailCounts).length) {
    primaryEmail = Object.entries(emailCounts).sort((a,b)=>b[1]-a[1])[0][0];
  }

  /* -------- Detailed contacts (name ↔ email) -------- */
  const contactsMap = {};
  emails.forEach(e => {
    const recipients = Array.isArray(e.to) ? e.to : [e.to];
    recipients.forEach(r => {
      if (!r) return;
      // Extract display name and email address
      const nameMatch = r.match(/^"?([^<"]+)"?\s*</);
      const emailMatch = r.match(/<([^>]+)>/) || r.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+)/);
      const address = emailMatch ? emailMatch[1] || emailMatch[0] : null;
      const displayName = nameMatch ? nameMatch[1].trim() : null;
      if (address) {
        const key = (displayName || address).toLowerCase();
        if (!contactsMap[key]) {
          contactsMap[key] = address;
        }
      }
    });
  });

  const contacts = Object.entries(contactsMap).map(([nameKey, email]) => ({
    name: nameKey,
    email
  }));

  return {
    userProfile: {
      name,
      profession,
      email: primaryEmail,
      tone,
      signature,
      frequentContacts,
      coworkers,
      typicalAvailability,
      hobbies,
      commonEmailIntents,
      contacts // detailed mapping
    }
  };
} 
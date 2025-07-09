import fs from 'fs/promises';
import path from 'path';

const ADRIEN = 'adrien@pipelinehq.com';
const OUT_DIR = path.resolve('./data');
const TOTAL = 500;
const CHUNK = 25;

// Simple deterministic helpers
const companies = [
  'Acme', 'Globex', 'Umbrella', 'Initech', 'Soylent', 'StarkIndustries', 'WayneEnterprises', 'Hooli', 'MassiveDynamic', 'Wonka',
];
const vcDomains = [
  'sequoiacap.com', 'a16z.com', 'firstround.com', 'benchmark.com', 'indexventures.com', 'accel.com', 'lightspeedvp.com', 'craft.vc', 'openviewpartners.com', 'iconiq.com',
];
const firstNames = ['Sarah', 'Josh', 'Laura', 'Liam', 'Lucas', 'Maria', 'Eddie', 'Allison', 'Harish', 'Lucy'];
const roles = ['RevOps Director', 'CRO', 'VP Sales', 'Staff Engineer', 'Product Designer'];

function pad(num, size = 2) {
  return String(num).padStart(size, '0');
}

function buildEmail(i) {
  const date = new Date(Date.UTC(2024, 3, 1)); // April 1st base
  date.setUTCDate(date.getUTCDate() + Math.floor(i / 5)); // spread ~100 days

  // Round-robin category
  const category = i % 5; // 0 lead, 1 VC, 2 hire, 3 team, 4 board

  if (category === 0) {
    const company = companies[i % companies.length];
    const domain = `${company.toLowerCase()}.com`;
    return {
      from: ADRIEN,
      to: [`${firstNames[i%firstNames.length].toLowerCase()}@${domain}`],
      subject: `PipelineHQ demo follow-up – next steps for ${company}`,
      body: `Hi ${firstNames[i%firstNames.length]},\n\nThanks for the lively discussion about pipeline hygiene at ${company}. Attaching a custom ROI model based on the 1,200 opportunities / month you mentioned.\n\nNext steps:\n• Field mapping workshop – ${company} RevOps + PipelineHQ CSM (45 min)\n• 14-day trial workspace provisioned upon signed DPA\n\nLet me know which slots next week work best.\n\nBest,\nAdrien`,
      date: date.toISOString(),
    };
  }

  if (category === 1) {
    const dom = vcDomains[i % vcDomains.length];
    return {
      from: ADRIEN,
      to: [`partner@${dom}`],
      subject: `PipelineHQ Seed progress – ${Math.floor(60 + (i%20))}k MRR & AI Coach GA`,
      body: `Hi there,\n\nQuick update as we prep for Series A: MRR just crossed $${Math.floor(60 + (i%20))}k (+${20 + (i%10)}% MoM) and AI Coach is now GA (3,800 weekly active deals nudged).\n\nAttaching the latest metrics deck – happy to dive deeper if this aligns with your enterprise SaaS thesis.\n\nCheers,\nAdrien`,
      date: date.toISOString(),
    };
  }

  if (category === 2) {
    const role = roles[i % roles.length];
    const name = firstNames[(i+3)%firstNames.length];
    return {
      from: ADRIEN,
      to: [`${name.toLowerCase()}@gmail.com`],
      subject: `PipelineHQ – ${role} opportunity & culture primer`,
      body: `Hi ${name},\n\nLoved your open-source work on revenue dashboards. We’re building the AI copilot for every AE and need a ${role} who can own zero-to-one experiences.\n\nCulture TL;DR: async-first, small senior team (10 ppl), customer-obsessed.\n\nIf that sparks joy, let’s schedule a 25-min founder chat.\n\nBest,\nAdrien`,
      date: date.toISOString(),
    };
  }

  if (category === 3) {
    return {
      from: ADRIEN,
      to: ['team@pipelinehq.com'],
      subject: `Weekly update #${pad(i/5)}`,
      body: `Team,\n\nWins:\n• Closed-won Umbrella expansion (+$27k ARR)\n• Latency P95 down from 7.2 → 4.3 s\n\nFocus next week: finish forecast API v1 and launch PH blog post.\n\n– Adrien`,
      date: date.toISOString(),
    };
  }

  // board
  return {
    from: ADRIEN,
    to: ['board@pipelinehq.com'],
    subject: `Board prep – metric deep-dives request #${pad(i)}`,
    body: `Hi board,\n\nAhead of next month’s meeting, let me know if you’d like additional detail on churn cohorts or AI infra spend. Deck draft will circulate two weeks prior.\n\nRegards,\nAdrien`,
    date: date.toISOString(),
  };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const emails = Array.from({ length: TOTAL }, (_, i) => buildEmail(i));

  // chunk and write
  for (let c = 0; c < TOTAL / CHUNK; c++) {
    const slice = emails.slice(c * CHUNK, c * CHUNK + CHUNK);
    const file = path.join(OUT_DIR, `emails_${pad(c+1)}.json`);
    await fs.writeFile(file, JSON.stringify(slice, null, 2));
  }

  console.log(`Generated ${TOTAL} emails in ${TOTAL/CHUNK} files under data/`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 
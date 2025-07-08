// Dynamic generator for a clean, authentic outbound email dataset
// All messages are FROM Adrien and sent TO others (no self-recipients)

const ADRIEN_EMAIL = 'adrien.malard2@gmail.com';

const firstNames = [
  'John', 'Jane', 'Alex', 'Nina', 'Michael', 'Laura', 'David', 'Emma', 'Oliver', 'Sophia',
  'Liam', 'Ava', 'Noah', 'Mia', 'Lucas', 'Amelia', 'Benjamin', 'Charlotte', 'Elijah', 'Harper',
  'Jackson', 'Grace', 'Henry', 'Isabella', 'Samuel', 'Chloe', 'Daniel', 'Ella', 'Matthew', 'Scarlett',
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
];

const roles = [
  'Backend Engineer', 'Frontend Engineer', 'Data Scientist', 'Product Manager', 'Site Reliability Engineer',
  'Security Engineer', 'Mobile Developer', 'DevOps Engineer', 'UX Designer', 'Technical Program Manager',
];

const subjectTemplates = [
  'Interview Scheduling – <Role>',
  'Re: Next Steps for <Role> Interview',
  'Follow-up: Application for <Role>',
  'Google Interview – Logistics',
  'Thank you for interviewing for <Role>',
  'Offer Update – <Role>',
  'Re: Feedback on your interview',
  'Onsite Interview Details – <Role>',
  'Recruitment Process Update',
];

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeSubject(role) {
  const template = random(subjectTemplates);
  return template.replace('<Role>', role);
}

function makeBody(first, role) {
  const genericBodies = [
    `Hi ${first},\n\nThank you for your continued interest in the ${role} role at Google. Could you please share your availability next week so we can arrange the next interview round?\n\nBest,\nAdrien`,
    `Hello ${first},\n\nI appreciated our recent conversation regarding the ${role} position. I’ve attached some preparation material for your upcoming interview. Let me know if you have any questions.\n\nBest regards,\nAdrien`,
    `Hi ${first},\n\nI wanted to follow up on the ${role} opportunity. Are you available for a quick call to discuss next steps?\n\nThanks,\nAdrien`,
    `Hi ${first},\n\nCongratulations on progressing to the next stage for the ${role} role! Please confirm if Thursday 2pm PST works for your technical interview.\n\nBest,\nAdrien`,
  ];
  return random(genericBodies);
}

function randomPastIso(daysBack = 60) {
  const now = Date.now();
  const offset = Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000);
  const date = new Date(now - offset);
  return date.toISOString();
}

function generateEmails(count = 300) {
  const emails = [];

  for (let i = 0; i < count; i++) {
    const first = random(firstNames);
    const last = random(lastNames);
    const role = random(roles);

    // Decide internal vs external recipient every 10th email
    const isInternal = i % 10 === 0;
    const domain = isInternal ? 'google.com' : random(['gmail.com', 'yahoo.com', 'outlook.com', 'startupxyz.com']);
    const recipient = `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`;

    emails.push({
      from: ADRIEN_EMAIL,
      to: [recipient],
      subject: makeSubject(role),
      body: makeBody(first, role),
      date: randomPastIso(),
    });
  }

  return emails;
}

const emails = generateEmails();
export default emails; 
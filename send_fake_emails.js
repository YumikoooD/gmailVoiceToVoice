import emails from './fake_inbox.js';

console.log(`Simulating sending ${emails.length} emails for Adrien Malard...`);

emails.forEach((email, idx) => {
  console.log(`\n--- Email #${idx + 1} ---`);
  console.log(`From: ${email.from}`);
  console.log(`To: ${email.to.join(', ')}`);
  console.log(`Subject: ${email.subject}`);
  console.log(`Date: ${email.date}`);
  console.log(`Body:\n${email.body}`);
});

console.log(`\nSimulation complete.`); 
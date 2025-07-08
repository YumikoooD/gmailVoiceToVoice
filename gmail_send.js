import fs from 'fs/promises';
import path from 'path';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import emails from './fake_inbox.js';

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const ADRIEN_EMAIL = 'adrien.malard2@gmail.com';

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: client._clientId,
    client_secret: client._clientSecret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client;
  const saved = await loadSavedCredentialsIfExist();
  if (saved) {
    client = google.auth.fromJSON(saved);
    client.scopes = SCOPES;
    return client;
  }
  client = await authenticate({
    keyfilePath: CREDENTIALS_PATH,
    scopes: SCOPES,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

function makeBody(email) {
  const to = email.to.join(', ');
  const subject = email.subject;
  const message = email.body;
  const date = new Date(email.date).toUTCString();
  const str = [
    `From: ${ADRIEN_EMAIL}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    message,
  ].join('\r\n');
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendAllEmails(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    try {
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: makeBody(email),
        },
      });
      console.log(`Sent email #${i + 1}: ${email.subject} -> ${email.to.join(', ')}`);
    } catch (err) {
      console.error(`Failed to send email #${i + 1}: ${email.subject}`, err.message);
    }
  }
}

(async () => {
  const auth = await authorize();
  await sendAllEmails(auth);
})(); 
# Gmail OAuth Setup Guide

Follow these steps to set up Gmail OAuth for your AI Email Assistant:

## 1. Google Cloud Console Setup

### Create a Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project" (or select an existing one)
3. Name it "AI Email Assistant"
4. Click "Create"

### Enable Gmail API
1. In the left sidebar, go to **"APIs & Services" → "Library"**
2. Search for **"Gmail API"**
3. Click on it and click **"Enable"**

### Configure OAuth Consent Screen
1. Go to **"APIs & Services" → "OAuth consent screen"**
2. Choose **"External"** (unless you have Google Workspace)
3. Fill out the form:
   - **App name**: AI Email Assistant
   - **User support email**: Your email
   - **App domain**: Leave blank for testing
   - **Developer contact**: Your email
4. Click **"Save and Continue"**

### Add Scopes
1. Click **"Add or Remove Scopes"**
2. Add these scopes:
   - `../auth/gmail.readonly`
   - `../auth/gmail.send` 
   - `../auth/gmail.modify`
3. Click **"Update"** and **"Save and Continue"**

### Add Test Users (for development)
1. Add your email address as a test user
2. Click **"Save and Continue"**

## 2. Create OAuth Credentials

1. Go to **"APIs & Services" → "Credentials"**
2. Click **"Create Credentials" → "OAuth 2.0 Client IDs"**
3. Choose **"Web application"**
4. Name it **"AI Email Assistant"**
5. Under **"Authorized redirect URIs"**, add:
   ```
   http://localhost:3000/auth/callback
   ```
6. Click **"Create"**

## 3. Update Your Environment

1. Copy the **Client ID** and **Client Secret** from the popup
2. Open your `config.env` file
3. Replace the placeholder values:

```env
GMAIL_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-actual-client-secret
```

## 4. Restart Your Application

```bash
npm start
```

## 🎉 Test Your Setup

1. Go to `http://localhost:3000`
2. You should be redirected to `/login`
3. Click "Sign in with Google"
4. Complete the OAuth flow
5. You'll be redirected back to the app

## 🔧 Troubleshooting

**Error: "Missing required parameter: client_id"**
- Check that your `config.env` has real values (not placeholders)
- Restart the server after updating `config.env`

**Error: "redirect_uri_mismatch"**
- Make sure your redirect URI is exactly: `http://localhost:3000/auth/callback`
- Check for trailing slashes or typos

**Error: "This app isn't verified"**
- Click "Advanced" → "Go to AI Email Assistant (unsafe)"
- This is normal for development apps

## 📚 Next Steps

Once OAuth is working:
1. Test voice commands: "Check my inbox"
2. Try email operations: "Send an email to..."
3. Achieve Inbox Zero with AI assistance! 
# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Environment Variables**: You need the following environment variables from your `config.env`

## Required Environment Variables

Set these in your Vercel project settings:

```
OPENAI_API_KEY=your-openai-api-key
GMAIL_CLIENT_ID=your-gmail-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-gmail-client-secret
GMAIL_REDIRECT_URI=https://your-vercel-url.vercel.app/api/auth/callback
```

## Deployment Steps

### 1. Deploy to Vercel

```bash
vercel --name email-ai-voice
```

Or deploy via GitHub by connecting your repository to Vercel.

### 2. Update OAuth Redirect URI

After deployment, you'll get a Vercel URL like `https://email-ai-voice.vercel.app`

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to your OAuth credentials
3. Add your Vercel URL to **Authorized redirect URIs**:
   ```
   https://your-vercel-url.vercel.app/api/auth/callback
   ```

### 3. Set Environment Variables

In your Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add all the required variables listed above
4. Make sure to update `GMAIL_REDIRECT_URI` with your actual Vercel URL

### 4. Redeploy

After setting environment variables, redeploy your project:

```bash
vercel --prod
```

## Testing

1. Visit your Vercel URL
2. Test the OAuth flow by clicking "Sign in with Google"
3. Test voice commands and email functionality

## Troubleshooting

### Common Issues

1. **OAuth Error**: Make sure redirect URI in Google Cloud Console matches your Vercel URL
2. **Environment Variables**: Ensure all variables are set correctly in Vercel dashboard
3. **API Errors**: Check Vercel function logs for detailed error messages

### Checking Logs

```bash
vercel logs your-project-name
```

## Architecture

The application is structured as:
- **Frontend**: React app built with Vite, served as static files
- **Backend**: Serverless functions in `/api` directory
- **Authentication**: OAuth2 flow with Google Gmail API
- **AI**: OpenAI Realtime API integration

## Production Considerations

1. **Security**: All sensitive data is handled via environment variables
2. **Performance**: Serverless functions provide automatic scaling
3. **Monitoring**: Use Vercel's built-in monitoring and logging
4. **SSL**: Automatic HTTPS provided by Vercel 
# AI Email Assistant - Voice-Controlled Email Management

Transform your daily commute into productive email management time with AI-powered voice commands. This application uses OpenAI's Realtime API to help you achieve **Inbox Zero** through natural voice interactions.

## 🎯 Perfect for:
- **Commuters** - Manage emails hands-free while driving
- **Accessibility** - Voice-first email management for those with mobility limitations
- **Productivity** - Efficient email triaging and response drafting
- **Multitaskers** - Handle emails while doing other tasks

## ✨ Features

### Voice Commands
- **"Check my inbox"** - Get a summary of unread emails
- **"Read my latest emails"** - AI reads emails aloud with key information
- **"Reply to John's email"** - Draft contextual responses
- **"Send an email to..."** - Compose and send new emails
- **"Delete this email"** - Remove unwanted messages
- **"Mark as read"** - Update email status

### AI Capabilities
- **Smart Email Triaging** - Prioritize important emails
- **Context-Aware Replies** - Generate appropriate responses based on email content
- **Email Summarization** - Get key points from long emails
- **Natural Language Processing** - Understand complex voice commands
- **Gmail Integration** - Full Gmail support with OAuth authentication

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `config.env` and update the following:

```env
# Required: OpenAI API Key
OPENAI_API_KEY=your-openai-api-key

# Gmail OAuth (Get from Google Cloud Console)
GMAIL_CLIENT_ID=your-gmail-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-gmail-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/auth/gmail/callback
```

### 3. Set Up Gmail Authentication

#### Gmail Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add your domain to authorized origins

### 4. Start the Application
```bash
npm run dev
```

Navigate to `http://localhost:3000` and start your voice-controlled email management!

## 🎙️ Usage Guide

### Getting Started
1. **Start Session** - Click "Start Session" to begin voice interaction
2. **Connect Gmail** - Authenticate with your Gmail account
3. **Grant Permissions** - Allow microphone access for voice commands
4. **Start Talking** - Use natural language to manage your emails

### Example Voice Interactions

**Inbox Management:**
- "What's in my inbox today?"
- "How many unread emails do I have?"
- "Show me emails from this week"

**Reading Emails:**
- "Read me the first email"
- "What did Sarah say in her email?"
- "Skip to the next email"

**Email Actions:**
- "Reply to this email saying I'll get back to them tomorrow"
- "Send an email to john@example.com about the meeting"
- "Delete all emails from promotions"
- "Mark this as important"

**Smart Replies:**
- "Accept this meeting invitation"
- "Decline politely and suggest next week"
- "Ask for more details about the project"

## 🛠️ Technical Architecture

### Frontend Components
- **App.jsx** - Main application with WebRTC voice connection
- **ToolPanel.jsx** - Email management interface and AI tool integration
- **EmailAuth.jsx** - OAuth authentication for email providers
- **SessionControls.jsx** - Voice session management
- **EventLog.jsx** - Real-time communication debugging

### Backend Services
- **EmailService** - Gmail API integration with full email operations
- **Express Server** - RESTful API endpoints for email operations
- **OAuth Integration** - Secure Gmail authentication flow

### AI Integration
- **OpenAI Realtime API** - Voice processing and natural language understanding
- **Function Calling** - Structured email operations
- **Context Management** - Maintains conversation state for complex email tasks

## 🔒 Privacy & Security

- **OAuth 2.0** - Industry standard authentication
- **No Password Storage** - Credentials never stored on our servers
- **Encrypted Communication** - All data transfer is encrypted
- **Minimal Permissions** - Only request necessary email access
- **Local Processing** - Voice data processed securely through OpenAI

## 📱 Mobile Support

While optimized for desktop use during commutes, the application works on mobile devices with:
- Touch-to-talk functionality
- Mobile-responsive interface
- Bluetooth headset compatibility

## 🤝 Contributing

This project is designed to be the foundation for the most useful voice-controlled email assistant. We welcome contributions from:

- **Email Integration Specialists** - Adding support for more email providers
- **Voice UX Designers** - Improving voice interaction patterns
- **AI Engineers** - Enhancing email understanding and response generation
- **Security Experts** - Strengthening authentication and privacy measures

## 📄 License

MIT License - Feel free to use this as a starting point for your own email AI assistant.

## 🚗 Ready to Transform Your Commute?

Start your journey to **Inbox Zero** today. Your daily drive will never be the same once you experience hands-free email management with AI.

---

*Built with OpenAI Realtime API, React, and a vision of making email management accessible to everyone.*

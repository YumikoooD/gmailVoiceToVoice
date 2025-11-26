<p align="center">
  <img src="https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/email.svg" width="100" alt="logo">
</p>

<h1 align="center">📧 Voice Mail AI</h1>

<p align="center">
  <strong>Your AI-powered voice assistant for Gmail</strong><br>
  Manage your inbox hands-free with natural conversations
</p>

<p align="center">
  <img src="https://img.shields.io/badge/OpenAI-Realtime_API-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI">
  <img src="https://img.shields.io/badge/Gmail-API-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Gmail">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
</p>

<br>

<p align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHJvdmVocXN2aGxiMGF6OGd6ZTlnOGV6bXA4cWNtNnRxZ3hhYnNodyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/077i6AULCXc0FKTj9s/giphy.gif" width="600" alt="Voice AI Demo">
</p>

---

## ✨ What is Voice Mail AI?

**Voice Mail AI** transforms how you interact with email. Instead of typing and scrolling, simply *talk* to your inbox. Built with OpenAI's cutting-edge Realtime API, it understands natural language and responds with a human-like voice.

<table>
<tr>
<td width="50%">

### 🎙️ Voice-First Experience

Speak naturally like you're talking to an assistant:

> *"Hey, what emails did I get today?"*
> 
> *"Read me the one from Sarah"*
> 
> *"Reply saying I'll call her tomorrow"*

</td>
<td width="50%">

### 🚗 Perfect for Commuters

Turn your drive time into productive inbox management:

- ✅ Hands-free operation
- ✅ Eyes on the road
- ✅ Arrive with Inbox Zero

</td>
</tr>
</table>

---

## 🎬 See It In Action

<table>
<tr>
<td align="center" width="33%">
<img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExb3BtbWZlb2lhd2NnMmNlZHJnbnRtN2ttdXF4OGdsZXFmMnFjbThtdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26tn33aiTi1jkl6H6/giphy.gif" width="200"><br>
<strong>📥 Check Inbox</strong><br>
<em>"Show me my unread emails"</em>
</td>
<td align="center" width="33%">
<img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWFvNXBqMGN0NXFxMnBxcjZrcXlhMWV4dGFyaWNqYjBxaGNmZ3g1cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYt5jPR6QX5pnqM/giphy.gif" width="200"><br>
<strong>✉️ Send Emails</strong><br>
<em>"Send an email to John about..."</em>
</td>
<td align="center" width="33%">
<img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGNiNHd5Y3RoMnBqMGdjMjR4YXE3aGNyYjVtY2ppOWNlN3hvMHNhMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7btPCcdNniyf0ArS/giphy.gif" width="200"><br>
<strong>📅 Manage Calendar</strong><br>
<em>"Schedule a meeting for..."</em>
</td>
</tr>
</table>

---

## 🚀 Features

<table>
<tr>
<td>

### 📬 Email Management
- List and read emails aloud
- Send new emails by voice
- Reply to conversations
- Delete unwanted messages
- Mark as read/unread

</td>
<td>

### 📅 Calendar Integration
- Create events with voice
- Add Google Meet links
- Invite attendees
- Check your schedule
- Update or cancel events

</td>
<td>

### 🧠 AI Intelligence
- Context-aware responses
- Smart email summaries
- Natural conversations
- Learns your writing style
- Filters out spam/promos

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        VOICE MAIL AI                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   React     │    │   Express   │    │   OpenAI    │     │
│  │  Frontend   │◄──►│   Server    │◄──►│  Realtime   │     │
│  │             │    │             │    │     API     │     │
│  └─────────────┘    └──────┬──────┘    └─────────────┘     │
│                            │                                 │
│                     ┌──────▼──────┐                         │
│                     │   Google    │                         │
│                     │  Gmail API  │                         │
│                     │ Calendar API│                         │
│                     └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TailwindCSS |
| **Backend** | Node.js, Express |
| **Voice AI** | OpenAI Realtime API (GPT-4o) |
| **Email** | Gmail API with OAuth 2.0 |
| **Calendar** | Google Calendar API |
| **Deployment** | Vercel (Serverless) |

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API Key
- Google Cloud Project with Gmail API

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/voice-mail-ai.git
cd voice-mail-ai

# Install dependencies
npm install

# Create environment file
cp config.env.example config.env
```

### Configuration

Edit `config.env` with your credentials:

```env
OPENAI_API_KEY=sk-your-openai-key
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/callback
SESSION_SECRET=your-random-secret
```

> 📖 See [OAUTH_SETUP.md](./OAUTH_SETUP.md) for detailed Gmail configuration

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start talking! 🎙️

---

## 🎯 Voice Commands

<details>
<summary><strong>📥 Inbox Commands</strong></summary>

| Say This | What Happens |
|----------|--------------|
| *"Check my inbox"* | Lists recent emails with summary |
| *"What's new today?"* | Shows today's emails |
| *"Any unread emails?"* | Filters to unread only |
| *"Show emails from Sarah"* | Filters by sender |

</details>

<details>
<summary><strong>📖 Reading Emails</strong></summary>

| Say This | What Happens |
|----------|--------------|
| *"Read the first one"* | Reads email content aloud |
| *"What did John say?"* | Reads specific sender's email |
| *"Summarize this email"* | AI provides key points |
| *"Skip to the next"* | Moves to next email |

</details>

<details>
<summary><strong>✉️ Sending Emails</strong></summary>

| Say This | What Happens |
|----------|--------------|
| *"Send an email to john@example.com"* | Starts composing |
| *"Reply saying I agree"* | Replies to current email |
| *"Forward this to the team"* | Forwards with your comment |

</details>

<details>
<summary><strong>📅 Calendar Commands</strong></summary>

| Say This | What Happens |
|----------|--------------|
| *"What's on my calendar?"* | Lists upcoming events |
| *"Schedule a meeting tomorrow at 2pm"* | Creates new event |
| *"Add a Google Meet link"* | Adds video conferencing |
| *"Cancel my 3pm meeting"* | Removes event |

</details>

---

## 🔒 Privacy & Security

| Feature | Description |
|---------|-------------|
| 🔐 **OAuth 2.0** | Industry-standard Google authentication |
| 🚫 **No Password Storage** | We never see your Google password |
| 🔒 **Encrypted** | All data encrypted in transit |
| 📍 **Minimal Scope** | Only requests necessary permissions |
| 🎤 **Voice Privacy** | Audio processed by OpenAI, not stored |

---

## 📁 Project Structure

```
voice-mail-ai/
├── api/                    # Vercel serverless functions
│   ├── _utils/            # Shared utilities
│   │   ├── email-service.js
│   │   └── calendar-service.js
│   ├── auth/              # OAuth endpoints
│   └── emails/            # Email API routes
├── client/                # React frontend
│   ├── components/        # UI components
│   └── pages/             # Page routes
├── server.js              # Express dev server
├── config.env.example     # Environment template
└── README.md              # You are here!
```

---

## 🤝 Contributing

Contributions welcome! Areas we'd love help with:

- 🎨 **UI/UX** - Improve the interface
- 🌍 **i18n** - Add language support
- 🔊 **Voice UX** - Better conversation patterns
- 🔌 **Integrations** - Add more email providers

---

## 📄 License

MIT License - Feel free to use and modify!

---

<p align="center">
  <strong>🎙️ Stop typing. Start talking.</strong><br>
  <em>Built with ❤️ using OpenAI Realtime API</em>
</p>

<p align="center">
  <a href="#-quick-start">Get Started</a> •
  <a href="./OAUTH_SETUP.md">Setup Guide</a> •
  <a href="./DEPLOYMENT.md">Deploy</a>
</p>

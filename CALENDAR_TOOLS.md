# Calendar Tools Integration

This document describes the complete calendar tool system that extends your existing Email AI Voice assistant with Google Calendar and Google Meet capabilities.

## Overview

The calendar tools allow your voice assistant to:
- ✅ Create calendar events with optional Google Meet links
- ✅ List upcoming events with flexible date filtering
- ✅ Get detailed information about specific events
- ✅ Update existing events (time, location, attendees, etc.)
- ✅ Delete/cancel events
- ✅ Search events by keywords and date ranges
- ✅ Automatic timezone handling
- ✅ Email notifications to attendees

## Architecture

The calendar system follows the same MCP (Multi-Tool Calling Protocol) pattern as your existing email tools:

```
Voice Commands → OpenAI Realtime API → MCP Client → REST API → CalendarService → Google Calendar API
```

### Components Added

1. **`CalendarService`** (`api/_utils/calendar-service.js`) - Core calendar operations
2. **Calendar MCP Tools** - Added to `mcp-gmail-server.js`
3. **REST API Endpoints** - Extended `server.js` with calendar endpoints
4. **OAuth2 Scopes** - Added Google Calendar permissions
5. **OpenAPI Specification** - Complete API documentation

## Setup Instructions

### 1. OAuth2 Configuration

The system automatically includes the required Google Calendar scope. Your existing Google OAuth setup now includes:

```javascript
scope: [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send', 
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar.events'  // ← New calendar scope
]
```

### 2. Dependencies

All required dependencies are already included in your `package.json`:
- `googleapis` - Google Calendar API client
- `date-fns` - Date formatting utilities

### 3. Environment Variables

No additional environment variables needed. The system reuses your existing Gmail OAuth credentials:
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET` 
- `GMAIL_REDIRECT_URI`

## Available Calendar Tools

### 1. `create_event` - Create Calendar Event

Creates a new calendar event with optional Google Meet link.

**Parameters:**
- `title` (required) - Event title
- `start_time` (required) - Start time in ISO 8601 format
- `end_time` (required) - End time in ISO 8601 format  
- `description` (optional) - Event description
- `location` (optional) - Event location
- `timezone` (optional) - Event timezone (defaults to UTC)
- `attendees` (optional) - Array of attendee email addresses
- `create_meet_link` (optional) - Boolean to create Google Meet link

**Example:**
```json
{
  "title": "Team Meeting",
  "description": "Weekly team sync meeting",
  "start_time": "2024-01-15T14:30:00",
  "end_time": "2024-01-15T15:30:00",
  "timezone": "America/New_York",
  "location": "Conference Room A",
  "attendees": ["john@example.com", "jane@example.com"],
  "create_meet_link": true
}
```

**Response:**
```json
{
  "id": "abc123def456",
  "title": "Team Meeting",
  "description": "Weekly team sync meeting", 
  "location": "Conference Room A",
  "start_time": "2024-01-15T14:30:00-05:00",
  "end_time": "2024-01-15T15:30:00-05:00",
  "timezone": "America/New_York",
  "attendees": ["john@example.com", "jane@example.com"],
  "meet_link": "https://meet.google.com/abc-defg-hij",
  "calendar_link": "https://calendar.google.com/event?eid=...",
  "status": "confirmed",
  "created": "Jan 15, 2024 10:30 AM"
}
```

### 2. `list_events` - List Upcoming Events

Lists upcoming calendar events with optional filtering.

**Parameters:**
- `maxResults` (optional) - Maximum events to return (default: 10)
- `timeMin` (optional) - Start time filter (ISO 8601, defaults to now)
- `timeMax` (optional) - End time filter (ISO 8601)
- `query` (optional) - Text query to filter events

**Example:**
```json
{
  "maxResults": 10,
  "timeMin": "2024-01-15T00:00:00Z",
  "timeMax": "2024-01-22T23:59:59Z"
}
```

### 3. `get_event_details` - Get Event Details

Gets detailed information about a specific event.

**Parameters:**
- `eventId` (required) - Calendar event ID

### 4. `update_event` - Update Event

Updates an existing calendar event.

**Parameters:**
- `eventId` (required) - Calendar event ID
- All other parameters from `create_event` (optional)

### 5. `delete_event` - Delete Event

Deletes/cancels a calendar event.

**Parameters:**
- `eventId` (required) - Calendar event ID

### 6. `search_events` - Search Events

Searches events by keywords and date range.

**Parameters:**
- `query` (required) - Search keywords
- `maxResults` (optional) - Maximum events to return (default: 25)
- `timeMin` (optional) - Start time filter
- `timeMax` (optional) - End time filter

## Voice Command Examples

The assistant now supports calendar voice commands:

### Creating Events
- "Schedule a meeting with John at 2 PM tomorrow"
- "Create a team standup for Monday at 9 AM" 
- "Book a 30-minute call with the client next Friday"
- "Set up a lunch meeting with Sarah at noon, include a Meet link"

### Listing Events
- "What's on my calendar today?"
- "Show me my meetings this week"
- "What do I have tomorrow afternoon?"
- "List my upcoming events"

### Managing Events
- "Cancel my 3 PM meeting"
- "Move my team meeting to 4 PM"
- "Add john@example.com to my project meeting"
- "Change the location of my client call to Conference Room B"

### Searching Events
- "Find my meeting with Sarah"
- "Show me all meetings about the project"
- "When is my next standup?"

## Assistant Instructions

The assistant now includes comprehensive calendar instructions:

```
📅 MANDATORY CALENDAR TOOL USAGE:
- ANY question about calendar/events → IMMEDIATELY call list_events
- User asks "what's on my calendar" → call list_events
- User asks "schedule a meeting" → call create_event (ASK FOR CONFIRMATION FIRST)
- User asks "cancel my [event]" → call delete_event (ASK FOR CONFIRMATION FIRST)
- User asks "find my meeting about [topic]" → call search_events with query
```

## Error Handling

The system includes comprehensive error handling:

- **Authentication errors** - Redirects to re-authenticate with Google
- **Invalid parameters** - Clear validation error messages
- **Calendar API errors** - Graceful fallbacks with user-friendly messages
- **Network errors** - Retry logic and timeout handling

## Security Features

- **OAuth2 flow** - Secure Google authentication
- **Session management** - Encrypted session tokens
- **Scope limitation** - Only calendar events access (no full calendar access)
- **Confirmation required** - Assistant asks for confirmation before creating/deleting events

## Testing

### Manual Testing

1. Start the server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Authenticate with Google (will now request calendar permissions)
4. Use voice commands to test calendar functionality

### API Testing

You can test the calendar tools directly via the REST API:

```bash
# List available tools (should now include calendar tools)
curl -X GET http://localhost:3000/api/mcp/list-tools \
  -H "Cookie: your-session-cookie"

# Create a test event
curl -X POST http://localhost:3000/api/mcp/call-tool \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "tool_name": "create_event",
    "arguments": {
      "title": "Test Meeting",
      "start_time": "2024-01-15T14:30:00",
      "end_time": "2024-01-15T15:30:00",
      "create_meet_link": true
    }
  }'
```

## Troubleshooting

### Common Issues

1. **"Authentication required" error**
   - Re-authenticate at `/api/auth/login`
   - Ensure calendar scope is included in OAuth

2. **"Failed to create event" error**
   - Check date/time format (must be ISO 8601)
   - Verify timezone is valid
   - Ensure attendee emails are valid

3. **Google Meet link not created**
   - Ensure `create_meet_link: true` is set
   - Check Google Calendar settings allow Meet creation

### Debug Logs

The system includes comprehensive logging. Check console for:
- `🔍 Calendar service authenticated: true/false`
- `Creating calendar event: {...}`
- `Calendar event created successfully: {...}`

## API Documentation

See `calendar-tools-openapi.yaml` for complete OpenAPI 3.0 specification with:
- Request/response schemas
- Error codes and messages
- Example requests and responses
- Authentication requirements

## Next Steps

The calendar tool system is now fully integrated. You can:

1. **Test the integration** - Try voice commands for calendar management
2. **Customize instructions** - Modify assistant prompts in `MCPToolPanel.jsx`
3. **Add features** - Extend `CalendarService` with additional capabilities
4. **Monitor usage** - Check logs for tool performance and errors

The system is designed to work seamlessly with your existing email tools, providing a unified voice interface for both email and calendar management. 
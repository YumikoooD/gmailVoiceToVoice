import { google } from 'googleapis';
import { format, parseISO } from 'date-fns';

class CalendarService {
  constructor() {
    this.calendarAuth = null;
    this.activeProvider = null;
  }

  // Google Calendar Authentication
  async authenticateGoogleCalendar(tokens) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
      );
      
      // Validate environment variables
      if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
        throw new Error('Missing Google OAuth credentials in environment variables');
      }
      
      // Validate tokens
      if (!tokens || !tokens.access_token) {
        throw new Error('Invalid or missing tokens');
      }
      
      oauth2Client.setCredentials(tokens);
      this.calendarAuth = oauth2Client;
      this.activeProvider = 'google_calendar';
      
      console.log('Google Calendar authentication successful');
      return true;
    } catch (error) {
      console.error('Google Calendar authentication failed:', error);
      throw error;
    }
  }

  isAuthenticated() {
    return this.calendarAuth !== null;
  }

  // Create calendar event
  async createEvent(eventData) {
    if (!this.calendarAuth) {
      throw new Error('Not authenticated');
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.calendarAuth });
      
      // Validate required fields
      if (!eventData.title || !eventData.start_time || !eventData.end_time) {
        throw new Error('Missing required fields: title, start_time, end_time');
      }

      // Process attendees
      const attendees = eventData.attendees ? 
        eventData.attendees.map(email => ({ email: email.trim() })) : [];

      // Create event object
      const event = {
        summary: eventData.title,
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: eventData.start_time,
          timeZone: eventData.timezone || 'UTC'
        },
        end: {
          dateTime: eventData.end_time,
          timeZone: eventData.timezone || 'UTC'
        },
        attendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day
            { method: 'popup', minutes: 10 }
          ]
        }
      };

      // Add Google Meet if requested
      if (eventData.create_meet_link) {
        event.conferenceData = {
          createRequest: {
            requestId: `meet_${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        };
      }

      console.log('Creating calendar event:', event);
      
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: eventData.create_meet_link ? 1 : 0,
        sendUpdates: 'all'
      });

      const createdEvent = response.data;
      
      // Format response
      const result = {
        id: createdEvent.id,
        title: createdEvent.summary,
        description: createdEvent.description,
        location: createdEvent.location,
        start_time: createdEvent.start.dateTime,
        end_time: createdEvent.end.dateTime,
        timezone: createdEvent.start.timeZone,
        attendees: createdEvent.attendees?.map(a => a.email) || [],
        meet_link: createdEvent.conferenceData?.entryPoints?.[0]?.uri || null,
        calendar_link: createdEvent.htmlLink,
        status: createdEvent.status,
        created: format(new Date(createdEvent.created), 'MMM d, yyyy h:mm a')
      };

      console.log('Calendar event created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }
  }

  // List upcoming events
  async listEvents(options = {}) {
    if (!this.calendarAuth) {
      throw new Error('Not authenticated');
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.calendarAuth });
      
      const {
        maxResults = 10,
        timeMin = new Date().toISOString(),
        timeMax = null,
        query = null
      } = options;

      const params = {
        calendarId: 'primary',
        timeMin,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      };

      if (timeMax) {
        params.timeMax = timeMax;
      }

      if (query) {
        params.q = query;
      }

      console.log('Listing calendar events with params:', params);
      
      const response = await calendar.events.list(params);
      const events = response.data.items || [];
      
      const formattedEvents = events.map(event => ({
        id: event.id,
        title: event.summary || 'No Title',
        description: event.description || '',
        location: event.location || '',
        start_time: event.start.dateTime || event.start.date,
        end_time: event.end.dateTime || event.end.date,
        timezone: event.start.timeZone,
        attendees: event.attendees?.map(a => a.email) || [],
        meet_link: event.conferenceData?.entryPoints?.[0]?.uri || null,
        calendar_link: event.htmlLink,
        status: event.status,
        created_by: event.creator?.email || 'Unknown'
      }));

      console.log(`Successfully fetched ${formattedEvents.length} events`);
      return {
        events: formattedEvents,
        summary: `Found ${formattedEvents.length} upcoming events`
      };
    } catch (error) {
      console.error('Error listing calendar events:', error);
      throw new Error(`Failed to list calendar events: ${error.message}`);
    }
  }

  // Get event details
  async getEventDetails(eventId) {
    if (!this.calendarAuth) {
      throw new Error('Not authenticated');
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.calendarAuth });
      
      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId
      });

      const event = response.data;
      
      const result = {
        id: event.id,
        title: event.summary || 'No Title',
        description: event.description || '',
        location: event.location || '',
        start_time: event.start.dateTime || event.start.date,
        end_time: event.end.dateTime || event.end.date,
        timezone: event.start.timeZone,
        attendees: event.attendees?.map(a => ({
          email: a.email,
          status: a.responseStatus,
          optional: a.optional || false
        })) || [],
        meet_link: event.conferenceData?.entryPoints?.[0]?.uri || null,
        calendar_link: event.htmlLink,
        status: event.status,
        created_by: event.creator?.email || 'Unknown',
        created: format(new Date(event.created), 'MMM d, yyyy h:mm a'),
        updated: format(new Date(event.updated), 'MMM d, yyyy h:mm a')
      };

      return result;
    } catch (error) {
      console.error('Error getting event details:', error);
      throw new Error(`Failed to get event details: ${error.message}`);
    }
  }

  // Update event
  async updateEvent(eventId, updates) {
    if (!this.calendarAuth) {
      throw new Error('Not authenticated');
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.calendarAuth });
      
      // Get current event first
      const currentEvent = await calendar.events.get({
        calendarId: 'primary',
        eventId
      });

      // Merge updates with current event
      const updatedEvent = { ...currentEvent.data };
      
      if (updates.title !== undefined) updatedEvent.summary = updates.title;
      if (updates.description !== undefined) updatedEvent.description = updates.description;
      if (updates.location !== undefined) updatedEvent.location = updates.location;
      
      if (updates.start_time !== undefined) {
        updatedEvent.start = {
          dateTime: updates.start_time,
          timeZone: updates.timezone || updatedEvent.start.timeZone || 'UTC'
        };
      }
      
      if (updates.end_time !== undefined) {
        updatedEvent.end = {
          dateTime: updates.end_time,
          timeZone: updates.timezone || updatedEvent.end.timeZone || 'UTC'
        };
      }
      
      if (updates.attendees !== undefined) {
        updatedEvent.attendees = updates.attendees.map(email => ({ email: email.trim() }));
      }

      // Add Google Meet if requested
      if (updates.create_meet_link && !updatedEvent.conferenceData) {
        updatedEvent.conferenceData = {
          createRequest: {
            requestId: `meet_${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        };
      }

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: updatedEvent,
        conferenceDataVersion: updates.create_meet_link ? 1 : 0,
        sendUpdates: 'all'
      });

      const event = response.data;
      
      const result = {
        id: event.id,
        title: event.summary,
        description: event.description,
        location: event.location,
        start_time: event.start.dateTime,
        end_time: event.end.dateTime,
        timezone: event.start.timeZone,
        attendees: event.attendees?.map(a => a.email) || [],
        meet_link: event.conferenceData?.entryPoints?.[0]?.uri || null,
        calendar_link: event.htmlLink,
        status: event.status,
        updated: format(new Date(event.updated), 'MMM d, yyyy h:mm a')
      };

      console.log('Calendar event updated successfully:', result);
      return result;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }
  }

  // Delete event
  async deleteEvent(eventId) {
    if (!this.calendarAuth) {
      throw new Error('Not authenticated');
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.calendarAuth });
      
      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all'
      });

      console.log('Calendar event deleted successfully:', eventId);
      return {
        success: true,
        message: 'Event deleted successfully',
        eventId
      };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error(`Failed to delete calendar event: ${error.message}`);
    }
  }

  // Search events
  async searchEvents(query, options = {}) {
    if (!this.calendarAuth) {
      throw new Error('Not authenticated');
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.calendarAuth });
      
      const {
        maxResults = 25,
        timeMin = null,
        timeMax = null
      } = options;

      const params = {
        calendarId: 'primary',
        q: query,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      };

      if (timeMin) {
        params.timeMin = timeMin;
      }

      if (timeMax) {
        params.timeMax = timeMax;
      }

      console.log('Searching calendar events with params:', params);
      
      const response = await calendar.events.list(params);
      const events = response.data.items || [];
      
      const formattedEvents = events.map(event => ({
        id: event.id,
        title: event.summary || 'No Title',
        description: event.description || '',
        location: event.location || '',
        start_time: event.start.dateTime || event.start.date,
        end_time: event.end.dateTime || event.end.date,
        timezone: event.start.timeZone,
        attendees: event.attendees?.map(a => a.email) || [],
        meet_link: event.conferenceData?.entryPoints?.[0]?.uri || null,
        calendar_link: event.htmlLink,
        status: event.status,
        created_by: event.creator?.email || 'Unknown'
      }));

      console.log(`Found ${formattedEvents.length} events matching query: ${query}`);
      return {
        events: formattedEvents,
        query,
        summary: `Found ${formattedEvents.length} events matching "${query}"`
      };
    } catch (error) {
      console.error('Error searching calendar events:', error);
      throw new Error(`Failed to search calendar events: ${error.message}`);
    }
  }

  // Get free/busy information
  async getFreeBusy(timeMin, timeMax, calendars = ['primary']) {
    if (!this.calendarAuth) {
      throw new Error('Not authenticated');
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.calendarAuth });
      
      const response = await calendar.freebusy.query({
        resource: {
          timeMin,
          timeMax,
          items: calendars.map(id => ({ id }))
        }
      });

      const freeBusyData = response.data;
      
      const result = {
        timeMin,
        timeMax,
        calendars: {}
      };

      for (const calendarId of calendars) {
        const calendar = freeBusyData.calendars[calendarId];
        if (calendar) {
          result.calendars[calendarId] = {
            busy: calendar.busy || [],
            errors: calendar.errors || []
          };
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting free/busy information:', error);
      throw new Error(`Failed to get free/busy information: ${error.message}`);
    }
  }

  // Generate calendar summary
  generateCalendarSummary(events) {
    const today = new Date();
    const todayEvents = events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === today.toDateString();
    });

    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate > today;
    });

    return {
      totalEvents: events.length,
      todayEvents: todayEvents.length,
      upcomingEvents: upcomingEvents.length,
      summary: `You have ${todayEvents.length} events today and ${upcomingEvents.length} upcoming events.`
    };
  }
}

export default CalendarService; 
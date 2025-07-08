import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { LogOut } from "react-feather";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import MCPToolPanel from "./MCPToolPanel";
import Button from "./Button";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const [pendingSessionUpdates, setPendingSessionUpdates] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const processedCallIds = useRef(new Set());

  // Fetch user profile once after mount
  useEffect(() => {
    fetch('/api/auth/status', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setUserProfile(d.userProfile || null))
      .catch(console.error);
  }, []);

  // Build personalised system prompt when profile is available
  const personalisedSystemMessage = useMemo(() => {
    if (!userProfile) return null;
    const {
      name, profession, email, tone, signature,
      coworkers = [], hobbies = [], typicalAvailability = []
    } = userProfile;

    const text = `You are an AI assistant writing emails on behalf of ${name || 'the user'}.
Profession: ${profession || 'unknown'}.
Preferred tone: ${tone || 'neutral'}.
User email address: ${email || 'unknown'}.
Always end emails with:\n${signature || 'Best,\n<name>'}.

Coworkers: ${coworkers.join(', ') || 'n/a'}.
Hobbies / interests: ${hobbies.join(', ') || 'n/a'}.
Typical availability: ${typicalAvailability.join(', ') || 'n/a'}.

You may share the user's informations with the user if they ask.

Follow these details when composing or replying.`;

    return {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'system',
        content: [{ type: 'input_text', text }]
      }
    };
  }, [userProfile]);

  // Logout function
  const handleLogout = async () => {
    try {
      // Stop session if active
      if (isSessionActive) {
        stopSession();
      }
      
      // Call logout endpoint
      await fetch('/api/auth/logout', { method: 'GET' });
      
      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      window.location.href = '/login';
    }
  };

  async function startSession() {
    // Get a session token for OpenAI Realtime API
    const tokenResponse = await fetch("/api/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    peerConnection.current.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  // Send a message to the model - memoized to prevent infinite loops
  const sendClientEvent = useCallback((message) => {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      // send event before setting timestamp since the backend peer doesn't expect this field
      dataChannel.send(JSON.stringify(message));

      // if guard just in case the timestamp exists by miracle
      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
      
      // Add event to the list, avoiding duplicates
      setEvents((prev) => {
        const eventExists = prev.some(event => 
          event.event_id === message.event_id && 
          event.type === message.type && 
          event.timestamp === message.timestamp
        );
        
        if (eventExists) {
          return prev;
        }
        
        return [message, ...prev];
      });
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }, [dataChannel]);

  // Send a text message to the model - memoized to prevent infinite loops
  const sendTextMessage = useCallback((message) => {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }, [sendClientEvent]);

  // Handle MCP tools update - memoized to prevent infinite loops
  const handleMCPToolsUpdate = useCallback((sessionUpdate) => {
    console.log('Queueing MCP tools update for session.created event');
    const queue = [];
    if (sessionUpdate) queue.push(sessionUpdate);
    if (personalisedSystemMessage) queue.push(personalisedSystemMessage);
    setPendingSessionUpdates(queue);
  }, [personalisedSystemMessage]);



  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", async (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        // Add server event to the list, avoiding duplicates
        setEvents((prev) => {
          const eventExists = prev.some(existingEvent => 
            existingEvent.event_id === event.event_id && 
            existingEvent.type === event.type && 
            existingEvent.timestamp === event.timestamp
          );
          
          if (eventExists) {
            return prev;
          }
          
          return [event, ...prev];
        });
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        // Clear processed call IDs for a fresh session
        processedCallIds.current = new Set();
        setIsSessionActive(true);
        setEvents([]);
      });
    }
  }, [dataChannel, pendingSessionUpdates, sendClientEvent]);

  // Handle MCP tool calls from events - separate effect to avoid dependency issues
  useEffect(() => {
    if (!events || events.length === 0) return;

    const handleMCPEvents = async () => {
      const mostRecentEvent = events[0];
      
      // Debug logging for all events
      console.log('🔍 Processing event:', mostRecentEvent.type, mostRecentEvent);
      
      // Extra debugging for any function-related events
      if (mostRecentEvent.type.includes('function') || mostRecentEvent.type.includes('tool')) {
        console.log('🔧 Found function/tool related event:', mostRecentEvent.type, mostRecentEvent);
      }
      
      // Send MCP tools update when session is created (like original ToolPanel)
      if (mostRecentEvent.type === "session.created" && pendingSessionUpdates.length) {
        console.log('🚀 Session created, sending queued session updates:', pendingSessionUpdates);
        pendingSessionUpdates.forEach(msg => sendClientEvent(msg));
        setPendingSessionUpdates([]);
        return;
      }
      
      // Look for function call events - these might be in different event types
      if (mostRecentEvent.type === "response.output_item.done" && mostRecentEvent.item?.type === "function_call") {
        console.log('🔧 Function call in output_item.done:', mostRecentEvent.item);
        
        try {
          const { name, arguments: args, call_id } = mostRecentEvent.item;
          
          // Skip if we've already handled this call_id to avoid duplicates
          if (processedCallIds.current.has(call_id)) {
            console.log('⏩ Skipping already processed call_id', call_id);
            return;
          }
          processedCallIds.current.add(call_id);

          console.log('🔧 MCP Function call detected:', name, 'with args:', args, 'call_id:', call_id);
          
          // Parse arguments if it's a string, otherwise use as-is
          let parsedArgs = {};
          if (typeof args === 'string') {
            parsedArgs = JSON.parse(args || '{}');
          } else if (args && typeof args === 'object') {
            parsedArgs = args;
          }
          
          // Call the MCP tool via HTTP API
          const callToolEndpoint = import.meta.env.DEV ? '/api/mcp/call-tool' : '/api/mcp?action=call-tool';
          const response = await fetch(callToolEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              tool_name: name,
              arguments: parsedArgs
            })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          console.log('✅ MCP tool result:', result);
          
          // Send the result back to the model
          const resultEvent = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: call_id,
              output: JSON.stringify(result)
            }
          };
          
          sendClientEvent(resultEvent);
          sendClientEvent({ type: 'response.create' });
          
        } catch (error) {
          console.error('❌ MCP tool call failed:', error);
          
          // Send error back to model
          const errorEvent = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: mostRecentEvent.item.call_id,
              output: JSON.stringify({ error: error.message })
            }
          };
          
          sendClientEvent(errorEvent);
          sendClientEvent({ type: 'response.create' });
        }
        return;
      }
      
      if (mostRecentEvent.type === "response.function_call_arguments.done") {
        console.log('🔧 Function call arguments done:', mostRecentEvent);
        
        try {
          const { name, arguments: args, call_id } = mostRecentEvent;
          
          // Skip if we've already handled this call_id to avoid duplicates
          if (processedCallIds.current.has(call_id)) {
            console.log('⏩ Skipping already processed call_id', call_id);
            return;
          }
          processedCallIds.current.add(call_id);

          console.log('🔧 MCP Function call detected:', name, 'with args:', args, 'call_id:', call_id);
          
          // Parse arguments if it's a string, otherwise use as-is
          let parsedArgs = {};
          if (typeof args === 'string') {
            parsedArgs = JSON.parse(args || '{}');
          } else if (args && typeof args === 'object') {
            parsedArgs = args;
          }
          
          // Call the MCP tool via HTTP API
          const callToolEndpoint = import.meta.env.DEV ? '/api/mcp/call-tool' : '/api/mcp?action=call-tool';
          const response = await fetch(callToolEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              tool_name: name,
              arguments: parsedArgs
            })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          console.log('MCP tool result:', result);
          
          // Send the result back to the model
          const resultEvent = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: call_id,
              output: JSON.stringify(result)
            }
          };
          
          sendClientEvent(resultEvent);
          sendClientEvent({ type: 'response.create' });
          
        } catch (error) {
          console.error('MCP tool call failed:', error);
          
          // Send error back to model
          const errorEvent = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: mostRecentEvent.call_id,
              output: JSON.stringify({ error: error.message })
            }
          };
          
          sendClientEvent(errorEvent);
          sendClientEvent({ type: 'response.create' });
        }
        return;
      }

      // Also check response.done events with function calls in output
      if (mostRecentEvent.type === "response.done" && mostRecentEvent.response?.output) {
        console.log('Found response.done event with output:', mostRecentEvent.response.output);
        for (const output of mostRecentEvent.response.output) {
          console.log('🔍 Checking output item:', output, 'type:', output.type, 'name:', output.name, 'arguments:', output.arguments);
          
          // Check for function call - the OpenAI Realtime API uses different field structures
          if (output.type === "function_call" || (output.name && output.arguments !== undefined)) {
            console.log('🔧 MCP Function call detected in response.done:', output.name, 'with args:', output.arguments);
            
            try {
              const { name, arguments: args, call_id } = output;
              
              // Skip if we've already handled this call_id to avoid duplicates
              if (processedCallIds.current.has(call_id)) {
                console.log('⏩ Skipping already processed call_id', call_id);
                continue;
              }
              processedCallIds.current.add(call_id);

              // Parse arguments if it's a string, otherwise use as-is
              let parsedArgs = {};
              if (typeof args === 'string') {
                parsedArgs = JSON.parse(args || '{}');
              } else if (args && typeof args === 'object') {
                parsedArgs = args;
              }
              
              // Call the MCP tool via HTTP API
              const callToolEndpoint = import.meta.env.DEV ? '/api/mcp/call-tool' : '/api/mcp?action=call-tool';
              const response = await fetch(callToolEndpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  tool_name: name,
                  arguments: parsedArgs
                })
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const result = await response.json();
              console.log('MCP tool result:', result);
              
              // Send the result back to the model
              const resultEvent = {
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: call_id,
                  output: JSON.stringify(result)
                }
              };
              
              sendClientEvent(resultEvent);
              sendClientEvent({ type: 'response.create' });
              
            } catch (error) {
              console.error('MCP tool call failed:', error);
              
              // Send error back to model
              const errorEvent = {
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: output.call_id,
                  output: JSON.stringify({ error: error.message })
                }
              };
              
              sendClientEvent(errorEvent);
              sendClientEvent({ type: 'response.create' });
            }
          }
        }
      }
    };

    handleMCPEvents();
  }, [events, sendClientEvent, pendingSessionUpdates]);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center">
        <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <img style={{ width: "24px" }} src={logo} />
          <h1>AI Email Assistant</h1>
          <div className="ml-auto text-sm text-gray-600">
            Drive to Inbox Zero with Voice Commands
          </div>
          <Button
            onClick={handleLogout}
            className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-3 py-1"
            icon={<LogOut size={14} />}
          >
            Logout
          </Button>
        </div>
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0">
        <section className="absolute top-0 left-0 right-[380px] bottom-0 flex">
          <section className="absolute top-0 left-0 right-0 bottom-32 px-4 overflow-y-auto">
            <EventLog events={events} />
          </section>
          <section className="absolute h-32 left-0 right-0 bottom-0 p-4">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              sendClientEvent={sendClientEvent}
              sendTextMessage={sendTextMessage}
              events={events}
              isSessionActive={isSessionActive}
            />
          </section>
        </section>
        <section className="absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto">
          <MCPToolPanel
            onToolsUpdate={handleMCPToolsUpdate}
          />
        </section>
      </main>
    </>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
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
  const [pendingSessionUpdate, setPendingSessionUpdate] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

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
    setPendingSessionUpdate(sessionUpdate);
  }, []);



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
        setIsSessionActive(true);
        setEvents([]);
      });
    }
  }, [dataChannel, pendingSessionUpdate, sendClientEvent]);

  // Handle MCP tool calls from events - separate effect to avoid dependency issues
  useEffect(() => {
    if (!events || events.length === 0) return;

    const handleMCPEvents = async () => {
      const mostRecentEvent = events[0];
      

      
      // Send MCP tools update when session is created (like original ToolPanel)
      if (mostRecentEvent.type === "session.created" && pendingSessionUpdate) {
        console.log('Session created, sending MCP tools update');
        sendClientEvent(pendingSessionUpdate);
        setPendingSessionUpdate(null);
        return;
      }
      
      // Look for response.done events with function calls
      if (mostRecentEvent.type === "response.done" && mostRecentEvent.response?.output) {
        console.log('Found response.done event with output:', mostRecentEvent.response.output);
        for (const output of mostRecentEvent.response.output) {
          if (output.type === "function_call") {
            console.log('🔧 MCP Function call detected:', output.name, 'with args:', output.arguments);
            
            try {
              const { name, arguments: args, call_id } = output;
              
              // Call the MCP tool via HTTP API
              const response = await fetch('/api/mcp/call-tool', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  tool_name: name,
                  arguments: JSON.parse(args || '{}')
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
  }, [events, sendClientEvent, pendingSessionUpdate]);

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

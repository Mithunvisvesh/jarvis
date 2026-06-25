import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  sendChatMessage, 
  getReminders, 
  createReminder, 
  updateReminderStatus, 
  deleteReminder,
  getMemories,
  deleteMemory,
  getDueReminders,
  resetSessionContext,
  getMissions,
  toggleMissionTask as toggleMissionTaskApi,
  deleteMission as deleteMissionApi
} from '../services/api';

const JarvisContext = createContext(undefined);

const getWelcomeMessage = (remindersCount) => {
  const today = new Date();
  const hours = today.getHours();
  let timeOfDay = 'evening';
  if (hours < 12) {
    timeOfDay = 'morning';
  } else if (hours < 17) {
    timeOfDay = 'afternoon';
  }

  const options = { month: 'long', day: 'numeric' };
  const todayStr = today.toLocaleDateString('en-US', options);

  const deadline = new Date('2026-07-06T00:00:00');
  const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d2 = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const timeDiff = d2.getTime() - d1.getTime();
  const daysAway = Math.round(timeDiff / (1000 * 3600 * 24));

  return `JARVIS online. Good ${timeOfDay}, Mithun. Today is ${todayStr} — your capstone deadline is ${daysAway} days away. I have ${remindersCount} items in your agenda. How can I help you today?`;
};

export function JarvisProvider({ children }) {
  const [messages, setMessages] = useState(() => {
    try {
      const stored = window.localStorage.getItem('jarvis_chat_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(msg => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          }));
        }
      }
    } catch (e) {
      console.error("Failed to hydrate chat session from localStorage:", e);
    }
    return [
      {
        id: 'init',
        sender: 'jarvis',
        text: getWelcomeMessage(0),
        timestamp: new Date()
      }
    ];
  });

  const [currentRequestEvents, setCurrentRequestEvents] = useState([]);

  // Serialize messages to localStorage whenever they change
  useEffect(() => {
    try {
      window.localStorage.setItem('jarvis_chat_session', JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat session to localStorage:", e);
    }
  }, [messages]);

  const [isThinking, setIsThinking] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [executionState, setExecutionState] = useState('Idle');
  const [gpuLoad, setGpuLoad] = useState(10);
  const [isConnected, setIsConnected] = useState(true);
  
  const [telemetry, setTelemetry] = useState({
    cpuLoad: 28,
    ramLoad: 54,
    diskLoad: 42,
    temperature: 45,
    syncActive: true
  });

  const [reminders, setReminders] = useState([]);
  const [memories, setMemories] = useState([]);
  const [dueReminders, setDueReminders] = useState([]);
  const [missions, setMissions] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([
    {
      id: 'init-evt',
      type: 'system',
      message: 'JARVIS core initialized. Offline-first DB synchronization active.',
      timestamp: new Date()
    }
  ]);

  // Log a new timeline activity event
  const addTimelineEvent = (type, message) => {
    setTimelineEvents(prev => [
      {
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type,
        message,
        timestamp: new Date()
      },
      ...prev
    ]);
  };

  // Fetch all reminders from the backend
  const fetchReminders = async () => {
    try {
      const data = await getReminders();
      if (Array.isArray(data)) {
        const mappedReminders = data.map(item => ({
          id: item.id,
          text: item.title,
          time: item.day ? `${item.time} (${item.day})` : item.time,
          completed: item.status === 'completed'
        }));
        setReminders(mappedReminders);
        
        // Dynamically update welcome message with actual count N
        const welcomeText = getWelcomeMessage(mappedReminders.length);
        setMessages(prev => {
          if (prev.length > 0) {
            return prev.map((msg, index) => {
              if (index === 0 && (msg.id === 'init' || msg.id.startsWith('init-') || msg.text.startsWith('JARVIS online.'))) {
                return { ...msg, text: welcomeText };
              }
              return msg;
            });
          }
          return [
            {
              id: 'init',
              sender: 'jarvis',
              text: welcomeText,
              timestamp: new Date()
            }
          ];
        });
      }
    } catch (err) {
      console.error("Failed to fetch reminders:", err);
    }
  };

  // Fetch all memories from the backend
  const fetchMemories = async () => {
    try {
      const data = await getMemories();
      if (data && Array.isArray(data.facts)) {
        setMemories(data.facts);
      }
    } catch (err) {
      console.error("Failed to fetch memories:", err);
    }
  };

  // Delete a memory from the backend
  const removeMemory = async (id) => {
    try {
      const res = await deleteMemory(id);
      if (res && res.status === 'success') {
        addTimelineEvent('memory', `Memory block deleted successfully`);
        await fetchMemories();
      }
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  };

  // Fetch all missions from the backend
  const fetchMissions = async () => {
    try {
      const data = await getMissions();
      if (Array.isArray(data)) {
        setMissions(data);
      }
    } catch (err) {
      console.error("Failed to fetch missions:", err);
    }
  };

  // Toggle a task in a mission
  const toggleMissionTask = async (missionId, taskId) => {
    try {
      const res = await toggleMissionTaskApi(missionId, taskId);
      if (res && res.status === 'success') {
        addTimelineEvent('system', 'Mission task status updated');
        await fetchMissions();
      }
    } catch (err) {
      console.error("Failed to toggle mission task:", err);
    }
  };

  // Delete a mission from the backend
  const removeMission = async (missionId) => {
    try {
      const res = await deleteMissionApi(missionId);
      if (res && res.status === 'success') {
        addTimelineEvent('system', 'Mission dismissed successfully');
        await fetchMissions();
      }
    } catch (err) {
      console.error("Failed to delete mission:", err);
    }
  };

  useEffect(() => {
    fetchReminders();
    fetchMemories();
    fetchMissions();
  }, []);

  // Periodic Telemetry Simulator to make meters "dance" in the UI
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry(prev => {
        const change = (Math.random() - 0.5) * 4; // +/- 2%
        const cpu = Math.max(10, Math.min(95, Math.round(prev.cpuLoad + change)));
        const ram = Math.max(20, Math.min(90, Math.round(prev.ramLoad + (Math.random() - 0.5) * 1.5)));
        const temp = Math.max(35, Math.min(80, Math.round(prev.temperature + (Math.random() - 0.5) * 2)));
        
        return {
          ...prev,
          cpuLoad: cpu,
          ramLoad: ram,
          temperature: temp
        };
      });
      
      if (!isThinking) {
        setGpuLoad(prev => {
          const drift = (Math.random() - 0.5) * 2;
          return Math.max(5, Math.min(25, Math.round(prev + drift)));
        });
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [isThinking]);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // First beep
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.05, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);

      // Second beep (slightly higher pitch, slightly delayed)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
      gain2.gain.setValueAtTime(0.05, ctx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn("Failed to play notification sound:", e);
    }
  };

  // Periodic Polling for Due Reminders
  useEffect(() => {
    const checkDueReminders = async () => {
      try {
        const due = await getDueReminders();
        if (Array.isArray(due) && due.length > 0) {
          setDueReminders(prev => {
            // Only add reminders that aren't already marked as due/notified
            const newDue = due.filter(d => !prev.some(p => p.id === d.id));
            if (newDue.length > 0) {
              newDue.forEach(item => {
                addTimelineEvent('reminder', `REMINDER DUE: "${item.title}"`);
              });
              playNotificationSound();
              return [...prev, ...newDue];
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to poll due reminders:", err);
      }
    };
    
    // Check initially and then every 10 seconds
    checkDueReminders();
    const interval = setInterval(checkDueReminders, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handler to add a reminder
  const addReminder = async (text, time) => {
    let day = null;
    let type = "one-time";
    
    const weeklyMatch = text.match(/every\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i);
    if (weeklyMatch) {
      type = "weekly";
      day = weeklyMatch[1].charAt(0).toUpperCase() + weeklyMatch[1].slice(1).toLowerCase();
    } else if (text.toLowerCase().includes("daily") || text.toLowerCase().includes("every day")) {
      type = "daily";
    } else if (text.toLowerCase().includes("tomorrow")) {
      day = "tomorrow";
    }

    // Clean title: strip "remind me to", etc.
    let title = text;
    const prefixMatch = text.match(/^(remind me to|remind me|add reminder to|add reminder for|schedule reminder for|schedule|please remind me to)\s+(.*)$/i);
    if (prefixMatch) {
      title = prefixMatch[2];
    }
    title = title.replace(/\s+(every|at|on|tomorrow|daily|weekly|schedule)\b.*$/i, "").trim();
    if (title.toLowerCase().startsWith("to ")) {
      title = title.slice(3);
    } else if (title.toLowerCase().startsWith("for ")) {
      title = title.slice(4);
    }

    const newReminder = await createReminder(title, time || "12:00 PM", type, day);
    if (newReminder) {
      addTimelineEvent('reminder', `Created reminder: "${title}" at ${time || '12:00 PM'}`);
    }
    await fetchReminders();
  };

  // Handler to toggle a reminder completed status
  const toggleReminder = async (id) => {
    if (String(id).startsWith("rem-fallback-")) {
      setReminders(prev =>
        prev.map(rem => (rem.id === id ? { ...rem, completed: !rem.completed } : rem))
      );
      return;
    }
    
    const target = reminders.find(r => r.id === id);
    if (!target) return;
    const newStatus = target.completed ? 'pending' : 'completed';
    await updateReminderStatus(id, newStatus);
    await fetchReminders();
    addTimelineEvent('reminder', `Updated reminder status: "${target.text}" -> ${newStatus}`);
  };

  // Handler to delete a reminder
  const removeReminder = async (id) => {
    if (String(id).startsWith("rem-fallback-")) {
      setReminders(prev => prev.filter(rem => rem.id !== id));
      return;
    }
    await deleteReminder(id);
    await fetchReminders();
    addTimelineEvent('reminder', `Deleted reminder from scheduled buffer`);
  };

  // Helper to extract a reminder command from user query (Simple Natural Language Parser)
  const parseReminderInPrompt = (prompt) => {
    const match = prompt.match(/(?:remind me to|schedule|add reminder for)\s+(.+?)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/i);
    if (match) {
      const [, text, time] = match;
      return { text: text.trim(), time: time.trim().toUpperCase() };
    }
    return null;
  };

  // Handler to send message to FastAPI
  const sendMessage = async (text) => {
    if (!text.trim() || isThinking) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);
    addTimelineEvent('user', `Query submitted: "${text}"`);
    setExecutionState('Analyzing Request');
    setCurrentRequestEvents([]); // Reset events for new request

    const localReminder = parseReminderInPrompt(text);
    let sseSuccess = false;
    let finalPayload = null;

    try {
      // 1. Try SSE Stream Endpoint
      const response = await fetch('http://localhost:8001/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: text,
          user_id: 'user_01',
          session_id: 'default_session'
        }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        sseSuccess = true;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep last incomplete line

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr) {
                try {
                  const event = JSON.parse(dataStr);
                  
                  // Append every event to currentRequestEvents for telemetry/dashboard
                  setCurrentRequestEvents(prev => [...prev, event]);
                  
                  // Map event type to executionState
                  switch (event.event_type) {
                    case 'THINKING':
                    case 'INTENT_DETECTED':
                      setExecutionState('Analyzing Request');
                      break;
                    case 'ROUTING':
                      setExecutionState('Routing Intent');
                      if (event.payload && event.payload.data && event.payload.data.route) {
                        addTimelineEvent('system', `Routing intent resolved: [${event.payload.data.route}]`);
                      }
                      break;
                    case 'TOOL_START':
                      setExecutionState('Running System Tools');
                      if (event.payload && event.payload.data && event.payload.data.tool) {
                        addTimelineEvent('system', `Invoking tool: ${event.payload.data.tool}`);
                      }
                      break;
                    case 'TOOL_COMPLETE':
                      addTimelineEvent('diagnostics', `Tool execution complete.`);
                      break;
                    case 'MEMORY_STORE':
                      setExecutionState('Running System Tools');
                      addTimelineEvent('memory', 'Initiating memory storage transaction...');
                      break;
                    case 'MEMORY_STORED':
                      addTimelineEvent('memory', 'Stored new fact in neural memory');
                      break;
                    case 'MEMORY_RECALL':
                      setExecutionState('Running System Tools');
                      addTimelineEvent('memory', 'Searching semantic memory...');
                      break;
                    case 'MEMORY_RECALLED':
                      addTimelineEvent('memory', 'Retrieved memory matching query semantic context');
                      break;
                    case 'REMINDER_CREATE':
                      setExecutionState('Running System Tools');
                      addTimelineEvent('reminder', 'Scheduling temporal reminder...');
                      break;
                    case 'REMINDER_CREATED':
                      addTimelineEvent('reminder', 'Parsed and saved scheduled reminder');
                      break;
                    case 'RESPONSE_SYNTHESIS':
                      setExecutionState('Synthesizing Response');
                      break;
                    case 'PARTIAL_TEXT':
                      if (event.payload && event.payload.data && event.payload.data.text) {
                        const chunk = event.payload.data.text;
                        setMessages(prev => {
                          const last = prev[prev.length - 1];
                          if (last && last.id === 'jarvis-streaming') {
                            return [
                              ...prev.slice(0, -1),
                              { ...last, text: last.text + chunk }
                            ];
                          } else {
                            return [
                              ...prev,
                              {
                                id: 'jarvis-streaming',
                                sender: 'jarvis',
                                text: chunk,
                                timestamp: new Date()
                              }
                            ];
                          }
                        });
                      }
                      break;
                    case 'COMPLETE':
                      setExecutionState('Completed');
                      if (event.payload && event.payload.data) {
                        finalPayload = event.payload.data;
                      }
                      break;
                    default:
                      break;
                  }
                } catch (e) {
                  console.error("Failed to parse SSE line JSON:", e);
                }
              }
            }
          }
        }
      }
    } catch (sseErr) {
      console.warn("SSE stream connection failed or not supported. Falling back to HTTP POST /api/chat. Error:", sseErr);
      sseSuccess = false;
    }

    // 2. Fallback to standard HTTP POST if SSE failed or didn't yield a payload
    if (!sseSuccess || !finalPayload) {
      // Simulate progress steps since we are in sync fallback mode
      setExecutionState('Analyzing Request');
      const t1 = setTimeout(() => setExecutionState('Routing Intent'), 400);
      const t2 = setTimeout(() => setExecutionState('Running System Tools'), 1000);
      const t3 = setTimeout(() => setExecutionState('Synthesizing Response'), 1800);

      try {
        const response = await sendChatMessage(text);
        
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        setExecutionState('Completed');

        setIsConnected(response.success);
        if (response.success) {
          finalPayload = response.data;
          
          if (finalPayload.cpu_load !== null) {
            addTimelineEvent('diagnostics', `System metrics polled: CPU ${finalPayload.cpu_load}%, RAM ${finalPayload.ram_load}%`);
          }
          if (finalPayload.route) {
            addTimelineEvent('system', `Routing intent resolved: [${finalPayload.route}]`);
            if (finalPayload.route === 'MEMORY_STORE') {
              addTimelineEvent('memory', 'Stored new fact in neural memory');
            } else if (finalPayload.route === 'MEMORY_RECALL') {
              addTimelineEvent('memory', 'Retrieved memory matching query semantic context');
            } else if (finalPayload.route === 'REMINDER') {
              addTimelineEvent('reminder', 'Parsed and saved scheduled reminder');
            }
          }
        } else {
          finalPayload = {
            message: response.data.message || 'Operation failed.',
            gpu_load: 5,
            cpu_load: 0,
            ram_load: 0,
            disk_load: 0,
            temperature: 0,
            sync_active: false,
            route: 'CHAT'
          };
        }
      } catch (postErr) {
        console.error("Fallback POST chat endpoint also failed:", postErr);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        setExecutionState('Completed');
        
        finalPayload = {
          message: `[CONNECTION ERROR] Both streaming and fallback endpoints failed: ${postErr.message}`,
          gpu_load: 5,
          cpu_load: 0,
          ram_load: 0,
          disk_load: 0,
          temperature: 0,
          sync_active: false,
          route: 'CHAT'
        };
      }
    }

    // 3. Process the final response payload (from either SSE or Fallback POST)
    if (finalPayload) {
      setIsConnected(finalPayload.sync_active !== undefined ? finalPayload.sync_active : true);
      setGpuLoad(finalPayload.gpu_load !== undefined ? finalPayload.gpu_load : (finalPayload.gpuLoad || 10));
      
      const cpu = finalPayload.cpu_load !== undefined ? finalPayload.cpu_load : finalPayload.cpuLoad;
      if (cpu !== null && cpu !== undefined) {
        setTelemetry({
          cpuLoad: cpu,
          ramLoad: finalPayload.ram_load !== undefined ? finalPayload.ram_load : finalPayload.ramLoad,
          diskLoad: finalPayload.disk_load !== undefined ? finalPayload.disk_load : finalPayload.diskLoad,
          temperature: finalPayload.temperature || 45,
          syncActive: finalPayload.sync_active !== undefined ? finalPayload.sync_active : true
        });
      }

      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.id === 'jarvis-streaming') {
          return [
            ...prev.slice(0, -1),
            {
              id: `msg-${Date.now() + 1}`,
              sender: 'jarvis',
              text: finalPayload.message || last.text || 'JARVIS online.',
              action_taken: finalPayload.action_taken || null,
              timestamp: new Date()
            }
          ];
        } else {
          return [
            ...prev,
            {
              id: `msg-${Date.now() + 1}`,
              sender: 'jarvis',
              text: finalPayload.message || 'JARVIS online.',
              action_taken: finalPayload.action_taken || null,
              timestamp: new Date()
            }
          ];
        }
      });
      setIsThinking(false);

      // Refresh DB files
      await fetchReminders();
      await fetchMemories();
      await fetchMissions();
    }

    // Reset execution state to Idle after 2 seconds
    setTimeout(() => setExecutionState('Idle'), 2000);

    // Trigger local reminder creation only if backend call failed (offline override mode)
    if ((!sseSuccess && !isConnected) && localReminder) {
      const newRem = {
        id: `rem-fallback-${Date.now()}`,
        text: localReminder.text,
        time: localReminder.time,
        completed: false
      };
      setReminders(prev => [...prev, newRem]);
      addTimelineEvent('reminder', `Local offline fallback reminder queued: "${localReminder.text}"`);
    }
  };

  const clearChat = () => {
    window.localStorage.removeItem('jarvis_chat_session');
    setMessages([
      {
        id: `clear-${Date.now()}`,
        sender: 'jarvis',
        text: 'Systems reset. Logging cleared. Awaiting command.',
        timestamp: new Date()
      }
    ]);
    setCurrentRequestEvents([]);
    addTimelineEvent('system', 'Terminal chat logs cleared.');
  };

  const wipeSessionContext = async (userId = 'user_01', sessionId = 'default_session') => {
    try {
      const response = await fetch('http://localhost:8001/clear_session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          session_id: sessionId
        }),
      });
      if (response.ok) {
        addTimelineEvent('system', 'Session context and working memory wiped on backend.');
        return true;
      }
    } catch (err) {
      console.error("Failed to wipe session context:", err);
    }
    return false;
  };

  const resetConversation = async (userId = 'user_01', sessionId = 'default_session') => {
    // 1. Clear local storage and state
    window.localStorage.removeItem('jarvis_chat_session');
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'jarvis',
        text: getWelcomeMessage(reminders.length),
        timestamp: new Date()
      }
    ]);
    setIsThinking(false);
    setExecutionState('Idle');
    setCurrentRequestEvents([]);
    addTimelineEvent('system', 'Local chat cache and logs cleared.');

    // 2. Call backend /clear_session
    try {
      const response = await fetch('http://localhost:8001/clear_session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          session_id: sessionId
        }),
      });
      if (response.ok) {
        addTimelineEvent('system', 'Session context and working memory wiped on backend.');
        return true;
      }
    } catch (err) {
      console.error("Failed to wipe session context on backend:", err);
    }
    return false;
  };

  return (
    <JarvisContext.Provider value={{
      messages,
      isThinking,
      executionState,
      gpuLoad,
      telemetry,
      reminders,
      memories,
      dueReminders,
      timelineEvents,
      isConnected,
      isDeveloperMode,
      setIsDeveloperMode,
      currentRequestEvents,
      sendMessage,
      addReminder,
      toggleReminder,
      removeReminder,
      removeMemory,
      setDueReminders,
      addTimelineEvent,
      clearChat,
      wipeSessionContext,
      resetConversation,
      missions,
      fetchMissions,
      toggleMissionTask,
      removeMission
    }}>
      {children}
    </JarvisContext.Provider>
  );
}

export function useJarvis() {
  const context = useContext(JarvisContext);
  if (context === undefined) {
    throw new Error('useJarvis must be used within a JarvisProvider');
  }
  return context;
}

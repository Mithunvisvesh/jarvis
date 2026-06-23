import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  sendChatMessage, 
  getReminders, 
  createReminder, 
  updateReminderStatus, 
  deleteReminder,
  getMemories,
  deleteMemory,
  getDueReminders
} from '../services/api';

const JarvisContext = createContext(undefined);

export function JarvisProvider({ children }) {
  const [messages, setMessages] = useState([
    {
      id: 'init',
      sender: 'jarvis',
      text: 'JARVIS online. Core synchronization active. System diagnostics normal. Instruct me to analyze data, schedule tasks, or check local system state.',
      timestamp: new Date()
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);
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
        setReminders(data.map(item => ({
          id: item.id,
          text: item.title,
          time: item.day ? `${item.time} (${item.day})` : item.time,
          completed: item.status === 'completed'
        })));
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

  useEffect(() => {
    fetchReminders();
    fetchMemories();
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
    if (!text.trim()) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);
    addTimelineEvent('user', `Query submitted: "${text}"`);
    
    // Simulate real-time progress steps during request flight
    setExecutionState('Analyzing Request');
    const t1 = setTimeout(() => setExecutionState('Routing Intent'), 400);
    const t2 = setTimeout(() => setExecutionState('Running Tools'), 1000);
    const t3 = setTimeout(() => setExecutionState('Synthesizing Response'), 1800);

    const localReminder = parseReminderInPrompt(text);
    let response;

    try {
      // Call Backend API
      response = await sendChatMessage(text);
      
      // Stop the simulation timers and complete immediately
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setExecutionState('Completed');
      
      setIsConnected(response.success);
      setGpuLoad(response.data.gpu_load);
      
      if (response.data.cpu_load !== null && response.success) {
        setTelemetry({
          cpuLoad: response.data.cpu_load,
          ramLoad: response.data.ram_load,
          diskLoad: response.data.disk_load,
          temperature: response.data.temperature,
          syncActive: response.data.sync_active
        });
        
        addTimelineEvent('diagnostics', `System metrics polled: CPU ${response.data.cpu_load}%, RAM ${response.data.ram_load}%`);
      }

      if (response.success && response.data.route) {
        addTimelineEvent('system', `Routing intent resolved: [${response.data.route}]`);
        if (response.data.route === 'MEMORY_STORE') {
          addTimelineEvent('memory', 'Stored new fact in neural memory');
        } else if (response.data.route === 'MEMORY_RECALL') {
          addTimelineEvent('memory', 'Retrieved memory matching query semantic context');
        } else if (response.data.route === 'REMINDER') {
          addTimelineEvent('reminder', 'Parsed and saved scheduled reminder');
        }
      }

      // Refresh data
      if (response.success) {
        await fetchReminders();
        await fetchMemories();
      }

    } catch (err) {
      console.error(err);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setExecutionState('Completed');
      response = {
        success: false,
        data: { message: `[CONNECTION ERROR] ${err.message}` }
      };
    }

    const jarvisMsg = {
      id: `msg-${Date.now() + 1}`,
      sender: 'jarvis',
      text: response.data.message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, jarvisMsg]);
    setIsThinking(false);

    // Reset execution state to Idle after 2 seconds
    setTimeout(() => setExecutionState('Idle'), 2000);

    // Trigger local reminder creation only if backend call failed (offline override mode)
    if (!response.success && localReminder) {
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
    setMessages([
      {
        id: `clear-${Date.now()}`,
        sender: 'jarvis',
        text: 'Systems reset. Logging cleared. Awaiting command.',
        timestamp: new Date()
      }
    ]);
    addTimelineEvent('system', 'Terminal chat logs cleared.');
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
      sendMessage,
      addReminder,
      toggleReminder,
      removeReminder,
      removeMemory,
      setDueReminders,
      addTimelineEvent,
      clearChat
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

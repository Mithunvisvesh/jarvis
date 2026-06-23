import React, { createContext, useContext, useState, useEffect } from 'react';
import { sendChatMessage, getReminders, createReminder, updateReminderStatus, deleteReminder } from '../services/api';

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

  useEffect(() => {
    fetchReminders();
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

    await createReminder(title, time || "12:00 PM", type, day);
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
  };

  // Handler to delete a reminder
  const removeReminder = async (id) => {
    if (String(id).startsWith("rem-fallback-")) {
      setReminders(prev => prev.filter(rem => rem.id !== id));
      return;
    }
    await deleteReminder(id);
    await fetchReminders();
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
    
    const localReminder = parseReminderInPrompt(text);

    // Call Backend API
    const response = await sendChatMessage(text);
    
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
    }

    // Refresh reminders list from backend
    if (response.success) {
      await fetchReminders();
    }

    const jarvisMsg = {
      id: `msg-${Date.now() + 1}`,
      sender: 'jarvis',
      text: response.data.message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, jarvisMsg]);
    setIsThinking(false);

    // Trigger local reminder creation only if backend call failed (offline override mode)
    if (!response.success && localReminder) {
      const newRem = {
        id: `rem-fallback-${Date.now()}`,
        text: localReminder.text,
        time: localReminder.time,
        completed: false
      };
      setReminders(prev => [...prev, newRem]);
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
  };

  return (
    <JarvisContext.Provider value={{
      messages,
      isThinking,
      gpuLoad,
      telemetry,
      reminders,
      isConnected,
      sendMessage,
      addReminder,
      toggleReminder,
      removeReminder,
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

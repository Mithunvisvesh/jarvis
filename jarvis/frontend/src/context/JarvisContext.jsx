import React, { createContext, useContext, useState, useEffect } from 'react';
import { sendChatMessage } from '../services/api';

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

  const [reminders, setReminders] = useState([
    { id: 'rem-1', text: 'Go for a morning walk', time: '5:00 AM', completed: false },
    { id: 'rem-2', text: 'Take medicine.', time: '8:00 AM', completed: false },
    { id: 'rem-3', text: 'Team meeting on Telegram', time: '10:00 AM', completed: false }
  ]);

  // Periodic Telemetry Simulator to make meters "dance" in the UI
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry(prev => {
        // Only fluctuate if we are active
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
      
      // Slightly drift GPU load too unless actively processing
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
  const addReminder = (text, time) => {
    const newRem = {
      id: `rem-${Date.now()}`,
      text: text,
      time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      completed: false
    };
    setReminders(prev => [...prev, newRem]);
  };

  // Handler to toggle a reminder
  const toggleReminder = (id) => {
    setReminders(prev =>
      prev.map(rem => (rem.id === id ? { ...rem, completed: !rem.completed } : rem))
    );
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
    
    // Check if the user is asking to schedule a reminder locally
    const localReminder = parseReminderInPrompt(text);

    // Call Backend API
    const response = await sendChatMessage(text);
    
    setIsConnected(response.success);
    setGpuLoad(response.data.gpu_load);
    
    // Update telemetry from backend response if provided
    if (response.data.cpu_load !== null && response.success) {
      setTelemetry({
        cpuLoad: response.data.cpu_load,
        ramLoad: response.data.ram_load,
        diskLoad: response.data.disk_load,
        temperature: response.data.temperature,
        syncActive: response.data.sync_active
      });
    }

    const jarvisMsg = {
      id: `msg-${Date.now() + 1}`,
      sender: 'jarvis',
      text: response.data.message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, jarvisMsg]);
    setIsThinking(false);

    // Trigger local reminder creation if parsed
    if (localReminder) {
      addReminder(localReminder.text, localReminder.time);
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

import React, { useState, useRef, useEffect } from 'react';
import { useJarvis } from '../context/JarvisContext';
import { Send, Eye, ShieldAlert, Cpu, Trash2, Bell, Code, Database, Mic, MicOff } from 'lucide-react';
import DemoPanel from './DemoPanel';

function SystemStatus({ executionState, isConnected }) {
  let statusColor = 'var(--accent-green)';
  let glow = 'var(--glow-green)';
  let animation = 'none';

  if (!isConnected) {
    statusColor = 'var(--accent-pink)';
    glow = 'var(--glow-pink)';
  } else if (executionState === 'Analyzing Request' || executionState === 'Running System Tools') {
    statusColor = 'var(--accent-cyan)';
    glow = 'var(--glow-cyan)';
    animation = 'pulse-cyan 1.5s infinite ease-in-out';
  } else if (executionState === 'Routing Intent' || executionState === 'Synthesizing Response') {
    statusColor = 'var(--accent-pink)';
    glow = 'var(--glow-pink)';
    animation = 'pulse-pink 1.5s infinite ease-in-out';
  }

  return (
    <div 
      title={!isConnected ? "OFFLINE" : `SYSTEM STATUS: ${executionState.toUpperCase()}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        marginLeft: '4px',
        cursor: 'help'
      }}
    >
      <span 
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          boxShadow: glow,
          display: 'inline-block',
          animation: animation,
          transition: 'all 0.3s ease'
        }} 
      />
    </div>
  );
}

const stagePercentages = {
  'Idle': 100,
  'Analyzing Request': 25,
  'Routing Intent': 50,
  'Running System Tools': 75,
  'Synthesizing Response': 90,
  'Completed': 100
};

function ActionCard({ actionTaken }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderLeft: '2px solid rgba(0, 212, 255, 0.4)',
      padding: '8px 12px',
      marginBottom: '12px',
      borderRadius: '0 4px 4px 0',
      color: 'rgba(255, 255, 255, 0.8)',
      letterSpacing: '0.5px'
    }}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--accent-cyan)',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          fontWeight: 'bold',
          cursor: 'pointer',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          outline: 'none',
          letterSpacing: '1px'
        }}
      >
        <span>{isOpen ? '▼' : '▶'}</span>
        <span>What I did</span>
      </button>
      {isOpen && (
        <div style={{ marginTop: '8px', borderTop: '1px solid rgba(0, 212, 255, 0.1)', paddingTop: '6px', whiteSpace: 'pre-wrap' }}>
          {actionTaken}
        </div>
      )}
    </div>
  );
}

export default function ChatInterface() {
  const { 
    messages, 
    isThinking, 
    executionState, 
    sendMessage, 
    clearChat, 
    isConnected,
    dueReminders,
    setDueReminders,
    toggleReminder,
    isDeveloperMode,
    setIsDeveloperMode,
    wipeSessionContext,
    resetConversation,
    speakText,
    ttsEnabled
  } = useJarvis();
  const [input, setInput] = useState('');
  const [voiceError, setVoiceError] = useState(null);
  const messagesEndRef = useRef(null);
  
  const [resetStage, setResetStage] = useState(0); // 0 = idle, 1 = confirm
  const resetTimerRef = useRef(null);

  const handleResetClick = () => {
    if (resetStage === 0) {
      setResetStage(1);
      resetTimerRef.current = setTimeout(() => {
        setResetStage(0);
      }, 3000); // 3 seconds timeout
    } else {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetConversation();
      setInput('');
      setResetStage(0);
    }
  };

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const latestInput = useRef('');
  const transcribedTextRef = useRef('');

  useEffect(() => {
    latestInput.current = input;
  }, [input]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        transcribedTextRef.current = '';
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setInput(transcript);
        transcribedTextRef.current = transcript;
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceError("Microphone permission blocked. Please allow mic access in your browser settings.");
        } else if (event.error === 'no-speech') {
          setVoiceError("No speech detected. Try speaking closer to the mic.");
        } else if (event.error === 'network') {
          setVoiceError("Speech network error. Ensure internet connection.");
        } else {
          setVoiceError(`Microphone error: ${event.error}`);
        }
        setTimeout(() => setVoiceError(null), 6000);
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalVal = transcribedTextRef.current || latestInput.current;
        if (finalVal.trim()) {
          sendMessage(finalVal.trim());
          setInput('');
          transcribedTextRef.current = '';
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setVoiceError("Voice requires Chrome, Edge, or Safari");
      setTimeout(() => setVoiceError(null), 4000);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Failed to stop speech recognition:", err);
      }
    } else {
      setInput('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  const stages = ['Analyzing Request', 'Routing Intent', 'Running System Tools', 'Synthesizing Response', 'Completed'];

  const prevThinkingRef = useRef(false);
  useEffect(() => {
    if (prevThinkingRef.current === true && isThinking === false) {
      if (ttsEnabled && messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.sender === 'jarvis') {
          speakText(lastMsg.text);
        }
      }
    }
    prevThinkingRef.current = isThinking;
  }, [isThinking, messages, ttsEnabled, speakText]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, executionState]);



  const handleSend = (e) => {
    e.preventDefault();
    if (isThinking || !input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const quickPrompts = [
    { text: 'Check my system stats' },
    { text: 'Schedule a reminder' },
    { text: 'Help me finish my capstone' }
  ];

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'rgba(5, 8, 16, 0.65)',
        overflow: 'hidden',
        position: 'relative',
        transition: 'all 0.3s ease-in-out'
      }}
    >
      {/* Header Banner */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(10, 14, 24, 0.4)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{
            fontFamily: 'var(--font-header)',
            fontSize: '18px',
            fontWeight: '600',
            letterSpacing: '1.5px',
            color: 'var(--text-primary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            JARVIS
            <span style={{
              fontSize: '9px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-cyan)',
              border: '1px solid var(--border-cyan)',
              padding: '1px 5px',
              borderRadius: '3px',
              background: 'rgba(0, 212, 255, 0.05)'
            }}>
              v2.0
            </span>
          </h1>
          <SystemStatus executionState={executionState} isConnected={isConnected} />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Due reminders count badge */}
          {dueReminders.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--accent-orange)',
              border: '1px solid rgba(255, 107, 53, 0.4)',
              padding: '3px 8px',
              borderRadius: '10px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(255, 107, 53, 0.08)',
              animation: 'pulse-pink 2s infinite'
            }}>
              <Bell size={10} style={{ fill: 'var(--accent-orange)' }} />
              <span>{dueReminders.length} ALERT</span>
            </div>
          )}

          <button 
            onClick={handleResetClick}
            title="Reset Conversation (Clear Local Storage & Backend Context)"
            style={{
              background: resetStage === 1 ? 'rgba(255, 0, 0, 0.15)' : 'none',
              border: resetStage === 1 ? '1px solid #FF0000' : '1px solid rgba(255, 0, 128, 0.3)',
              color: resetStage === 1 ? '#FF0000' : 'var(--accent-pink)',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '10px',
              fontFamily: 'var(--font-nav)',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              boxShadow: resetStage === 1 ? '0 0 10px rgba(255, 0, 0, 0.3)' : 'none',
              animation: resetStage === 1 ? 'pulse-pink 1.5s infinite ease-in-out' : 'none'
            }}
            onMouseEnter={(e) => {
              if (resetStage === 0) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 0, 128, 0.05)';
                e.currentTarget.style.boxShadow = 'var(--glow-pink)';
                e.currentTarget.style.borderColor = 'var(--accent-pink)';
              }
            }}
            onMouseLeave={(e) => {
              if (resetStage === 0) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(255, 0, 128, 0.3)';
              }
            }}
          >
            <Database size={12} />
            <span>{resetStage === 1 ? 'Confirm?' : 'New Session'}</span>
          </button>
        </div>
      </div>

      <DemoPanel />

      {/* Due Reminder Alert Banner Area */}
      {dueReminders.length > 0 && (
        <div className="cyber-panel" style={{
          background: 'rgba(255, 107, 53, 0.08)',
          borderLeft: '3px solid var(--accent-orange)',
          borderBottom: '1px solid rgba(255, 107, 53, 0.2)',
          padding: '12px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--accent-orange)',
            fontFamily: 'var(--font-nav)',
            fontSize: '12px',
            fontWeight: 'bold',
            letterSpacing: '1px'
          }}>
            <ShieldAlert size={14} />
            <span>DUE REMINDERS</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {dueReminders.map(rem => (
              <div 
                key={rem.id} 
                style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  fontSize: '11px', 
                  background: 'rgba(0, 0, 0, 0.3)', 
                  padding: '6px 12px', 
                  borderRadius: '4px', 
                  border: '1px solid rgba(255, 107, 53, 0.15)' 
                }}
              >
                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                  {rem.title} (Time: {rem.time})
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={async () => {
                      await toggleReminder(rem.id);
                      setDueReminders(prev => prev.filter(r => r.id !== rem.id));
                    }}
                    style={{
                      background: 'var(--accent-orange)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '2px',
                      padding: '2px 8px',
                      fontSize: '9px',
                      fontFamily: 'var(--font-nav)',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    RESOLVE
                  </button>
                  <button 
                    onClick={() => {
                      setDueReminders(prev => prev.filter(r => r.id !== rem.id));
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'var(--text-secondary)',
                      borderRadius: '2px',
                      padding: '2px 8px',
                      fontSize: '9px',
                      fontFamily: 'var(--font-nav)',
                      cursor: 'pointer'
                    }}
                  >
                    DISMISS
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {messages.map((msg) => {
          const isJarvis = msg.sender === 'jarvis';
          return (
            <div 
              key={msg.id}
              className="message-slide-in"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isJarvis ? 'flex-start' : 'flex-end',
                maxWidth: '85%',
                alignSelf: isJarvis ? 'flex-start' : 'flex-end',
              }}
            >
              {/* Message Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '6px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isJarvis ? 'var(--accent-cyan)' : 'var(--accent-pink)',
                  boxShadow: isJarvis ? 'var(--glow-cyan)' : 'var(--glow-pink)',
                  display: 'inline-block'
                }} />
                <span style={{
                  fontFamily: 'var(--font-header)',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: isJarvis ? 'var(--accent-cyan)' : 'var(--accent-pink)',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase'
                }}>
                  {isJarvis ? 'JARVIS' : 'USER'}
                </span>
              </div>

              {/* Message Bubble */}
              <div 
                className={isJarvis ? "cyber-panel" : "cyber-panel cyber-panel-pink"}
                style={{
                  padding: '18px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: 'var(--text-primary)',
                  letterSpacing: '0.2px',
                  whiteSpace: 'pre-wrap',
                  borderLeft: isJarvis ? 'none' : '1px solid rgba(255, 0, 128, 0.4)',
                  backgroundColor: isJarvis ? 'rgba(10, 15, 30, 0.5)' : 'rgba(255, 0, 128, 0.03)',
                  border: isJarvis ? '1px solid var(--border-muted)' : '1px solid rgba(255, 0, 128, 0.15)'
                }}
              >
                {isJarvis && msg.action_taken && (
                  <ActionCard actionTaken={msg.action_taken} />
                )}
                {msg.text}
              </div>
            </div>
          );
        })}

        {/* Real-time Agent Execution Horizontal Progress Indicator */}
        {isThinking && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            alignSelf: 'flex-start',
            width: '100%',
            maxWidth: '480px',
            gap: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-cyan)',
                boxShadow: 'var(--glow-cyan)',
                display: 'inline-block',
                animation: 'pulse-cyan 1.5s infinite ease-in-out'
              }} />
              <span style={{
                fontFamily: 'var(--font-header)',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                JARVIS is processing...
              </span>
            </div>
            
            <div 
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-muted)',
                borderRadius: '4px',
                padding: '12px 16px',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <span>{executionState}</span>
                <span style={{ color: 'var(--accent-cyan)' }}>{stagePercentages[executionState] || 100}%</span>
              </div>
              
              {/* Progress track */}
              <div style={{
                height: '4px',
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {/* Progress bar fill */}
                <div style={{
                  height: '100%',
                  width: `${stagePercentages[executionState] || 100}%`,
                  backgroundColor: 'var(--accent-cyan)',
                  boxShadow: 'var(--glow-cyan)',
                  borderRadius: '2px',
                  transition: 'width 0.4s ease-out',
                  position: 'relative',
                  backgroundImage: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-pink))'
                }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Interface Bar */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border-muted)',
        background: 'rgba(5, 8, 16, 0.9)',
        flexShrink: 0
      }}>
        {/* Quick Prompts */}
        {messages.length <= 1 && !isThinking && (
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
            flexWrap: 'wrap'
          }}>
            {quickPrompts.map((p, idx) => (
              <button 
                key={idx}
                onClick={() => setInput(p.text)}
                style={{
                  background: 'rgba(0, 212, 255, 0.05)',
                  border: '1px solid rgba(0, 212, 255, 0.15)',
                  color: 'var(--accent-cyan)',
                  fontSize: '10px',
                  fontFamily: 'var(--font-nav)',
                  padding: '4px 10px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: '600'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                  e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {p.text}
              </button>
            ))}
          </div>
        )}

        {voiceError && (
          <div style={{
            color: 'var(--accent-pink)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            margin: '0 0 8px 4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: 'var(--accent-pink)', borderRadius: '50%' }}></span>
            {voiceError}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isThinking || isListening}
            placeholder={isListening ? 'Listening... Speak now.' : (isThinking ? 'JARVIS is thinking...' : 'Ask JARVIS anything...')}
            style={{
              flex: 1,
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-muted)',
              borderRadius: '4px',
              padding: '12px 16px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              outline: 'none',
              transition: 'all 0.3s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-muted)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button 
            type="button"
            onClick={toggleListening}
            disabled={isThinking}
            style={{
              background: isListening ? 'rgba(255, 0, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: isListening ? '1px solid var(--accent-pink)' : '1px solid var(--border-muted)',
              color: isListening ? 'var(--accent-pink)' : 'var(--text-secondary)',
              padding: '0 12px',
              borderRadius: '4px',
              cursor: isThinking ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              boxShadow: isListening ? 'var(--glow-pink)' : 'none',
            }}
            title={isListening ? "Listening... Speak now. Tap to stop." : isSpeechSupported ? "Voice Input" : "Voice Input (Unsupported in this browser)"}
          >
            {!isSpeechSupported ? (
              <MicOff size={16} />
            ) : isListening ? (
              <Mic size={16} className="mic-listening" />
            ) : (
              <Mic size={16} />
            )}
          </button>
          <button 
            type="submit"
            disabled={isThinking || isListening || !input.trim()}
            style={{
              background: input.trim() && !isListening ? 'var(--accent-cyan)' : 'rgba(0, 212, 255, 0.1)',
              color: '#000',
              border: 'none',
              padding: '0 20px',
              borderRadius: '4px',
              cursor: input.trim() && !isListening ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: input.trim() && !isListening ? 'var(--glow-cyan)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (input.trim() && !isListening) {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none';
            }}
          >
            <Send size={16} style={{ color: '#050810', strokeWidth: 2.5 }} />
          </button>
        </form>
      </div>
    </div>
  );
}

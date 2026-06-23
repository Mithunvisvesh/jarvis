import React, { useState, useRef, useEffect } from 'react';
import { useJarvis } from '../context/JarvisContext';
import { Send, Eye, ShieldAlert, Cpu, Trash2 } from 'lucide-react';

export default function ChatInterface() {
  const { messages, isThinking, sendMessage, clearChat, isConnected } = useJarvis();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const quickPrompts = [
    { text: 'System Diagnostics', label: 'SYS_CHECK' },
    { text: 'Schedule team sprint at 2:00 PM', label: 'ADD_REMINDER' },
    { text: 'Is the ReAct Agent online?', label: 'AGENT_PING' }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'rgba(5, 8, 16, 0.65)',
      borderRight: '1px solid var(--border-muted)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Header Banner */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(10, 14, 24, 0.4)'
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-header)',
            fontSize: '18px',
            fontWeight: '600',
            letterSpacing: '1px',
            color: 'var(--text-primary)',
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
              verticalAlign: 'middle',
              background: 'rgba(0, 212, 255, 0.05)'
            }}>
              v2.0-ADK
            </span>
          </h1>
          <p style={{
            fontFamily: 'var(--font-nav)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            marginTop: '2px',
            letterSpacing: '0.5px'
          }}>
            SECURE INTELLECTUAL OVERLAY CORE
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Connection status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginRight: '8px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: isConnected ? 'var(--accent-green)' : 'var(--accent-pink)',
            border: `1px solid ${isConnected ? 'var(--accent-green)40' : 'var(--accent-pink)40'}`,
            padding: '2px 8px',
            borderRadius: '10px',
            background: isConnected ? 'rgba(0, 255, 159, 0.02)' : 'rgba(255, 0, 128, 0.02)'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isConnected ? 'var(--accent-green)' : 'var(--accent-pink)',
              boxShadow: isConnected ? 'var(--glow-green)' : 'var(--glow-pink)'
            }} />
            {isConnected ? 'IPC_ONLINE' : 'IPC_OFFLINE'}
          </div>

          <button 
            onClick={clearChat}
            title="RESET LOGGER"
            style={{
              background: 'none',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-secondary)',
              padding: '6px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent-pink)';
              e.currentTarget.style.borderColor = 'var(--accent-pink)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

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
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isJarvis ? 'flex-start' : 'flex-end',
                maxWidth: '85%',
                alignSelf: isJarvis ? 'flex-start' : 'flex-end',
              }}
            >
              {/* Message Header */}
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: isJarvis ? 'var(--accent-cyan)' : 'var(--accent-pink)',
                marginBottom: '4px',
                letterSpacing: '1px'
              }}>
                {isJarvis ? '🤖 JARVIS // SYSTEM_RESP' : '👤 VIBE_CODER // IN_PROMPT'}
              </span>

              {/* Message Bubble */}
              <div 
                className={isJarvis ? "cyber-panel" : "cyber-panel cyber-panel-pink"}
                style={{
                  padding: '12px 16px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: 'var(--text-primary)',
                  letterSpacing: '0.2px',
                  boxShadow: isJarvis ? 'none' : 'none',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isThinking && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            alignSelf: 'flex-start',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--accent-cyan)',
              marginBottom: '4px',
              letterSpacing: '1px'
            }}>
              🤖 JARVIS // EVAL_CYCLE
            </span>
            <div className="cyber-panel thinking-pulse" style={{
              padding: '12px 16px',
              borderRadius: '4px',
              fontSize: '13px',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-cyan)',
                boxShadow: '0 0 10px var(--accent-cyan)',
                animation: 'pulse-cyan 1s infinite'
              }} />
              <span>ROUTING GRAPH STATE... RE-ACT EVALUATION IN PROGRESS</span>
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
                [{p.label}] {p.text}
              </button>
            ))}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isThinking}
            placeholder={isThinking ? 'JARVIS is thinking...' : 'Input operational prompts (e.g. check system diagnostics)...'}
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
            type="submit"
            disabled={isThinking || !input.trim()}
            style={{
              background: input.trim() ? 'var(--accent-cyan)' : 'rgba(0, 212, 255, 0.1)',
              color: '#000',
              border: 'none',
              padding: '0 20px',
              borderRadius: '4px',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: input.trim() ? 'var(--glow-cyan)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (input.trim()) {
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

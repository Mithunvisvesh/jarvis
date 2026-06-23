import React, { useState } from 'react';
import { useJarvis } from '../context/JarvisContext';
import { Calendar, Plus, Clock, CheckCircle2, Circle } from 'lucide-react';

export default function TemporalBuffer() {
  const { reminders, addReminder, toggleReminder } = useJarvis();
  const [showAddForm, setShowAddForm] = useState(false);
  const [text, setText] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    addReminder(text, time);
    setText('');
    setTime('');
    setShowAddForm(false);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden',
      gap: '12px',
      marginTop: '8px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          fontFamily: 'var(--font-nav)',
          fontSize: '12px',
          fontWeight: 'bold',
          letterSpacing: '1.5px',
          color: 'var(--accent-cyan)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Calendar size={14} />
          TEMPORAL BUFFER
        </div>
        
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-cyan)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px',
            borderRadius: '4px',
            transition: 'all 0.2s',
            border: '1px solid rgba(0, 212, 255, 0.25)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
            e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Add Reminder Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="cyber-panel" style={{
          padding: '10px',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          borderLeft: '3px solid var(--accent-cyan)',
        }}>
          <input 
            type="text"
            placeholder="Reminder task..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              borderRadius: '2px',
              padding: '4px 8px',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'var(--font-body)',
              outline: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <input 
              type="text"
              placeholder="e.g. 10:00 AM"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(0, 212, 255, 0.2)',
                borderRadius: '2px',
                padding: '4px 8px',
                color: 'var(--text-primary)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                flex: 1
              }}
            />
            <button type="submit" style={{
              background: 'var(--accent-cyan)',
              color: '#000',
              border: 'none',
              padding: '0 12px',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '10px',
              fontFamily: 'var(--font-nav)',
              fontWeight: 'bold'
            }}>
              QUEUE
            </button>
          </div>
        </form>
      )}

      {/* Reminders List */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        overflowY: 'auto',
        flex: 1,
        paddingRight: '2px'
      }}>
        {reminders.length === 0 ? (
          <div style={{
            fontSize: '11px',
            color: 'var(--text-dark)',
            textAlign: 'center',
            padding: '20px 0',
            fontStyle: 'italic',
            fontFamily: 'var(--font-mono)'
          }}>
            BUFFER_EMPTY
          </div>
        ) : (
          reminders.map((rem) => (
            <div 
              key={rem.id}
              className="cyber-panel"
              onClick={() => toggleReminder(rem.id)}
              style={{
                padding: '10px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                opacity: rem.completed ? 0.6 : 1,
                borderLeft: rem.completed 
                  ? '3px solid var(--text-dark)' 
                  : '3px solid var(--accent-cyan)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                <span style={{ color: rem.completed ? 'var(--text-dark)' : 'var(--accent-cyan)', display: 'flex', alignItems: 'center' }}>
                  {rem.completed ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                </span>
                <span style={{
                  fontSize: '11px',
                  textDecoration: rem.completed ? 'line-through' : 'none',
                  color: rem.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {rem.text}
                </span>
              </div>
              <div style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: rem.completed ? 'var(--text-dark)' : 'var(--accent-orange)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Clock size={10} />
                {rem.time}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

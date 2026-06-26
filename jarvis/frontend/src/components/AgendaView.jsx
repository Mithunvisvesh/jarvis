import React, { useState } from 'react';
import { useJarvis } from '../context/JarvisContext';
import { Calendar, Plus, Clock, CheckCircle2, Circle, Trash2, X } from 'lucide-react';

export default function AgendaView() {
  const { reminders, addReminder, toggleReminder, removeReminder } = useJarvis();
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

  const categorizeReminder = (rem) => {
    if (rem.completed) {
      const todayDayName = new Date().toLocaleDateString(undefined, { weekday: 'long' });
      const remDay = rem.day;
      if (!remDay || remDay.toLowerCase() === 'today' || (rem.type === 'weekly' && remDay.toLowerCase() === todayDayName.toLowerCase())) {
        return 'today';
      }
      return 'upcoming';
    }
    
    const now = new Date();
    const todayDate = now.getDate();
    const todayMonth = now.getMonth();
    const todayYear = now.getFullYear();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const todayDayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
    
    const remType = rem.type || 'one-time';
    const remDay = rem.day;
    const remTime = rem.rawTime || '';
    
    let hours = 0;
    let minutes = 0;
    if (remTime.includes(':')) {
      const parts = remTime.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
    }
    
    let isToday = false;
    let isOverdue = false;
    
    let createdDate = rem.created_at ? new Date(rem.created_at) : now;
    
    if (remType === 'daily') {
      isToday = true;
    } else if (remType === 'weekly') {
      if (remDay && remDay.toLowerCase() === todayDayName.toLowerCase()) {
        isToday = true;
        const remDateTimeToday = new Date(todayYear, todayMonth, todayDate, hours, minutes);
        if (now > remDateTimeToday) {
          isOverdue = true;
        }
      } else {
        return 'upcoming';
      }
    } else if (remType === 'one-time') {
      if (!remDay || remDay.toLowerCase() === 'today') {
        isToday = true;
        const remDateTimeToday = new Date(todayYear, todayMonth, todayDate, hours, minutes);
        if (now > remDateTimeToday) {
          isOverdue = true;
        }
      } else if (remDay.toLowerCase() === 'tomorrow') {
        const diffTime = now.getTime() - createdDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        const createdDay = createdDate.getDate();
        const createdMonth = createdDate.getMonth();
        const createdYear = createdDate.getFullYear();
        const scheduledDate = new Date(createdYear, createdMonth, createdDay + 1, hours, minutes);
        
        if (now.getDate() === scheduledDate.getDate() && now.getMonth() === scheduledDate.getMonth() && now.getFullYear() === scheduledDate.getFullYear()) {
          isToday = true;
          if (now > scheduledDate) {
            isOverdue = true;
          }
        } else if (now > scheduledDate) {
          isOverdue = true;
        } else {
          return 'upcoming';
        }
      } else {
        let parsedMonth = -1;
        let parsedDay = -1;
        
        monthNames.forEach((name, idx) => {
          if (remDay.toLowerCase().includes(name.toLowerCase())) {
            parsedMonth = idx;
          }
        });
        
        const numbers = remDay.match(/\d+/);
        if (numbers) {
          parsedDay = parseInt(numbers[0], 10);
        }
        
        if (parsedMonth !== -1 && parsedDay !== -1) {
          const scheduledDate = new Date(todayYear, parsedMonth, parsedDay, hours, minutes);
          const scheduledDateStart = new Date(todayYear, parsedMonth, parsedDay, 0, 0, 0);
          const todayStart = new Date(todayYear, todayMonth, todayDate, 0, 0, 0);
          
          if (scheduledDateStart.getTime() === todayStart.getTime()) {
            isToday = true;
            if (now > scheduledDate) {
              isOverdue = true;
            }
          } else if (now > scheduledDate) {
            isOverdue = true;
          } else {
            return 'upcoming';
          }
        } else {
          return 'upcoming';
        }
      }
    }
    
    if (isOverdue) return 'overdue';
    if (isToday) return 'today';
    return 'upcoming';
  };

  const overdueGroup = [];
  const todayGroup = [];
  const upcomingGroup = [];

  reminders.forEach(rem => {
    const category = categorizeReminder(rem);
    if (category === 'overdue') overdueGroup.push(rem);
    else if (category === 'today') todayGroup.push(rem);
    else upcomingGroup.push(rem);
  });

  const renderReminderCard = (rem) => (
    <div 
      key={rem.id}
      className="cyber-panel"
      onClick={() => toggleReminder(rem.id)}
      style={{
        padding: '16px 20px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        opacity: rem.completed ? 0.5 : 1,
        borderLeft: rem.completed 
          ? '3px solid var(--text-dark)' 
          : (categorizeReminder(rem) === 'overdue' 
              ? '3px solid var(--accent-pink)' 
              : '3px solid var(--accent-cyan)'),
        backgroundColor: 'rgba(10, 14, 24, 0.4)',
        transition: 'all 0.2s ease',
        marginBottom: '8px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, overflow: 'hidden' }}>
        <span style={{ color: rem.completed ? 'var(--text-dark)' : (categorizeReminder(rem) === 'overdue' ? 'var(--accent-pink)' : 'var(--accent-cyan)'), display: 'flex', alignItems: 'center' }}>
          {rem.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </span>
        <span style={{
          fontSize: '13.5px',
          textDecoration: rem.completed ? 'line-through' : 'none',
          color: rem.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
          fontWeight: rem.completed ? 'normal' : '500',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {rem.text}
        </span>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: rem.completed ? 'var(--text-dark)' : (categorizeReminder(rem) === 'overdue' ? 'var(--accent-pink)' : 'var(--accent-orange)'),
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Clock size={12} />
          <span>{rem.time.toUpperCase()}</span>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeReminder(rem.id);
          }}
          title="Remove Task"
          style={{
            background: 'none',
            border: 'none',
            color: rem.completed ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-pink)'}
          onMouseLeave={(e) => e.currentTarget.style.color = rem.completed ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-secondary)'}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'rgba(5, 8, 16, 0.65)',
      overflow: 'hidden',
      position: 'relative',
      transition: 'all 0.3s ease-in-out',
    }}>
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
        <div>
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
            <Calendar size={18} style={{ color: 'var(--accent-cyan)' }} />
            AGENDA
          </h1>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)'
          }}>
            TEMPORAL INTEL SYSTEM // ACTIVE REMINDER MATRIX
          </p>
        </div>

        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: showAddForm ? 'rgba(255, 0, 128, 0.1)' : 'rgba(0, 212, 255, 0.08)',
            border: showAddForm ? '1px solid var(--accent-pink)' : '1px solid rgba(0, 212, 255, 0.3)',
            color: showAddForm ? 'var(--accent-pink)' : 'var(--accent-cyan)',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontFamily: 'var(--font-nav)',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            boxShadow: showAddForm ? 'none' : 'var(--glow-cyan)'
          }}
        >
          {showAddForm ? (
            <>
              <X size={12} />
              <span>CANCEL</span>
            </>
          ) : (
            <>
              <Plus size={12} />
              <span>NEW TASK</span>
            </>
          )}
        </button>
      </div>

      {/* Main Workspace Area */}
      <div style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Add Task Panel */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="cyber-panel" style={{
            padding: '20px',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            borderLeft: '4px solid var(--accent-cyan)',
            background: 'rgba(10, 14, 24, 0.9)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{
              fontSize: '12px',
              fontFamily: 'var(--font-nav)',
              fontWeight: 'bold',
              letterSpacing: '1px',
              color: 'var(--accent-cyan)',
              margin: 0
            }}>
              INITIALIZE NEW REMINDER OPERATIONAL TASK
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                TASK DESCRIPTION
              </label>
              <input 
                type="text"
                placeholder="What should JARVIS remind you about? (e.g., schedule sprint meeting)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: '4px',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-muted)'}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  EXECUTION TIME / PATTERN
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 2:00 PM, tomorrow at 5 PM, every Sunday at 9 AM"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-muted)',
                    borderRadius: '4px',
                    padding: '10px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-muted)'}
                />
              </div>

              <button type="submit" style={{
                background: 'var(--accent-cyan)',
                color: '#050810',
                border: 'none',
                padding: '0 24px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'var(--font-nav)',
                fontWeight: 'bold',
                alignSelf: 'flex-end',
                height: '38px',
                boxShadow: 'var(--glow-cyan)'
              }}>
                QUEUE TASK
              </button>
            </div>
          </form>
        )}

        {/* Reminders List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reminders.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 24px',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
              gap: '16px',
              border: '1px dashed var(--border-muted)',
              borderRadius: '8px',
              background: 'rgba(10, 14, 24, 0.25)',
              opacity: 0.85
            }}>
              <Calendar size={36} style={{ color: 'var(--accent-cyan)', filter: 'drop-shadow(0 0 8px rgba(0, 212, 255, 0.35))' }} />
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '1px' }}>
                NO TEMPORAL OPERATIONS DETECTED
              </div>
              <div style={{ fontSize: '11px', maxWidth: '380px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                Your schedule queue is currently empty. Initialize a new task using the <strong style={{ color: 'var(--accent-cyan)' }}>NEW TASK</strong> button above, or request scheduling in natural language.
              </div>
              <div style={{
                fontSize: '10px',
                color: 'var(--text-dark)',
                borderTop: '1px solid var(--border-muted)',
                paddingTop: '12px',
                width: '100%',
                maxWidth: '300px'
              }}>
                Try: "Remind me to finish slide deck tomorrow at 9:00 AM"
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {overdueGroup.length > 0 && (
                <div>
                  <h3 style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-header)',
                    color: 'var(--accent-pink)',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    margin: '0 0 10px 0',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-pink)',
                      boxShadow: 'var(--glow-pink)'
                    }} />
                    OVERDUE ({overdueGroup.length})
                  </h3>
                  {overdueGroup.map(renderReminderCard)}
                </div>
              )}

              {todayGroup.length > 0 && (
                <div>
                  <h3 style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-header)',
                    color: 'var(--accent-cyan)',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    margin: '8px 0 10px 0',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-cyan)',
                      boxShadow: 'var(--glow-cyan)'
                    }} />
                    TODAY ({todayGroup.length})
                  </h3>
                  {todayGroup.map(renderReminderCard)}
                </div>
              )}

              {upcomingGroup.length > 0 && (
                <div>
                  <h3 style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-header)',
                    color: 'var(--text-secondary)',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    margin: '8px 0 10px 0',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--text-secondary)'
                    }} />
                    UPCOMING ({upcomingGroup.length})
                  </h3>
                  {upcomingGroup.map(renderReminderCard)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

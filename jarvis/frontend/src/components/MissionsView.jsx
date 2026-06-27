import React, { useState, useRef, useEffect } from 'react';
import { useJarvis } from '../context/JarvisContext';
import { Target, CheckSquare, Square, Trash2, ShieldAlert } from 'lucide-react';

export default function MissionsView() {
  const { missions, toggleMissionTask, removeMission } = useJarvis();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const confirmTimeoutRef = useRef(null);

  const handleDeleteClick = (missionId) => {
    if (confirmingDeleteId === missionId) {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      removeMission(missionId);
      setConfirmingDeleteId(null);
    } else {
      setConfirmingDeleteId(missionId);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = setTimeout(() => {
        setConfirmingDeleteId(null);
      }, 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'rgba(5, 8, 16, 0.65)',
      overflow: 'hidden',
      position: 'relative',
      transition: 'all 0.3s ease-in-out',
      width: '100%'
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
            <Target size={18} style={{ color: 'var(--accent-cyan)' }} />
            MISSIONS
          </h1>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)'
          }}>
            Your active goals and tasks
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {missions.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            textAlign: 'center',
            gap: '12px',
            opacity: 0.8
          }}>
            <ShieldAlert size={36} style={{ color: 'var(--accent-cyan)' }} />
            <div>No active missions. Tell me what you're working toward.</div>
            <div style={{ fontSize: '11px', maxWidth: '300px', lineHeight: '1.5' }}>
              Type a goal-oriented request in the chat (e.g., "Help me finish my capstone") to initiate a new mission.
            </div>
          </div>
        ) : (
          missions.map((mission) => {
            const completedCount = mission.tasks.filter(t => t.completed).length;
            const totalCount = mission.tasks.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return (
              <div 
                key={mission.id}
                className="cyber-panel"
                style={{
                  background: 'rgba(10, 14, 24, 0.45)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: '8px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Mission Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <div>
                    <h2 style={{
                      margin: 0,
                      fontFamily: 'var(--font-header)',
                      fontSize: '15px',
                      color: 'var(--accent-cyan)',
                      letterSpacing: '1px'
                    }}>
                      {mission.title}
                    </h2>
                    <p style={{
                      margin: '4px 0 0 0',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)'
                    }}>
                      Goal: "{mission.goal}"
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => handleDeleteClick(mission.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: confirmingDeleteId === mission.id ? 'var(--accent-pink)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)'
                    }}
                    title={confirmingDeleteId === mission.id ? "CONFIRM DISMISS?" : "DISMISS MISSION"}
                  >
                    {confirmingDeleteId === mission.id ? (
                      <>
                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent-pink)' }}>CONFIRM?</span>
                        <Trash2 size={14} style={{ color: 'var(--accent-pink)' }} />
                      </>
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>

                {/* Progress Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)'
                  }}>
                    <span>PROGRESS STATUS</span>
                    <span>{completedCount} / {totalCount} TASKS COMPLETED ({progressPercent}%)</span>
                  </div>
                  <div style={{
                    height: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <div style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--accent-cyan), #00ff9f)',
                      boxShadow: '0 0 8px var(--accent-cyan)',
                      transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>
                </div>

                {/* Tasks List */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingTop: '12px'
                }}>
                  {mission.tasks.map((task) => (
                    <div 
                      key={task.id}
                      onClick={() => toggleMissionTask(mission.id, task.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        userSelect: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)';
                        e.currentTarget.style.backgroundColor = 'rgba(0, 212, 255, 0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.02)';
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                      }}
                    >
                      {task.completed ? (
                        <CheckSquare size={16} style={{ color: '#00ff9f', flexShrink: 0 }} />
                      ) : (
                        <Square size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontSize: '12px',
                        fontFamily: 'var(--font-body)',
                        color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: task.completed ? 'line-through' : 'none',
                        transition: 'color 0.2s'
                      }}>
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

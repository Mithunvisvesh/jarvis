import React from 'react';
import { useJarvis } from '../context/JarvisContext';
import { Cpu, Server, Database, HardDrive } from 'lucide-react';

export default function TelemetryPanel() {
  const { gpuLoad, telemetry } = useJarvis();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      paddingBottom: '16px',
      borderBottom: '1px solid var(--border-muted)',
    }}>
      {/* Title */}
      <div style={{
        fontFamily: 'var(--font-nav)',
        fontSize: '12px',
        fontWeight: 'bold',
        letterSpacing: '1.5px',
        color: 'var(--accent-cyan)',
        marginBottom: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <Server size={14} />
        DIAGNOSTIC TELEMETRY
      </div>

      {/* CORE NODE */}
      <div className="cyber-panel" style={{
        padding: '10px 12px',
        borderRadius: '4px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-nav)', color: 'var(--text-secondary)' }}>
            CORE NODE
          </span>
          <span style={{ 
            fontSize: '11px', 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--accent-cyan)',
            fontWeight: '600'
          }}>
            NODE_01_ACTIVE
          </span>
        </div>
        <div style={{ 
          fontSize: '14px', 
          fontFamily: 'var(--font-mono)', 
          marginTop: '4px',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Cpu size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span>GEMINI_FLASH_2.5</span>
        </div>
      </div>

      {/* NEURAL CACHE */}
      <div className="cyber-panel" style={{
        padding: '10px 12px',
        borderRadius: '4px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-nav)', color: 'var(--text-secondary)' }}>
            NEURAL CACHE
          </span>
          <span style={{ 
            fontSize: '11px', 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--accent-green)',
            fontWeight: '600'
          }}>
            OPTIMIZED
          </span>
        </div>
        <div style={{ 
          fontSize: '14px', 
          fontFamily: 'var(--font-mono)', 
          marginTop: '4px',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Database size={14} style={{ color: 'var(--accent-green)' }} />
          <span>94.2% CACHE HIT</span>
        </div>
      </div>

      {/* GPU LOAD (Hot Pink ProgressBar) */}
      <div className="cyber-panel cyber-panel-pink" style={{
        padding: '12px',
        borderRadius: '4px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-nav)', color: 'var(--text-secondary)' }}>
            GPU LOAD
          </span>
          <span style={{ 
            fontSize: '12px', 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--accent-pink)',
            fontWeight: 'bold',
            textShadow: '0 0 5px rgba(255, 0, 128, 0.4)'
          }}>
            {gpuLoad}%
          </span>
        </div>
        {/* Progress Bar Container */}
        <div style={{
          height: '6px',
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '3px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${gpuLoad}%`,
            backgroundColor: 'var(--accent-pink)',
            boxShadow: '0 0 10px var(--accent-pink)',
            borderRadius: '3px',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
        <div style={{
          fontSize: '9px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dark)',
          marginTop: '6px',
          textAlign: 'right'
        }}>
          VRAM SYNC: ONLINE
        </div>
      </div>

      {/* STORAGE INDEX */}
      <div className="cyber-panel" style={{
        padding: '10px 12px',
        borderRadius: '4px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-nav)', color: 'var(--text-secondary)' }}>
            STORAGE INDEX
          </span>
          <span style={{ 
            fontSize: '11px', 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--accent-cyan)',
            fontWeight: '600'
          }}>
            INDEX_SECURE
          </span>
        </div>
        <div style={{ 
          fontSize: '14px', 
          fontFamily: 'var(--font-mono)', 
          marginTop: '4px',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <HardDrive size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span>IDX_4812_SYS</span>
        </div>
      </div>
    </div>
  );
}

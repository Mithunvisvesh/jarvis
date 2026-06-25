import React from 'react';
import { useJarvis } from '../context/JarvisContext';
import { Activity, ShieldCheck, Thermometer, Cpu, HardDrive } from 'lucide-react';

export default function StatusBar() {
  const { telemetry, isConnected } = useJarvis();

  return (
    <div style={{
      height: '32px',
      background: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderTop: '1px solid var(--border-muted)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      color: 'var(--text-secondary)',
      zIndex: 5,
      letterSpacing: '0.5px'
    }}>
      {/* Telemetry stats */}
      <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Cpu size={11} style={{ color: 'var(--accent-cyan)' }} />
          <span>CPU:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{telemetry.cpuLoad}%</span>
        </div>
        
        <div style={{ height: '12px', width: '1px', backgroundColor: 'var(--border-muted)' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Activity size={11} style={{ color: 'var(--accent-cyan)' }} />
          <span>RAM:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{telemetry.ramLoad}%</span>
        </div>
        
        <div style={{ height: '12px', width: '1px', backgroundColor: 'var(--border-muted)' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <HardDrive size={11} style={{ color: 'var(--accent-cyan)' }} />
          <span>DISK:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{telemetry.diskLoad}%</span>
        </div>
        
        <div style={{ height: '12px', width: '1px', backgroundColor: 'var(--border-muted)' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Thermometer size={11} style={{ color: 'var(--accent-orange)' }} />
          <span>TEMP:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{telemetry.temperature}°C</span>
        </div>
      </div>

      {/* Synchronized status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '5px',
          color: telemetry.syncActive ? 'var(--accent-cyan)' : 'var(--text-dark)',
          fontWeight: 'bold',
          letterSpacing: '1px'
        }}>
          <ShieldCheck size={12} style={{ filter: telemetry.syncActive ? 'drop-shadow(0 0 3px rgba(0, 212, 255, 0.4))' : 'none' }} />
          <span>CORE_SYNC_ACTIVE</span>
        </div>
        
        <div style={{ height: '12px', width: '1px', backgroundColor: 'var(--border-muted)' }} />
        
        <div style={{
          color: isConnected ? 'var(--accent-green)' : 'var(--accent-pink)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 'bold',
          letterSpacing: '1px'
        }}>
          <span style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: isConnected ? 'var(--accent-green)' : 'var(--accent-pink)',
            boxShadow: isConnected ? 'var(--glow-green)' : 'var(--glow-pink)',
            display: 'inline-block'
          }} />
          <span>{isConnected ? 'CONNECTED' : 'STANDALONE_OVERRIDE'}</span>
        </div>
      </div>
    </div>
  );
}

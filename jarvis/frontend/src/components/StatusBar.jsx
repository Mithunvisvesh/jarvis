import React from 'react';
import { useJarvis } from '../context/JarvisContext';
import { Activity, ShieldCheck, Thermometer } from 'lucide-react';

export default function StatusBar() {
  const { telemetry, isConnected } = useJarvis();

  return (
    <div style={{
      height: '32px',
      backgroundColor: '#050810',
      borderTop: '1px solid var(--border-muted)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      color: 'var(--text-secondary)',
      zIndex: 5
    }}>
      {/* Telemetry stats */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Activity size={10} style={{ color: 'var(--accent-cyan)' }} />
          <span>CPU: {telemetry.cpuLoad}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Activity size={10} style={{ color: 'var(--accent-cyan)' }} />
          <span>RAM: {telemetry.ramLoad}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Activity size={10} style={{ color: 'var(--accent-cyan)' }} />
          <span>DISK: {telemetry.diskLoad}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Thermometer size={10} style={{ color: 'var(--accent-orange)' }} />
          <span>TEMP: {telemetry.temperature}°C</span>
        </div>
      </div>

      {/* Synchronized status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          color: telemetry.syncActive ? 'var(--accent-cyan)' : 'var(--text-dark)',
          fontWeight: '500'
        }}>
          <ShieldCheck size={11} />
          <span>CORE_SYNC_ACTIVE</span>
        </div>
        <div style={{
          color: isConnected ? 'var(--accent-green)' : 'var(--accent-pink)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: isConnected ? 'var(--accent-green)' : 'var(--accent-pink)',
            boxShadow: isConnected ? 'var(--glow-green)' : 'var(--glow-pink)'
          }} />
          <span>{isConnected ? 'CONNECTED' : 'STANDALONE_OVERRIDE'}</span>
        </div>
      </div>
    </div>
  );
}

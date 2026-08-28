import React, { useState, useEffect } from 'react';
import { telemetryAPI } from '../api/client';
import { 
  Activity, Clock, Calendar, Bell, ChevronRight, CheckCircle2, 
  Sparkles, Coffee, Users, Cpu, Shield, AlertCircle
} from 'lucide-react';

export const AdaptiveTelemetryWidget = ({ user, team }) => {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTelemetry = async () => {
    try {
      const data = await telemetryAPI.getTimeline();
      if (data) {
        setTelemetry(data);
      }
    } catch (err) {
      console.error("Error fetching telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !telemetry) {
    return null;
  }

  const milestones = telemetry?.milestones || [];
  const activePhase = telemetry?.activePhase || "Live Hacking Sprint";
  const progressPercent = telemetry?.progressPercent || 0;
  const alerts = telemetry?.personalizedAlerts || [];

  return (
    <div 
      className="adaptive-telemetry-widget"
      style={{
        backgroundColor: 'var(--editorial-card, #0f172a)',
        border: '1px solid var(--editorial-border, rgba(99, 102, 241, 0.25))',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        marginTop: '1.25rem',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
        position: 'relative'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06b6d4'
            }}
          >
            <Activity size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                Adaptive Sprint Telemetry & Timeline Milestones
              </h4>
              <span className="pill-badge pill-badge-live" style={{ fontSize: '0.62rem' }}>
                <span className="pulse-dot" /> LIVE TRACKER
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--editorial-subtext, #94a3b8)' }}>
              Proactively tracks event schedule shifts, workshop alarms, mentor availability, and catering calls.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', color: '#38bdf8' }}>
            {telemetry?.elapsedHours || 0}h / 48h ({progressPercent}%)
          </span>
        </div>
      </div>

      {/* Sprint Progress Bar */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
          <div 
            style={{
              width: `${Math.min(100, Math.max(2, progressPercent))}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 50%, #10b981 100%)',
              borderRadius: '9999px',
              transition: 'width 0.6s ease'
            }}
          />
        </div>
      </div>

      {/* Personalized Role / Track Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {alerts.map((al, idx) => (
            <div 
              key={al.id || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.95rem',
                borderRadius: '8px',
                backgroundColor: al.type === 'warning' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                border: `1px solid ${al.type === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
              }}
            >
              <Bell size={16} color={al.type === 'warning' ? '#f59e0b' : '#38bdf8'} />
              <div style={{ fontSize: '0.8rem', color: '#f8fafc', flex: 1 }}>
                <strong style={{ color: al.type === 'warning' ? '#fbbf24' : '#38bdf8', marginRight: '0.4rem' }}>{al.title}:</strong>
                {al.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Horizontal / Grid Timeline of Milestones */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '0.75rem'
        }}
      >
        {milestones.map((m) => {
          const isComp = m.status === 'completed';
          const isAct = m.status === 'active';

          return (
            <div 
              key={m.id}
              style={{
                padding: '0.75rem 0.85rem',
                backgroundColor: isAct ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0, 0, 0, 0.25)',
                borderRadius: '10px',
                border: `1px solid ${isAct ? 'rgba(99, 102, 241, 0.5)' : isComp ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace', color: isAct ? '#38bdf8' : isComp ? '#10b981' : '#94a3b8' }}>
                  {m.targetTime}
                </span>
                <span 
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: isComp ? '#10b981' : isAct ? '#38bdf8' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  {isComp ? <CheckCircle2 size={12} /> : isAct ? 'CURRENT' : 'UPCOMING'}
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isAct ? '#ffffff' : isComp ? '#cbd5e1' : '#94a3b8', marginBottom: '0.2rem' }}>
                {m.name}
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--editorial-subtext, #94a3b8)', lineHeight: 1.4 }}>
                {m.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

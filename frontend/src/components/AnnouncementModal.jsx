import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bell, X, Info, Flame, Megaphone, CheckCircle2, MessageSquareText, Users, ArrowRight, Paperclip, Download } from 'lucide-react';
import { adminAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const AnnouncementModal = () => {
  const { user, isAdmin, refreshUser } = useAuth();
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('dismissed_announcements');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (isAdmin || user?.role === 'admin') return;

    const fetchAnnouncements = async () => {
      try {
        const data = await adminAPI.getAnnouncements();
        const now = Date.now();
        const broadcastList = (data.announcements || []).filter(a => {
          if (a.type === 'qa_answer') return false;
          if (a.type === 'team_deleted') {
            if (a.affectedUserIds && Array.isArray(a.affectedUserIds)) {
              return user?.id && a.affectedUserIds.includes(user.id);
            }
            return true;
          }
          if (a.broadcastBy === user?.name || a.author === user?.name || a.broadcastBy === user?.email) {
            return false;
          }
          const ts = a.timestamp || a.createdAt;
          if (ts) {
            const ageMs = now - new Date(ts).getTime();
            if (!isNaN(ageMs) && ageMs > 12 * 60 * 60 * 1000) return false;
          }
          return true;
        });

        const unread = broadcastList.find(a => !dismissedIds.has(a.id));
        if (unread) {
          setActiveAnnouncement(unread);
        }
      } catch (err) {
        // Silent polling error handling
      }
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 2000);
    return () => clearInterval(interval);
  }, [user, isAdmin, dismissedIds]);

  const handleDismiss = () => {
    if (!activeAnnouncement) return;
    const newDismissed = new Set([...dismissedIds, activeAnnouncement.id]);
    setDismissedIds(newDismissed);
    try {
      localStorage.setItem('dismissed_announcements', JSON.stringify(Array.from(newDismissed)));
    } catch (e) {
      console.error(e);
    }

    if (activeAnnouncement.type === 'team_deleted') {
      window.dispatchEvent(new CustomEvent('team_reset'));
      if (typeof refreshUser === 'function') refreshUser();
    }

    setActiveAnnouncement(null);
  };

  if (!activeAnnouncement) return null;

  const getSeverityStyles = (severity, type) => {
    if (type === 'team_deleted') {
      return {
        bg: 'var(--bg-card)',
        border: '1px solid var(--danger)',
        badgeClass: 'pill-badge pill-badge-alert',
        icon: <Users size={22} color="var(--danger)" />,
        titleColor: 'var(--danger)',
        badgeText: 'Team Disbanded Alert'
      };
    }

    switch (severity?.toLowerCase()) {
      case 'critical':
        return {
          bg: 'var(--bg-card)',
          border: '1px solid var(--danger)',
          badgeClass: 'pill-badge pill-badge-alert',
          icon: <Flame size={22} color="var(--danger)" />,
          titleColor: 'var(--danger)',
          badgeText: 'Critical Event Alert'
        };
      case 'warning':
        return {
          bg: 'var(--bg-card)',
          border: '1px solid var(--warning)',
          badgeClass: 'pill-badge',
          icon: <AlertTriangle size={22} color="var(--warning)" />,
          titleColor: 'var(--warning)',
          badgeText: 'Important Notice'
        };
      default:
        return {
          bg: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          badgeClass: 'pill-badge pill-badge-available',
          icon: <Megaphone size={22} color="var(--color-teal-primary)" />,
          titleColor: 'var(--text-headlines)',
          badgeText: 'Broadcast Alert'
        };
    }
  };

  const style = getSeverityStyles(activeAnnouncement.severity, activeAnnouncement.type);

  const renderMessageContent = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={i} style={{ marginTop: i > 0 ? '0.35rem' : 0 }}>
          {parts.map((p, idx) => {
            if (p.startsWith('**') && p.endsWith('**')) {
              return <strong key={idx} style={{ color: 'var(--text-headlines)', fontWeight: 800 }}>{p.slice(2, -2)}</strong>;
            }
            return p;
          })}
        </div>
      );
    });
  };

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: 100, 
      backgroundColor: 'rgba(0, 0, 0, 0.7)', 
      backdropFilter: 'blur(5px)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1.5rem' 
    }} className="animate-fade-in">
      
      <div 
        className="arch-card animate-fade-in"
        style={{ 
          maxWidth: '540px', 
          width: '100%', 
          backgroundColor: style.bg, 
          border: style.border, 
          boxShadow: 'var(--brutalist-shadow-lg)',
          padding: '1.75rem',
          position: 'relative'
        }}
      >
        <button 
          onClick={handleDismiss}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ 
            padding: '0.65rem', 
            backgroundColor: 'var(--code-box-bg)', 
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {style.icon}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <span className={style.badgeClass}>
                {style.badgeText}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                {activeAnnouncement.broadcastBy ? `By ${activeAnnouncement.broadcastBy}` : 'Live Notification'}
              </span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: style.titleColor, marginBottom: '0.75rem', lineHeight: '1.35' }}>
              {activeAnnouncement.title}
            </h3>

            <div style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.92rem', 
              lineHeight: '1.55', 
              marginBottom: '1.25rem', 
              backgroundColor: 'var(--code-box-bg)', 
              padding: '0.85rem 1rem', 
              border: '1px solid var(--border-color)' 
            }}>
              {renderMessageContent(activeAnnouncement.message)}
            </div>

            {/* Attached File Preview & Download */}
            {activeAnnouncement.attachmentName && (
              <div style={{ marginBottom: '1.25rem' }}>
                <a
                  href={activeAnnouncement.attachmentUrl ? (activeAnnouncement.attachmentUrl.startsWith('http') ? activeAnnouncement.attachmentUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${activeAnnouncement.attachmentUrl}`) : '#'}
                  download={activeAnnouncement.attachmentName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-brutalist-outline"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.82rem',
                    textDecoration: 'none'
                  }}
                >
                  <Paperclip size={15} color="var(--color-aqua-teal)" />
                  <span>Download: <strong style={{ color: 'var(--text-headlines)' }}>{activeAnnouncement.attachmentName}</strong></span>
                  {activeAnnouncement.attachmentSize && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                      ({activeAnnouncement.attachmentSize < 1024 * 1024 
                        ? `${Math.round(activeAnnouncement.attachmentSize / 1024)} KB` 
                        : `${(activeAnnouncement.attachmentSize / (1024 * 1024)).toFixed(1)} MB`})
                    </span>
                  )}
                  <Download size={13} style={{ marginLeft: '0.25rem' }} />
                </a>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                onClick={handleDismiss} 
                className="btn-brutalist-primary"
                style={{ 
                  padding: '0.6rem 1.25rem', 
                  fontSize: '0.88rem'
                }}
              >
                {activeAnnouncement.type === 'team_deleted' ? (
                  <>
                    Acknowledge & Continue <ArrowRight size={15} />
                  </>
                ) : (
                  'Acknowledge & Close'
                )}
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

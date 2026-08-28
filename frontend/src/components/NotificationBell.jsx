import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, MessageSquareText, Sparkles, ExternalLink, Clock, HelpCircle, CheckCircle2, User } from 'lucide-react';
import { notificationAPI, adminAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem('hackathon_read_notifs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const dropdownRef = useRef(null);

  const fetchQAUpdates = async () => {
    try {
      const data = await notificationAPI.getNotifications();
      const notifList = data.notifications || [];
      
      // If notifications exist from /api/notifications, cap to 5
      if (notifList.length > 0) {
        setNotifications(notifList.slice(0, 5));
      } else {
        // Fallback to QA announcements if no direct notifications yet
        const annData = await adminAPI.getAnnouncements();
        const qaAnnouncements = (annData.announcements || []).filter(a => a.type === 'qa_answer');
        setNotifications(qaAnnouncements.slice(0, 5));
      }
    } catch (err) {
      // Silent polling failure
    }
  };

  useEffect(() => {
    fetchQAUpdates();
    const interval = setInterval(fetchQAUpdates, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchQAUpdates();
    }
  };

  const handleMarkAllRead = () => {
    const newRead = new Set([...readIds, ...notifications.map(n => n.id)]);
    setReadIds(newRead);
    try {
      localStorage.setItem('hackathon_read_notifs', JSON.stringify(Array.from(newRead)));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      {/* Semi-transparent Backdrop Overlay for Mobile Dismissal */}
      {isOpen && (
        <div 
          className="notification-backdrop" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      <div style={{ position: 'relative' }} ref={dropdownRef}>
        {/* Bell Trigger Button */}
        <button
          onClick={handleToggle}
          className="btn-brutalist-outline"
          title="Organizer Q&A Solutions & Notifications"
          style={{
            position: 'relative',
            padding: '0.4rem 0.6rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isOpen ? 'var(--btn-outline-hover-bg)' : 'transparent',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--brutalist-shadow-sm)',
            minHeight: '36px'
          }}
        >
          <Bell size={16} color="var(--text-headlines)" />
          
          {unreadCount > 0 && (
            <span 
              className="pulse-dot"
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '7px',
                height: '7px',
                backgroundColor: 'var(--color-aqua-teal)',
                boxShadow: '0 0 8px var(--color-aqua-teal)'
              }}
            />
          )}
        </button>

        {/* Notification Dropdown Panel */}
        {isOpen && (
          <div 
            className="arch-card notification-panel animate-fade-in"
            style={{ width: 'min(420px, 92vw)' }}
          >
            {/* Header */}
            <div style={{ 
              padding: '0.85rem 1rem', 
              borderBottom: '1px solid var(--border-color)', 
              background: 'var(--code-box-bg)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <MessageSquareText size={16} color="var(--color-teal-primary)" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-headlines)' }}>
                    Organizer Q&A Solutions
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    Max 5 Answer History • Live Feed
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="pill-badge pill-badge-ready" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                  {notifications.length}/5 Stored
                </span>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--color-aqua-teal)', 
                      fontSize: '0.72rem', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.25rem', 
                      fontWeight: 700 
                    }}
                  >
                    <CheckCheck size={13} /> Mark read
                  </button>
                )}
              </div>
            </div>

            {/* Notification List with Smooth Scroll */}
            <div style={{ 
              overflowY: 'auto', 
              flex: 1,
              maxHeight: 'calc(75vh - 90px)',
              padding: '0.35rem 0'
            }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '2.75rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  <HelpCircle size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4, display: 'block' }} />
                  <div>No answered Q&A solutions registered yet.</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-subtle)', marginTop: '0.35rem' }}>
                    When organizers answer flagged questions, solutions appear here in real time.
                  </div>
                </div>
              ) : (
                notifications.slice(0, 5).map((n) => {
                  const isRead = readIds.has(n.id);
                  const timeStr = n.timestamp || n.createdAt 
                    ? new Date(n.timestamp || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';
                  const questionText = n.query || n.title || 'Inquiry';
                  const answerText = n.answer || n.message || n.response || 'Answer provided by organizers.';
                  const ticketId = n.ticketId || (n.id && n.id.startsWith('notif_qa_') ? n.id.replace('notif_qa_', 'esc_') : null);

                  return (
                    <div 
                      key={n.id}
                      style={{
                        padding: '0.9rem 1.1rem',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: isRead ? 'transparent' : 'rgba(82, 171, 152, 0.05)',
                        position: 'relative',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Unread indicator dot */}
                      {!isRead && (
                        <div style={{ 
                          position: 'absolute', 
                          top: '12px', 
                          right: '12px', 
                          width: '7px', 
                          height: '7px', 
                          borderRadius: '50%', 
                          backgroundColor: 'var(--color-aqua-teal)',
                          boxShadow: '0 0 6px var(--color-aqua-teal)'
                        }} />
                      )}

                      {/* Header Row: Badge, Ticket ID, Timestamp */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                        <span className="pill-badge pill-badge-available" style={{ fontSize: '0.64rem', padding: '0.12rem 0.5rem' }}>
                          <CheckCheck size={11} /> Resolved Q&A
                        </span>
                        
                        {ticketId && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                            #{ticketId}
                          </span>
                        )}

                        {timeStr && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: 'auto' }}>
                            <Clock size={11} /> {timeStr}
                          </span>
                        )}
                      </div>

                      {/* 1. Flagged Question Block */}
                      <div style={{ 
                        backgroundColor: 'var(--code-box-bg)', 
                        border: '1px solid var(--border-color)', 
                        padding: '0.55rem 0.75rem',
                        marginBottom: '0.45rem'
                      }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, fontFamily: 'JetBrains Mono', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                          FLAGGED QUESTION:
                        </div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-headlines)', lineHeight: 1.35 }}>
                          "{questionText}"
                        </div>
                      </div>

                      {/* 2. Organizer Solution / Answer Block */}
                      <div style={{ 
                        backgroundColor: 'var(--bg-card)', 
                        border: '1px solid var(--color-aqua-teal)', 
                        borderLeft: '4px solid var(--color-aqua-teal)', 
                        padding: '0.65rem 0.85rem',
                        boxShadow: 'var(--brutalist-shadow-sm)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.66rem', color: 'var(--color-aqua-teal)', fontWeight: 800, fontFamily: 'JetBrains Mono', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                          <CheckCircle2 size={12} color="var(--color-aqua-teal)" />
                          ORGANIZER SOLUTION:
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {answerText}
                        </div>
                      </div>

                      {/* Footer: Answered By */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.45rem', fontFamily: 'JetBrains Mono' }}>
                        <User size={11} />
                        <span>Answered by <strong>{n.answeredBy || 'Campus Copilot Admin'}</strong></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            <div style={{ 
              padding: '0.6rem 1rem', 
              background: 'var(--bg-card)', 
              borderTop: '1px solid var(--border-color)', 
              fontSize: '0.72rem', 
              color: 'var(--text-muted)', 
              textAlign: 'center',
              fontFamily: 'JetBrains Mono, monospace',
              flexShrink: 0
            }}>
              Showing {Math.min(notifications.length, 5)} of max 5 recent solutions (Oldest auto-purged)
            </div>
          </div>
        )}
      </div>
    </>
  );
};

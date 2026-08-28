import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Shield, User, LogOut, Sun, Moon, Radio, Sparkles, Terminal } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

export const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <header style={{ 
      backgroundColor: 'var(--bg-card)', 
      borderBottom: '1px solid var(--border-color)', 
      position: 'sticky', 
      top: 0, 
      zIndex: 45,
      boxShadow: 'var(--brutalist-shadow-sm)',
      transition: 'background-color 0.25s ease, border-color 0.25s ease'
    }}>
      <div style={{ 
        maxWidth: '100%', 
        padding: '0.65rem 1.25rem', 
        width: '100%'
      }}>
        
        {/* =========================================================================
            DESKTOP NAVBAR (Screens >= 768px) - 100% UNMODIFIED SINGLE-ROW LAYOUT
            ========================================================================= */}
        <div className="navbar-desktop">
          
          {/* Brand Logo & Title */}
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }} 
            onClick={() => setActiveTab && setActiveTab('dashboard')}
          >
            <div style={{ 
              width: '34px', 
              height: '34px', 
              backgroundColor: 'var(--color-teal-primary)', 
              color: '#ffffff',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: 'var(--brutalist-shadow-sm)',
              border: '1px solid var(--border-color)'
            }}>
              <Terminal size={18} />
            </div>
            <div>
              <div style={{ 
                fontSize: '1rem', 
                fontWeight: 800, 
                color: 'var(--text-headlines)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.35rem', 
                letterSpacing: '0.01em' 
              }}>
                CampusCopilot
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                OPERATIONS DESK
              </div>
            </div>
          </div>

          {/* Right Section: System Indicator, Notification Bell, Theme Switcher & User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            
            {/* Live Status Tag */}
            <div className="pill-badge pill-badge-live" title="Live Event Network Operational">
              <span className="pulse-dot" />
              <span>LIVE OPERATIONAL</span>
            </div>

            {/* Notification Bell Section with Unread Badge */}
            {user && <NotificationBell />}

            {/* Dark / Light Mode Toggle Switch */}
            <button
              onClick={toggleTheme}
              className="btn-brutalist-outline"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              style={{ 
                padding: '0.45rem 0.65rem',
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem',
                fontSize: '0.78rem'
              }}
            >
              {isDark ? (
                <>
                  <Sun size={15} color="#f59e0b" />
                  <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace' }}>LIGHT</span>
                </>
              ) : (
                <>
                  <Moon size={15} color="var(--color-teal-primary)" />
                  <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace' }}>DARK</span>
                </>
              )}
            </button>

            {/* User Profile Pill & Logout */}
            {user && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.65rem', 
                paddingLeft: '0.65rem', 
                borderLeft: '1px solid var(--border-color)' 
              }}>
                
                {/* User Avatar & Name Pill */}
                <div 
                  className="pill-badge" 
                  style={{ 
                    backgroundColor: 'var(--code-box-bg)', 
                    border: '1px solid var(--border-color)', 
                    padding: '0.3rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ 
                    width: '22px', 
                    height: '22px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--color-teal-primary)', 
                    color: '#ffffff',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.68rem',
                    fontWeight: 800
                  }}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-headlines)', textTransform: 'none' }}>
                      {user.name || 'Participant'}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--color-aqua-teal)', fontWeight: 700 }}>
                      {user.role === 'admin' ? 'ORGANIZER' : 'PARTICIPANT'}
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <button 
                  onClick={logout}
                  title="Sign Out"
                  className="btn-brutalist-outline"
                  style={{ 
                    padding: '0.45rem 0.65rem',
                    color: 'var(--text-muted)',
                    borderColor: 'var(--border-color)'
                  }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}

          </div>

        </div>

        {/* =========================================================================
            MOBILE NAVBAR (Screens < 768px) - CLEAN 2-ROW RESPONSIVE HEADER
            ========================================================================= */}
        <div className="navbar-mobile">
          
          {/* Row 1: App Logo on Left | Dark Mode Toggle + Notification Bell on Right */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            
            {/* Logo */}
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} 
              onClick={() => setActiveTab && setActiveTab('dashboard')}
            >
              <div style={{ 
                width: '30px', 
                height: '30px', 
                backgroundColor: 'var(--color-teal-primary)', 
                color: '#ffffff',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: 'var(--brutalist-shadow-sm)',
                border: '1px solid var(--border-color)'
              }}>
                <Terminal size={16} />
              </div>
              <div>
                <div style={{ 
                  fontSize: '0.92rem', 
                  fontWeight: 800, 
                  color: 'var(--text-headlines)', 
                  letterSpacing: '0.01em',
                  lineHeight: 1.1
                }}>
                  CampusCopilot
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                  OPERATIONS DESK
                </div>
              </div>
            </div>

            {/* Quick Actions: Bell + Dark Mode */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              {user && <NotificationBell />}
              
              <button
                onClick={toggleTheme}
                className="btn-brutalist-outline"
                title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
                style={{ 
                  padding: '0.4rem 0.55rem',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.35rem',
                  fontSize: '0.72rem',
                  minHeight: '36px'
                }}
              >
                {isDark ? (
                  <>
                    <Sun size={14} color="#f59e0b" />
                    <span style={{ fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace' }}>LIGHT</span>
                  </>
                ) : (
                  <>
                    <Moon size={14} color="var(--color-teal-primary)" />
                    <span style={{ fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace' }}>DARK</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Row 2: Live Operational Badge on Left | User Profile + Logout on Right */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            width: '100%',
            paddingTop: '0.45rem',
            borderTop: '1px dashed var(--border-color)'
          }}>
            
            {/* Live Operational Badge */}
            <div className="pill-badge pill-badge-live" style={{ padding: '0.2rem 0.55rem', fontSize: '0.64rem' }}>
              <span className="pulse-dot" style={{ width: '6px', height: '6px' }} />
              <span>LIVE OPERATIONAL</span>
            </div>

            {/* User Profile + Logout Group */}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div 
                  className="pill-badge" 
                  style={{ 
                    backgroundColor: 'var(--code-box-bg)', 
                    border: '1px solid var(--border-color)', 
                    padding: '0.25rem 0.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    maxWidth: '170px'
                  }}
                >
                  <div style={{ 
                    width: '18px', 
                    height: '18px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--color-teal-primary)', 
                    color: '#ffffff',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                    <div style={{ 
                      fontSize: '0.74rem', 
                      fontWeight: 800, 
                      color: 'var(--text-headlines)', 
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {user.name || 'Participant'}
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <button 
                  onClick={logout}
                  title="Sign Out"
                  className="btn-brutalist-outline"
                  style={{ 
                    padding: '0.35rem 0.55rem',
                    color: 'var(--text-muted)',
                    borderColor: 'var(--border-color)',
                    minHeight: '34px'
                  }}
                >
                  <LogOut size={13} />
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </header>
  );
};

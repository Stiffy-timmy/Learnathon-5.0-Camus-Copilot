import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../api/client';
import { Lock, Mail, ArrowRight, Sparkles, Terminal, Sun, Moon, Trash2 } from 'lucide-react';

export const Login = ({ onNavigate }) => {
  const { loginUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please fill in both email/username and password.");
      return;
    }
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.login({
        identifier: identifier.trim(),
        password,
        rememberMe
      });
      
      loginUser(data.token, data.user);
      if (data.user.role === 'admin') {
        onNavigate('admin');
      } else {
        onNavigate('participant');
      }
    } catch (err) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '2rem',
      backgroundColor: 'var(--bg-page)',
      position: 'relative'
    }}>
      
      {/* Theme Toggle in top right */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <button
          onClick={toggleTheme}
          className="btn-brutalist-outline"
          style={{ padding: '0.45rem 0.65rem' }}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          {isDark ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="var(--color-teal-primary)" />}
        </button>
      </div>

      <div className="arch-card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem', boxShadow: 'var(--brutalist-shadow-lg)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="pill-badge pill-badge-ready" style={{ marginBottom: '1rem', padding: '0.25rem 0.85rem' }}>
            <Terminal size={14} color="var(--color-teal-primary)" /> CampusCopilot
          </div>
          <h1 className="font-serif" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem' }}>
            Sign In
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Access participant operations or organizer mission control
          </p>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(225, 29, 72, 0.1)', 
            border: '1px solid var(--danger)', 
            color: 'var(--danger)', 
            padding: '0.75rem 1rem', 
            fontSize: '0.85rem', 
            marginBottom: '1.25rem',
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
              EMAIL OR USERNAME
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text"
                className="arch-input"
                placeholder="developer@gmail.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                style={{ paddingLeft: '2.35rem' }}
                required
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', fontFamily: 'JetBrains Mono' }}>
                PASSWORD
              </label>
              <button 
                type="button" 
                onClick={() => onNavigate('forgot-password')}
                style={{ background: 'none', border: 'none', color: 'var(--color-teal-primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="password"
                className="arch-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.35rem' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="remember" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Remember this workstation
            </label>
          </div>

          <button 
            type="submit" 
            className="btn-brutalist-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Authenticating...' : (
              <>
                Sign In to Portal <ArrowRight size={16} />
              </>
            )}
          </button>

        </form>

        {/* Footer Links */}
        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <div>
            Don't have an account?{' '}
            <button 
              onClick={() => onNavigate('register')}
              style={{ background: 'none', border: 'none', color: 'var(--color-teal-primary)', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Register Participant Profile
            </button>
          </div>

          {/* Self-Service Account Deletion via OTP */}
          <div style={{ 
            marginTop: '1.15rem', 
            paddingTop: '0.85rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '0.45rem',
            borderTop: '1px dashed var(--border-color)'
          }}>
            <Trash2 size={13} color="var(--danger)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Need to permanently remove account?</span>
            <button
              type="button"
              onClick={() => onNavigate('delete-account')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Delete Account via OTP
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

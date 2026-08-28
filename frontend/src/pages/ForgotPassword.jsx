import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../api/client';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { KeyRound, Mail, Lock, ArrowRight, CheckCircle2, AlertTriangle, Terminal, Sun, Moon, ArrowLeft } from 'lucide-react';

export const ForgotPassword = ({ onNavigate }) => {
  const { isDark, toggleTheme } = useTheme();
  const [step, setStep] = useState(1); // 1: Request Email, 2: Reset OTP & New Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);

    try {
      await authAPI.forgotPassword({ email: email.trim() });
      setSuccessMsg("Reset OTP has been dispatched to your inbox.");
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to request password reset code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !newPassword) return;
    setError('');
    setLoading(true);

    try {
      await authAPI.resetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword
      });

      setSuccessMsg("Password successfully reset! Redirecting to sign in...");
      setTimeout(() => {
        onNavigate('login');
      }, 1500);
    } catch (err) {
      setError(err.message || "Password reset failed. Check the 6-digit code.");
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
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="pill-badge pill-badge-ready" style={{ marginBottom: '0.85rem', padding: '0.25rem 0.85rem' }}>
            <KeyRound size={14} color="var(--color-teal-primary)" /> Password Recovery
          </div>
          <h1 className="font-serif" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem' }}>
            Reset Password
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
            {step === 1 ? "Enter your registered email to receive a 6-digit reset code" : "Enter the verification code and set a new password"}
          </p>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(225, 29, 72, 0.1)', 
            border: '1px solid var(--danger)', 
            color: 'var(--danger)', 
            padding: '0.75rem 1rem', 
            fontSize: '0.84rem', 
            marginBottom: '1.25rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ 
            backgroundColor: 'var(--badge-available-bg)', 
            border: '1px solid var(--color-aqua-teal)', 
            color: 'var(--color-teal-primary)', 
            padding: '0.75rem 1rem', 
            fontSize: '0.84rem', 
            marginBottom: '1.25rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            <CheckCircle2 size={16} color="var(--color-aqua-teal)" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestCode} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                REGISTERED EMAIL ADDRESS
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  className="arch-input"
                  placeholder="developer@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '2.4rem' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-brutalist-primary"
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {loading ? 'Sending Code...' : (
                <>
                  Dispatch Reset Code <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                6-DIGIT OTP VERIFICATION CODE *
              </label>
              <input
                type="text"
                className="arch-input font-mono"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                style={{ 
                  textAlign: 'center', 
                  fontSize: '1.3rem', 
                  fontWeight: 800, 
                  letterSpacing: '0.2em',
                  color: 'var(--text-headlines)'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                NEW PASSWORD *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  className="arch-input"
                  placeholder="Enter new strong password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingLeft: '2.4rem' }}
                  required
                />
              </div>
              {newPassword && <PasswordStrengthMeter password={newPassword} />}
            </div>

            <button
              type="submit"
              className="btn-brutalist-primary"
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {loading ? 'Updating Password...' : 'Save & Login'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '1.15rem' }}>
          <button
            onClick={() => onNavigate('login')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--color-teal-primary)', 
              fontWeight: 800, 
              cursor: 'pointer', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.35rem' 
            }}
          >
            <ArrowLeft size={14} /> Back to Sign In
          </button>
        </div>

      </div>

    </div>
  );
};

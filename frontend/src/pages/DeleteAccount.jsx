import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../api/client';
import { Trash2, AlertTriangle, ShieldAlert, Mail, ArrowRight, ArrowLeft, CheckCircle2, Terminal, Sun, Moon } from 'lucide-react';

export const DeleteAccount = ({ onNavigate }) => {
  const { isDark, toggleTheme } = useTheme();
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify & Delete, 3 = Deleted Success
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Step 1: Request Deletion OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your registered email address or handle.");
      return;
    }
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.requestDeleteOtp({
        identifier: identifier.trim()
      });

      setTargetEmail(data.email || identifier.trim());
      setSuccessMessage(data.message || "A 6-digit verification code has been dispatched to your email.");
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to initiate account deletion. Please check the email/handle.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm Deletion with OTP
  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError("Please enter the 6-digit OTP sent to your email.");
      return;
    }
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.confirmDeleteAccount({
        identifier: targetEmail || identifier.trim(),
        code: otp.trim()
      });

      setSuccessMessage(data.message || "Account successfully deleted.");
      setStep(3);
    } catch (err) {
      setError(err.message || "Invalid or expired deletion verification code.");
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

      <div className="arch-card animate-fade-in" style={{ maxWidth: '460px', width: '100%', padding: '2.5rem', boxShadow: 'var(--brutalist-shadow-lg)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ 
            width: '52px', 
            height: '52px', 
            backgroundColor: 'rgba(225, 29, 72, 0.12)', 
            border: '1px solid var(--danger)', 
            color: 'var(--danger)', 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: '1rem',
            boxShadow: 'var(--brutalist-shadow-sm)'
          }}>
            <Trash2 size={26} />
          </div>
          <h1 className="font-serif" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem' }}>
            Delete Account
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
            Irreversible self-service deletion of user profile and database records
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

        {successMessage && step !== 3 && (
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
            <span>{successMessage}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                REGISTERED EMAIL OR HANDLE
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="arch-input"
                  placeholder="developer@gmail.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{ paddingLeft: '2.4rem' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-brutalist-primary"
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
            >
              {loading ? 'Sending Code...' : (
                <>
                  Request Deletion Code <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleConfirmDelete} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                6-DIGIT DELETION CODE (SENT TO {targetEmail}) *
              </label>
              <input
                type="text"
                className="arch-input font-mono"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.trim())}
                style={{ 
                  textAlign: 'center', 
                  fontSize: '1.35rem', 
                  fontWeight: 800, 
                  letterSpacing: '0.2em',
                  color: 'var(--text-headlines)'
                }}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-brutalist-primary"
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
            >
              {loading ? 'Permanently Deleting...' : 'Confirm & Delete Everything'}
            </button>
          </form>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ 
              color: 'var(--color-teal-primary)', 
              backgroundColor: 'var(--badge-available-bg)', 
              padding: '1rem', 
              border: '1px solid var(--color-aqua-teal)', 
              fontWeight: 700, 
              fontSize: '0.92rem',
              marginBottom: '1.5rem' 
            }}>
              {successMessage}
            </div>
            <button
              onClick={() => onNavigate('login')}
              className="btn-brutalist-primary"
              style={{ width: '100%', padding: '0.75rem' }}
            >
              Return to Login
            </button>
          </div>
        )}

        {step !== 3 && (
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
        )}

      </div>

    </div>
  );
};

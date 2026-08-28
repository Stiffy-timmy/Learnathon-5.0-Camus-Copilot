import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../api/client';
import { ShieldCheck, ArrowRight, RotateCw, CheckCircle2, AlertTriangle, Sun, Moon, Edit3, Check, Mail } from 'lucide-react';

export const VerifyEmail = ({ email, onNavigate }) => {
  const { loginUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  
  const [targetEmail, setTargetEmail] = useState(() => {
    return email || localStorage.getItem('pending_verification_email') || '';
  });
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(targetEmail);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (email) {
      setTargetEmail(email);
      setEmailInput(email);
      localStorage.setItem('pending_verification_email', email);
    }
  }, [email]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance focus to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedText)) {
      const digits = pastedText.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
      handleVerify(digits.join(''));
    }
  };

  const handleSaveEmail = () => {
    const clean = emailInput.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setError("Please enter a valid email address.");
      return;
    }
    setTargetEmail(clean);
    localStorage.setItem('pending_verification_email', clean);
    setIsEditingEmail(false);
    setError('');
  };

  const handleVerify = async (codeOverride) => {
    const activeEmail = targetEmail.trim().toLowerCase();
    if (!activeEmail) {
      setError("Please specify the registered email address to verify.");
      setIsEditingEmail(true);
      return;
    }

    const code = codeOverride || otp.join('');
    if (code.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await authAPI.verifyEmail({
        email: activeEmail,
        code
      });

      loginUser(data.token, data.user);
      setSuccessMsg("Email verified! Redirecting to dashboard...");
      localStorage.removeItem('pending_verification_email');

      setTimeout(() => {
        if (data.user?.role === 'admin') {
          onNavigate('admin');
        } else {
          onNavigate('participant');
        }
      }, 800);
    } catch (err) {
      setError(err.message || "Verification failed. Check the 6-digit code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const activeEmail = targetEmail.trim().toLowerCase();
    if (!activeEmail) {
      setError("Please enter your email to receive a new code.");
      setIsEditingEmail(true);
      return;
    }

    setResending(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await authAPI.resendCode({ email: activeEmail });
      setTimer(60);
      setCanResend(false);
      setSuccessMsg(res.message || "A fresh 6-digit OTP code has been dispatched to your email.");
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.message || "Failed to resend code. Please check your email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '2rem 1rem',
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

      <div className="arch-card animate-fade-in" style={{ maxWidth: '460px', width: '100%', padding: '2.5rem 2rem', boxShadow: 'var(--brutalist-shadow-lg)', textAlign: 'center' }}>
        
        {/* Shield Icon Badge */}
        <div style={{ 
          width: '56px', 
          height: '56px', 
          backgroundColor: 'var(--badge-available-bg)', 
          border: '1px solid var(--badge-available-border)', 
          color: 'var(--color-aqua-teal)', 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginBottom: '1.25rem',
          boxShadow: 'var(--brutalist-shadow-sm)'
        }}>
          <ShieldCheck size={30} />
        </div>

        {/* High-Contrast Title */}
        <h1 className="font-serif" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.4rem' }}>
          Verify Email Address
        </h1>
        
        {/* Email display and inline editor */}
        {!isEditingEmail ? (
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
              Enter the 6-digit OTP code dispatched to <strong style={{ color: 'var(--text-headlines)', fontFamily: 'JetBrains Mono, monospace' }}>{targetEmail || 'your email'}</strong>
            </p>
            <button
              onClick={() => setIsEditingEmail(true)}
              style={{ background: 'none', border: 'none', color: 'var(--color-teal-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'underline' }}
              title="Change or fix email address"
            >
              <Edit3 size={12} /> Edit
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--code-box-bg)', border: '1px dashed var(--border-focus)' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
              REGISTERED EMAIL ADDRESS
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="email"
                className="arch-input"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="developer@gmail.com"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
              />
              <button
                onClick={handleSaveEmail}
                className="btn-brutalist-primary"
                style={{ padding: '0.45rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Check size={14} /> Save
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(225, 29, 72, 0.1)', 
            border: '1px solid var(--danger)', 
            color: 'var(--danger)', 
            padding: '0.65rem', 
            fontSize: '0.82rem', 
            marginBottom: '1.25rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
            padding: '0.65rem', 
            fontSize: '0.82rem', 
            marginBottom: '1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.5rem',
            fontWeight: 700
          }}>
            <CheckCircle2 size={16} color="var(--color-aqua-teal)" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 6-Digit OTP Inputs with Crisp High-Contrast Visibility & Clipboard Paste */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.75rem' }}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={el => inputRefs.current[idx] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className="arch-input font-mono"
              style={{
                width: '46px',
                height: '54px',
                textAlign: 'center',
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--text-headlines)',
                backgroundColor: 'var(--bg-input)',
                borderColor: digit ? 'var(--color-aqua-teal)' : 'var(--border-color)',
                boxShadow: digit ? 'var(--brutalist-shadow-sm)' : 'none',
                padding: 0
              }}
            />
          ))}
        </div>

        <button
          onClick={() => handleVerify()}
          className="btn-brutalist-primary"
          style={{ width: '100%', padding: '0.8rem' }}
          disabled={loading || otp.join('').length < 6}
        >
          {loading ? 'Verifying Code...' : 'Confirm Verification OTP'}
        </button>

        {/* Resend Cooldown Timer & Action */}
        <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Didn't receive the code?{' '}
          {canResend ? (
            <button
              onClick={handleResend}
              disabled={resending}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--color-teal-primary)', 
                fontWeight: 800, 
                cursor: 'pointer', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.25rem',
                textDecoration: 'underline'
              }}
            >
              <RotateCw size={13} className={resending ? 'animate-spin' : ''} /> {resending ? 'Sending...' : 'Resend OTP Code'}
            </button>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
              Resend available in {timer}s
            </span>
          )}
        </div>

        {/* Alternate navigation */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
          <button
            onClick={() => onNavigate('login')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
          >
            Already verified? <span style={{ color: 'var(--color-teal-primary)', fontWeight: 700 }}>Sign In</span>
          </button>
        </div>

      </div>

    </div>
  );
};

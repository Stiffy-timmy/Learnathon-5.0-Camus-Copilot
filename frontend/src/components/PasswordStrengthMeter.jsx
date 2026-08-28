import React from 'react';
import { Check, X } from 'lucide-react';

export const PasswordStrengthMeter = ({ password }) => {
  const requirements = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter (A-Z)", valid: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a-z)", valid: /[a-z]/.test(password) },
    { label: "One numeric digit (0-9)", valid: /[0-9]/.test(password) },
    { label: "One special character (!@#$%...)", valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password) },
  ];

  const score = requirements.filter(r => r.valid).length;
  
  const getStrengthLabel = () => {
    if (score === 0) return { text: "Too Short", color: "var(--text-muted)", pct: 0 };
    if (score <= 2) return { text: "Weak", color: "var(--danger)", pct: 33 };
    if (score <= 4) return { text: "Medium", color: "var(--warning)", pct: 66 };
    return { text: "Strong Password", color: "var(--color-aqua-teal)", pct: 100 };
  };

  const strength = getStrengthLabel();

  return (
    <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.78rem' }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Password Strength:</span>
        <span style={{ fontWeight: 800, color: strength.color, fontFamily: 'JetBrains Mono, monospace' }}>{strength.text}</span>
      </div>

      <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '0px', overflow: 'hidden', marginBottom: '0.65rem' }}>
        <div 
          style={{ 
            height: '100%', 
            width: `${strength.pct}%`, 
            backgroundColor: strength.color,
            transition: 'all 0.3s ease'
          }} 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '0.2rem', fontSize: '0.73rem' }}>
        {requirements.map((req, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: req.valid ? 'var(--color-aqua-teal)' : 'var(--text-muted)' }}>
            {req.valid ? <Check size={13} strokeWidth={3} /> : <X size={13} />}
            <span style={{ fontWeight: req.valid ? 600 : 400 }}>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../api/client';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { User, Mail, Lock, Shield, ArrowRight, Key, Code, Terminal, Sun, Moon, X, Plus, Trash2 } from 'lucide-react';

export const Register = ({ onNavigate, setRegisteredEmail }) => {
  const { isDark, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('participant');
  const [adminPasskey, setAdminPasskey] = useState('');
  const [developerType, setDeveloperType] = useState('Full-Stack Developer (React / FastAPI / Node)');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState(['React', 'Python', 'FastAPI']);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickSkillSuggestions = ['Next.js', 'TypeScript', 'Tailwind CSS', 'Docker', 'PyTorch', 'Figma', 'Solidity', 'Go'];

  const handleAddSkill = (skillToAdd) => {
    const s = (skillToAdd || skillInput).trim();
    if (!s) return;
    if (!skills.map(k => k.toLowerCase()).includes(s.toLowerCase())) {
      setSkills([...skills, s]);
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError("Full Name is mandatory.");
      return;
    }
    if (!username.trim() || username.trim().replace(/^@/, '').length < 3) {
      setError("Username handle is mandatory (at least 3 characters).");
      return;
    }
    if (!email.trim()) {
      setError("Email address is mandatory.");
      return;
    }
    if (!password) {
      setError("Password is mandatory.");
      return;
    }

    if (role === 'admin' && !adminPasskey.trim()) {
      setError("Organizer Admin Passkey is required for organizer accounts.");
      return;
    }

    if (role === 'participant') {
      if (!developerType || !developerType.trim()) {
        setError("Primary Developer Specialty / Role is mandatory.");
        return;
      }
      if (!bio.trim() || bio.trim().length < 10) {
        setError("Developer Bio is mandatory (minimum 10 characters describing what you build).");
        return;
      }
      if (!skills || skills.length === 0) {
        setError("Please add at least one technology or framework to your skills profile.");
        return;
      }
    }

    setLoading(true);

    try {
      await authAPI.register({
        name: name.trim(),
        username: username.trim().replace(/^@/, ''),
        email: email.trim(),
        password,
        role,
        adminPasskey: role === 'admin' ? adminPasskey.trim() : null,
        developerType: role === 'participant' ? developerType : null,
        bio: role === 'participant' ? bio.trim() : null,
        skills: role === 'participant' ? skills : []
      });

      const cleanEmail = email.trim();
      localStorage.setItem('pending_verification_email', cleanEmail);
      if (setRegisteredEmail) setRegisteredEmail(cleanEmail);
      onNavigate('verify-email', { email: cleanEmail });
    } catch (err) {
      setError(err.message || "Registration failed. Please check input values.");
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
      padding: '2.5rem 1rem',
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

      <div className="arch-card animate-fade-in" style={{ maxWidth: '540px', width: '100%', padding: '2.25rem', boxShadow: 'var(--brutalist-shadow-lg)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="pill-badge pill-badge-ready" style={{ marginBottom: '0.85rem', padding: '0.25rem 0.85rem' }}>
            <Terminal size={14} color="var(--color-teal-primary)" /> CampusCopilot
          </div>
          <h1 className="font-serif" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem' }}>
            Self-Registration Portal
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
            Create your hacker profile or register as an event organizer
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
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          
          {/* Role Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.45rem', fontFamily: 'JetBrains Mono' }}>
              SELECT ACCOUNT ROLE
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                className={role === 'participant' ? 'btn-brutalist-primary' : 'btn-brutalist-outline'}
                onClick={() => setRole('participant')}
                style={{ padding: '0.6rem' }}
              >
                <User size={15} /> Participant
              </button>
              <button
                type="button"
                className={role === 'admin' ? 'btn-brutalist-primary' : 'btn-brutalist-outline'}
                onClick={() => setRole('admin')}
                style={{ padding: '0.6rem' }}
              >
                <Shield size={15} /> Organizer / Admin
              </button>
            </div>
          </div>

          {/* Admin Passkey Section */}
          {role === 'admin' && (
            <div style={{ 
              backgroundColor: 'var(--code-box-bg)', 
              padding: '1rem', 
              border: '1px dashed var(--border-focus)',
              boxShadow: 'var(--brutalist-shadow-sm)'
            }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                ORGANIZER PASSKEY REQUIRED *
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-aqua-teal)' }} />
                <input
                  type="password"
                  className="arch-input"
                  placeholder="Enter admin password"
                  value={adminPasskey}
                  onChange={(e) => setAdminPasskey(e.target.value)}
                  style={{ paddingLeft: '2.4rem' }}
                  required={role === 'admin'}
                />
              </div>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
              FULL NAME *
            </label>
            <input
              type="text"
              className="arch-input"
              placeholder="e.g. Alex Mercer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Username & Email in 2 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                USERNAME HANDLE *
              </label>
              <input
                type="text"
                className="arch-input"
                placeholder="alexdev"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                EMAIL ADDRESS *
              </label>
              <input
                type="email"
                className="arch-input"
                placeholder="alex@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Participant Developer Profile Fields */}
          {role === 'participant' && (
            <div style={{ 
              backgroundColor: 'var(--code-box-bg)', 
              border: '1px solid var(--border-color)', 
              padding: '1.15rem', 
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-headlines)', fontSize: '0.84rem', fontWeight: 800 }}>
                <Code size={15} color="var(--color-teal-primary)" /> 
                <span>Developer Bio & Skills Profile</span> 
                <span style={{ fontSize: '0.72rem', color: 'var(--color-aqua-teal)', fontFamily: 'JetBrains Mono' }}>(Matchmaking Hub)</span>
              </div>

              {/* Developer Specialty / Role */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  PRIMARY DEVELOPER SPECIALTY / ROLE *
                </label>
                <select 
                  className="arch-input" 
                  value={developerType} 
                  onChange={(e) => setDeveloperType(e.target.value)}
                  style={{ 
                    width: '100%', 
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-headlines)'
                  }}
                  required
                >
                  <option value="Full-Stack Developer (React / FastAPI / Node)">Full-Stack Developer (React / FastAPI / Node)</option>
                  <option value="Frontend Specialist (React / Next.js / Tailwind)">Frontend Specialist (React / Next.js / Tailwind)</option>
                  <option value="Backend & Cloud Engineer (Python / Go / PostgreSQL)">Backend & Cloud Engineer (Python / Go / PostgreSQL)</option>
                  <option value="AI & Autonomous Agents Engineer (LLMs / PyTorch / RAG)">AI & Autonomous Agents Engineer (LLMs / PyTorch / RAG)</option>
                  <option value="Mobile App Developer (Flutter / React Native / Android / iOS)">Mobile App Developer (Flutter / React Native / Android / iOS)</option>
                  <option value="UI/UX Designer & Product Lead (Figma / Design Systems)">UI/UX Designer & Product Lead (Figma / Design Systems)</option>
                  <option value="Web3 & Smart Contracts Dev (Solidity / Rust / EVM)">Web3 & Smart Contracts Dev (Solidity / Rust / EVM)</option>
                  <option value="DevOps & Infrastructure Engineer (Docker / K8s / CI-CD)">DevOps & Infrastructure Engineer (Docker / K8s / CI-CD)</option>
                </select>
              </div>

              {/* Developer Bio */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  DEVELOPER BIO (WHAT DO YOU BUILD?) *
                </label>
                <textarea 
                  className="arch-input"
                  rows={2}
                  placeholder="e.g. Passionate about building modern web apps and agentic AI systems..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  required
                />
              </div>

              {/* Familiar Technologies & Skills Tag Cloud */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  FAMILIAR TECHNOLOGIES & FRAMEWORKS *
                </label>

                {/* Active Skills Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                  {skills.map((s, idx) => (
                    <span 
                      key={idx} 
                      className="pill-badge pill-badge-tech"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingRight: '0.45rem' }}
                    >
                      {s}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSkill(s)} 
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex' }}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Custom Skill Input */}
                <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    className="arch-input"
                    placeholder="Add technology (e.g. PyTorch, Rust)..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                    style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill()}
                    className="btn-brutalist-outline"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                {/* Quick suggestions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>Quick add:</span>
                  {quickSkillSuggestions.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAddSkill(sug)}
                      className="pill-badge"
                      style={{ 
                        backgroundColor: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)', 
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.65rem'
                      }}
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Password & Strength Meter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
              CREATE PASSWORD *
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                className="arch-input"
                placeholder="Create strong password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.4rem' }}
                required
              />
            </div>
            {password && <PasswordStrengthMeter password={password} />}
          </div>

          <button
            type="submit"
            className="btn-brutalist-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Creating Profile & Dispatching OTP...' : (
              <>
                Complete Registration & Verify <ArrowRight size={16} />
              </>
            )}
          </button>

        </form>

        {/* Footer Link */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '1.15rem' }}>
          <div>
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('login')}
              style={{ background: 'none', border: 'none', color: 'var(--color-teal-primary)', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign In Here
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

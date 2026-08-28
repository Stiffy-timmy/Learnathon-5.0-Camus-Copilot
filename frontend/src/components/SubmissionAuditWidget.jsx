import React, { useState, useEffect } from 'react';
import { auditAPI } from '../api/client';
import { 
  ShieldCheck, AlertTriangle, XCircle, CheckCircle2, 
  ExternalLink, Video, Code, RefreshCw, Sparkles, HelpCircle, FileCheck
} from 'lucide-react';

export const SubmissionAuditWidget = ({ team, user }) => {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customGhUrl, setCustomGhUrl] = useState('');
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [showInspector, setShowInspector] = useState(false);

  useEffect(() => {
    if (team) {
      if (team.githubUrl) setCustomGhUrl(team.githubUrl);
      if (team.description) setCustomDesc(team.description);
      runInitialAudit();
    }
  }, [team]);

  const runInitialAudit = async () => {
    setLoading(true);
    try {
      const res = await auditAPI.auditSubmission({
        githubUrl: team?.githubUrl || '',
        demoVideoUrl: customVideoUrl,
        description: team?.description || ''
      });
      if (res?.audit) {
        setAuditData(res.audit);
      }
    } catch (err) {
      console.error("Audit error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      const res = await auditAPI.auditSubmission({
        githubUrl: customGhUrl,
        demoVideoUrl: customVideoUrl,
        description: customDesc || team?.description || ''
      });
      if (res?.audit) {
        setAuditData(res.audit);
      }
    } catch (err) {
      alert("Failed to run submission audit: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const score = auditData?.score ?? 0;
  const isCompliant = auditData?.complianceStatus === 'compliant';
  const hasErrors = (auditData?.errors?.length || 0) > 0;

  return (
    <div 
      className="submission-audit-widget"
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
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div 
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: isCompliant ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${isCompliant ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isCompliant ? '#10b981' : '#f59e0b'
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                Automated Submission Compliance Auditor
              </h4>
              <span 
                className="pill-badge"
                style={{
                  fontSize: '0.65rem',
                  backgroundColor: isCompliant ? 'rgba(16, 185, 129, 0.15)' : hasErrors ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: isCompliant ? '#10b981' : hasErrors ? '#ef4444' : '#f59e0b',
                  border: `1px solid ${isCompliant ? 'rgba(16, 185, 129, 0.4)' : hasErrors ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                }}
              >
                {isCompliant ? '100% COMPLIANT' : hasErrors ? 'ACTION REQUIRED' : 'WARNINGS PRESENT'}
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--editorial-subtext, #94a3b8)' }}>
              Pre-deadline compliance checklist: checks repository structure, demo video link, and track eligibility to prevent disqualification.
            </p>
          </div>
        </div>

        {/* Score & Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>AUDIT SCORE</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444' }}>
              {score}<span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>/100</span>
            </div>
          </div>

          <button
            onClick={() => setShowInspector(!showInspector)}
            style={{
              padding: '0.45rem 0.9rem',
              backgroundColor: showInspector ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {showInspector ? 'Hide Inspector' : 'Run Live Inspector'}
          </button>
        </div>
      </div>

      {/* Live Inspector Form (Collapsible) */}
      {showInspector && (
        <form onSubmit={handleRunAudit} style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '10px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.25rem', fontFamily: 'JetBrains Mono, monospace' }}>
                GITHUB REPOSITORY URL *
              </label>
              <div style={{ position: 'relative' }}>
                <Code size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input 
                  type="text"
                  placeholder="https://github.com/organization/project"
                  value={customGhUrl}
                  onChange={(e) => setCustomGhUrl(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.55rem 0.75rem 0.55rem 2rem',
                    backgroundColor: '#090d16',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.25rem', fontFamily: 'JetBrains Mono, monospace' }}>
                DEMO VIDEO WALKTHROUGH LINK (Loom / YouTube)
              </label>
              <div style={{ position: 'relative' }}>
                <Video size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input 
                  type="text"
                  placeholder="https://loom.com/share/... or YouTube link"
                  value={customVideoUrl}
                  onChange={(e) => setCustomVideoUrl(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.55rem 0.75rem 0.55rem 2rem',
                    backgroundColor: '#090d16',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1.15rem',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
              {loading ? 'Auditing Codebase...' : 'Execute Compliance Audit'}
            </button>
          </div>
        </form>
      )}

      {/* Checklist Grid */}
      {auditData?.checks && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.65rem' }}>
          {auditData.checks.map((chk) => {
            const isPass = chk.status === 'pass';
            const isWarn = chk.status === 'warning';
            const isFail = chk.status === 'fail';

            return (
              <div
                key={chk.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '8px',
                  border: `1px solid ${isPass ? 'rgba(16, 185, 129, 0.2)' : isWarn ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}
              >
                <div style={{ marginTop: '2px', color: isPass ? '#10b981' : isWarn ? '#f59e0b' : '#ef4444' }}>
                  {isPass ? <CheckCircle2 size={16} /> : isWarn ? <AlertTriangle size={16} /> : <XCircle size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff' }}>
                    {chk.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: isPass ? '#94a3b8' : isWarn ? '#fcd34d' : '#fca5a5', marginTop: '0.1rem', lineHeight: 1.4 }}>
                    {chk.message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

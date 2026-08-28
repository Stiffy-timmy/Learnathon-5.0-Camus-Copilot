import React, { useState, useEffect } from 'react';
import { certificateAPI } from '../api/client';
import { 
  Award, ShieldCheck, Download, Search, CheckCircle2, 
  XCircle, Copy, Check, ExternalLink, RefreshCw, Sparkles, FileText, CheckCircle,
  Lock, AlertTriangle
} from 'lucide-react';

export const CertificateWidget = ({ user, team }) => {
  const [certData, setCertData] = useState(null);
  const [certConfig, setCertConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Authenticator State
  const [verifyQuery, setVerifyQuery] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      const [certRes, cfgRes] = await Promise.all([
        certificateAPI.getMyCertificate().catch(() => ({ certificate: null })),
        certificateAPI.getConfig().catch(() => ({ config: { isUnlocked: false } }))
      ]);
      if (certRes?.certificate) {
        setCertData(certRes.certificate);
      }
      if (cfgRes?.config) {
        setCertConfig(cfgRes.config);
      }
    } catch (err) {
      console.error("Error fetching certificate:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificate();
  }, [user, team]);

  const isUnlocked = certConfig ? certConfig.isUnlocked === true : false;

  const handleDownload = async (customId = null) => {
    const targetId = customId || certData?.id;
    if (!targetId) return;
    setDownloading(true);
    try {
      await certificateAPI.downloadPdf(targetId, certData?.recipientName || user?.name || 'Participant');
    } catch (err) {
      alert("Failed to download certificate: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleVerifyLookup = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = verifyQuery.trim();
    if (!query) return;

    setVerifying(true);
    setVerifyError('');
    setVerifyResult(null);
    try {
      const res = await certificateAPI.verifyCertificate(query);
      if (res?.isValid && res?.certificate) {
        setVerifyResult(res.certificate);
      } else {
        setVerifyError("Certificate could not be authenticated. Invalid Hash ID.");
      }
    } catch (err) {
      setVerifyError("Certificate record not found or invalid Certificate ID.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyHash = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 3000);
  };

  const participantName = certData?.recipientName || user?.name || 'Participant';
  const roleTitle = certData?.roleTitle || user?.roleTitle || 'Full-Stack Developer (React / FastAPI / Node)';
  const teamRoster = certData?.teamName || (team?.name ? team.name : 'Solo Hacker');
  const trackName = certData?.track || (team?.track ? team.track : 'Open Innovation & Smart Campus');
  const certId = certData?.id || 'CERT-2026-D6370B6A';

  return (
    <div 
      className="certificate-portal-wrapper"
      style={{
        marginTop: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      {/* Top Banner Header matching Reference Photo 3 */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.4) 0%, rgba(224, 231, 255, 0.4) 50%, rgba(207, 250, 254, 0.4) 100%), #ffffff',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          borderRadius: '16px',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div 
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem'
            }}
          >
            🏆
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f3a47' }}>
              Post–Hackathon Event & Certificate Portal
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Official digital achievements, verified PDF certificates, and event credential validation.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleDownload()}
          disabled={!isUnlocked || downloading || loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.35rem',
            backgroundColor: isUnlocked ? '#4f46e5' : '#94a3b8',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: !isUnlocked || downloading || loading ? 'not-allowed' : 'pointer',
            boxShadow: isUnlocked ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
            opacity: isUnlocked ? 1 : 0.85,
            transition: 'all 0.15s ease'
          }}
          title={!isUnlocked ? "Certificate download permission has not been released by organizers yet" : "Download your official PDF Certificate"}
        >
          {isUnlocked ? <Download size={16} /> : <Lock size={16} />}
          {downloading 
            ? 'Generating PDF...' 
            : isUnlocked 
              ? 'Download Official PDF Certificate' 
              : 'Downloads Disabled (Pending Release)'}
        </button>
      </div>

      {/* 2-Column Split: Certificate Card (Left) & Certificate Authenticator (Right) */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.25rem'
        }}
      >
        {/* LEFT: Official Certificate Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.5rem 1.75rem',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          {/* Top Right Ribbon Medal Icon */}
          <div
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)'
            }}
          >
            <Award size={18} />
          </div>

          <div>
            {/* Gold Participation Badge */}
            <div style={{ marginBottom: '0.85rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: '#b45309',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px'
                }}
              >
                ★ {certData?.certificateTitle || 'CERTIFICATE OF PARTICIPATION'} ★
              </span>
            </div>

            {/* Recipient Name */}
            <h3
              style={{
                margin: '0 0 0.25rem 0',
                fontSize: '1.65rem',
                fontWeight: 800,
                color: '#0f3a47',
                letterSpacing: '-0.02em'
              }}
            >
              {participantName}
            </h3>

            {/* Role Title */}
            <div style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 500, marginBottom: '1.15rem' }}>
              {roleTitle}
            </div>

            {/* Structured Table Box */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                marginBottom: '1.25rem',
                fontSize: '0.82rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Team Roster:</span>
                <span style={{ fontWeight: 700, color: '#0f3a47' }}>{teamRoster}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Hackathon Track:</span>
                <span style={{ fontWeight: 700, color: '#0f3a47' }}>{trackName}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Certificate Hash ID:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: '#4f46e5' }}>
                    {certId}
                  </span>
                  <button
                    onClick={() => handleCopyHash(certId)}
                    title="Copy Certificate ID"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedHash ? '#10b981' : '#64748b',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    {copiedHash ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
            {/* Permission Locked Banner when downloads are withheld */}
            {!isUnlocked && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  color: '#b45309',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  lineHeight: '1.4'
                }}
              >
                <Lock size={16} color="#d97706" style={{ flexShrink: 0 }} />
                <span>
                  Official certificate downloads are currently locked by organizers. Permission will be enabled after closing ceremonies.
                </span>
              </div>
            )}

          </div>

          {/* Bottom Download Button */}
          <button
            onClick={() => handleDownload()}
            disabled={!isUnlocked || downloading || loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1rem',
              backgroundColor: isUnlocked ? '#f5f3ff' : '#f1f5f9',
              color: isUnlocked ? '#4f46e5' : '#94a3b8',
              border: `1px solid ${isUnlocked ? '#c7d2fe' : '#cbd5e1'}`,
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: !isUnlocked || downloading || loading ? 'not-allowed' : 'pointer',
              opacity: isUnlocked ? 1 : 0.85,
              transition: 'all 0.15s ease'
            }}
            title={!isUnlocked ? "Download permission disabled by event admin" : "Download PDF certificate"}
          >
            {isUnlocked ? <Download size={15} /> : <Lock size={15} />}
            {downloading 
              ? 'Downloading PDF...' 
              : isUnlocked 
                ? 'Download PDF' 
                : 'Download Locked by Organizers'}
          </button>
        </div>

        {/* RIGHT: Certificate Authenticator */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.5rem 1.75rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            {/* Authenticator Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.5rem' }}>
              <div 
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  backgroundColor: '#ecfdf5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f3a47' }}>
                Certificate Authenticator
              </h3>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Verify the authenticity of any GIETU Smart Hackathon 2026 certificate by entering its unique hash code (e.g. {certId}).
            </p>

            {/* Input Search Form */}
            <form onSubmit={handleVerifyLookup} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Enter Certificate ID..."
                value={verifyQuery}
                onChange={(e) => setVerifyQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
              <button
                type="submit"
                disabled={verifying || !verifyQuery.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.6rem 1.15rem',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: verifying || !verifyQuery.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {verifying ? <RefreshCw size={14} className="spin-animation" /> : <Search size={14} />}
                Verify
              </button>
            </form>

            {/* Verification Result Readout */}
            {verifyResult && (
              <div 
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  marginBottom: '1rem',
                  fontSize: '0.8rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontWeight: 800, marginBottom: '0.35rem' }}>
                  <CheckCircle2 size={16} /> Authentic & Verifiable Credential
                </div>
                <div style={{ color: '#1e293b', fontWeight: 700 }}>
                  Recipient: {verifyResult.recipientName} ({verifyResult.roleTitle || 'Developer'})
                </div>
                <div style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '0.2rem' }}>
                  Track: {verifyResult.track} • Issued on: {verifyResult.issueDate}
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    onClick={() => handleDownload(verifyResult.id)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Download This Verified PDF
                  </button>
                </div>
              </div>
            )}

            {verifyError && (
              <div 
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  marginBottom: '1rem'
                }}
              >
                ✕ {verifyError}
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>
            Official Event Certification Engine • Digital Verification Protocol
          </div>
        </div>
      </div>
    </div>
  );
};

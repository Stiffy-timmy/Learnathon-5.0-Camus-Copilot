import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamAPI, handbookAPI, timerAPI, authAPI } from '../api/client';
import { Navbar } from '../components/Navbar';
import { ChatWidget } from '../components/ChatWidget';
import { AnnouncementModal } from '../components/AnnouncementModal';
import { CertificateWidget } from '../components/CertificateWidget';
import { SubmissionAuditWidget } from '../components/SubmissionAuditWidget';
import { AdaptiveTelemetryWidget } from '../components/AdaptiveTelemetryWidget';
import { LogisticsHubModal } from '../components/LogisticsHubModal';
import { LogisticsHubWidget } from '../components/LogisticsHubWidget';
import { 
  Users, UserPlus, Sparkles, Target, Award, Code, CheckCircle, CheckCircle2,
  HelpCircle, ChevronRight, Search, PlusCircle, UserCheck, Shield, Clock, Wifi, Utensils, MapPin,
  UserX, Copy, Check, Edit3, Mail, AlertTriangle, Ban, Send, ExternalLink, Terminal, Globe, Key,
  X, CheckCheck, Cpu, Activity
} from 'lucide-react';

export const ParticipantDashboard = ({ onNavigate }) => {
  const { user, refreshUser } = useAuth();
  const [team, setTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);

  // Live Timer State
  const [timerData, setTimerData] = useState(null);
  const [displayTime, setDisplayTime] = useState('2d : 00h : 00m : 00s');
  const [timerStatus, setTimerStatus] = useState('idle');
  
  // Quick Reference Dynamic State
  const [quickRef, setQuickRef] = useState({
    wifi: { ssid: 'Hackathon_5G', password: 'innovate_together_2026' },
    rubric: [
      { criterion: 'Innovation & Uniqueness', weight: '30%' },
      { criterion: 'Technical Execution', weight: '30%' },
      { criterion: 'UX & Polish', weight: '20%' },
      { criterion: 'Pitch & Impact', weight: '20%' }
    ],
    catering: { schedule: 'Breakfast: 8:00 AM | Lunch: 1:00 PM | Dinner: 7:00 PM (Lounge C)' },
    location: 'CSE Block, GIETU Gunupur',
    duration: '48 Hours continuous sprint'
  });

  // Dynamic Live Tracks from Handbook Section 3
  const [tracks, setTracks] = useState([
    { id: 'track_1', name: 'AI & Autonomous Agents', fullName: 'Track 1: AI & Autonomous Agents', description: 'Building LLM systems, multi-agent frameworks, RAG workflows, or task automation tooling.' },
    { id: 'track_2', name: 'Web3, Fintech & Decentralized Apps', fullName: 'Track 2: Web3, Fintech & Decentralized Apps', description: 'Smart contracts, decentralized identity, payments, and blockchain security.' },
    { id: 'track_3', name: 'Healthcare & MedTech', fullName: 'Track 3: Healthcare & MedTech', description: 'Diagnostics tooling, patient management, accessible health tech, and AI medical triage.' },
    { id: 'track_4', name: 'Open Innovation & Smart Campus', fullName: 'Track 4: Open Innovation & Smart Campus', description: 'Logistics, smart city solutions, IoT, sustainability, and open-source public goods.' }
  ]);

  // Matchmaking State
  const [matchResults, setMatchResults] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [matchSearchQuery, setMatchSearchQuery] = useState('');

  // Developer Profile & Bio Edit State
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editRoleTitle, setEditRoleTitle] = useState(user?.roleTitle || 'UI/UX Designer & Product Lead');
  const [editSkills, setEditSkills] = useState(user?.skills || ['React', 'Figma', 'UI/UX', 'TailwindCSS']);
  const [editSkillInput, setEditSkillInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Copy Feedback States
  const [copiedWifiSSID, setCopiedWifiSSID] = useState(false);
  const [copiedWifiPass, setCopiedWifiPass] = useState(false);
  const [copiedInviteCode, setCopiedInviteCode] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState('');

  // Modal / Form States
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showJoinTeam, setShowJoinTeam] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [githubUrlInput, setGithubUrlInput] = useState('');
  const [submittingProject, setSubmittingProject] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamTrack, setTeamTrack] = useState('Track 1: AI & Autonomous Agents');
  const [teamDesc, setTeamDesc] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchTimer = async () => {
    try {
      const data = await timerAPI.getTimer();
      setTimerData(data);
      setTimerStatus(data.status);
      if (data.formattedRemaining) {
        setDisplayTime(data.formattedRemaining);
      }
    } catch (err) {
      console.error("Error fetching live timer:", err);
    }
  };

  useEffect(() => {
    fetchMyTeam();
    runMatchmaking();
    fetchQuickReference();
    fetchTimer();

    const pollInterval = setInterval(fetchTimer, 5000);

    // Real-time polling for live updates
    const interval = setInterval(async () => {
      try {
        const [teamData, quickRefData, matchData] = await Promise.all([
          teamAPI.getMyTeam(),
          handbookAPI.getQuickReference(),
          teamAPI.getMatchmaking()
        ]);

        if (quickRefData?.quickReference) {
          setQuickRef(quickRefData.quickReference);
          if (quickRefData.quickReference.tracks && Array.isArray(quickRefData.quickReference.tracks) && quickRefData.quickReference.tracks.length > 0) {
            setTracks(quickRefData.quickReference.tracks);
          }
        }

        if (matchData) {
          setMatchResults(matchData);
        }

        setTeam(prevTeam => {
          if (prevTeam && !teamData.team) {
            if (typeof refreshUser === 'function') refreshUser();
            runMatchmaking(true);
            return null;
          }
          return teamData.team;
        });
      } catch (err) {
        // Silent polling error handling
      }
    }, 3000);

    const handleTeamReset = () => {
      setTeam(null);
      if (typeof refreshUser === 'function') refreshUser();
      runMatchmaking();
    };

    window.addEventListener('team_reset', handleTeamReset);
    return () => {
      clearInterval(interval);
      clearInterval(pollInterval);
      window.removeEventListener('team_reset', handleTeamReset);
    };
  }, []);

  // 1-second local countdown interpolation when running
  useEffect(() => {
    if (!timerData || timerData.status !== 'running' || !timerData.endTime) {
      if (timerData?.formattedRemaining) {
        setDisplayTime(timerData.formattedRemaining);
      }
      return;
    }

    const tick = () => {
      const endMs = new Date(timerData.endTime).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((endMs - nowMs) / 1000));

      if (diffSec <= 0) {
        setDisplayTime('00h : 00m : 00s');
        setTimerStatus('ended');
        return;
      }

      const days = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;

      const pad = (n) => String(n).padStart(2, '0');
      if (days > 0) {
        setDisplayTime(`${days}d : ${pad(hours)}h : ${pad(mins)}m : ${pad(secs)}s`);
      } else {
        setDisplayTime(`${pad(hours)}h : ${pad(mins)}m : ${pad(secs)}s`);
      }
    };

    tick();
    const tickInterval = setInterval(tick, 1000);
    return () => clearInterval(tickInterval);
  }, [timerData]);

  const fetchQuickReference = async () => {
    try {
      const data = await handbookAPI.getQuickReference();
      if (data?.quickReference) {
        setQuickRef(data.quickReference);
        if (data.quickReference.tracks && Array.isArray(data.quickReference.tracks) && data.quickReference.tracks.length > 0) {
          setTracks(data.quickReference.tracks);
        }
      }
    } catch (err) {
      console.error("Error fetching live handbook quick reference:", err);
    }
  };

  const fetchMyTeam = async () => {
    setLoadingTeam(true);
    try {
      const data = await teamAPI.getMyTeam();
      setTeam(data.team);
    } catch (err) {
      console.error("Error loading team info:", err);
    } finally {
      setLoadingTeam(false);
    }
  };

  const runMatchmaking = async (silent = false) => {
    if (!silent) setLoadingMatch(true);
    try {
      const data = await teamAPI.getMatchmaking();
      setMatchResults(data);
    } catch (err) {
      console.error("Error executing matchmaking:", err);
    } finally {
      if (!silent) setLoadingMatch(false);
    }
  };

  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    if (!teamName.trim()) {
      setActionError('Please enter a valid team name.');
      return;
    }
    try {
      const data = await teamAPI.createTeam({
        name: teamName.trim(),
        track: teamTrack,
        description: teamDesc.trim(),
        neededSkills: user?.skills || []
      });
      setTeam(data.team);
      setShowCreateTeam(false);
      setTeamName('');
      setTeamDesc('');
      setActionSuccess("Team successfully created!");
      if (typeof refreshUser === 'function') await refreshUser();
      runMatchmaking();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || "Failed to create team.");
    }
  };

  const handleJoinTeamSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      const data = await teamAPI.joinTeam({ inviteCodeOrId: inviteCodeInput.trim() });
      setTeam(data.team);
      setShowJoinTeam(false);
      setInviteCodeInput('');
      setActionSuccess(`Successfully joined ${data.team.name}!`);
      if (typeof refreshUser === 'function') await refreshUser();
      runMatchmaking();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || "Failed to join team.");
    }
  };

  const handleConfirmSubmitProject = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (team?.status === 'disqualified') {
      setActionError('Your team has been disqualified. Project repository submissions are permanently locked.');
      setShowSubmitModal(false);
      return;
    }
    let ghUrl = githubUrlInput.trim();
    if (!ghUrl) {
      setActionError('Please enter a GitHub repository link.');
      return;
    }
    if (!ghUrl.startsWith('http://') && !ghUrl.startsWith('https://')) {
      ghUrl = `https://${ghUrl}`;
    }
    if (!ghUrl.toLowerCase().includes('github.com')) {
      setActionError('Please enter a valid GitHub repository URL (e.g., https://github.com/organization/repo).');
      return;
    }

    setSubmittingProject(true);
    setActionError('');
    try {
      const data = await teamAPI.submitProject(ghUrl);
      setTeam(data.team);
      setShowSubmitModal(false);
      setActionSuccess(data.message || "Project GitHub repository successfully submitted!");
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setActionError(err.message || "Failed to submit project repository.");
    } finally {
      setSubmittingProject(false);
    }
  };

  // Sync profile edit state from current user
  useEffect(() => {
    if (user) {
      if (user.name) setEditName(user.name);
      if (user.bio !== undefined) setEditBio(user.bio || '');
      if (user.roleTitle) setEditRoleTitle(user.roleTitle);
      if (user.skills) setEditSkills(user.skills);
    }
  }, [user]);

  // Remove Member
  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove "${member.name}" from your team roster?`)) return;
    setActionError('');
    try {
      const data = await teamAPI.removeMember(member.userId);
      setTeam(data.team);
      setActionSuccess(`Successfully removed ${member.name} from the team roster.`);
      runMatchmaking();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setActionError(err.message || "Failed to remove team member.");
    }
  };

  // Leave Team
  const handleLeaveTeam = async () => {
    if (!window.confirm("Are you sure you want to leave this team? You will be reset to Solo Hacker status.")) return;
    setActionError('');
    try {
      await teamAPI.leaveTeam();
      setTeam(null);
      if (typeof refreshUser === 'function') refreshUser();
      runMatchmaking();
      setActionSuccess("You have left the team and are now a Solo Hacker.");
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || "Failed to leave team.");
    }
  };

  // Copy Email Handler
  const handleCopyEmail = (email) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(''), 3000);
    }
  };

  // Copy Wi-Fi credentials
  const handleCopyWifi = (type, val) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(val);
      if (type === 'ssid') {
        setCopiedWifiSSID(true);
        setTimeout(() => setCopiedWifiSSID(false), 2500);
      } else {
        setCopiedWifiPass(true);
        setTimeout(() => setCopiedWifiPass(false), 2500);
      }
    }
  };

  // Copy Invite Code
  const handleCopyInviteCode = (code) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedInviteCode(true);
      setTimeout(() => setCopiedInviteCode(false), 2500);
    }
  };

  // Invite candidate via Gmail
  const handleSendInviteGmail = (candidate) => {
    const senderEmail = user?.email || '';
    const senderName = user?.name || 'Fellow Hacker';
    const recipientEmail = candidate?.email || '';
    const candidateName = candidate?.name || 'Hacker';
    const roleTitle = candidate?.roleTitle || 'Developer';
    const teamNameStr = team ? team.name : 'our Hackathon Team';
    const teamTrackStr = team ? team.track : 'General Track';
    const inviteCodeLine = team?.inviteCode ? `\n• Team Invite Code: ${team.inviteCode}` : '';

    const subject = `Hackathon Team Invitation: Join ${teamNameStr} - CampusCopilot`;
    const body = `Hi ${candidateName},

I came across your developer profile on the CampusCopilot Matchmaking Hub (${roleTitle}) and would love to invite you to join ${teamNameStr}!

• Team Name: ${teamNameStr}
• Track: ${teamTrackStr}${inviteCodeLine}
• Sent by: ${senderName}
• Registered Email: ${senderEmail}

Let me know if you would like to collaborate and hack together!

Best regards,
${senderName}
${senderEmail}`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const win = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  // Save Developer Profile & Bio
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setActionError('');
    try {
      await authAPI.updateProfile({
        name: editName.trim(),
        roleTitle: editRoleTitle.trim(),
        bio: editBio.trim(),
        skills: editSkills
      });
      if (typeof refreshUser === 'function') await refreshUser();
      setShowProfileEditor(false);
      setActionSuccess("Developer bio updated successfully!");
      runMatchmaking();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!editSkillInput.trim()) return;
    const clean = editSkillInput.trim();
    if (!editSkills.includes(clean)) {
      setEditSkills([...editSkills, clean]);
    }
    setEditSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setEditSkills(editSkills.filter(s => s !== skillToRemove));
  };

  // Filter candidates (Supports both candidates and soloHackers keys)
  const candidateList = matchResults?.candidates || matchResults?.soloHackers || [];
  const filteredCandidates = candidateList.filter(c => {
    if (!matchSearchQuery.trim()) return true;
    const q = matchSearchQuery.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const handleMatch = c.username?.toLowerCase().includes(q);
    const roleMatch = c.roleTitle?.toLowerCase().includes(q);
    const bioMatch = c.bio?.toLowerCase().includes(q);
    const emailMatch = c.email?.toLowerCase().includes(q);
    const skillsMatch = c.skills?.some(s => s.toLowerCase().includes(q));
    return nameMatch || handleMatch || roleMatch || bioMatch || emailMatch || skillsMatch;
  });

  const isLeader = team?.members?.some(m => (m.userId === user?.id || m.email === user?.email) && m.isLeader);

  return (
    <div className="participant-dashboard-root" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <Navbar />

      {/* Main Split Layout Container */}
      <div className="dashboard-split-layout">

        {/* =========================================================================
            LEFT PANE: Editorial Typography & Hackathon Countdown Banner (NO IMAGES)
            ========================================================================= */}
        <aside className="arch-card-editorial dashboard-left-editorial">
          {/* Subtle Vector Background Patterns */}
          <div 
            className="tech-grid-pattern" 
            style={{ 
              position: 'absolute', 
              inset: 0, 
              opacity: 0.15, 
              pointerEvents: 'none' 
            }} 
          />

          {/* Top Section: Header, Category & Welcome Hero */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            
            {/* Category Tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.15rem', flexWrap: 'wrap' }}>
              <span className="pill-badge pill-badge-ready" style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}>
                PARTICIPANT OPERATIONS PORTAL
              </span>
            </div>

            {/* High-Contrast Serif Hero Headline */}
            <h1 
              className="font-serif"
              style={{ 
                fontSize: 'clamp(1.65rem, 5.5vw, 2.4rem)', 
                lineHeight: 1.15, 
                color: '#ffffff',
                fontWeight: 700,
                marginBottom: '0.75rem',
                letterSpacing: '-0.01em',
                wordBreak: 'break-word'
              }}
            >
              Welcome, {user?.name || 'Hacker'} 👋
            </h1>

            {/* Subtext */}
            <p style={{ 
              fontSize: '0.92rem', 
              lineHeight: 1.6, 
              color: 'var(--editorial-subtext)',
              marginBottom: '1.5rem',
              fontWeight: 400
            }}>
              Track your team roster, discover complementary hackers via automated skill gap matchmaking, and get 24/7 RAG support.
            </p>

            {/* SPRINT COUNTDOWN TIMER WIDGET (Directly Below Welcome Section) */}
            <div 
              style={{ 
                backgroundColor: 'var(--editorial-card)', 
                border: '1px solid var(--editorial-border)',
                padding: '1.25rem 1.25rem',
                boxShadow: 'var(--editorial-shadow)',
                position: 'relative',
                marginBottom: '1rem',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              {/* Corner Crosshairs */}
              <span style={{ position: 'absolute', top: '-7px', left: '-5px', color: 'var(--color-aqua-teal)', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>+</span>
              <span style={{ position: 'absolute', top: '-7px', right: '-5px', color: 'var(--color-aqua-teal)', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>+</span>
              <span style={{ position: 'absolute', bottom: '-7px', left: '-5px', color: 'var(--color-aqua-teal)', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>+</span>
              <span style={{ position: 'absolute', bottom: '-7px', right: '-5px', color: 'var(--color-aqua-teal)', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>+</span>

              {/* Tag Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <span style={{ 
                  fontSize: '0.72rem', 
                  fontFamily: 'JetBrains Mono, monospace', 
                  color: 'var(--color-slate-blue)', 
                  fontWeight: 700, 
                  letterSpacing: '0.05em' 
                }}>
                  HACKATHON SPRINT DURATION
                </span>

                <span className={`pill-badge ${timerStatus === 'running' ? 'pill-badge-live' : 'pill-badge-ready'}`}>
                  {timerStatus === 'running' && <span className="pulse-dot" />}
                  {timerStatus === 'running' ? 'LIVE' : 'READY'}
                </span>
              </div>

              {/* Monospaced Digital Countdown Timer */}
              <div 
                className="font-mono"
                style={{ 
                  fontSize: 'clamp(0.92rem, 2.3vw, 1.32rem)', 
                  fontWeight: 800, 
                  color: '#ffffff', 
                  letterSpacing: '-0.02em',
                  marginBottom: '0.85rem',
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                  whiteSpace: 'nowrap',
                  overflow: 'visible'
                }}
              >
                {displayTime}
              </div>

              {/* Technical Metadata Row */}
              <div style={{ 
                borderTop: '1px solid var(--editorial-border)',
                paddingTop: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--editorial-subtext)', fontFamily: 'JetBrains Mono, monospace' }}>VENUE ROOM</div>
                  <div style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 700 }}>CSE Block, GIETU</div>
                </div>
              </div>

              {/* Operational Logistics Hub Button */}
              <div style={{ marginTop: '0.85rem' }}>
                <button 
                  onClick={() => setShowLogisticsModal(true)}
                  className="btn-brutalist-primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', fontSize: '0.8rem' }}
                >
                  <Cpu size={15} />
                  Logistics & Sponsor Resources
                </button>
              </div>

            </div>

          </div>

          {/* Bottom Section: Telemetry Node & System Status */}
          <div style={{ 
            position: 'relative', 
            zIndex: 2, 
            marginTop: 'auto',
            paddingTop: '1rem',
            borderTop: '1px solid var(--editorial-border)',
            fontSize: '0.7rem', 
            color: 'var(--editorial-subtext)', 
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="pulse-dot" style={{ width: '6px', height: '6px' }} />
              STATUS: LIVE
            </span>
            <span>NODE: GIETU-01</span>
          </div>

        </aside>

        {/* =========================================================================
            RIGHT PANE: Workspace Widgets & Matchmaking Hub
            ========================================================================= */}
        <main className="dashboard-right-workspace">

          {/* Action Success / Error Notifications */}
          {actionSuccess && (
            <div 
              className="arch-card animate-fade-in"
              style={{ 
                padding: '0.85rem 1.15rem', 
                backgroundColor: 'var(--badge-available-bg)', 
                borderColor: 'var(--color-aqua-teal)',
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.65rem',
                color: 'var(--color-teal-primary)',
                fontWeight: 700,
                fontSize: '0.88rem'
              }}
            >
              <CheckCircle2 size={18} color="var(--color-aqua-teal)" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div 
              className="arch-card animate-fade-in"
              style={{ 
                padding: '0.85rem 1.15rem', 
                backgroundColor: 'rgba(225, 29, 72, 0.1)', 
                borderColor: 'var(--danger)',
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.65rem',
                color: 'var(--danger)',
                fontWeight: 700,
                fontSize: '0.88rem'
              }}
            >
              <AlertTriangle size={18} color="var(--danger)" />
              <span>{actionError}</span>
            </div>
          )}

          {/* =========================================================================
              ADAPTIVE SPRINT TELEMETRY & TIMELINE WIDGET
              ========================================================================= */}
          <AdaptiveTelemetryWidget user={user} team={team} />

          {/* =========================================================================
              WIDGET 1: Team Profile Widget (Card)
              ========================================================================= */}
          <section className="arch-card" style={{ padding: '1.5rem 1.75rem' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  backgroundColor: 'var(--color-teal-primary)', 
                  color: '#ffffff',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Users size={16} />
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                  Team Profile
                </h2>
              </div>

              {team && (
                <span className={`pill-badge ${team.status === 'disqualified' ? 'pill-badge-alert' : team.status === 'submitted' ? 'pill-badge-available' : 'pill-badge-ready'}`}>
                  {team.status === 'disqualified' && <Ban size={11} />}
                  {team.status === 'submitted' && <CheckCircle2 size={11} />}
                  {team.status !== 'disqualified' && team.status !== 'submitted' && <Clock size={11} />}
                  {team.status === 'disqualified' ? 'DISQUALIFIED' : team.status === 'submitted' ? 'SUBMITTED' : 'NOT SUBMITTED'}
                </span>
              )}
            </div>

            {/* Empty State: Solo Hacker */}
            {!team ? (
              <div style={{ 
                padding: '1.75rem 1rem', 
                textAlign: 'center', 
                backgroundColor: 'var(--code-box-bg)', 
                border: '1px dashed var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                {/* Minimalist SVG Stroke Solo Hacker Icon */}
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  border: '2px solid var(--color-teal-primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: 'var(--bg-card)',
                  boxShadow: 'var(--brutalist-shadow-sm)'
                }}>
                  <Code size={26} color="var(--color-teal-primary)" />
                </div>

                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-headlines)', marginBottom: '0.25rem' }}>
                    You are currently a Solo Hacker
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                    Create a new team or join an existing one using a 6-character code.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button 
                    onClick={() => setShowCreateTeam(true)}
                    className="btn-brutalist-primary"
                  >
                    <PlusCircle size={16} />
                    + Create Team Profile
                  </button>

                  <button 
                    onClick={() => setShowJoinTeam(true)}
                    className="btn-brutalist-outline"
                  >
                    <Key size={16} />
                    Enter Invite Code
                  </button>
                </div>
              </div>
            ) : (
              /* In-Team State */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Team Name, Track & Invite Code Banner */}
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '1rem',
                  backgroundColor: 'var(--code-box-bg)',
                  border: '1px solid var(--border-color)',
                  padding: '1rem 1.25rem'
                }}>
                  <div>
                    <h3 className="font-serif" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.2rem' }}>
                      {team.name}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {team.track}
                    </div>
                  </div>

                  {/* Invite Code Box */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>INVITE CODE</div>
                      <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-headlines)', letterSpacing: '0.08em' }}>
                        {team.inviteCode}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleCopyInviteCode(team.inviteCode)}
                      className="btn-brutalist-outline"
                      title="Copy Invite Code"
                      style={{ padding: '0.45rem 0.65rem' }}
                    >
                      {copiedInviteCode ? <Check size={14} color="var(--color-aqua-teal)" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Team Disqualification Notice Banner */}
                {team.status === 'disqualified' && (
                  <div style={{
                    backgroundColor: 'rgba(225, 29, 72, 0.1)',
                    border: '1px solid var(--danger)',
                    padding: '0.85rem 1.15rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem'
                  }}>
                    <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.86rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                        Team Disqualified
                      </div>
                      <div style={{ color: 'var(--text-headlines)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                        {team.disqualificationReason || 'This team has been marked as disqualified. Project repository submissions are permanently locked.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Description */}
                {team.description && (
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {team.description}
                  </div>
                )}

                {/* Members Roster Table */}
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-headlines)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem', fontFamily: 'JetBrains Mono, monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>ROSTER ({team.members?.length || 0} / 4 HACKERS)</span>
                    {team.members?.length < 4 && isLeader && team.status !== 'disqualified' && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-aqua-teal)', textTransform: 'none' }}>
                        Share invite code to fill remaining slots
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {team.members?.map((m, idx) => (
                      <div 
                        key={idx}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          boxShadow: 'var(--brutalist-shadow-sm)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ 
                            width: '28px', 
                            height: '28px', 
                            backgroundColor: m.isLeader ? 'var(--color-teal-primary)' : 'var(--code-box-bg)', 
                            color: m.isLeader ? '#ffffff' : 'var(--text-primary)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '0.78rem',
                            fontWeight: 800
                          }}>
                            {m.name ? m.name.charAt(0).toUpperCase() : 'H'}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-headlines)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              {m.name}
                              {m.isLeader && <span title="Team Leader" style={{ fontSize: '0.8rem' }}>👑</span>}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {m.role || 'Member'} • {m.email}
                            </div>
                          </div>
                        </div>

                        {/* Leader Actions */}
                        {isLeader && !m.isLeader && team.members.length > 1 && team.status !== 'disqualified' && (
                          <button 
                            onClick={() => handleRemoveMember(m)}
                            className="btn-brutalist-ghost"
                            style={{ color: 'var(--danger)', fontSize: '0.74rem' }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Project Submission Area */}
                <div style={{ 
                  backgroundColor: 'var(--code-box-bg)', 
                  border: '1px solid var(--border-color)', 
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-headlines)', fontFamily: 'JetBrains Mono' }}>
                      PROJECT GITHUB SUBMISSION
                    </div>
                    {team.submittedAt && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-aqua-teal)', fontFamily: 'JetBrains Mono' }}>
                        Submitted {new Date(team.submittedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {team.githubUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <a 
                        href={team.githubUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: 'var(--color-teal-primary)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'underline' }}
                      >
                        <Globe size={15} /> {team.githubUrl}
                      </a>
                      {isLeader && team.status !== 'disqualified' && (
                        <button 
                          onClick={() => { setGithubUrlInput(team.githubUrl); setShowSubmitModal(true); }}
                          className="btn-brutalist-outline"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                        >
                          Update URL
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.82rem', color: team.status === 'disqualified' ? 'var(--danger)' : 'var(--text-muted)', fontWeight: team.status === 'disqualified' ? 700 : 400 }}>
                        {team.status === 'disqualified' ? 'Submission locked: Team has been disqualified.' : 'No repository linked yet.'}
                      </span>
                      {isLeader ? (
                        <button 
                          onClick={() => {
                            if (team.status === 'disqualified') return;
                            setShowSubmitModal(true);
                          }}
                          disabled={team.status === 'disqualified'}
                          className="btn-brutalist-primary"
                          style={{ 
                            padding: '0.45rem 0.85rem', 
                            fontSize: '0.78rem',
                            opacity: team.status === 'disqualified' ? 0.45 : 1,
                            cursor: team.status === 'disqualified' ? 'not-allowed' : 'pointer'
                          }}
                          title={team.status === 'disqualified' ? 'Repository submission disabled for disqualified teams' : 'Submit Repository'}
                        >
                          Submit Repository
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Leader must submit URL</span>
                      )}
                    </div>
                  )}
                </div>

                {/* AUTOMATED PRE-SUBMISSION COMPLIANCE AUDIT INSPECTOR */}
                <SubmissionAuditWidget team={team} user={user} />

                {/* Leave Team Button */}
                <div style={{ textAlign: 'right' }}>
                  <button 
                    onClick={handleLeaveTeam}
                    className="btn-brutalist-ghost"
                    style={{ color: 'var(--danger)', fontSize: '0.78rem' }}
                  >
                    Leave Team
                  </button>
                </div>

              </div>
            )}

          </section>

          {/* =========================================================================
              WIDGET 2: Quick Reference Widget (Card)
              ========================================================================= */}
          <section className="arch-card" style={{ padding: '1.5rem 1.75rem' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  backgroundColor: 'var(--color-teal-primary)', 
                  color: '#ffffff',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Sparkles size={16} />
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                  Quick Reference
                </h2>
              </div>
              <span className="pill-badge pill-badge-ready" style={{ fontSize: '0.68rem' }}>
                LIVE HANDBOOK
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              
              {/* Wi-Fi Details Box */}
              <div style={{ 
                backgroundColor: 'var(--code-box-bg)', 
                border: '1px solid var(--border-color)', 
                padding: '1rem',
                boxShadow: 'var(--brutalist-shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}>
                  <Wifi size={16} color="var(--color-teal-primary)" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-headlines)', fontFamily: 'JetBrains Mono' }}>
                    EVENT WI-FI ACCESS
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>SSID:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <strong className="font-mono" style={{ color: 'var(--text-headlines)' }}>{quickRef.wifi?.ssid || 'Hackathon_5G'}</strong>
                      <button 
                        onClick={() => handleCopyWifi('ssid', quickRef.wifi?.ssid || 'Hackathon_5G')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                        title="Copy SSID"
                      >
                        {copiedWifiSSID ? <Check size={13} color="var(--color-aqua-teal)" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Password:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <strong className="font-mono" style={{ color: 'var(--text-headlines)' }}>{quickRef.wifi?.password || 'innovate_2026'}</strong>
                      <button 
                        onClick={() => handleCopyWifi('pass', quickRef.wifi?.password || 'innovate_2026')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                        title="Copy Password"
                      >
                        {copiedWifiPass ? <Check size={13} color="var(--color-aqua-teal)" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Venue & Location Box */}
              <div style={{ 
                backgroundColor: 'var(--code-box-bg)', 
                border: '1px solid var(--border-color)', 
                padding: '1rem',
                boxShadow: 'var(--brutalist-shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}>
                  <MapPin size={16} color="var(--color-teal-primary)" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-headlines)', fontFamily: 'JetBrains Mono' }}>
                    EVENT VENUE
                  </span>
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.25rem' }}>
                  {quickRef.location || 'CSE Block, GIETU Gunupur'}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Main auditorium & lab halls. Mentors stationed at Block 2.
                </div>
              </div>

            </div>

            {/* Judging Rubric Breakdown */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem' }}>
                <Award size={16} color="var(--color-teal-primary)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-headlines)', fontFamily: 'JetBrains Mono' }}>
                  JUDGING CRITERIA WEIGHTS
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem' }}>
                {[
                  { criterion: 'Innovation & Uniqueness', weight: '30%' },
                  { criterion: 'Technical Execution', weight: '30%' },
                  { criterion: 'UX & Polish', weight: '20%' },
                  { criterion: 'Pitch & Impact', weight: '20%' }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    style={{ 
                      padding: '0.65rem 0.75rem', 
                      backgroundColor: 'var(--bg-card)', 
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--brutalist-shadow-sm)'
                    }}
                  >
                    <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-aqua-teal)' }}>
                      {item.weight}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {item.criterion}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Catering Timings */}
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: 'var(--code-box-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Utensils size={16} color="var(--color-teal-primary)" />
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-headlines)' }}>Catering Schedule: </strong>
                {quickRef.catering?.schedule || 'Breakfast: 8:00 AM | Lunch: 1:00 PM | Dinner: 7:00 PM (Lounge C)'}
              </div>
            </div>

          </section>

          {/* =========================================================================
              WIDGET 3: My Developer Bio Widget (Card)
              ========================================================================= */}
          <section className="arch-card" style={{ padding: '1.5rem 1.75rem' }}>
            
            {/* Header with EDIT Action */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  backgroundColor: 'var(--color-teal-primary)', 
                  color: '#ffffff',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <UserCheck size={16} />
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                  My Developer Bio
                </h2>
              </div>

              <button 
                onClick={() => setShowProfileEditor(true)}
                className="btn-brutalist-outline"
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
              >
                <Edit3 size={13} />
                EDIT
              </button>
            </div>

            {/* Profile Info */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                {user?.name || 'Prajurjya Mohapatra'}
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--color-aqua-teal)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                {user?.roleTitle || 'UI/UX Designer & Product Lead'}
              </div>
            </div>

            {/* Quote / Bio Box with Left Border Accent */}
            <div 
              style={{ 
                backgroundColor: 'var(--quote-box-bg)', 
                borderLeft: '4px solid var(--quote-border)', 
                padding: '0.85rem 1.15rem',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                fontStyle: 'italic',
                marginBottom: '1.15rem'
              }}
            >
              "{user?.bio || 'Passionate about building intuitive web applications, agentic workflows, and high-performance product experiences.'}"
            </div>

            {/* Tech Stack Badges */}
            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontWeight: 700, marginBottom: '0.5rem' }}>
                TECH STACK & SKILLS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {(user?.skills && user.skills.length > 0 ? user.skills : ['React', 'Figma', 'UI/UX', 'TailwindCSS']).map((skill, idx) => (
                  <span key={idx} className="pill-badge pill-badge-tech">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

          </section>

          {/* =========================================================================
              WIDGET 4: Skill Gap Matchmaking Hub (Expandable Card List)
              ========================================================================= */}
          <section className="arch-card" style={{ padding: '1.5rem 1.75rem' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ 
                    width: '30px', 
                    height: '30px', 
                    backgroundColor: 'var(--color-teal-primary)', 
                    color: '#ffffff',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Target size={16} />
                  </div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                    Skill Gap Matchmaking Hub
                  </h2>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Discover solo hackers with complementary skills.
                </p>
              </div>

              <div className="pill-badge pill-badge-available">
                Available Solo Developers ({filteredCandidates.length})
              </div>
            </div>

            {/* Search / Filter Input */}
            <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="arch-input"
                placeholder="Search candidates by name, handle, role, or skills (e.g. React, Python)..."
                value={matchSearchQuery}
                onChange={(e) => setMatchSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>

            {/* Hacker Cards List */}
            {loadingMatch && candidateList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                Computing TF-IDF skill vectors & loading solo hackers...
              </div>
            ) : filteredCandidates.length > 0 ? (
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.85rem',
                  maxHeight: '440px',
                  overflowY: 'auto',
                  paddingRight: '0.35rem'
                }}
                className="custom-scrollbar"
              >
                {filteredCandidates.map((candidate) => {
                  const initials = candidate.name
                    ? candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'DEV';

                  return (
                    <div 
                      key={candidate.id}
                      className="arch-card arch-card-hover"
                      style={{ 
                        padding: '1.25rem', 
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem'
                      }}
                    >
                      {/* Header Row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ 
                            width: '38px', 
                            height: '38px', 
                            backgroundColor: 'var(--color-teal-primary)', 
                            color: '#ffffff',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            fontFamily: 'JetBrains Mono, monospace',
                            flexShrink: 0
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.45rem' }}>
                              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                                {candidate.name}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                                @{candidate.username}
                              </span>
                              {candidate.roleTitle && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--color-teal-primary)', fontWeight: 600 }}>
                                  • {candidate.roleTitle}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {candidate.matchScore !== undefined && candidate.matchScore !== null && (
                            <span className="pill-badge" style={{ backgroundColor: 'rgba(82, 171, 152, 0.15)', color: 'var(--color-aqua-teal)', borderColor: 'var(--color-aqua-teal)' }}>
                              {Math.round(candidate.matchScore)}% MATCH
                            </span>
                          )}
                          <span className="pill-badge pill-badge-available">
                            AVAILABLE SOLO DEVELOPER
                          </span>
                        </div>
                      </div>

                      {/* Bio Description Box */}
                      {candidate.bio && (
                        <div 
                          style={{ 
                            backgroundColor: 'var(--code-box-bg)', 
                            borderLeft: '3px solid var(--color-aqua-teal)', 
                            padding: '0.65rem 0.95rem',
                            fontSize: '0.86rem', 
                            color: 'var(--text-secondary)', 
                            lineHeight: 1.5,
                            fontStyle: 'italic'
                          }}
                        >
                          "{candidate.bio}"
                        </div>
                      )}

                      {/* Skill Chips */}
                      {candidate.skills && candidate.skills.length > 0 && (
                        <div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {candidate.skills.map((s, idx) => (
                              <span key={idx} className="pill-badge pill-badge-tech" style={{ textTransform: 'uppercase' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '0.75rem',
                        marginTop: '0.25rem',
                        flexWrap: 'wrap',
                        gap: '0.65rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem' }}>
                          <Mail size={14} color="var(--color-teal-primary)" />
                          <span style={{ color: 'var(--text-headlines)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                            {candidate.email}
                          </span>
                          <button 
                            onClick={() => handleCopyEmail(candidate.email)}
                            className="btn-brutalist-ghost"
                            style={{ padding: '0.2rem 0.4rem', color: 'var(--text-primary)' }}
                            title="Copy Email to Clipboard"
                          >
                            {copiedEmail === candidate.email ? <Check size={13} color="var(--color-aqua-teal)" /> : <Copy size={13} />}
                          </button>
                        </div>

                        <button 
                          onClick={() => handleSendInviteGmail(candidate)}
                          className="btn-brutalist-primary"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
                          title={`Open Gmail tab to send team invite to ${candidate.email}`}
                        >
                          <Send size={14} />
                          Send Invite (Gmail)
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--code-box-bg)', border: '1px dashed var(--border-color)' }}>
                <Users size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.6 }} />
                <div style={{ fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.25rem' }}>
                  No solo hackers found matching your criteria.
                </div>
                <div style={{ fontSize: '0.82rem' }}>
                  All registered developers are either in a team or no candidates match the filter keyword.
                </div>
              </div>
            )}

          </section>

          {/* =========================================================================
              WIDGET 5: LOGISTICS, MENTOR BOOKING & OPERATIONAL HUB (PHOTOS 2, 4, 5)
              ========================================================================= */}
          <LogisticsHubWidget user={user} team={team} onEscalationSubmitted={() => fetchDashboardData?.()} />

          {/* =========================================================================
              WIDGET 6: POST-EVENT AUTOMATED CERTIFICATE CREATION WIDGET (PHOTO 3)
              ========================================================================= */}
          <CertificateWidget user={user} team={team} />

        </main>

      </div>

      {/* Operational Logistics Modal */}
      <LogisticsHubModal 
        isOpen={showLogisticsModal} 
        onClose={() => setShowLogisticsModal(false)} 
        user={user} 
        team={team} 
      />

      {/* Floating AI Concierge / Copilot Trigger */}
      <ChatWidget />

      {/* =========================================================================
          MODALS & OVERLAYS (Crisp 0px Architectural Styling)
          ========================================================================= */}

      {/* 1. Create Team Modal */}
      {showCreateTeam && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: '1rem' }}>
          <div className="arch-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '1.75rem', boxShadow: 'var(--brutalist-shadow-lg)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={18} color="var(--color-teal-primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)' }}>Create Team Profile</h3>
              </div>
              <button onClick={() => setShowCreateTeam(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  TEAM NAME *
                </label>
                <input 
                  type="text" 
                  className="arch-input"
                  required
                  placeholder="e.g. NeuralVoyagers"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  HACKATHON TRACK THEME *
                </label>
                <select 
                  className="arch-input"
                  value={teamTrack}
                  onChange={(e) => setTeamTrack(e.target.value)}
                >
                  {tracks.map(t => (
                    <option key={t.id} value={t.fullName || t.name}>
                      {t.fullName || t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  PROJECT DESCRIPTION
                </label>
                <textarea 
                  className="arch-input"
                  rows={3}
                  placeholder="Briefly describe what your team plans to build..."
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateTeam(false)} 
                  className="btn-brutalist-outline"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-brutalist-primary"
                >
                  Create Team
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 2. Join Team Modal */}
      {showJoinTeam && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: '1rem' }}>
          <div className="arch-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', boxShadow: 'var(--brutalist-shadow-lg)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={18} color="var(--color-teal-primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)' }}>Enter Team Invite Code</h3>
              </div>
              <button onClick={() => setShowJoinTeam(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleJoinTeamSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  6-CHARACTER INVITE CODE *
                </label>
                <input 
                  type="text" 
                  className="arch-input font-mono"
                  required
                  maxLength={10}
                  placeholder="e.g. A9F0E1"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.15em', fontWeight: 800 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowJoinTeam(false)} 
                  className="btn-brutalist-outline"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-brutalist-primary"
                >
                  Join Team
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 3. Submit Project GitHub Modal */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: '1rem' }}>
          <div className="arch-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', boxShadow: 'var(--brutalist-shadow-lg)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={18} color="var(--color-teal-primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)' }}>Submit Project Repository</h3>
              </div>
              <button onClick={() => setShowSubmitModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmSubmitProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  GITHUB REPOSITORY URL *
                </label>
                <input 
                  type="url" 
                  className="arch-input"
                  required
                  placeholder="https://github.com/organization/repo"
                  value={githubUrlInput}
                  onChange={(e) => setGithubUrlInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowSubmitModal(false)} 
                  className="btn-brutalist-outline"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingProject}
                  className="btn-brutalist-primary"
                >
                  {submittingProject ? 'Verifying...' : 'Confirm Submission'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 4. Edit Bio / Developer Profile Modal */}
      {showProfileEditor && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: '1rem' }}>
          <div className="arch-card animate-fade-in" style={{ width: '100%', maxWidth: '540px', padding: '1.75rem', boxShadow: 'var(--brutalist-shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} color="var(--color-teal-primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)' }}>Edit Developer Bio & Profile</h3>
              </div>
              <button onClick={() => setShowProfileEditor(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  FULL NAME *
                </label>
                <input 
                  type="text" 
                  className="arch-input"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  ROLE TITLE / SPECIALTY
                </label>
                <input 
                  type="text" 
                  className="arch-input"
                  placeholder="e.g. UI/UX Designer & Product Lead"
                  value={editRoleTitle}
                  onChange={(e) => setEditRoleTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  CUSTOM BIO & WHAT YOU BUILD
                </label>
                <textarea 
                  className="arch-input"
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell potential teammates about your interests..."
                />
              </div>

              {/* Interactive Skills Pills Editor */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  TECH STACK & SKILLS (CLICK X TO REMOVE)
                </label>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.65rem' }}>
                  {editSkills.map((s, idx) => (
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
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.45rem' }}>
                  <input 
                    type="text" 
                    className="arch-input"
                    placeholder="Add a new skill (e.g. PyTorch, Next.js)..."
                    value={editSkillInput}
                    onChange={(e) => setEditSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(e); } }}
                  />
                  <button 
                    type="button" 
                    onClick={handleAddSkill} 
                    className="btn-brutalist-outline"
                    style={{ padding: '0.5rem 0.85rem' }}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowProfileEditor(false)} 
                  className="btn-brutalist-outline"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingProfile}
                  className="btn-brutalist-primary"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

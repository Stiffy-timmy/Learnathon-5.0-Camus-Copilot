import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, CheckCircle2, Megaphone, Users, MessageSquare, Send, 
  Trash2, Ban, Filter, CheckSquare, Square, X, AlertTriangle, Sparkles, 
  RefreshCw, BookOpen, Save, FileText, CheckCheck, Code2, Clock, Play, Pause, RotateCcw,
  Database, FileSpreadsheet, Download, Server, HardDrive, Globe, ExternalLink, Check,
  Paperclip, LayoutGrid, LayoutList, Search, Maximize2, Minimize2, CheckCircle,
  User, UserX, UserCheck, Crown, Mail, AtSign, Shield, ArrowUpDown
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { adminAPI, teamAPI, timerAPI, certificateAPI, logisticsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Award, Cpu, Plus, Edit2, Lock, Unlock } from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [escalations, setEscalations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Admin View Tab: 'operations' | 'handbook' | 'participants' | 'logistics_certs' | 'database_export'
  const [adminTab, setAdminTab] = useState('operations');

  // Certificate Settings & Logistics Management State
  const [certConfig, setCertConfig] = useState({
    eventName: 'GIETU Smart Hackathon 2026',
    certificateTitle: 'CERTIFICATE OF PARTICIPATION',
    organizer: 'GIET University & CampusCopilot Agentic Operations',
    achievementType: 'Official Hackathon Competitor',
    isUnlocked: true,
    signatory1Name: 'Dr. A. K. Sharma',
    signatory1Title: 'Convener & Head of CSE',
    signatory2Name: 'Prof. S. R. Patnaik',
    signatory2Title: 'Lead Hackathon Organizer'
  });
  const [certConfigSaving, setCertConfigSaving] = useState(false);
  const [adminMentors, setAdminMentors] = useState([]);
  const [adminResourceRequests, setAdminResourceRequests] = useState([]);
  const [editingMentor, setEditingMentor] = useState(null);
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [savingMentor, setSavingMentor] = useState(false);
  const [updatingReqId, setUpdatingReqId] = useState(null);
  const [batchCertLoading, setBatchCertLoading] = useState(false);

  // Live Master Timer State (Fixed 48 Hours from Handbook)
  const [timerData, setTimerData] = useState(null);
  const [timerDisplayTime, setTimerDisplayTime] = useState('2d : 00h : 00m : 00s');
  const [timerLoading, setTimerLoading] = useState(false);

  // Database Management & Export State
  const [dbStatus, setDbStatus] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Handbook Editor State
  const [handbookContent, setHandbookContent] = useState('');
  const [handbookOriginal, setHandbookOriginal] = useState('');
  const [handbookLoading, setHandbookLoading] = useState(false);
  const [handbookSaving, setHandbookSaving] = useState(false);
  const [handbookSuccess, setHandbookSuccess] = useState('');
  const [handbookError, setHandbookError] = useState('');

  // Filter & Selection State
  const [queueFilter, setQueueFilter] = useState('pending'); // 'pending', 'resolved', 'rejected', 'all'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [rejectingEscalation, setRejectingEscalation] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [resolveResponse, setResolveResponse] = useState('');
  const [broadcastAnswer, setBroadcastAnswer] = useState(true);
  const [resolving, setResolving] = useState(false);

  // Broadcast Center State
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annSeverity, setAnnSeverity] = useState('info');
  const [annFile, setAnnFile] = useState(null);
  const fileInputRef = useRef(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Participants & User Management Directory State
  const [usersList, setUsersList] = useState([]);
  const [usersMetadata, setUsersMetadata] = useState({ total: 0, participantsCount: 0, adminsCount: 0, soloCount: 0, inTeamCount: 0, verifiedCount: 0 });
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all'); // 'all' | 'participant' | 'admin'
  const [userTeamFilter, setUserTeamFilter] = useState('all'); // 'all' | 'in_team' | 'solo'
  const [userVerifiedFilter, setUserVerifiedFilter] = useState('all'); // 'all' | 'verified' | 'unverified'
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [deletingUser, setDeletingUser] = useState(null); // single user object for confirmation modal
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  // Team Roster State (List vs Grid, Search & Status Tracking)
  const [teamViewMode, setTeamViewMode] = useState('grid'); // 'grid' | 'list'
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState('all'); // 'all' | 'submitted' | 'not_submitted' | 'disqualified'
  const [showTeamGridModal, setShowTeamGridModal] = useState(false);
  const [updatingTeamId, setUpdatingTeamId] = useState(null);
  const [disqualifyingTeam, setDisqualifyingTeam] = useState(null); // team object for disqualification reason modal
  const [disqualifyReason, setDisqualifyReason] = useState('');
  const [restoringTeam, setRestoringTeam] = useState(null); // team object for restore confirmation modal

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await adminAPI.getUsers();
      setUsersList(res.users || []);
      setUsersMetadata({
        total: res.total || (res.users?.length || 0),
        participantsCount: res.participantsCount || 0,
        adminsCount: res.adminsCount || 0,
        soloCount: res.soloCount || 0,
        inTeamCount: res.inTeamCount || 0,
        verifiedCount: res.verifiedCount || 0
      });
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchCertAndLogisticsData = async () => {
    try {
      const [cfgRes, mentorsRes, reqsRes] = await Promise.all([
        certificateAPI.getConfig().catch(() => ({ config: {} })),
        logisticsAPI.getAdminMentors().catch(() => ({ mentors: [] })),
        logisticsAPI.getAdminResourceRequests().catch(() => ({ requests: [] }))
      ]);
      if (cfgRes?.config) setCertConfig(cfgRes.config);
      if (mentorsRes?.mentors) setAdminMentors(mentorsRes.mentors);
      if (reqsRes?.requests) setAdminResourceRequests(reqsRes.requests);
    } catch (err) {
      console.error("Failed to load cert and logistics data:", err);
    }
  };

  const handleSaveCertConfig = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setCertConfigSaving(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await certificateAPI.updateConfig(certConfig);
      setActionSuccess("✅ Certificate template configuration saved permanently to server!");
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setActionError("Failed to save certificate config: " + err.message);
    } finally {
      setCertConfigSaving(false);
    }
  };

  const handleToggleCertPermission = async () => {
    const newStatus = !(certConfig.isUnlocked === true);
    setCertConfigSaving(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await certificateAPI.updateConfig({
        ...certConfig,
        isUnlocked: newStatus
      });
      setCertConfig(res.config || { ...certConfig, isUnlocked: newStatus });
      setActionSuccess(
        newStatus
          ? "🎉 Certificate downloads UNLOCKED! All participants can now download official PDF certificates."
          : "🔒 Certificate downloads LOCKED! Participant download buttons are now disabled."
      );
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setActionError("Failed to toggle download permission: " + err.message);
    } finally {
      setCertConfigSaving(false);
    }
  };

  const handleSaveMentor = async (e) => {
    e.preventDefault();
    if (!editingMentor?.name) return;
    setSavingMentor(true);
    try {
      const skillsArray = typeof editingMentor.skills === 'string'
        ? editingMentor.skills.split(',').map(s => s.trim()).filter(Boolean)
        : (editingMentor.skills || ['AI', 'Full-Stack']);

      await logisticsAPI.saveAdminMentor({
        ...editingMentor,
        skills: skillsArray
      });
      setActionSuccess(`Mentor '${editingMentor.name}' saved successfully!`);
      setShowMentorModal(false);
      setEditingMentor(null);
      fetchCertAndLogisticsData();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      alert("Failed to save mentor: " + err.message);
    } finally {
      setSavingMentor(false);
    }
  };

  const handleDeleteMentor = async (mentorId, mentorName) => {
    if (!window.confirm(`Are you sure you want to delete mentor '${mentorName}'?`)) return;
    try {
      await logisticsAPI.deleteAdminMentor(mentorId);
      setActionSuccess(`Mentor '${mentorName}' deleted.`);
      fetchCertAndLogisticsData();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      alert("Failed to delete mentor: " + err.message);
    }
  };

  const handleUpdateResourceStatus = async (reqId, newStatus) => {
    setUpdatingReqId(reqId);
    try {
      await logisticsAPI.updateResourceRequest(reqId, { status: newStatus });
      setAdminResourceRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: newStatus } : r));
      setActionSuccess(`Resource request #${reqId} marked as ${newStatus}!`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setUpdatingReqId(null);
    }
  };

  const handleBatchGenerateCertificates = async () => {
    setBatchCertLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await adminAPI.batchGenerateCertificates();
      setActionSuccess(res.message || "Successfully batch generated certificates for all participants!");
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err) {
      setActionError(err.message || "Failed to batch generate certificates.");
    } finally {
      setBatchCertLoading(false);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!deletingUser) return;
    setDeletingInProgress(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await adminAPI.deleteUser(deletingUser.id);
      setActionSuccess(res.message || `User '${deletingUser.name}' and all associated database records were permanently deleted.`);
      setTimeout(() => setActionSuccess(''), 6000);
      setDeletingUser(null);
      setSelectedUserIds(prev => {
        const next = new Set(prev);
        next.delete(deletingUser.id);
        return next;
      });
      await fetchUsers();
      await fetchDashboardData();
    } catch (err) {
      setActionError(err.message || "Failed to delete user from database.");
    } finally {
      setDeletingInProgress(false);
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedUserIds.size === 0) return;
    setDeletingInProgress(true);
    setActionError('');
    setActionSuccess('');
    try {
      const ids = Array.from(selectedUserIds);
      const res = await adminAPI.batchDeleteUsers(ids);
      setActionSuccess(res.message || `Successfully purged ${ids.length} participant(s) from all database tables!`);
      setTimeout(() => setActionSuccess(''), 6000);
      setSelectedUserIds(new Set());
      setShowBatchDeleteModal(false);
      await fetchUsers();
      await fetchDashboardData();
    } catch (err) {
      setActionError(err.message || "Failed to batch delete users.");
    } finally {
      setDeletingInProgress(false);
    }
  };

  const toggleSelectUser = (id) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllUsers = (filtered) => {
    const selectable = filtered.filter(u => u.id !== user?.id);
    if (selectable.length > 0 && selectedUserIds.size >= selectable.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(selectable.map(u => u.id)));
    }
  };

  const handleUpdateTeamStatus = async (teamId, newStatus) => {
    setUpdatingTeamId(teamId);
    setActionError('');
    try {
      const res = await adminAPI.updateTeamStatus(teamId, newStatus);
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, status: newStatus } : t));
      setActionSuccess(res.message || `Team status updated to ${newStatus}`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to update team status.');
    } finally {
      setUpdatingTeamId(null);
    }
  };

  const handleOpenDisqualifyModal = (team) => {
    const isDisqualified = (team.status || '').toLowerCase() === 'disqualified';
    if (isDisqualified) {
      setRestoringTeam(team);
    } else {
      setDisqualifyingTeam(team);
      setDisqualifyReason('');
    }
  };

  const handleConfirmDisqualify = async () => {
    if (!disqualifyingTeam) return;
    const teamId = disqualifyingTeam.id;
    const reasonText = disqualifyReason.trim() || 'Violation of hackathon rules or missing mandatory checkpoints.';

    setUpdatingTeamId(teamId);
    setActionError('');
    try {
      const res = await adminAPI.disqualifyTeam(teamId, true, reasonText);
      setTeams(prev => prev.map(t => t.id === teamId ? { 
        ...t, 
        status: 'disqualified',
        disqualificationReason: reasonText
      } : t));
      setActionSuccess(res.message || `Team '${disqualifyingTeam.name}' has been disqualified.`);
      setDisqualifyingTeam(null);
      setDisqualifyReason('');
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setActionError(err.message || 'Failed to disqualify team.');
    } finally {
      setUpdatingTeamId(null);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoringTeam) return;
    const teamId = restoringTeam.id;

    setUpdatingTeamId(teamId);
    setActionError('');
    try {
      const res = await adminAPI.disqualifyTeam(teamId, false);
      const newStatus = res.team?.status || (restoringTeam.githubUrl ? 'submitted' : 'not_submitted');
      setTeams(prev => prev.map(t => t.id === teamId ? { 
        ...t, 
        status: newStatus,
        disqualificationReason: null
      } : t));
      setActionSuccess(res.message || `Team '${restoringTeam.name}' restored to active status.`);
      setRestoringTeam(null);
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setActionError(err.message || 'Failed to restore team.');
    } finally {
      setUpdatingTeamId(null);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [m, esc, t, tmr] = await Promise.all([
        adminAPI.getMetrics(),
        adminAPI.getEscalations(),
        teamAPI.listTeams(),
        timerAPI.getTimer()
      ]);
      setMetrics(m);
      setEscalations(esc.escalations || []);
      setTeams(t.teams || []);
      setTimerData(tmr);
      if (tmr?.formattedRemaining) {
        setTimerDisplayTime(tmr.formattedRemaining);
      }
    } catch (err) {
      console.error("Failed to load admin telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHandbook = async () => {
    setHandbookLoading(true);
    setHandbookError('');
    try {
      const res = await adminAPI.getHandbook();
      setHandbookContent(res.content || '');
      setHandbookOriginal(res.content || '');
    } catch (err) {
      setHandbookError(err.message || "Failed to load handbook from server.");
    } finally {
      setHandbookLoading(false);
    }
  };

  const fetchDatabaseStatus = async () => {
    setDbLoading(true);
    try {
      const data = await adminAPI.getDatabaseStatus();
      setDbStatus(data);
    } catch (err) {
      console.error("Failed to fetch database telemetry:", err);
    } finally {
      setDbLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    setActionError('');
    try {
      await adminAPI.downloadExcelReport();
      setActionSuccess("Excel report (.xlsx) generated and downloaded successfully!");
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setActionError(err.message || "Failed to download Excel report.");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    setActionError('');
    try {
      await adminAPI.downloadPdfReport();
      setActionSuccess("Event PDF report generated and downloaded successfully!");
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setActionError(err.message || "Failed to download PDF report.");
    } finally {
      setExportingPdf(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchHandbook();
    fetchDatabaseStatus();
    fetchUsers();
    const interval = setInterval(fetchDashboardData, 4000);
    return () => clearInterval(interval);
  }, []);

  // 1-second local countdown tick for Admin live view
  useEffect(() => {
    if (!timerData || timerData.status !== 'running' || !timerData.endTime) {
      if (timerData?.formattedRemaining) {
        setTimerDisplayTime(timerData.formattedRemaining);
      }
      return;
    }

    const tick = () => {
      const endMs = new Date(timerData.endTime).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((endMs - nowMs) / 1000));

      if (diffSec <= 0) {
        setTimerDisplayTime('00h : 00m : 00s');
        return;
      }

      const days = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;

      const pad = (n) => String(n).padStart(2, '0');
      if (days > 0) {
        setTimerDisplayTime(`${days}d : ${pad(hours)}h : ${pad(mins)}m : ${pad(secs)}s`);
      } else {
        setTimerDisplayTime(`${pad(hours)}h : ${pad(mins)}m : ${pad(secs)}s`);
      }
    };

    tick();
    const tickInterval = setInterval(tick, 1000);
    return () => clearInterval(tickInterval);
  }, [timerData]);

  // Master Timer Action Handlers (Fixed 48-Hour Hackathon)
  const handleStartTimer = async () => {
    setTimerLoading(true);
    setActionError('');
    try {
      const res = await adminAPI.startTimer();
      setTimerData(res.timer);
      setActionSuccess("🟢 48-Hour Hackathon Live Timer started! All participant views are now counting down in real-time.");
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err) {
      setActionError(err.message || "Failed to start timer.");
    } finally {
      setTimerLoading(false);
    }
  };

  const handlePauseTimer = async () => {
    setTimerLoading(true);
    setActionError('');
    try {
      const res = await adminAPI.pauseTimer();
      setTimerData(res.timer);
      setActionSuccess("⏸️ Hackathon Live Timer paused. Participant countdowns are temporarily frozen.");
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err) {
      setActionError(err.message || "Failed to pause timer.");
    } finally {
      setTimerLoading(false);
    }
  };

  const handleStopTimer = async () => {
    if (!window.confirm("⚠️ Are you sure you want to stop and conclude the hackathon timer?\n\nAll teams that have NOT submitted will be automatically disqualified.")) return;
    setTimerLoading(true);
    setActionError('');
    try {
      const res = await adminAPI.stopTimer();
      setTimerData(res.timer);
      setActionSuccess("⏹️ Hackathon timer stopped and concluded. Unsubmitted teams automatically disqualified!");
      fetchDashboardData();
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err) {
      setActionError(err.message || "Failed to stop timer.");
    } finally {
      setTimerLoading(false);
    }
  };

  const handleResetTimer = async () => {
    if (!window.confirm("Are you sure you want to reset the timer to the official 48-hour handbook duration?")) return;
    setTimerLoading(true);
    setActionError('');
    try {
      const res = await adminAPI.resetTimer();
      setTimerData(res.timer);
      setActionSuccess(`🔄 Hackathon Timer reset to ${res.timer?.durationText || '48 Hours'}!`);
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err) {
      setActionError(err.message || "Failed to reset timer.");
    } finally {
      setTimerLoading(false);
    }
  };

  const handleSyncHandbookTimer = async () => {
    setTimerLoading(true);
    setActionError('');
    try {
      const res = await adminAPI.updateTimer({ action: 'sync_handbook' });
      setTimerData(res.timer);
      setActionSuccess(`📖 Successfully synchronized timer reference from handbook (${res.timer?.durationText})!`);
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err) {
      setActionError(err.message || "Failed to sync timer from handbook.");
    } finally {
      setTimerLoading(false);
    }
  };

  const handleSaveHandbook = async () => {
    if (!handbookContent.trim()) {
      setHandbookError("Handbook content cannot be empty.");
      return;
    }
    setHandbookSaving(true);
    setHandbookError('');
    setHandbookSuccess('');
    try {
      const res = await adminAPI.updateHandbook(handbookContent);
      setHandbookOriginal(handbookContent);
      setHandbookSuccess("✅ Handbook changes permanently saved to server and synced with RAG Knowledge Engine!");
      setTimeout(() => setHandbookSuccess(''), 6000);
    } catch (err) {
      setHandbookError(err.message || "Failed to save handbook to server.");
    } finally {
      setHandbookSaving(false);
    }
  };

  const handleSelectAll = (filteredList) => {
    if (selectedIds.size === filteredList.length && filteredList.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredList.map(e => e.id)));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSingle = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this question?")) return;
    try {
      await adminAPI.deleteEscalation(id);
      setActionSuccess("Question deleted successfully!");
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchDashboardData();
    } catch (err) {
      setActionError(err.message || "Failed to delete question.");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected questions?`)) return;
    try {
      const ids = Array.from(selectedIds);
      await adminAPI.batchDeleteEscalations(ids);
      setActionSuccess(`Successfully deleted ${ids.length} questions.`);
      setSelectedIds(new Set());
      fetchDashboardData();
    } catch (err) {
      setActionError(err.message || "Batch delete failed.");
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to delete team "${teamName}"? All team members will be converted to Solo Hackers and their project submission will be deleted.`)) return;
    setActionError('');
    try {
      const res = await adminAPI.deleteTeam(teamId);
      setActionSuccess(res.message || `Team "${teamName}" deleted successfully.`);
      setTimeout(() => setActionSuccess(''), 5000);
      fetchDashboardData();
      fetchUsers();
    } catch (err) {
      setActionError(err.message || "Failed to delete team.");
    }
  };

  const handleRejectSubmit = async (e) => {
    e?.preventDefault();
    if (!rejectingEscalation) return;
    setResolving(true);
    try {
      await adminAPI.rejectEscalation(rejectingEscalation.id, rejectReason.trim() || 'Question rejected by organizer');
      setActionSuccess("Question marked as rejected.");
      setRejectingEscalation(null);
      setRejectReason('');
      fetchDashboardData();
    } catch (err) {
      setActionError(err.message || "Failed to reject ticket.");
    } finally {
      setResolving(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!selectedEscalation || !resolveResponse.trim()) return;
    setResolving(true);
    setActionSuccess('');
    setActionError('');
    try {
      await adminAPI.resolveEscalation(selectedEscalation.id, resolveResponse.trim(), broadcastAnswer);
      setActionSuccess(
        broadcastAnswer 
          ? "Answer submitted & live Q&A notification sent to participants!" 
          : "Question marked as answered."
      );
      setSelectedEscalation(null);
      setResolveResponse('');
      await fetchDashboardData();
    } catch (err) {
      setActionError(err.message || "Failed to resolve ticket.");
    } finally {
      setResolving(false);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;
    setBroadcasting(true);
    try {
      let res;
      if (annFile) {
        const formData = new FormData();
        formData.append('title', annTitle.trim());
        formData.append('message', annMessage.trim());
        formData.append('severity', annSeverity);
        formData.append('file', annFile);
        res = await adminAPI.broadcastAnnouncement(formData);
        setActionSuccess(res.message || "Live alert & attachment dispatched to all participants!");
      } else {
        res = await adminAPI.broadcastAnnouncement({
          title: annTitle.trim(),
          message: annMessage.trim(),
          severity: annSeverity
        });
        setActionSuccess(res.message || "Live alert broadcasted to all participants!");
      }

      if (res?.announcement?.id) {
        try {
          const stored = localStorage.getItem('dismissed_announcements');
          const set = stored ? new Set(JSON.parse(stored)) : new Set();
          set.add(res.announcement.id);
          localStorage.setItem('dismissed_announcements', JSON.stringify(Array.from(set)));
        } catch (e) {
          // ignore
        }
      }

      setAnnTitle('');
      setAnnMessage('');
      setAnnSeverity('info');
      setAnnFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setActionError(err.message || "Failed to broadcast alert.");
    } finally {
      setBroadcasting(false);
    }
  };

  const filteredEscalations = escalations.filter(e => {
    if (queueFilter === 'all') return true;
    return e.status === queueFilter;
  });

  const filteredTeams = teams.filter((t) => {
    const q = teamSearchQuery.toLowerCase().trim();
    const status = (t.status || 'not_submitted').toLowerCase();
    
    // Status filter
    if (teamStatusFilter !== 'all' && status !== teamStatusFilter) {
      return false;
    }
    
    // Search query filter
    if (q) {
      const matchName = (t.name || '').toLowerCase().includes(q);
      const matchTrack = (t.track || '').toLowerCase().includes(q);
      const matchCode = (t.inviteCode || '').toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchStatus = status.includes(q);
      const matchMembers = t.members?.some(m => 
        (m.name || '').toLowerCase().includes(q) || 
        (m.email || '').toLowerCase().includes(q) ||
        (m.role || '').toLowerCase().includes(q)
      );
      return matchName || matchTrack || matchCode || matchDesc || matchStatus || matchMembers;
    }
    return true;
  });

  const countSubmitted = teams.filter(t => t.status === 'submitted').length;
  const countNotSubmitted = teams.filter(t => (t.status || 'not_submitted') === 'not_submitted').length;
  const countDisqualified = teams.filter(t => t.status === 'disqualified').length;

  const renderTeamStatusBadge = (status) => {
    const st = (status || 'not_submitted').toLowerCase();
    if (st === 'submitted') {
      return (
        <span className="pill-badge pill-badge-available">
          <CheckCircle2 size={11} /> SUBMITTED
        </span>
      );
    }
    if (st === 'disqualified') {
      return (
        <span className="pill-badge pill-badge-alert">
          <Ban size={11} /> DISQUALIFIED
        </span>
      );
    }
    return (
      <span className="pill-badge pill-badge-ready">
        <Clock size={11} /> NOT SUBMITTED
      </span>
    );
  };

  const handbookHasChanges = handbookContent !== handbookOriginal;
  const handbookLineCount = handbookContent ? handbookContent.split('\n').length : 0;
  const handbookWordCount = handbookContent ? handbookContent.trim().split(/\s+/).length : 0;

  const filteredUsers = usersList.filter(u => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (userTeamFilter === 'in_team' && !u.teamId) return false;
    if (userTeamFilter === 'solo' && u.teamId) return false;
    if (userVerifiedFilter === 'verified' && !u.isVerified) return false;
    if (userVerifiedFilter === 'unverified' && u.isVerified) return false;

    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchUsername = (u.username || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchRoleTitle = (u.roleTitle || '').toLowerCase().includes(q);
      const matchBio = (u.bio || '').toLowerCase().includes(q);
      const matchTeam = (u.teamName || '').toLowerCase().includes(q);
      const matchSkills = (u.skills || []).some(s => String(s).toLowerCase().includes(q));
      return matchName || matchUsername || matchEmail || matchRoleTitle || matchBio || matchTeam || matchSkills;
    }
    return true;
  });

  return (
    <div className="participant-dashboard-root" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <Navbar activeTab="admin" />

      {/* Main Split Layout Container (Desktop Sticky Left + Independent Right Scroll) */}
      <div className="dashboard-split-layout">

        {/* =========================================================================
            LEFT PANE: Organizer Telemetry Hero (Zero Images, Deep Teal #2b6777)
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

          {/* Top Section */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            
            {/* Category Tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.15rem', flexWrap: 'wrap' }}>
              <span className="pill-badge pill-badge-ready" style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}>
                🎓 CAMPUSCOPILOT
              </span>
            </div>

            {/* High-Contrast Serif Hero Headline */}
            <h1 
              className="font-serif"
              style={{ 
                fontSize: 'clamp(1.65rem, 5vw, 2.3rem)', 
                lineHeight: 1.15, 
                color: '#ffffff',
                fontWeight: 700,
                marginBottom: '0.75rem',
                letterSpacing: '-0.01em',
                wordBreak: 'break-word'
              }}
            >
              Organizer Control Center.
            </h1>

            {/* Subtitle */}
            <p style={{ 
              fontSize: '0.88rem', 
              lineHeight: 1.6, 
              color: 'var(--editorial-subtext)',
              marginBottom: '1.5rem',
              fontWeight: 400
            }}>
              Manage participant inquiries, broadcast emergency alerts, and edit official handbook rules in one calm view.
            </p>

            {/* Organizer Quick Navigation Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setAdminTab('operations')}
                style={{
                  padding: '0.65rem 0.95rem',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: adminTab === 'operations' ? 'var(--color-aqua-teal)' : 'rgba(255,255,255,0.06)',
                  color: adminTab === 'operations' ? '#0f1d21' : '#ffffff',
                  border: `1px solid ${adminTab === 'operations' ? 'var(--color-aqua-teal)' : 'var(--editorial-border)'}`,
                  borderRadius: '0px',
                  cursor: 'pointer',
                  boxShadow: adminTab === 'operations' ? 'var(--brutalist-shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={16} /> Operations Desk
                </span>
                {metrics?.pendingTicketsCount > 0 && (
                  <span className="pill-badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', backgroundColor: '#e11d48', color: '#ffffff' }}>
                    {metrics.pendingTicketsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setAdminTab('participants'); fetchUsers(); }}
                style={{
                  padding: '0.65rem 0.95rem',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: adminTab === 'participants' ? 'var(--color-aqua-teal)' : 'rgba(255,255,255,0.06)',
                  color: adminTab === 'participants' ? '#0f1d21' : '#ffffff',
                  border: `1px solid ${adminTab === 'participants' ? 'var(--color-aqua-teal)' : 'var(--editorial-border)'}`,
                  borderRadius: '0px',
                  cursor: 'pointer',
                  boxShadow: adminTab === 'participants' ? 'var(--brutalist-shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} /> Participant Directory
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: adminTab === 'participants' ? '#0f1d21' : 'var(--color-slate-blue)' }}>
                  {usersList.length} registered
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setAdminTab('logistics_certs'); fetchCertAndLogisticsData(); }}
                style={{
                  padding: '0.65rem 0.95rem',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: adminTab === 'logistics_certs' ? 'var(--color-aqua-teal)' : 'rgba(255,255,255,0.06)',
                  color: adminTab === 'logistics_certs' ? '#0f1d21' : '#ffffff',
                  border: `1px solid ${adminTab === 'logistics_certs' ? 'var(--color-aqua-teal)' : 'var(--editorial-border)'}`,
                  borderRadius: '0px',
                  cursor: 'pointer',
                  boxShadow: adminTab === 'logistics_certs' ? 'var(--brutalist-shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={16} /> Logistics & Certificates
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: adminTab === 'logistics_certs' ? '#0f1d21' : 'var(--color-slate-blue)' }}>
                  Editable
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setAdminTab('handbook'); fetchHandbook(); }}
                style={{
                  padding: '0.65rem 0.95rem',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: adminTab === 'handbook' ? 'var(--color-aqua-teal)' : 'rgba(255,255,255,0.06)',
                  color: adminTab === 'handbook' ? '#0f1d21' : '#ffffff',
                  border: `1px solid ${adminTab === 'handbook' ? 'var(--color-aqua-teal)' : 'var(--editorial-border)'}`,
                  borderRadius: '0px',
                  cursor: 'pointer',
                  boxShadow: adminTab === 'handbook' ? 'var(--brutalist-shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={16} /> Handbook Editor
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: adminTab === 'handbook' ? '#0f1d21' : 'var(--color-slate-blue)' }}>
                  RAG Active
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setAdminTab('database_export'); fetchDatabaseStatus(); }}
                style={{
                  padding: '0.65rem 0.95rem',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: adminTab === 'database_export' ? 'var(--color-aqua-teal)' : 'rgba(255,255,255,0.06)',
                  color: adminTab === 'database_export' ? '#0f1d21' : '#ffffff',
                  border: `1px solid ${adminTab === 'database_export' ? 'var(--color-aqua-teal)' : 'var(--editorial-border)'}`,
                  borderRadius: '0px',
                  cursor: 'pointer',
                  boxShadow: adminTab === 'database_export' ? 'var(--brutalist-shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Database size={16} /> Database & Storage
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: adminTab === 'database_export' ? '#0f1d21' : 'var(--color-slate-blue)' }}>
                  SQLite Sync
                </span>
              </button>
            </div>

            {/* Live Master Sprint Telemetry Box */}
            <div style={{
              backgroundColor: 'var(--editorial-card)',
              border: '1px solid var(--editorial-border)',
              padding: '1.15rem',
              boxShadow: 'var(--editorial-shadow)',
              position: 'relative',
              marginBottom: '1rem',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {/* Crosshairs */}
              <span style={{ position: 'absolute', top: '-7px', left: '-5px', color: 'var(--color-aqua-teal)', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>+</span>
              <span style={{ position: 'absolute', top: '-7px', right: '-5px', color: 'var(--color-aqua-teal)', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>+</span>
              <span style={{ position: 'absolute', bottom: '-7px', left: '-5px', color: 'var(--color-aqua-teal)', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>+</span>
              <span style={{ position: 'absolute', bottom: '-7px', right: '-5px', color: 'var(--color-aqua-teal)', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>+</span>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-blue)', fontWeight: 700, fontFamily: 'JetBrains Mono', letterSpacing: '0.04em' }}>
                  LIVE SPRINT CLOCK
                </span>
                <span className={`pill-badge ${timerData?.status === 'running' ? 'pill-badge-live' : 'pill-badge-ready'}`}>
                  {timerData?.status === 'running' && <span className="pulse-dot" />}
                  {timerData?.status === 'running' ? 'LIVE' : timerData?.status === 'paused' ? 'PAUSED' : 'READY'}
                </span>
              </div>

              <div className="font-mono" style={{ fontSize: 'clamp(0.92rem, 2.3vw, 1.32rem)', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'visible' }}>
                {timerDisplayTime}
              </div>

              <div style={{ 
                borderTop: '1px solid var(--editorial-border)',
                paddingTop: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--editorial-subtext)', fontFamily: 'JetBrains Mono, monospace' }}>VENUE ROOM</div>
                  <div style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 700 }}>CSE Block, GIETU</div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Telemetry Footer */}
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
              NODE: GIETU-01
            </span>
            <span>DB: CONNECTED</span>
          </div>

        </aside>

        {/* =========================================================================
            RIGHT PANE: Operational Workspace & Control Center (Independent Scroll)
            ========================================================================= */}
        <main className="dashboard-right-workspace">

          {/* Top Utility Header Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            paddingBottom: '1.25rem', 
            borderBottom: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Left: View title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                backgroundColor: 'var(--color-teal-primary)', 
                color: '#ffffff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: 'var(--brutalist-shadow-sm)'
              }}>
                {adminTab === 'operations' && <ShieldAlert size={18} />}
                {adminTab === 'participants' && <Users size={18} />}
                {adminTab === 'handbook' && <BookOpen size={18} />}
                {adminTab === 'database_export' && <Database size={18} />}
              </div>
              <div>
                <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                  {adminTab === 'operations' && "Operations Desk & Inquiries"}
                  {adminTab === 'participants' && "Participant Directory & Database Purging"}
                  {adminTab === 'logistics_certs' && "Logistics, Mentors & Certificate Settings"}
                  {adminTab === 'handbook' && "Official Hackathon Handbook Editor"}
                  {adminTab === 'database_export' && "Database Management & Telemetry"}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {adminTab === 'operations' && "Live master timer, escalated questions queue, and emergency broadcasts."}
                  {adminTab === 'participants' && "Live registry of all users with search, filters, and cascade deletion."}
                  {adminTab === 'logistics_certs' && "Edit certificate templates, manage mentor roster, and approve hardware/API requests."}
                  {adminTab === 'handbook' && "Markdown editor synced directly to RAG knowledge embeddings."}
                  {adminTab === 'database_export' && "Storage metrics, table breakdowns, and one-click data downloads."}
                </p>
              </div>
            </div>

            {/* Right: Quick Actions (Excel, PDF, Handbook) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={handleExportExcel} 
                disabled={exportingExcel}
                className="btn-brutalist-outline"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                title="Download complete event database in Excel (.xlsx)"
              >
                <FileSpreadsheet size={14} color="var(--color-aqua-teal)" />
                <span>{exportingExcel ? 'Exporting...' : '📥 Export Excel'}</span>
              </button>

              <button 
                onClick={handleExportPdf} 
                disabled={exportingPdf}
                className="btn-brutalist-outline"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                title="Generate master event report (.pdf)"
              >
                <FileText size={14} color="var(--danger)" />
                <span>{exportingPdf ? 'Generating...' : '📄 Export PDF'}</span>
              </button>

              <button 
                onClick={() => { setAdminTab(adminTab === 'handbook' ? 'operations' : 'handbook'); if (adminTab !== 'handbook') fetchHandbook(); }}
                className={adminTab === 'handbook' ? 'btn-brutalist-primary' : 'btn-brutalist-outline'}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
              >
                <BookOpen size={14} />
                <span>📖 Handbook</span>
              </button>
            </div>
          </div>

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
                justifyContent: 'space-between',
                color: 'var(--color-teal-primary)',
                fontWeight: 700,
                fontSize: '0.88rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CheckCircle2 size={18} color="var(--color-aqua-teal)" />
                <span>{actionSuccess}</span>
              </div>
              <button onClick={() => setActionSuccess('')} style={{ background: 'none', border: 'none', color: 'var(--color-teal-primary)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
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
                justifyContent: 'space-between',
                color: 'var(--danger)',
                fontWeight: 700,
                fontSize: '0.88rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <AlertTriangle size={18} color="var(--danger)" />
                <span>{actionError}</span>
              </div>
              <button onClick={() => setActionError('')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* =========================================================================
              TAB 1: OPERATIONS & CONTROL CENTER
              ========================================================================= */}
          {adminTab === 'operations' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

              {/* 1. Live Master Timer Widget */}
              <section className="arch-card" style={{ padding: '1.5rem 1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                      <Clock size={16} color="var(--color-teal-primary)" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--text-headlines)', letterSpacing: '0.04em' }}>
                        LIVE HACKATHON MASTER TIMER
                      </span>
                      <span className={`pill-badge ${timerData?.status === 'running' ? 'pill-badge-live' : 'pill-badge-ready'}`}>
                        {timerData?.status === 'running' && <span className="pulse-dot" />}
                        {timerData?.status === 'running' ? 'RUNNING' : timerData?.status === 'paused' ? 'PAUSED' : 'READY'}
                      </span>
                    </div>

                    <div 
                      className="font-mono"
                      style={{ 
                        fontSize: 'clamp(1.6rem, 3.2vw, 2.5rem)', 
                        fontWeight: 900, 
                        color: 'var(--text-headlines)',
                        letterSpacing: '-0.02em',
                        marginBottom: '0.65rem'
                      }}
                    >
                      {timerDisplayTime}
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Handbook Reference: Deadline: Day 3 at 09:00 AM IST
                    </p>
                  </div>

                  {/* Timer Control Bar */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    {timerData?.status !== 'running' ? (
                      <button 
                        onClick={handleStartTimer}
                        disabled={timerLoading}
                        className="btn-brutalist-primary"
                      >
                        <Play size={16} fill="currentColor" /> Start Timer
                      </button>
                    ) : (
                      <button 
                        onClick={handlePauseTimer}
                        disabled={timerLoading}
                        className="btn-brutalist-outline"
                      >
                        <Pause size={16} /> Pause Timer
                      </button>
                    )}

                    {timerData?.status !== 'ended' && (
                      <button 
                        onClick={handleStopTimer}
                        disabled={timerLoading}
                        className="btn-brutalist-outline"
                        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        title="Conclude hackathon and disqualify unsubmitted teams"
                      >
                        <Square size={14} fill="currentColor" /> Stop
                      </button>
                    )}

                    <button 
                      onClick={handleResetTimer}
                      disabled={timerLoading}
                      className="btn-brutalist-outline"
                    >
                      <RotateCcw size={15} /> Reset
                    </button>

                    <button 
                      onClick={handleSyncHandbookTimer}
                      disabled={timerLoading}
                      className="btn-brutalist-outline"
                    >
                      <BookOpen size={15} /> Sync
                    </button>
                  </div>
                </div>
              </section>

              {/* 2. Key Metrics Grid (4 Stat Cards) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                
                {/* Pending Questions */}
                <div className="arch-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>
                      Pending Questions
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-headlines)' }}>
                      {metrics?.pendingTicketsCount ?? 0}
                    </div>
                  </div>
                </div>

                {/* Answered / Resolved */}
                <div className="arch-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', backgroundColor: 'var(--badge-available-bg)', border: '1px solid var(--color-aqua-teal)', color: 'var(--color-teal-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={20} color="var(--color-aqua-teal)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>
                      Answered / Resolved
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-headlines)' }}>
                      {metrics?.resolvedTicketsCount ?? 0}
                    </div>
                  </div>
                </div>

                {/* Rejected Questions */}
                <div className="arch-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', backgroundColor: 'rgba(225, 29, 72, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ban size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>
                      Rejected Questions
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-headlines)' }}>
                      {metrics?.rejectedTicketsCount ?? 0}
                    </div>
                  </div>
                </div>

                {/* Registered Teams */}
                <div className="arch-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', backgroundColor: 'var(--badge-ready-bg)', border: '1px solid var(--color-slate-blue)', color: 'var(--color-teal-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>
                      Registered Teams
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-headlines)' }}>
                      {metrics?.totalTeams ?? teams.length}
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. 2-Column Split: Questions Queue + Live Alert Broadcast Center */}
              <div className="admin-operations-grid">
                
                {/* LEFT: Flagged & Escalated Questions Queue */}
                <section className="arch-card admin-operations-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Header & Filter Tabs */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem', flexShrink: 0 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShieldAlert size={18} color="var(--warning)" />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                          Flagged & Escalated Questions Queue
                        </h3>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Questions escalated by participants for organizer review.
                      </p>
                    </div>

                    {/* Filter Tabs (0px sharp) */}
                    <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--code-box-bg)', padding: '0.25rem', border: '1px solid var(--border-color)' }}>
                      {['pending', 'resolved', 'rejected', 'all'].map((f) => (
                        <button
                          key={f}
                          onClick={() => setQueueFilter(f)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            borderRadius: '0px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: queueFilter === f ? 'var(--color-teal-primary)' : 'transparent',
                            color: queueFilter === f ? '#ffffff' : 'var(--text-secondary)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Batch Selection Toolbar */}
                  {filteredEscalations.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', background: 'var(--code-box-bg)', border: '1px solid var(--border-color)', marginBottom: '1rem', flexShrink: 0 }}>
                      <button 
                        onClick={() => handleSelectAll(filteredEscalations)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}
                      >
                        {selectedIds.size === filteredEscalations.length && filteredEscalations.length > 0 ? (
                          <CheckSquare size={15} color="var(--color-teal-primary)" />
                        ) : (
                          <Square size={15} />
                        )}
                        Select All ({filteredEscalations.length})
                      </button>

                      {selectedIds.size > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-headlines)', fontWeight: 700 }}>
                            {selectedIds.size} selected
                          </span>
                          <button
                            onClick={handleBatchDelete}
                            className="btn-brutalist-outline"
                            style={{ padding: '0.25rem 0.65rem', fontSize: '0.74rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                          >
                            <Trash2 size={13} /> Delete Selected
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tickets List (Scrollable) */}
                  {filteredEscalations.length > 0 ? (
                    <div 
                      className="custom-scrollbar" 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.85rem', 
                        overflowY: 'auto', 
                        flex: 1, 
                        minHeight: 0, 
                        paddingRight: '0.35rem' 
                      }}
                    >
                      {filteredEscalations.map((ticket) => {
                        const isSelected = selectedIds.has(ticket.id);
                        return (
                          <div 
                            key={ticket.id} 
                            style={{ 
                              backgroundColor: isSelected ? 'rgba(43, 103, 119, 0.08)' : 'var(--bg-card)', 
                              border: `1px solid ${isSelected ? 'var(--color-teal-primary)' : 'var(--border-color)'}`, 
                              padding: '1rem', 
                              boxShadow: 'var(--brutalist-shadow-sm)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* Top Info */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                                <button
                                  onClick={() => handleToggleSelect(ticket.id)}
                                  style={{ background: 'none', border: 'none', color: isSelected ? 'var(--color-teal-primary)' : 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                                >
                                  {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                </button>
                                <div>
                                  <div style={{ fontSize: '0.82rem', color: 'var(--text-headlines)', fontWeight: 700 }}>
                                    {ticket.userEmail || 'Participant'}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                                    #{ticket.id} • {ticket.timestamp || ticket.createdAt ? new Date(ticket.timestamp || ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                {ticket.urgencyLevel && (
                                  <span 
                                    className="pill-badge"
                                    style={{
                                      fontSize: '0.62rem',
                                      backgroundColor: ticket.urgencyLevel === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : ticket.urgencyLevel === 'HIGH' ? 'rgba(245, 158, 11, 0.2)' : ticket.urgencyLevel === 'MEDIUM' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                      color: ticket.urgencyLevel === 'CRITICAL' ? '#ef4444' : ticket.urgencyLevel === 'HIGH' ? '#f59e0b' : ticket.urgencyLevel === 'MEDIUM' ? '#06b6d4' : '#94a3b8',
                                      borderColor: ticket.urgencyLevel === 'CRITICAL' ? '#ef4444' : ticket.urgencyLevel === 'HIGH' ? '#f59e0b' : ticket.urgencyLevel === 'MEDIUM' ? '#06b6d4' : '#94a3b8'
                                    }}
                                  >
                                    ⚡ {ticket.urgencyLevel} ({ticket.urgencyScore || 50}/100)
                                  </span>
                                )}
                                <span className={`pill-badge ${ticket.status === 'resolved' ? 'pill-badge-available' : ticket.status === 'rejected' ? 'pill-badge-alert' : 'pill-badge-ready'}`}>
                                  {ticket.status}
                                </span>
                              </div>
                            </div>

                            {/* Question Box */}
                            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--code-box-bg)', border: '1px solid var(--border-color)', fontSize: '0.86rem', color: 'var(--text-headlines)', fontWeight: 600, marginBottom: '0.65rem', lineHeight: '1.45' }}>
                              "{ticket.query || ticket.question || 'Participant Question'}"
                            </div>

                            {/* Response Box */}
                            {ticket.status === 'resolved' && (
                              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--badge-available-bg)', borderLeft: '3px solid var(--color-aqua-teal)', fontSize: '0.82rem', marginBottom: '0.65rem' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-teal-primary)', fontWeight: 800 }}>Answer ({ticket.resolvedBy || 'CampusCopilot'}):</div>
                                <div style={{ color: 'var(--text-headlines)', marginTop: '0.2rem' }}>{ticket.response || ticket.proposedAnswer || ticket.answer}</div>
                              </div>
                            )}

                            {ticket.status === 'rejected' && (
                              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'rgba(225, 29, 72, 0.08)', borderLeft: '3px solid var(--danger)', fontSize: '0.82rem', marginBottom: '0.65rem' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 800 }}>Rejection Reason:</div>
                                <div style={{ color: 'var(--danger)', marginTop: '0.2rem' }}>{ticket.response || ticket.rejectionReason}</div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem', marginTop: '0.5rem' }}>
                              {ticket.status === 'pending' && (
                                <>
                                  <button 
                                    onClick={() => setSelectedEscalation(ticket)}
                                    className="btn-brutalist-primary"
                                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', minHeight: '30px' }}
                                  >
                                    💬 Answer & Notify
                                  </button>

                                  <button 
                                    onClick={() => setRejectingEscalation(ticket)}
                                    className="btn-brutalist-outline"
                                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', minHeight: '30px' }}
                                  >
                                    <Ban size={12} /> Reject
                                  </button>
                                </>
                              )}

                              <button 
                                onClick={(e) => handleDeleteSingle(ticket.id, e)}
                                className="btn-brutalist-outline"
                                title="Delete question"
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.55rem', minHeight: '30px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--code-box-bg)', border: '1px dashed var(--border-color)' }}>
                      <CheckCircle2 size={32} color="var(--color-aqua-teal)" style={{ marginBottom: '0.65rem' }} />
                      <div style={{ fontWeight: 700, color: 'var(--text-headlines)', fontSize: '0.92rem' }}>No {queueFilter} questions in queue.</div>
                    </div>
                  )}

                </section>

                {/* RIGHT: Live Alert Broadcast Center */}
                <section className="arch-card admin-operations-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexShrink: 0 }}>
                    <Megaphone size={18} color="var(--color-aqua-teal)" />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                      Live Alert Broadcast Center
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.15rem', flexShrink: 0 }}>
                    Pushes urgent emergency alerts to participant pop-up modals.
                  </p>

                  <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                        ALERT TITLE *
                      </label>
                      <input
                        type="text"
                        className="arch-input"
                        placeholder="e.g. Day 2 Submission Reminder"
                        value={annTitle}
                        onChange={(e) => setAnnTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                        SEVERITY LEVEL
                      </label>
                      <select 
                        className="arch-input"
                        value={annSeverity}
                        onChange={(e) => setAnnSeverity(e.target.value)}
                      >
                        <option value="info">Info (General Notice)</option>
                        <option value="warning">Urgent (Action Required)</option>
                        <option value="critical">Critical (Emergency)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                        MESSAGE CONTENT *
                      </label>
                      <textarea
                        className="arch-input"
                        rows={3}
                        placeholder="Type broadcast announcement message..."
                        value={annMessage}
                        onChange={(e) => setAnnMessage(e.target.value)}
                        required
                      />
                    </div>

                    {/* Optional Attachment */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                        OPTIONAL FILE ATTACHMENT
                      </label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setAnnFile(e.target.files[0]);
                          }
                        }}
                        style={{ display: 'none' }}
                        id="admin-file-upload"
                      />

                      {annFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.75rem', backgroundColor: 'var(--badge-ready-bg)', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                            <Paperclip size={14} color="var(--color-teal-primary)" />
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-headlines)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {annFile.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAnnFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor="admin-file-upload"
                          className="btn-brutalist-outline"
                          style={{ width: '100%', padding: '0.5rem', fontSize: '0.78rem', cursor: 'pointer', borderStyle: 'dashed' }}
                        >
                          <Paperclip size={13} /> Attach Document / Image
                        </label>
                      )}
                    </div>

                    <button 
                      type="submit" 
                      className="btn-brutalist-primary"
                      disabled={broadcasting}
                      style={{ marginTop: '0.35rem' }}
                    >
                      <Send size={15} />
                      {broadcasting ? 'Broadcasting...' : '📢 Broadcast to All Participants'}
                    </button>
                  </form>
                </section>

              </div>

              {/* 4. Registered Teams & Submissions Management Card */}
              <section className="arch-card" style={{ padding: '1.5rem 1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={18} color="var(--color-teal-primary)" />
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                        Registered Teams & Submissions ({filteredTeams.length})
                      </h3>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>✓ {countSubmitted} Submitted</span>
                      <span>•</span>
                      <span>⏳ {countNotSubmitted} Not Submitted</span>
                      {countDisqualified > 0 && (
                        <>
                          <span>•</span>
                          <span style={{ color: 'var(--danger)', fontWeight: 700 }}>🚫 {countDisqualified} Disqualified</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* View Mode & Full Grid Explorer Trigger */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      type="button"
                      onClick={() => setTeamViewMode('grid')}
                      className={teamViewMode === 'grid' ? 'btn-brutalist-primary' : 'btn-brutalist-outline'}
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', minHeight: '30px' }}
                    >
                      <LayoutGrid size={13} /> Grid
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamViewMode('list')}
                      className={teamViewMode === 'list' ? 'btn-brutalist-primary' : 'btn-brutalist-outline'}
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', minHeight: '30px' }}
                    >
                      <LayoutList size={13} /> List
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTeamGridModal(true)}
                      className="btn-brutalist-outline"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', minHeight: '30px' }}
                    >
                      <Maximize2 size={13} /> Full Grid
                    </button>
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                    <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      className="arch-input"
                      placeholder="Search teams by name, track, invite code, or member..."
                      value={teamSearchQuery}
                      onChange={(e) => setTeamSearchQuery(e.target.value)}
                      style={{ paddingLeft: '2.2rem', paddingRight: teamSearchQuery ? '2rem' : '0.75rem', fontSize: '0.82rem' }}
                    />
                    {teamSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTeamSearchQuery('')}
                        style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: `All (${teams.length})` },
                      { id: 'not_submitted', label: `⏳ Not Submitted (${countNotSubmitted})` },
                      { id: 'submitted', label: `✓ Submitted (${countSubmitted})` },
                      { id: 'disqualified', label: `🚫 Disqualified (${countDisqualified})` }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTeamStatusFilter(tab.id)}
                        className={teamStatusFilter === tab.id ? 'btn-brutalist-primary' : 'btn-brutalist-outline'}
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', minHeight: '32px' }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team Roster Content */}
                {filteredTeams.length > 0 ? (
                  teamViewMode === 'grid' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                      {filteredTeams.map((t) => {
                        const st = (t.status || 'not_submitted').toLowerCase();
                        return (
                          <div
                            key={t.id}
                            className="arch-card arch-card-hover"
                            style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.85rem' }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                <div style={{ fontWeight: 800, color: 'var(--text-headlines)', fontSize: '1rem' }}>{t.name}</div>
                                {renderTeamStatusBadge(t.status)}
                              </div>

                              <div style={{ fontSize: '0.74rem', color: 'var(--color-aqua-teal)', fontWeight: 700, marginBottom: '0.5rem' }}>
                                {t.track}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', backgroundColor: 'var(--code-box-bg)', padding: '0.35rem 0.6rem', border: '1px solid var(--border-color)', marginBottom: '0.65rem' }}>
                                <span>Code: <strong>{t.inviteCode}</strong></span>
                                <span>{t.members?.length || 0}/4 Members</span>
                              </div>

                              {/* Members preview */}
                              {t.members && t.members.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.65rem' }}>
                                  {t.members.map((m, midx) => (
                                    <div key={midx} style={{ fontSize: '0.74rem', color: 'var(--text-headlines)', display: 'flex', alignItems: 'center' }}>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                        {m.isLeader ? '👑 ' : '• '}{m.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Repo Link */}
                              {st === 'submitted' && t.githubUrl && (
                                <div style={{ marginTop: '0.4rem' }}>
                                  <a
                                    href={t.githubUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-brutalist-outline"
                                    style={{ width: '100%', padding: '0.35rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                                  >
                                    <Code2 size={12} /> View GitHub Repo <ExternalLink size={10} />
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Card Actions */}
                            <div style={{ paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.45rem' }}>
                              <button
                                onClick={() => handleOpenDisqualifyModal(t)}
                                disabled={updatingTeamId === t.id}
                                className="btn-brutalist-outline"
                                style={{ flex: 1, padding: '0.35rem', fontSize: '0.72rem', minHeight: '30px' }}
                              >
                                {st === 'disqualified' ? <RotateCcw size={11} /> : <Ban size={11} />}
                                <span>{st === 'disqualified' ? 'Restore' : 'Disqualify'}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteTeam(t.id, t.name)}
                                className="btn-brutalist-outline"
                                style={{ padding: '0.35rem 0.55rem', fontSize: '0.72rem', minHeight: '30px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                title={`Delete team ${t.name}`}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* LIST VIEW TABLE */
                    <div className="arch-table-container">
                      <table className="arch-table">
                        <thead>
                          <tr>
                            <th>Team Name</th>
                            <th>Track Theme</th>
                            <th>Code</th>
                            <th>Members</th>
                            <th>Status</th>
                            <th>GitHub Repo</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTeams.map((t) => {
                            const st = (t.status || 'not_submitted').toLowerCase();
                            return (
                              <tr key={t.id}>
                                <td style={{ fontWeight: 800, color: 'var(--text-headlines)' }}>{t.name}</td>
                                <td style={{ color: 'var(--color-aqua-teal)', fontWeight: 600 }}>{t.track}</td>
                                <td><code style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-headlines)' }}>{t.inviteCode}</code></td>
                                <td>{t.members?.length || 0}/4</td>
                                <td>{renderTeamStatusBadge(t.status)}</td>
                                <td>
                                  {st === 'submitted' && t.githubUrl ? (
                                    <a href={t.githubUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-aqua-teal)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                                      <Code2 size={12} /> Repo <ExternalLink size={10} />
                                    </a>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>None</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                                    <button
                                      onClick={() => handleOpenDisqualifyModal(t)}
                                      className="btn-brutalist-outline"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', minHeight: '26px' }}
                                    >
                                      {st === 'disqualified' ? 'Restore' : 'Disqualify'}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTeam(t.id, t.name)}
                                      className="btn-brutalist-outline"
                                      style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem', minHeight: '26px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No teams match your search or filter criteria.
                  </div>
                )}
              </section>

            </div>
          )}

          {/* =========================================================================
              TAB 2: PARTICIPANT DIRECTORY & USER MANAGEMENT
              ========================================================================= */}
          {adminTab === 'participants' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Directory Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="arch-card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>
                    Total Registered
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-headlines)', marginTop: '0.25rem' }}>
                    {usersMetadata.total}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {usersMetadata.participantsCount} Hackers • {usersMetadata.adminsCount} Admins
                  </div>
                </div>

                <div className="arch-card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>
                    Assigned to Team
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-headlines)', marginTop: '0.25rem' }}>
                    {usersMetadata.inTeamCount}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {teams.length} Active Team Rosters
                  </div>
                </div>

                <div className="arch-card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>
                    Solo / Seeking Team
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-headlines)', marginTop: '0.25rem' }}>
                    {usersMetadata.soloCount}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Open to Matchmaking
                  </div>
                </div>

                <div className="arch-card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>
                    Verified Accounts
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-headlines)', marginTop: '0.25rem' }}>
                    {usersMetadata.verifiedCount}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {usersMetadata.total > 0 ? Math.round((usersMetadata.verifiedCount / usersMetadata.total) * 100) : 0}% Verification Rate
                  </div>
                </div>
              </div>

              {/* Participant Directory Card */}
              <section className="arch-card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={18} color="var(--color-teal-primary)" />
                      <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                        Registered Participants Directory ({filteredUsers.length})
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Deleting a user instantly purges their record across all database tables (teams, Q&A tickets, credentials).
                    </p>
                  </div>

                  <button
                    onClick={fetchUsers}
                    disabled={usersLoading}
                    className="btn-brutalist-outline"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
                  >
                    <RefreshCw size={13} className={usersLoading ? 'animate-spin' : ''} /> Refresh List
                  </button>
                </div>

                {/* Search & Filter Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                      <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        className="arch-input"
                        placeholder="Search participants by name, @username, email, role, skills, team..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        style={{ paddingLeft: '2.2rem', paddingRight: userSearchQuery ? '2rem' : '0.75rem', fontSize: '0.82rem' }}
                      />
                      {userSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setUserSearchQuery('')}
                          style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {[
                        { id: 'all', label: `All (${usersList.length})`, active: userRoleFilter === 'all' && userTeamFilter === 'all' && userVerifiedFilter === 'all', onClick: () => { setUserRoleFilter('all'); setUserTeamFilter('all'); setUserVerifiedFilter('all'); } },
                        { id: 'in_team', label: `👥 In Team (${usersMetadata.inTeamCount})`, active: userTeamFilter === 'in_team', onClick: () => { setUserTeamFilter(userTeamFilter === 'in_team' ? 'all' : 'in_team'); } },
                        { id: 'solo', label: `🔍 Solo Hackers (${usersMetadata.soloCount})`, active: userTeamFilter === 'solo', onClick: () => { setUserTeamFilter(userTeamFilter === 'solo' ? 'all' : 'solo'); } },
                        { id: 'verified', label: `✓ Verified (${usersMetadata.verifiedCount})`, active: userVerifiedFilter === 'verified', onClick: () => { setUserVerifiedFilter(userVerifiedFilter === 'verified' ? 'all' : 'verified'); } },
                        { id: 'admin', label: `🛡️ Admins (${usersMetadata.adminsCount})`, active: userRoleFilter === 'admin', onClick: () => { setUserRoleFilter(userRoleFilter === 'admin' ? 'all' : 'admin'); } }
                      ].map((tab, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={tab.onClick}
                          className={tab.active ? 'btn-brutalist-primary' : 'btn-brutalist-outline'}
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', minHeight: '32px' }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Batch Selection Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', backgroundColor: 'var(--code-box-bg)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => toggleSelectAllUsers(filteredUsers)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-headlines)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontWeight: 700 }}
                    >
                      {filteredUsers.filter(u => u.id !== user?.id).length > 0 && selectedUserIds.size >= filteredUsers.filter(u => u.id !== user?.id).length ? (
                        <CheckSquare size={16} color="var(--color-teal-primary)" />
                      ) : (
                        <Square size={16} />
                      )}
                      Select All Filtered ({filteredUsers.filter(u => u.id !== user?.id).length})
                    </button>

                    {selectedUserIds.size > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 800 }}>
                          {selectedUserIds.size} participant{selectedUserIds.size > 1 ? 's' : ''} selected
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedUserIds(new Set())}
                          className="btn-brutalist-outline"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', minHeight: '26px' }}
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowBatchDeleteModal(true)}
                          className="btn-brutalist-primary"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.72rem', minHeight: '26px', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                        >
                          <Trash2 size={12} /> Purge Selected ({selectedUserIds.size}) & All Records
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Cards Grid */}
                {usersLoading && usersList.length === 0 ? (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={28} className="animate-spin" style={{ marginBottom: '0.75rem' }} />
                    <div>Loading Registered Participants...</div>
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                    {filteredUsers.map((u) => {
                      const isCurrentUser = u.id === user?.id;
                      const isSelected = selectedUserIds.has(u.id);
                      const isAdmin = u.role === 'admin';
                      const initial = (u.name || u.username || 'U').charAt(0).toUpperCase();

                      return (
                        <div
                          key={u.id}
                          className="arch-card arch-card-hover"
                          style={{ 
                            padding: '1.25rem', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'space-between', 
                            gap: '0.85rem',
                            borderColor: isSelected ? 'var(--danger)' : undefined
                          }}
                        >
                          <div>
                            {/* User Header */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.65rem' }}>
                              <div style={{ paddingTop: '0.2rem' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isCurrentUser}
                                  onChange={() => toggleSelectUser(u.id)}
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    accentColor: 'var(--color-teal-primary)',
                                    cursor: isCurrentUser ? 'not-allowed' : 'pointer',
                                    opacity: isCurrentUser ? 0.3 : 1
                                  }}
                                />
                              </div>

                              <div style={{ 
                                width: '38px', 
                                height: '38px', 
                                backgroundColor: isAdmin ? 'var(--color-teal-primary)' : 'var(--color-aqua-teal)', 
                                color: isAdmin ? '#ffffff' : '#0f1d21', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontWeight: 900, 
                                fontSize: '1rem',
                                flexShrink: 0,
                                border: '1px solid var(--border-color)'
                              }}>
                                {initial}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 800, color: 'var(--text-headlines)', fontSize: '0.94rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {u.name || 'Anonymous Hacker'}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="pill-badge pill-badge-ready" style={{ fontSize: '0.62rem', padding: '0.05rem 0.35rem' }}>YOU</span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-aqua-teal)', fontWeight: 700 }}>
                                  @{u.username || 'user'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {u.email}
                                </div>
                              </div>
                            </div>

                            {/* Badges */}
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                              <span className={`pill-badge ${isAdmin ? 'pill-badge-ready' : 'pill-badge-tech'}`} style={{ fontSize: '0.65rem' }}>
                                {isAdmin ? '🛡️ Admin' : 'Hacker'}
                              </span>
                              {u.isVerified ? (
                                <span className="pill-badge pill-badge-available" style={{ fontSize: '0.65rem' }}>
                                  ✓ Verified
                                </span>
                              ) : (
                                <span className="pill-badge pill-badge-alert" style={{ fontSize: '0.65rem' }}>
                                  Unverified
                                </span>
                              )}
                              {u.roleTitle && (
                                <span className="pill-badge pill-badge-tech" style={{ fontSize: '0.65rem' }}>
                                  {u.roleTitle}
                                </span>
                              )}
                            </div>

                            {/* Bio */}
                            {u.bio && (
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '0.65rem', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                "{u.bio}"
                              </p>
                            )}

                            {/* Team Status */}
                            <div style={{ backgroundColor: 'var(--code-box-bg)', border: '1px solid var(--border-color)', padding: '0.45rem 0.65rem', fontSize: '0.75rem', marginBottom: '0.65rem' }}>
                              {u.teamName ? (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--text-headlines)' }}>👥 {u.teamName}</span>
                                  {u.isTeamLeader && <span style={{ color: 'var(--warning)', fontWeight: 800 }}>👑 Leader</span>}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)' }}>🔍 Solo Participant {u.lookingForTeam && '• Seeking Team'}</span>
                              )}
                            </div>

                            {/* Skills */}
                            {u.skills && u.skills.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
                                {u.skills.slice(0, 4).map((sk, sidx) => (
                                  <span key={sidx} className="pill-badge pill-badge-tech" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Footer Delete Action */}
                          <div style={{ paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active Member'}
                            </span>

                            <button
                              type="button"
                              onClick={() => setDeletingUser(u)}
                              disabled={isCurrentUser}
                              className="btn-brutalist-outline"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', borderColor: 'var(--danger)', color: 'var(--danger)', minHeight: '28px' }}
                              title={isCurrentUser ? "You cannot delete your active admin session" : `Permanently delete ${u.name}`}
                            >
                              <Trash2 size={12} /> {isCurrentUser ? 'Active Session' : 'Delete User & Data'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No participants match your current search query or active filter.
                  </div>
                )}
              </section>

            </div>
          )}

          {/* =========================================================================
              TAB 3: HANDBOOK EDITOR & RAG SYNC
              ========================================================================= */}
          {adminTab === 'handbook' && (
            <div className="animate-fade-in">
              <section className="arch-card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BookOpen size={18} color="var(--color-teal-primary)" />
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                        Official Event Handbook & RAG Knowledge Editor
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Live editor for <code>hackathon_handbook.txt</code>. Saved changes immediately update the AI Concierge RAG engine.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={fetchHandbook}
                      disabled={handbookLoading || handbookSaving}
                      className="btn-brutalist-outline"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                    >
                      <RefreshCw size={13} /> Reload Server Copy
                    </button>
                    <button
                      onClick={handleSaveHandbook}
                      disabled={handbookSaving || !handbookHasChanges}
                      className="btn-brutalist-primary"
                      style={{ padding: '0.45rem 0.95rem', fontSize: '0.78rem' }}
                    >
                      <Save size={14} /> {handbookSaving ? 'Saving...' : '💾 Save & Sync RAG'}
                    </button>
                  </div>
                </div>

                {/* Handbook Status Feedback */}
                {handbookSuccess && (
                  <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--badge-available-bg)', border: '1px solid var(--color-aqua-teal)', color: 'var(--color-teal-primary)', fontWeight: 700, fontSize: '0.84rem', marginBottom: '1rem' }}>
                    {handbookSuccess}
                  </div>
                )}
                {handbookError && (
                  <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(225, 29, 72, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', fontWeight: 700, fontSize: '0.84rem', marginBottom: '1rem' }}>
                    {handbookError}
                  </div>
                )}

                {/* Metadata Strip */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.85rem', backgroundColor: 'var(--code-box-bg)', border: '1px solid var(--border-color)', borderBottom: 'none', fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span>File: hackathon_handbook.txt</span>
                    <span>Lines: {handbookLineCount}</span>
                    <span>Words: {handbookWordCount}</span>
                  </div>
                  <div>
                    {handbookHasChanges ? (
                      <span style={{ color: 'var(--warning)', fontWeight: 700 }}>● Unsaved Changes</span>
                    ) : (
                      <span style={{ color: 'var(--color-aqua-teal)', fontWeight: 700 }}>✓ Synced with Server</span>
                    )}
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  value={handbookContent}
                  onChange={(e) => setHandbookContent(e.target.value)}
                  disabled={handbookLoading || handbookSaving}
                  rows={20}
                  className="arch-input font-mono"
                  style={{
                    fontSize: '0.88rem',
                    lineHeight: '1.6',
                    resize: 'vertical',
                    borderTop: 'none'
                  }}
                  placeholder="Loading handbook contents from server..."
                />
              </section>
            </div>
          )}

          {/* =========================================================================
              TAB 4: DATABASE TELEMETRY & DATA EXPORTS
              ========================================================================= */}
          {adminTab === 'database_export' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Telemetry Overview Card */}
              <section className="arch-card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Database size={18} color="var(--color-teal-primary)" />
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                        SQLite Relational Database Telemetry
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Server-local SQLite database engine managed via SQLAlchemy with ACID compliance.
                    </p>
                  </div>

                  <button 
                    onClick={fetchDatabaseStatus}
                    disabled={dbLoading}
                    className="btn-brutalist-outline"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                  >
                    <RefreshCw size={13} className={dbLoading ? 'animate-spin' : ''} /> {dbLoading ? 'Querying...' : 'Refresh Status'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: 'var(--code-box-bg)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>FILE NAME</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-headlines)', marginTop: '0.2rem' }}>{dbStatus?.databaseFile || 'hackathon.db'}</div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'var(--code-box-bg)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>DATABASE SIZE</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--color-aqua-teal)', marginTop: '0.2rem' }}>{dbStatus?.sizeKB ? `${dbStatus.sizeKB} KB` : 'Active'}</div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'var(--code-box-bg)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>ENGINE</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-headlines)', marginTop: '0.2rem' }}>SQLite 3 / SQLAlchemy</div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'var(--code-box-bg)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>STATUS</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--color-aqua-teal)', marginTop: '0.2rem' }}>Operational (ACID)</div>
                  </div>
                </div>

                {/* Table Breakdown */}
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-headlines)', marginBottom: '0.75rem' }}>
                  Relational Table Counts
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
                  <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Table: users</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-headlines)' }}>{dbStatus?.counts?.users ?? '...'}</div>
                  </div>
                  <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Table: teams</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-headlines)' }}>{dbStatus?.counts?.teams ?? '...'}</div>
                  </div>
                  <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Table: faq_escalations</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-headlines)' }}>{dbStatus?.counts?.escalations ?? '...'}</div>
                  </div>
                  <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Table: announcements</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-headlines)' }}>{dbStatus?.counts?.announcements ?? '...'}</div>
                  </div>
                  <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Table: knowledge_items</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-headlines)' }}>{dbStatus?.counts?.knowledgeItems ?? '...'}</div>
                  </div>
                </div>
              </section>

              {/* Data Export Cards */}
              <section className="arch-card" style={{ padding: '1.75rem' }}>
                <div style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                    Data Export & Printable Report Generation
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Download formatted multi-tab Excel workbooks or print-ready PDF executive summaries.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                  <div style={{ padding: '1.5rem', backgroundColor: 'var(--code-box-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <FileSpreadsheet size={22} color="var(--color-aqua-teal)" />
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-headlines)' }}>Full Excel Workbook (.xlsx)</h4>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Formatted 5-sheet workbook containing complete rosters, developer skills, submissions, and helpdesk logs.
                      </p>
                    </div>
                    <button
                      onClick={handleExportExcel}
                      disabled={exportingExcel}
                      className="btn-brutalist-primary"
                    >
                      <Download size={15} /> {exportingExcel ? 'Exporting...' : 'Download Excel (.xlsx)'}
                    </button>
                  </div>

                  <div style={{ padding: '1.5rem', backgroundColor: 'var(--code-box-bg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <FileText size={22} color="var(--danger)" />
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-headlines)' }}>Official Event Report (PDF)</h4>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Print-ready formatted summary report with participation metrics, track distribution, and Q&A analytics.
                      </p>
                    </div>
                    <button
                      onClick={handleExportPdf}
                      disabled={exportingPdf}
                      className="btn-brutalist-primary"
                    >
                      <Download size={15} /> {exportingPdf ? 'Generating...' : 'Download PDF Report'}
                    </button>
                  </div>
                </div>
              </section>

            </div>
          )}

          {/* =========================================================================
              TAB 5: LOGISTICS & CERTIFICATES MANAGEMENT (EDITABLE BY ADMIN)
              ========================================================================= */}
          {adminTab === 'logistics_certs' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* 1. Certificate Download Permission & Release Widget */}
              <section className="arch-card" style={{ padding: '1.75rem', borderLeft: certConfig.isUnlocked ? '4px solid var(--color-aqua-teal)' : '4px solid var(--danger)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: certConfig.isUnlocked ? 'var(--badge-available-bg)' : 'rgba(239, 68, 68, 0.12)',
                      border: `1px solid ${certConfig.isUnlocked ? 'var(--color-aqua-teal)' : 'var(--danger)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: certConfig.isUnlocked ? 'var(--color-aqua-teal)' : 'var(--danger)',
                      flexShrink: 0
                    }}>
                      {certConfig.isUnlocked ? <Unlock size={24} /> : <Lock size={24} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-headlines)', margin: 0 }}>
                          Certificate Download Permission Widget
                        </h3>
                        <span 
                          className="pill-badge"
                          style={{
                            backgroundColor: certConfig.isUnlocked ? 'var(--badge-available-bg)' : 'rgba(239, 68, 68, 0.12)',
                            color: certConfig.isUnlocked ? 'var(--color-aqua-teal)' : 'var(--danger)',
                            borderColor: certConfig.isUnlocked ? 'var(--color-aqua-teal)' : 'var(--danger)',
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}
                        >
                          {certConfig.isUnlocked ? '● PERMISSION GRANTED (UNLOCKED)' : '🔒 LOCKED (DISABLED FOR PARTICIPANTS)'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {certConfig.isUnlocked 
                          ? 'Participants currently have permission to download their official verifiable PDF certificates from their dashboard.'
                          : 'Download buttons on the participant page are currently disabled. Participants cannot download certificates until you grant permission.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleCertPermission}
                    disabled={certConfigSaving}
                    className={certConfig.isUnlocked ? 'btn-brutalist-outline' : 'btn-brutalist-primary'}
                    style={{
                      padding: '0.75rem 1.35rem',
                      fontSize: '0.86rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      borderColor: certConfig.isUnlocked ? 'var(--danger)' : undefined,
                      color: certConfig.isUnlocked ? 'var(--danger)' : undefined
                    }}
                  >
                    {certConfig.isUnlocked ? (
                      <>
                        <Lock size={16} /> Lock & Revoke Download Permission
                      </>
                    ) : (
                      <>
                        <Unlock size={16} /> 🔓 Grant Permission & Unlock Downloads
                      </>
                    )}
                  </button>
                </div>
              </section>

              {/* 2. Certificate Template Configuration Card */}
              <section className="arch-card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--color-teal-primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)', margin: 0 }}>
                        Certificate Template & Signatory Configuration
                      </h3>
                      <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Customize event branding, certificate titles, and authorized signatories on all vector PDFs.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleBatchGenerateCertificates}
                    disabled={batchCertLoading}
                    className="btn-brutalist-outline"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                  >
                    <Sparkles size={14} color="var(--color-aqua-teal)" />
                    {batchCertLoading ? 'Generating...' : 'Batch Issue All Certificates'}
                  </button>
                </div>

                <form onSubmit={handleSaveCertConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                        EVENT NAME
                      </label>
                      <input
                        type="text"
                        className="arch-input"
                        value={certConfig.eventName || ''}
                        onChange={(e) => setCertConfig({ ...certConfig, eventName: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                        CERTIFICATE TITLE
                      </label>
                      <input
                        type="text"
                        className="arch-input"
                        value={certConfig.certificateTitle || ''}
                        onChange={(e) => setCertConfig({ ...certConfig, certificateTitle: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                        SIGNATORY 1 (NAME & TITLE)
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          className="arch-input"
                          placeholder="Name"
                          value={certConfig.signatory1Name || ''}
                          onChange={(e) => setCertConfig({ ...certConfig, signatory1Name: e.target.value })}
                        />
                        <input
                          type="text"
                          className="arch-input"
                          placeholder="Title"
                          value={certConfig.signatory1Title || ''}
                          onChange={(e) => setCertConfig({ ...certConfig, signatory1Title: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                        SIGNATORY 2 (NAME & TITLE)
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          className="arch-input"
                          placeholder="Name"
                          value={certConfig.signatory2Name || ''}
                          onChange={(e) => setCertConfig({ ...certConfig, signatory2Name: e.target.value })}
                        />
                        <input
                          type="text"
                          className="arch-input"
                          placeholder="Title"
                          value={certConfig.signatory2Title || ''}
                          onChange={(e) => setCertConfig({ ...certConfig, signatory2Title: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                      type="submit"
                      disabled={certConfigSaving}
                      className="btn-brutalist-primary"
                    >
                      <Save size={15} />
                      {certConfigSaving ? 'Saving Template...' : 'Save Certificate Settings'}
                    </button>
                  </div>
                </form>
              </section>

              {/* 2. Mentor Directory Manager */}
              <section className="arch-card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--color-teal-primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)', margin: 0 }}>
                        Technical Mentor Directory Management
                      </h3>
                      <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Add, edit, or remove mentors and configure real-time availability slots.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingMentor({
                        id: '',
                        name: '',
                        title: '',
                        status: 'Available Now',
                        statusType: 'available',
                        slotTime: '15 mins (Immediate)',
                        skills: 'React, Node, AI'
                      });
                      setShowMentorModal(true);
                    }}
                    className="btn-brutalist-primary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                  >
                    <Plus size={14} /> Add New Mentor
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {adminMentors.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '1rem',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.65rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-headlines)' }}>
                            {m.name}
                          </h4>
                          <span className="pill-badge pill-badge-ready" style={{ fontSize: '0.68rem' }}>
                            {m.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          {m.title}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {m.skills?.map((sk, idx) => (
                            <span key={idx} className="pill-badge pill-badge-tech" style={{ fontSize: '0.65rem' }}>
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                        <button
                          onClick={() => {
                            setEditingMentor({
                              ...m,
                              skills: Array.isArray(m.skills) ? m.skills.join(', ') : m.skills
                            });
                            setShowMentorModal(true);
                          }}
                          className="btn-brutalist-outline"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMentor(m.id, m.name)}
                          className="btn-brutalist-outline"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 3. Resource Requests Approvals */}
              <section className="arch-card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--color-teal-primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Cpu size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)', margin: 0 }}>
                      Hardware & API Key Request Approvals
                    </h3>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Review participant hardware checkout and sponsor API key grant requests.
                    </p>
                  </div>
                </div>

                {adminResourceRequests.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {adminResourceRequests.map((req) => {
                      const isPending = (req.status || 'PENDING') === 'PENDING';
                      const isApproved = (req.status || '') === 'APPROVED';

                      return (
                        <div
                          key={req.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.85rem 1.15rem',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            flexWrap: 'wrap',
                            gap: '0.75rem'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <span className={`pill-badge ${req.category === 'HARDWARE' ? 'pill-badge-alert' : 'pill-badge-available'}`} style={{ fontSize: '0.65rem' }}>
                                {req.category}
                              </span>
                              <strong style={{ color: 'var(--text-headlines)', fontSize: '0.88rem' }}>
                                {req.item}
                              </strong>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                by {req.userEmail}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              Reason: "{req.reason}"
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`pill-badge ${isApproved ? 'pill-badge-available' : isPending ? 'pill-badge-ready' : 'pill-badge-alert'}`} style={{ fontSize: '0.7rem' }}>
                              {req.status || 'PENDING'}
                            </span>

                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleUpdateResourceStatus(req.id, 'APPROVED')}
                                  disabled={updatingReqId === req.id}
                                  className="btn-brutalist-primary"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  onClick={() => handleUpdateResourceStatus(req.id, 'REJECTED')}
                                  disabled={updatingReqId === req.id}
                                  className="btn-brutalist-outline"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                >
                                  ✕ Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No resource requests submitted yet.
                  </div>
                )}
              </section>

            </div>
          )}

        </main>
      </div>

      {/* =========================================================================
          MODALS & OVERLAYS (0px Sharp Architectural Styling)
          ========================================================================= */}

      {/* 1. ANSWER & RESOLVE MODAL */}
      {selectedEscalation && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="arch-card animate-fade-in" style={{ maxWidth: '540px', width: '100%', padding: '1.75rem', boxShadow: 'var(--brutalist-shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} color="var(--color-aqua-teal)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)' }}>Answer Question & Notify User</h3>
              </div>
              <button onClick={() => setSelectedEscalation(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--code-box-bg)', padding: '0.75rem', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.84rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-teal-primary)', fontWeight: 800 }}>Participant Question:</div>
              <div style={{ color: 'var(--text-headlines)', fontWeight: 600, marginTop: '0.2rem' }}>
                "{selectedEscalation.query || selectedEscalation.question || 'Participant Question'}"
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                From: {selectedEscalation.userEmail}
              </div>
            </div>

            <form onSubmit={handleResolveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  OFFICIAL ORGANIZER ANSWER *
                </label>
                <textarea
                  className="arch-input"
                  rows={4}
                  placeholder="Type clear instructions or answers for the participant..."
                  value={resolveResponse}
                  onChange={(e) => setResolveResponse(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox"
                  id="broadcastCheck"
                  checked={broadcastAnswer}
                  onChange={(e) => setBroadcastAnswer(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-teal-primary)', cursor: 'pointer' }}
                />
                <label htmlFor="broadcastCheck" style={{ fontSize: '0.82rem', color: 'var(--text-headlines)', cursor: 'pointer', fontWeight: 600 }}>
                  Push to Notification Bell (Stores in participant notification drawer)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedEscalation(null)}
                  className="btn-brutalist-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving || !resolveResponse.trim()}
                  className="btn-brutalist-primary"
                >
                  {resolving ? 'Submitting...' : 'Submit Answer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. REJECT QUESTION MODAL */}
      {rejectingEscalation && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="arch-card animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '1.75rem', boxShadow: 'var(--brutalist-shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ban size={18} color="var(--warning)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)' }}>Reject Flagged Question</h3>
              </div>
              <button onClick={() => setRejectingEscalation(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--code-box-bg)', padding: '0.75rem', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.84rem' }}>
              <div style={{ color: 'var(--text-headlines)', fontWeight: 600 }}>
                "{rejectingEscalation.query || rejectingEscalation.question}"
              </div>
            </div>

            <form onSubmit={handleRejectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  REJECTION NOTE / REASON
                </label>
                <input
                  type="text"
                  className="arch-input"
                  placeholder="e.g. Duplicate question or outside event guidelines"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setRejectingEscalation(null)}
                  className="btn-brutalist-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="btn-brutalist-primary"
                  style={{ backgroundColor: 'var(--warning)', borderColor: 'var(--warning)', color: '#ffffff' }}
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. PANORAMIC TEAM GRID EXPLORER MODAL */}
      {showTeamGridModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div className="arch-card animate-fade-in" style={{ maxWidth: '1360px', width: '100%', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '1.75rem', boxShadow: 'var(--brutalist-shadow-lg)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-headlines)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LayoutGrid size={22} color="var(--color-teal-primary)" /> Event Teams Grid Explorer
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Panoramic grid for searching and managing teams.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="pill-badge pill-badge-ready">Total: {teams.length}</span>
                <span className="pill-badge pill-badge-available">✓ {countSubmitted} Submitted</span>
                <button
                  type="button"
                  onClick={() => setShowTeamGridModal(false)}
                  className="btn-brutalist-outline"
                  style={{ padding: '0.4rem 0.65rem' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="arch-input"
                placeholder="Search teams by name, track, invite code, or member..."
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: '240px' }}
              />
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {['all', 'not_submitted', 'submitted', 'disqualified'].map(stId => (
                  <button
                    key={stId}
                    onClick={() => setTeamStatusFilter(stId)}
                    className={teamStatusFilter === stId ? 'btn-brutalist-primary' : 'btn-brutalist-outline'}
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem', minHeight: '32px', textTransform: 'capitalize' }}
                  >
                    {stId.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Panoramic Grid */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredTeams.map((t) => {
                  const st = (t.status || 'not_submitted').toLowerCase();
                  return (
                    <div key={t.id} className="arch-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-headlines)', fontSize: '1.05rem' }}>{t.name}</div>
                          {renderTeamStatusBadge(t.status)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-aqua-teal)', fontWeight: 700, marginBottom: '0.5rem' }}>{t.track}</div>
                        
                        <div style={{ backgroundColor: 'var(--code-box-bg)', padding: '0.45rem 0.65rem', border: '1px solid var(--border-color)', fontSize: '0.74rem', marginBottom: '0.5rem' }}>
                          <span>Invite Code: <strong>{t.inviteCode}</strong></span>
                        </div>

                        {t.members && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.5rem' }}>
                            {t.members.map((m, midx) => (
                              <div key={midx} style={{ fontSize: '0.75rem', color: 'var(--text-headlines)' }}>
                                {m.isLeader ? '👑 ' : '• '}{m.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.45rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                        <button
                          onClick={() => handleOpenDisqualifyModal(t)}
                          className="btn-brutalist-outline"
                          style={{ flex: 1, padding: '0.35rem', fontSize: '0.72rem' }}
                        >
                          {st === 'disqualified' ? 'Restore' : 'Disqualify'}
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(t.id, t.name)}
                          className="btn-brutalist-outline"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.72rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. SINGLE PARTICIPANT CASCADE DELETE MODAL */}
      {deletingUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="arch-card animate-fade-in" style={{ maxWidth: '520px', width: '100%', padding: '1.75rem', border: '2px solid var(--danger)', boxShadow: 'var(--brutalist-shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trash2 size={20} /> Permanently Delete Participant?
            </h3>
            
            <p style={{ color: 'var(--text-headlines)', fontSize: '0.88rem', marginBottom: '1rem', lineHeight: '1.5' }}>
              You are about to delete <strong>{deletingUser.name}</strong> (<code>{deletingUser.email}</code>). This action is <strong>irreversible</strong> and will immediately cascade delete all data:
            </p>

            <div style={{ backgroundColor: 'rgba(225, 29, 72, 0.08)', border: '1px solid var(--danger)', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--danger)' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Instant Cascade Database Purge:</div>
              <ul style={{ paddingLeft: '1.15rem', margin: 0, lineHeight: '1.5' }}>
                <li>User credentials, password hash, and active session tokens</li>
                {deletingUser.teamName && <li>Removed from team <strong>{deletingUser.teamName}</strong></li>}
                <li>All support tickets & personal inbox notifications</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={deletingInProgress}
                className="btn-brutalist-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                disabled={deletingInProgress}
                className="btn-brutalist-primary"
                style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)', color: '#ffffff' }}
              >
                <Trash2 size={14} /> {deletingInProgress ? 'Purging Database...' : 'Confirm & Purge Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. BATCH PARTICIPANTS CASCADE DELETE MODAL */}
      {showBatchDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="arch-card animate-fade-in" style={{ maxWidth: '540px', width: '100%', padding: '1.75rem', border: '2px solid var(--danger)', boxShadow: 'var(--brutalist-shadow-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trash2 size={20} /> Batch Purge {selectedUserIds.size} Participants?
            </h3>
            
            <p style={{ color: 'var(--text-headlines)', fontSize: '0.88rem', marginBottom: '1rem', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete <strong>{selectedUserIds.size} selected participants</strong>? All accounts, team memberships, support tickets, and notifications will be wiped instantly from the database.
            </p>

            <div style={{ maxHeight: '140px', overflowY: 'auto', backgroundColor: 'var(--code-box-bg)', border: '1px solid var(--border-color)', padding: '0.65rem', marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {Array.from(selectedUserIds).map(uid => {
                const targetU = usersList.find(u => u.id === uid);
                return (
                  <span
                    key={uid}
                    className="pill-badge pill-badge-alert"
                    style={{ fontSize: '0.7rem', textTransform: 'none' }}
                  >
                    {targetU ? `${targetU.name} (${targetU.email})` : uid}
                  </span>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                disabled={deletingInProgress}
                className="btn-brutalist-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                disabled={deletingInProgress}
                className="btn-brutalist-primary"
                style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)', color: '#ffffff' }}
              >
                <Trash2 size={14} /> {deletingInProgress ? 'Purging Batch...' : `Purge All ${selectedUserIds.size} Users`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. DISQUALIFY TEAM WITH REASON MODAL */}
      {disqualifyingTeam && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 115, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="arch-card animate-fade-in" style={{ maxWidth: '580px', width: '100%', padding: '1.75rem', border: '2px solid var(--danger)', boxShadow: 'var(--brutalist-shadow-lg)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Ban size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--danger)', margin: 0 }}>
                    Disqualify Team: {disqualifyingTeam.name}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                    Track: {disqualifyingTeam.track} • Invite Code: {disqualifyingTeam.inviteCode}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setDisqualifyingTeam(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Team Info & Warning */}
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.07)', border: '1px solid var(--danger)', padding: '0.75rem 0.95rem', marginBottom: '1rem', fontSize: '0.82rem', lineHeight: '1.45', color: 'var(--text-headlines)' }}>
              <div style={{ fontWeight: 800, color: 'var(--danger)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertTriangle size={14} /> Critical Enforcement Notice
              </div>
              Disqualifying this team will permanently lock project repository submissions, prevent any GitHub URL uploads, and instantly dispatch a targeted alert to all {disqualifyingTeam.members?.length || 0} team member(s) with the specified reason below.
            </div>

            {/* Team Members */}
            {disqualifyingTeam.members && disqualifyingTeam.members.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  Affected Team Members ({disqualifyingTeam.members.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {disqualifyingTeam.members.map((m, idx) => (
                    <span key={idx} className="pill-badge" style={{ fontSize: '0.72rem', backgroundColor: 'var(--code-box-bg)', borderColor: 'var(--border-color)', color: 'var(--text-headlines)' }}>
                      {m.isLeader ? '👑 ' : ''}{m.name} ({m.email})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preset Quick Chips */}
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                Quick Reason Presets (Click to Insert)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {[
                  'Pre-existing codebase / early commits prior to hackathon start',
                  'Plagiarism or copied submission from third-party repo',
                  'Missed mandatory sprint checkpoint & failed verification',
                  'Code of Conduct violation / disruptive behavior',
                  'Unauthorized proprietary models / undisclosed AI assets',
                  'Incomplete roster / failure to meet eligibility criteria'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDisqualifyReason(preset)}
                    style={{
                      background: disqualifyReason === preset ? 'var(--btn-outline-hover-bg)' : 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      color: 'var(--text-headlines)',
                      textAlign: 'left'
                    }}
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Disqualification Reason Textarea */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                DISQUALIFICATION REASON (SHOWN TO TEAM MEMBERS) *
              </label>
              <textarea
                rows={3}
                className="arch-input"
                placeholder="State the reason for disqualification (e.g., Code committed prior to hackathon start window, plagiarism detected, etc.)..."
                value={disqualifyReason}
                onChange={(e) => setDisqualifyReason(e.target.value)}
                style={{ width: '100%', resize: 'vertical', fontSize: '0.82rem', padding: '0.55rem' }}
                required
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDisqualifyingTeam(null)}
                disabled={updatingTeamId === disqualifyingTeam.id}
                className="btn-brutalist-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisqualify}
                disabled={updatingTeamId === disqualifyingTeam.id}
                className="btn-brutalist-primary"
                style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)', color: '#ffffff' }}
              >
                <Ban size={14} /> {updatingTeamId === disqualifyingTeam.id ? 'Disqualifying...' : 'Confirm Disqualification'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. RESTORE TEAM CONFIRMATION MODAL */}
      {restoringTeam && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 115, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="arch-card animate-fade-in" style={{ maxWidth: '500px', width: '100%', padding: '1.75rem', border: '2px solid var(--color-teal-primary)', boxShadow: 'var(--brutalist-shadow-lg)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--color-teal-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-teal-primary)', margin: 0 }}>
                    Restore Team: {restoringTeam.name}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                    Track: {restoringTeam.track}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setRestoringTeam(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: 'var(--text-headlines)', fontSize: '0.88rem', marginBottom: '1rem', lineHeight: '1.5' }}>
              Are you sure you want to <strong>restore team '{restoringTeam.name}'</strong> to active standing?
            </p>

            {restoringTeam.disqualificationReason && (
              <div style={{ backgroundColor: 'var(--code-box-bg)', border: '1px solid var(--border-color)', padding: '0.65rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <strong>Previous Disqualification Reason:</strong> {restoringTeam.disqualificationReason}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setRestoringTeam(null)}
                disabled={updatingTeamId === restoringTeam.id}
                className="btn-brutalist-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={updatingTeamId === restoringTeam.id}
                className="btn-brutalist-primary"
              >
                <RotateCcw size={14} /> {updatingTeamId === restoringTeam.id ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. ADD / EDIT MENTOR MODAL */}
      {showMentorModal && editingMentor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="arch-card animate-fade-in" style={{ maxWidth: '540px', width: '100%', padding: '1.75rem', boxShadow: 'var(--brutalist-shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="var(--color-teal-primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-headlines)', margin: 0 }}>
                  {editingMentor.id ? 'Edit Mentor Profile' : 'Add New Technical Mentor'}
                </h3>
              </div>
              <button 
                onClick={() => setShowMentorModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMentor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  MENTOR FULL NAME *
                </label>
                <input
                  type="text"
                  className="arch-input"
                  placeholder="e.g. Dr. Sarah Chen"
                  value={editingMentor.name}
                  onChange={(e) => setEditingMentor({ ...editingMentor, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  TITLE & SPECIALTY *
                </label>
                <input
                  type="text"
                  className="arch-input"
                  placeholder="e.g. AI / ML Architect • DeepMind Alum"
                  value={editingMentor.title}
                  onChange={(e) => setEditingMentor({ ...editingMentor, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                    AVAILABILITY STATUS *
                  </label>
                  <select
                    className="arch-input"
                    value={editingMentor.status}
                    onChange={(e) => setEditingMentor({ ...editingMentor, status: e.target.value, statusType: e.target.value.includes('Slot') ? 'slot' : 'available' })}
                  >
                    <option value="Available Now">Available Now</option>
                    <option value="Slot @ 14:00">Slot @ 14:00</option>
                    <option value="Slot @ 15:30">Slot @ 15:30</option>
                    <option value="Slot @ 17:00">Slot @ 17:00</option>
                    <option value="Offline / In Session">Offline / In Session</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                    SLOT TIME LABEL
                  </label>
                  <input
                    type="text"
                    className="arch-input"
                    placeholder="e.g. 15 mins (Immediate)"
                    value={editingMentor.slotTime || ''}
                    onChange={(e) => setEditingMentor({ ...editingMentor, slotTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-headlines)', marginBottom: '0.35rem', fontFamily: 'JetBrains Mono' }}>
                  EXPERTISE TAGS (COMMA SEPARATED)
                </label>
                <input
                  type="text"
                  className="arch-input"
                  placeholder="e.g. PyTorch, RAG, LangChain, FastAPI"
                  value={typeof editingMentor.skills === 'string' ? editingMentor.skills : (editingMentor.skills || []).join(', ')}
                  onChange={(e) => setEditingMentor({ ...editingMentor, skills: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowMentorModal(false)}
                  className="btn-brutalist-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMentor}
                  className="btn-brutalist-primary"
                >
                  <Save size={14} /> {savingMentor ? 'Saving...' : 'Save Mentor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

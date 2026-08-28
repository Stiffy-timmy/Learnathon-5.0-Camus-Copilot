const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const isFormData = options.body instanceof FormData;
  
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers,
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => ({}));
    } else {
      const text = await response.text().catch(() => '');
      data = { message: text || response.statusText };
    }
    
    if (!response.ok) {
      const errorMsg = data.detail || data.message || `HTTP ${response.status}: Request failed.`;
      throw new Error(errorMsg);
    }
    
    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err);
    throw err;
  }
}

export const authAPI = {
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  verifyEmail: (data) => request('/api/auth/verify-email', { method: 'POST', body: JSON.stringify(data) }),
  resendCode: (data) => request('/api/auth/resend-code', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  forgotPassword: (data) => request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  requestDeleteOtp: (data) => request('/api/auth/request-delete-otp', { method: 'POST', body: JSON.stringify(data) }),
  confirmDeleteAccount: (data) => request('/api/auth/confirm-delete-account', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/api/auth/me'),
  updateProfile: (data) => request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
};

export const ragAPI = {
  query: (queryText) => request('/api/rag/query', { method: 'POST', body: JSON.stringify({ query: queryText }) }),
  escalate: (queryText, details) => request('/api/rag/escalate', { method: 'POST', body: JSON.stringify({ query: queryText, details }) }),
  getKnowledge: () => request('/api/rag/knowledge'),
};

export const teamAPI = {
  getMyTeam: () => request('/api/teams/my-team'),
  listTeams: () => request('/api/teams'),
  createTeam: (data) => request('/api/teams/create', { method: 'POST', body: JSON.stringify(data) }),
  joinTeam: (data) => request('/api/teams/join', { method: 'POST', body: JSON.stringify(data) }),
  leaveTeam: () => request('/api/teams/leave', { method: 'POST' }),
  submitProject: (githubUrl) => request('/api/teams/submit', { method: 'POST', body: JSON.stringify({ githubUrl }) }),
  removeMember: (userId) => request('/api/teams/remove-member', { method: 'POST', body: JSON.stringify({ userId }) }),
  updateMatchmakingStatus: (data) => request('/api/teams/matchmaking-status', { method: 'PUT', body: JSON.stringify(data) }),
  getMatchmaking: () => request('/api/teams/matchmaking'),
};

export const notificationAPI = {
  getNotifications: () => request('/api/notifications'),
};

export const handbookAPI = {
  getQuickReference: () => request('/api/handbook/quick-reference'),
  getTracks: () => request('/api/handbook/tracks'),
};

export const timerAPI = {
  getTimer: () => request('/api/timer'),
  startTimer: () => request('/api/admin/timer/start', { method: 'POST' }),
  pauseTimer: () => request('/api/admin/timer/pause', { method: 'POST' }),
  stopTimer: () => request('/api/admin/timer/stop', { method: 'POST' }),
  resetTimer: () => request('/api/admin/timer/reset', { method: 'POST' }),
  updateTimer: (data) => request('/api/admin/timer/update', { method: 'POST', body: JSON.stringify(data) }),
};

export const adminAPI = {
  getAnnouncements: () => request('/api/announcements'),
  getEscalations: () => request('/api/admin/escalations'),
  resolveEscalation: (id, responseText, broadcastToAll = true) => request(`/api/admin/escalations/${id}/resolve`, { method: 'POST', body: JSON.stringify({ response: responseText, broadcastToAll }) }),
  rejectEscalation: (id, reason) => request(`/api/admin/escalations/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  deleteEscalation: (id) => request(`/api/admin/escalations/${id}`, { method: 'DELETE' }),
  batchDeleteEscalations: (escalationIds) => request('/api/admin/escalations/batch-delete', { method: 'POST', body: JSON.stringify({ escalationIds }) }),
  getHandbook: () => request('/api/admin/handbook'),
  updateHandbook: (content) => request('/api/admin/handbook', { method: 'POST', body: JSON.stringify({ content }) }),
  deleteTeam: (teamId) => request(`/api/admin/teams/${teamId}`, { method: 'DELETE' }),
  updateTeamStatus: (teamId, status) => request(`/api/admin/teams/${teamId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  disqualifyTeam: (teamId, disqualified, reason) => request(`/api/admin/teams/${teamId}/disqualify`, { method: 'PATCH', body: JSON.stringify({ disqualified, reason }) }),
  broadcastAnnouncement: (data) => {
    if (data instanceof FormData) {
      return request('/api/admin/announcements', { method: 'POST', body: data });
    }
    return request('/api/admin/announcements', { method: 'POST', body: JSON.stringify(data) });
  },
  getMetrics: () => request('/api/admin/metrics'),
  getTimer: () => request('/api/timer'),
  startTimer: () => request('/api/admin/timer/start', { method: 'POST' }),
  pauseTimer: () => request('/api/admin/timer/pause', { method: 'POST' }),
  stopTimer: () => request('/api/admin/timer/stop', { method: 'POST' }),
  resetTimer: () => request('/api/admin/timer/reset', { method: 'POST' }),
  updateTimer: (data) => request('/api/admin/timer/update', { method: 'POST', body: JSON.stringify(data) }),
  
  // Participant & User Directory Management
  getUsers: () => request('/api/admin/users'),
  deleteUser: (userId) => request(`/api/admin/users/${userId}`, { method: 'DELETE' }),
  batchDeleteUsers: (userIds) => request('/api/admin/users/batch-delete', { method: 'POST', body: JSON.stringify({ userIds }) }),

  // Database Telemetry & Health Status
  getDatabaseStatus: () => request('/api/admin/database/status'),
  
  // Submission Audits
  getSubmissionAudits: () => request('/api/admin/submissions/audits'),
  
  // Batch Certificates
  batchGenerateCertificates: () => request('/api/admin/certificates/batch-generate', { method: 'POST' }),
  
  // Milestone Trigger
  triggerMilestone: (data) => request('/api/admin/telemetry/trigger-milestone', { method: 'POST', body: JSON.stringify(data) }),

  // Excel (.xlsx) & PDF Reports Download
  downloadExcelReport: async () => {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/api/admin/export/excel`, { headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to export Excel report' }));
      throw new Error(err.detail || 'Failed to export Excel report');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GIETU_Hackathon_2026_Master_Report_${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },
  
  downloadPdfReport: async () => {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/api/admin/export/pdf`, { headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to export PDF report' }));
      throw new Error(err.detail || 'Failed to export PDF report');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GIETU_Hackathon_2026_Master_Report_${new Date().toISOString().slice(0,10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
};

export const certificateAPI = {
  getMyCertificate: () => request('/api/certificates/my-certificate'),
  generateCertificate: () => request('/api/certificates/generate', { method: 'POST' }),
  verifyCertificate: (certId) => request(`/api/certificates/verify/${certId}`),
  getConfig: () => request('/api/certificates/config'),
  updateConfig: (data) => request('/api/admin/certificates/config', { method: 'PUT', body: JSON.stringify(data) }),
  downloadPdf: async (certId, recipientName = 'Participant') => {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/api/certificates/download/${certId}`, { headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to download certificate PDF' }));
      throw new Error(err.detail || 'Failed to download certificate PDF');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificate_${recipientName.replace(/\s+/g, '_')}_${certId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
};

export const telemetryAPI = {
  getTimeline: () => request('/api/telemetry/timeline'),
};

export const auditAPI = {
  auditSubmission: (data) => request('/api/teams/audit-submission', { method: 'POST', body: JSON.stringify(data) }),
  getAuditStatus: () => request('/api/teams/audit-status'),
};

export const logisticsAPI = {
  getResources: () => request('/api/logistics/resources'),
  claimKey: (keyId) => request('/api/logistics/claim-key', { method: 'POST', body: JSON.stringify({ keyId }) }),
  bookMentor: (data) => request('/api/logistics/book-mentor', { method: 'POST', body: JSON.stringify(data) }),
  bookMentorSession: (data) => request('/api/logistics/book-mentor-session', { method: 'POST', body: JSON.stringify(data) }),
  submitResourceRequest: (data) => request('/api/logistics/resource-requests', { method: 'POST', body: JSON.stringify(data) }),
  getAdminResourceRequests: () => request('/api/admin/logistics/resource-requests'),
  updateResourceRequest: (reqId, data) => request(`/api/admin/logistics/resource-requests/${reqId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getAdminMentors: () => request('/api/admin/logistics/mentors'),
  saveAdminMentor: (data) => request('/api/admin/logistics/mentors', { method: 'POST', body: JSON.stringify(data) }),
  deleteAdminMentor: (mentorId) => request(`/api/admin/logistics/mentors/${mentorId}`, { method: 'DELETE' }),
  requestHardware: (data) => request('/api/logistics/request-hardware', { method: 'POST', body: JSON.stringify(data) }),
};



import React, { useState, useEffect } from 'react';
import { logisticsAPI, ragAPI } from '../api/client';
import { 
  Users, Cpu, ShieldAlert, Send, Clock, CheckCircle2, 
  Sparkles, Check, RefreshCw, X, AlertTriangle, Key, Layers
} from 'lucide-react';

export const LogisticsHubWidget = ({ user, team, onEscalationSubmitted }) => {
  const [activeTab, setActiveTab] = useState('mentors'); // 'mentors' | 'resources' | 'escalation'
  const [logisticsData, setLogisticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mentor Booking State
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [mentorTopic, setMentorTopic] = useState('');
  const [bookingMentor, setBookingMentor] = useState(false);
  const [mentorSuccess, setMentorSuccess] = useState('');

  // Resource Request State
  const [resCategory, setResCategory] = useState('Hardware Component (Arduino/Raspberry Pi/Sensors)');
  const [resItem, setResItem] = useState('');
  const [resReason, setResReason] = useState('');
  const [submittingRes, setSubmittingRes] = useState(false);
  const [resSuccess, setResSuccess] = useState('');

  // Escalation State
  const [escalationQuery, setEscalationQuery] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [escalationResult, setEscalationResult] = useState(null);
  const [escalationError, setEscalationError] = useState('');

  const fetchLogistics = async () => {
    try {
      setLoading(true);
      const data = await logisticsAPI.getResources();
      setLogisticsData(data);
    } catch (err) {
      console.error("Failed to load logistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogistics();
  }, [user, team]);

  const handleSelectMentorForBooking = (mentor) => {
    setSelectedMentor(mentor);
    setMentorTopic('');
    setMentorSuccess('');
  };

  const handleConfirmMentorBooking = async (e) => {
    e.preventDefault();
    if (!selectedMentor) return;
    setBookingMentor(true);
    setMentorSuccess('');
    try {
      const res = await logisticsAPI.bookMentorSession({
        mentorId: selectedMentor.id,
        mentorName: selectedMentor.name,
        slot: selectedMentor.slotTime || selectedMentor.status,
        topic: mentorTopic.trim() || 'Architecture and code debugging session'
      });
      setMentorSuccess(res.message || `Mentor session confirmed with ${selectedMentor.name}!`);
      setSelectedMentor(null);
      setMentorTopic('');
      await fetchLogistics();
      setTimeout(() => setMentorSuccess(''), 6000);
    } catch (err) {
      alert("Failed to book mentor: " + err.message);
    } finally {
      setBookingMentor(false);
    }
  };

  const handleSubmitResourceRequest = async (e) => {
    e.preventDefault();
    if (!resItem.trim() || !resReason.trim()) return;
    setSubmittingRes(true);
    setResSuccess('');
    try {
      const isHw = resCategory.includes('Hardware');
      const res = await logisticsAPI.submitResourceRequest({
        category: isHw ? 'HARDWARE' : 'API_KEY',
        item: resItem.trim(),
        reason: resReason.trim()
      });
      setResSuccess(res.message || "Resource request submitted to organizers!");
      setResItem('');
      setResReason('');
      await fetchLogistics();
      setTimeout(() => setResSuccess(''), 6000);
    } catch (err) {
      alert("Failed to submit resource request: " + err.message);
    } finally {
      setSubmittingRes(false);
    }
  };

  const handleEscalateTicket = async (e) => {
    e.preventDefault();
    if (!escalationQuery.trim()) return;
    setEscalating(true);
    setEscalationError('');
    setEscalationResult(null);
    try {
      const res = await ragAPI.escalate(escalationQuery.trim(), {
        userEmail: user?.email || 'participant@hackathon.com'
      });
      setEscalationResult(res);
      setEscalationQuery('');
      if (onEscalationSubmitted) onEscalationSubmitted(res);
      setTimeout(() => setEscalationResult(null), 8000);
    } catch (err) {
      setEscalationError(err.message || "Failed to escalate ticket.");
    } finally {
      setEscalating(false);
    }
  };

  const mentors = logisticsData?.mentors || [
    {
      id: "mentor_1",
      name: "Dr. Sarah Chen",
      title: "AI / ML Architect • DeepMind Alum",
      status: "Available Now",
      statusType: "available",
      slotTime: "15 mins (Immediate)",
      skills: ["PyTorch", "RAG", "LangChain", "FastAPI"]
    },
    {
      id: "mentor_2",
      name: "Alex Rivera",
      title: "Full-Stack Tech Lead • Vercel Ecosystem",
      status: "Slot @ 14:00",
      statusType: "slot",
      slotTime: "Slot @ 14:00",
      skills: ["React 19", "Next.js", "Solidity", "Tailwind"]
    },
    {
      id: "mentor_3",
      name: "Elena Rostova",
      title: "Hardware & IoT Specialist • Robotics Lab Lead",
      status: "Available Now",
      statusType: "available",
      slotTime: "15 mins (Immediate)",
      skills: ["Raspberry Pi", "Arduino", "Sensors", "MQTT"]
    },
    {
      id: "mentor_4",
      name: "Marcus Vance",
      title: "Cloud & DevOps Architect • AWS Community Hero",
      status: "Slot @ 15:30",
      statusType: "slot",
      slotTime: "Slot @ 15:30",
      skills: ["Docker", "Kubernetes", "AWS", "CI/CD"]
    }
  ];

  const myBookings = logisticsData?.myMentorBookings || [
    {
      id: "mb_1",
      mentorName: "Alex Rivera",
      displayText: "Alex Rivera (15 mins (Immediate)) — sdfghj",
      status: "CONFIRMED"
    },
    {
      id: "mb_2",
      mentorName: "Dr. Sarah Chen",
      displayText: "Dr. Sarah Chen (Slot @ 14:00) — learnathon",
      status: "CONFIRMED"
    }
  ];

  const myRequests = logisticsData?.myResourceRequests || [
    {
      id: "req_1",
      displayText: "[HARDWARE] esp32 — for project",
      status: "PENDING"
    },
    {
      id: "req_2",
      displayText: "[API_KEY] rasberry pi — for projecct",
      status: "PENDING"
    }
  ];

  return (
    <div
      className="logistics-hub-widget"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.5rem 1.75rem',
        marginTop: '1.5rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      {/* Top Header matching Photos 2, 4, 5 */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f3a47' }}>
          Logistics, Mentor Booking & Operational Hub
        </h3>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
          Book 1-on-1 mentor sessions, request hardware/API keys, or escalate urgent blockers.
        </p>
      </div>

      {/* 3 Interactive Tab Buttons */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('mentors')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: activeTab === 'mentors' ? 'none' : '1px solid #e2e8f0',
            backgroundColor: activeTab === 'mentors' ? '#2b6777' : '#f8fafc',
            color: activeTab === 'mentors' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Users size={15} />
          Book Mentor
        </button>

        <button
          onClick={() => setActiveTab('resources')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: activeTab === 'resources' ? 'none' : '1px solid #e2e8f0',
            backgroundColor: activeTab === 'resources' ? '#2b6777' : '#f8fafc',
            color: activeTab === 'resources' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Cpu size={15} />
          Hardware & API Keys
        </button>

        <button
          onClick={() => setActiveTab('escalation')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: activeTab === 'escalation' ? 'none' : '1px solid #e2e8f0',
            backgroundColor: activeTab === 'escalation' ? '#2b6777' : '#f8fafc',
            color: activeTab === 'escalation' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <ShieldAlert size={15} />
          Urgent Escalation
        </button>
      </div>

      {/* =========================================================================
          TAB 1: BOOK MENTOR (Reference Photo 4)
          ========================================================================= */}
      {activeTab === 'mentors' && (
        <div>
          {mentorSuccess && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1rem' }}>
              ✓ {mentorSuccess}
            </div>
          )}

          {/* Mentor Cards Grid matching Photo 4 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
              marginBottom: '1.75rem'
            }}
          >
            {mentors.map((m) => {
              const isSlot = m.statusType === 'slot' || m.status.includes('Slot');
              const isSelected = selectedMentor?.id === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => handleSelectMentorForBooking(m)}
                  style={{
                    backgroundColor: isSelected ? '#f0fdfa' : '#f8fafc',
                    border: `1px solid ${isSelected ? '#0d9488' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 0 2px rgba(13, 148, 136, 0.2)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f3a47' }}>
                      {m.name}
                    </h4>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        backgroundColor: isSlot ? '#f0fdfa' : '#ecfdf5',
                        color: isSlot ? '#0d9488' : '#059669',
                        border: `1px solid ${isSlot ? '#ccfbf1' : '#a7f3d0'}`
                      }}
                    >
                      {m.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    {m.title}
                  </div>

                  {/* Expertise Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {m.skills?.map((sk, sidx) => (
                      <span
                        key={sidx}
                        style={{
                          fontSize: '0.68rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          color: '#475569',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Booking Modal / Drawer inline */}
          {selectedMentor && (
            <form onSubmit={handleConfirmMentorBooking} style={{ padding: '1rem', backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f3a47' }}>
                  Request Booking with {selectedMentor.name} ({selectedMentor.slotTime || selectedMentor.status})
                </div>
                <button type="button" onClick={() => setSelectedMentor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Describe your question or technical blocker (e.g. Debugging PyTorch tensors, LangChain memory)..."
                  value={mentorTopic}
                  onChange={(e) => setMentorTopic(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedMentor(null)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingMentor}
                  style={{
                    padding: '0.45rem 1.15rem',
                    backgroundColor: '#2b6777',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: bookingMentor ? 'not-allowed' : 'pointer'
                  }}
                >
                  {bookingMentor ? 'Booking...' : 'Confirm Mentor Request'}
                </button>
              </div>
            </form>
          )}

          {/* Active Mentor Bookings Section matching Photo 4 */}
          <div>
            <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.88rem', fontWeight: 800, color: '#0f3a47' }}>
              Your Active Mentor Bookings
            </h4>

            {myBookings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {myBookings.map((b, idx) => (
                  <div
                    key={b.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 1rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ color: '#1e293b', fontWeight: 600 }}>
                      {b.displayText || `${b.mentorName || 'Mentor'} — ${b.topic || 'Review session'}`}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', letterSpacing: '0.04em' }}>
                      {b.status || 'CONFIRMED'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                No active mentor bookings. Click any mentor card above to schedule a session.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: HARDWARE & API KEYS (Reference Photo 5)
          ========================================================================= */}
      {activeTab === 'resources' && (
        <div>
          {/* Request Form Box */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.75rem'
            }}
          >
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#0f3a47' }}>
              Request Hardware Component or API Key Grant
            </h4>

            {resSuccess && (
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#16a34a', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
                ✓ {resSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitResourceRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Resource Category
                  </label>
                  <select
                    value={resCategory}
                    onChange={(e) => setResCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      color: '#0f172a'
                    }}
                  >
                    <option value="Hardware Component (Arduino/Raspberry Pi/Sensors)">Hardware Component (Arduino/Raspberry Pi/Sensors)</option>
                    <option value="API Key Grant (Groq / Gemini / OpenAI / Postgres)">API Key Grant (Groq / Gemini / OpenAI / Postgres)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Item / API Key Requested
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Groq Llama-3.3 70B Key or Raspberry Pi 4 Kit"
                    value={resItem}
                    onChange={(e) => setResItem(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Reason & Project Requirement
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this resource is required for your project prototype..."
                  value={resReason}
                  onChange={(e) => setResReason(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.6rem 0.75rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: '#0f172a',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submittingRes}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.6rem 1.25rem',
                    backgroundColor: '#2b6777',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: submittingRes ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Send size={14} />
                  {submittingRes ? 'Submitting...' : 'Submit Request to Organizers'}
                </button>
              </div>
            </form>
          </div>

          {/* Your Submitted Resource Requests Section matching Photo 5 */}
          <div>
            <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.88rem', fontWeight: 800, color: '#0f3a47' }}>
              Your Submitted Resource Requests
            </h4>

            {myRequests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {myRequests.map((r, idx) => (
                  <div
                    key={r.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 1rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ color: '#1e293b', fontWeight: 600 }}>
                      {r.displayText || `[${r.category || 'RESOURCE'}] ${r.item || 'Item'} — ${r.reason || 'Reason'}`}
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        backgroundColor: r.status === 'APPROVED' ? '#ecfdf5' : r.status === 'REJECTED' ? '#fef2f2' : '#fef3c7',
                        color: r.status === 'APPROVED' ? '#059669' : r.status === 'REJECTED' ? '#dc2626' : '#d97706'
                      }}
                    >
                      {r.status || 'PENDING'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                No resource requests submitted yet. Use the form above to request hardware or extra API keys.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: URGENT ESCALATION (Reference Photo 2)
          ========================================================================= */}
      {activeTab === 'escalation' && (
        <div>
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem'
            }}
          >
            {/* Header matching Photo 2 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Sparkles size={16} color="#2b6777" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f3a47' }}>
                Submit Priority Inquiry with AI Urgency Scoring
              </h4>
            </div>

            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.45 }}>
              The system automatically calculates an <strong>Urgency Score (1–100)</strong> based on inquiry severity (e.g. submission errors, hardware issues) to prioritize organizer response.
            </p>

            {escalationResult && (
              <div style={{ padding: '0.85rem 1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem' }}>
                <div style={{ color: '#16a34a', fontWeight: 800, marginBottom: '0.2rem' }}>
                  ✓ Blocker Escalated Successfully (Ticket ID: #{escalationResult.ticketId || escalationResult.escalation?.id || 'ESC'})
                </div>
                <div style={{ color: '#1e293b' }}>
                  Computed AI Urgency: <strong>{escalationResult.urgencyLevel || 'HIGH'} ({escalationResult.urgencyScore || 85}/100)</strong>. Organizers have been alerted in real-time.
                </div>
              </div>
            )}

            {escalationError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.8rem', marginBottom: '1rem' }}>
                ✕ {escalationError}
              </div>
            )}

            <form onSubmit={handleEscalateTicket}>
              <div style={{ marginBottom: '1rem' }}>
                <textarea
                  rows={4}
                  placeholder="Describe your blocker or urgent question in detail..."
                  value={escalationQuery}
                  onChange={(e) => setEscalationQuery(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.75rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: '#0f172a',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={escalating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1.35rem',
                  backgroundColor: '#2b6777',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: escalating ? 'not-allowed' : 'pointer'
                }}
              >
                <Send size={14} />
                {escalating ? 'Analyzing Urgency & Escalating...' : 'Escalate Ticket to Organizers'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

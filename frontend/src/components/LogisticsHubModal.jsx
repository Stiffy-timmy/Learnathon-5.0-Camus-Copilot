import React, { useState, useEffect } from 'react';
import { logisticsAPI } from '../api/client';
import { 
  Key, Users, Cpu, Copy, Check, CheckCircle2, Clock, 
  X, ExternalLink, Sparkles, MapPin, AlertCircle, RefreshCw
} from 'lucide-react';

export const LogisticsHubModal = ({ isOpen, onClose, user, team }) => {
  const [activeTab, setActiveTab] = useState('keys'); // 'keys' | 'mentors' | 'hardware'
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState('');
  const [claimingKeyId, setClaimingKeyId] = useState('');

  // Mentor Booking State
  const [mentorTrack, setMentorTrack] = useState(team?.track || 'Track 1: AI & Autonomous Agents');
  const [mentorTopic, setMentorTopic] = useState('');
  const [bookingMentor, setBookingMentor] = useState(false);
  const [mentorBookingSuccess, setMentorBookingSuccess] = useState('');

  // Hardware Request State
  const [hwItemId, setHwItemId] = useState('hw_esp32');
  const [hwQuantity, setHwQuantity] = useState(1);
  const [requestingHw, setRequestingHw] = useState(false);
  const [hwSuccess, setHwSuccess] = useState('');

  const fetchResources = async () => {
    setLoading(true);
    try {
      const data = await logisticsAPI.getResources();
      setResources(data);
    } catch (err) {
      console.error("Logistics error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchResources();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClaimKey = async (keyId) => {
    setClaimingKeyId(keyId);
    try {
      const res = await logisticsAPI.claimKey(keyId);
      if (res?.accessKey) {
        navigator.clipboard.writeText(res.accessKey);
        setCopiedKeyId(keyId);
        setTimeout(() => setCopiedKeyId(''), 3500);
        fetchResources();
      }
    } catch (err) {
      alert("Failed to claim key: " + err.message);
    } finally {
      setClaimingKeyId('');
    }
  };

  const handleBookMentor = async (e) => {
    e.preventDefault();
    if (!mentorTopic.trim()) return;
    setBookingMentor(true);
    setMentorBookingSuccess('');
    try {
      const res = await logisticsAPI.bookMentor({
        track: mentorTrack,
        topic: mentorTopic.trim()
      });
      setMentorBookingSuccess(res.message || "Mentor request registered!");
      setMentorTopic('');
      fetchResources();
      setTimeout(() => setMentorBookingSuccess(''), 5000);
    } catch (err) {
      alert("Failed to book mentor: " + err.message);
    } finally {
      setBookingMentor(false);
    }
  };

  const handleRequestHardware = async (e) => {
    e.preventDefault();
    setRequestingHw(true);
    setHwSuccess('');
    try {
      const res = await logisticsAPI.requestHardware({
        itemId: hwItemId,
        quantity: parseInt(hwQuantity, 10) || 1
      });
      setHwSuccess(res.message || "Hardware checkout approved!");
      fetchResources();
      setTimeout(() => setHwSuccess(''), 5000);
    } catch (err) {
      alert("Failed to request hardware: " + err.message);
    } finally {
      setRequestingHw(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div 
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(15, 23, 42, 0.8)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8'
              }}
            >
              <Cpu size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                Operational Logistics & Resource Hub
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                Sponsor API credits, Mentor Office Hours queue, and Hardware checkout.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '0 1.5rem', backgroundColor: '#090d16' }}>
          <button
            onClick={() => setActiveTab('keys')}
            style={{
              padding: '0.85rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'keys' ? '2px solid #6366f1' : '2px solid transparent',
              color: activeTab === 'keys' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Key size={16} color={activeTab === 'keys' ? '#6366f1' : '#94a3b8'} />
            Sponsor API Keys & Credits
          </button>

          <button
            onClick={() => setActiveTab('mentors')}
            style={{
              padding: '0.85rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'mentors' ? '2px solid #06b6d4' : '2px solid transparent',
              color: activeTab === 'mentors' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Users size={16} color={activeTab === 'mentors' ? '#06b6d4' : '#94a3b8'} />
            Mentor Office Hours
          </button>

          <button
            onClick={() => setActiveTab('hardware')}
            style={{
              padding: '0.85rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'hardware' ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === 'hardware' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Cpu size={16} color={activeTab === 'hardware' ? '#f59e0b' : '#94a3b8'} />
            Hardware Desk Inventory
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <RefreshCw size={24} className="spin-animation" style={{ marginBottom: '0.5rem' }} />
              <div>Loading operational resources...</div>
            </div>
          ) : activeTab === 'keys' ? (
            /* API Keys Tab */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.85rem' }}>
                {resources?.apiKeys?.map((k) => {
                  const isClaimed = k.isClaimedByYou;
                  const isCopied = copiedKeyId === k.id;
                  const isClaiming = claimingKeyId === k.id;

                  return (
                    <div 
                      key={k.id}
                      style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
                          {k.provider}
                        </div>
                        <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                          {k.quota}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.85rem', lineHeight: 1.4 }}>
                        {k.description}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {k.claimedCount} teams claimed
                        </span>

                        <button
                          onClick={() => handleClaimKey(k.id)}
                          disabled={isClaiming}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.85rem',
                            backgroundColor: isCopied ? '#10b981' : isClaimed ? 'rgba(99, 102, 241, 0.25)' : '#6366f1',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          {isCopied ? 'Key Copied!' : isClaimed ? 'Copy Key Again' : isClaiming ? 'Claiming...' : 'Claim & Copy Key'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'mentors' ? (
            /* Mentor Booking Tab */
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ color: '#ffffff', margin: '0 0 0.4rem 0', fontSize: '0.95rem' }}>
                  Request 1-on-1 Architecture & Debugging Review
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                  Senior technical mentors in AI, Full-Stack, Web3, and Hardware are available in Lounge B and via Discord voice channels.
                </p>
              </div>

              {mentorBookingSuccess && (
                <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', color: '#10b981', fontSize: '0.82rem', marginBottom: '1rem', fontWeight: 600 }}>
                  ✓ {mentorBookingSuccess}
                </div>
              )}

              <form onSubmit={handleBookMentor} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: '580px', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.3rem', fontFamily: 'JetBrains Mono, monospace' }}>
                    TRACK / SPECIALTY DOMAIN
                  </label>
                  <select
                    value={mentorTrack}
                    onChange={(e) => setMentorTrack(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.82rem'
                    }}
                  >
                    <option value="Track 1: AI & Autonomous Agents">Track 1: AI & Autonomous Agents (LLMs, RAG, Memory)</option>
                    <option value="Track 2: Web3, Fintech & Decentralized Apps">Track 2: Web3, Fintech & Smart Contracts</option>
                    <option value="Track 3: Healthcare & MedTech">Track 3: Healthcare & MedTech</option>
                    <option value="Track 4: Open Innovation & Smart Campus">Track 4: Open Innovation & IoT / Hardware</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.3rem', fontFamily: 'JetBrains Mono, monospace' }}>
                    TOPIC OR QUESTION SUMMARY *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Debugging LangChain token memory, or WebSockets sync issue"
                    value={mentorTopic}
                    onChange={(e) => setMentorTopic(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.55rem 0.75rem',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingMentor || !mentorTopic.trim()}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '0.6rem 1.25rem',
                    backgroundColor: '#06b6d4',
                    color: '#090d16',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: bookingMentor || !mentorTopic.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {bookingMentor ? 'Registering...' : 'Submit Mentor Request'}
                </button>
              </form>

              {/* Active Bookings List */}
              {resources?.myMentorBookings?.length > 0 && (
                <div>
                  <h5 style={{ color: '#ffffff', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>Your Active Mentor Bookings</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {resources.myMentorBookings.map((b) => (
                      <div key={b.id} style={{ padding: '0.65rem 0.85rem', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontWeight: 700 }}>
                          <span>#{b.id} • {b.track}</span>
                          <span style={{ color: '#10b981' }}>{b.status.toUpperCase()}</span>
                        </div>
                        <div style={{ color: '#cbd5e1', marginTop: '0.2rem' }}>{b.topic}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                          Assigned: {b.assignedMentor} • Location: {b.location}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Hardware Tab */
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ color: '#ffffff', margin: '0 0 0.4rem 0', fontSize: '0.95rem' }}>
                  Hardware Desk Component Checkout
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                  Pick up microcontrollers, VR headsets, and sensor peripherals from Hardware Desk A & B.
                </p>
              </div>

              {hwSuccess && (
                <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', color: '#10b981', fontSize: '0.82rem', marginBottom: '1rem', fontWeight: 600 }}>
                  ✓ {hwSuccess}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {resources?.hardwareInventory?.map((h) => (
                  <div key={h.id} style={{ padding: '0.85rem', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.2rem' }}>
                      {h.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Category: {h.category}</span>
                      <span style={{ color: h.available > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                        {h.available} of {h.total} available
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#38bdf8' }}>
                      📍 {h.location}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleRequestHardware} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.3rem', fontFamily: 'JetBrains Mono, monospace' }}>
                    SELECT HARDWARE COMPONENT
                  </label>
                  <select
                    value={hwItemId}
                    onChange={(e) => setHwItemId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.82rem'
                    }}
                  >
                    {resources?.hardwareInventory?.map((h) => (
                      <option key={h.id} value={h.id} disabled={h.available === 0}>
                        {h.name} ({h.available} available)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ width: '90px' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.3rem', fontFamily: 'JetBrains Mono, monospace' }}>
                    QUANTITY
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={hwQuantity}
                    onChange={(e) => setHwQuantity(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.55rem 0.75rem',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={requestingHw}
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: '#f59e0b',
                    color: '#090d16',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: requestingHw ? 'not-allowed' : 'pointer'
                  }}
                >
                  {requestingHw ? 'Processing...' : 'Reserve for Pickup'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

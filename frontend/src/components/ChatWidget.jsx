import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, ShieldAlert, Terminal } from 'lucide-react';
import { ragAPI } from '../api/client';

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'init_01',
      sender: 'bot',
      text: "👋 Hi! I'm your **Campus Copilot AI**. Ask me anything about the schedule, meal times, Wi-Fi, tracks, rules, or submission requirements!",
      canEscalate: false
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [escalatingId, setEscalatingId] = useState(null);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    "What are the meal times?",
    "What is the Wi-Fi password?",
    "When is the submission deadline?",
    "What are the tracks?",
    "Can I participate solo?",
    "How are projects scored?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText) => {
    const q = queryText || inputQuery;
    if (!q.trim() || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: q.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoading(true);

    try {
      const res = await ragAPI.query(q.trim());
      
      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.answer,
        canEscalate: res.canEscalate || false,
        originalQuery: q.trim()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error("RAG Query error:", err);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: "Sorry, I encountered a temporary connection issue. Please try again or visit Help Desk B.",
        canEscalate: true,
        originalQuery: q.trim()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async (msgId, originalQuery) => {
    setEscalatingId(msgId);
    try {
      const res = await ragAPI.escalate(originalQuery || "Participant requested organizer assistance");
      
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, canEscalate: false, escalated: true } : m));
      
      const confirmMsg = {
        id: (Date.now() + 2).toString(),
        sender: 'bot',
        text: res.answer || `✅ Ticket #${res.escalationId} has been created for event organizers! Staff will assist you shortly.`
      };
      setMessages(prev => [...prev, confirmMsg]);
    } catch (err) {
      console.error("Escalation error:", err);
    } finally {
      setEscalatingId(null);
    }
  };

  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx} style={{ color: 'var(--text-headlines)', fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={idx} style={{ background: 'var(--code-box-bg)', padding: '0.1rem 0.35rem', border: '1px solid var(--border-color)', color: 'var(--color-aqua-teal)', fontSize: '0.8rem' }}>{part.slice(1, -1)}</code>;
        }
        return part;
      });

      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return (
          <div key={i} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem', paddingLeft: '0.2rem' }}>
            <span style={{ color: 'var(--color-aqua-teal)', fontWeight: 'bold' }}>•</span>
            <div>{formattedLine.slice(1)}</div>
          </div>
        );
      }

      if (line.trim() === '') {
        return <div key={i} style={{ height: '0.45rem' }} />;
      }

      return <div key={i} style={{ marginTop: i > 0 ? '0.25rem' : 0 }}>{formattedLine}</div>;
    });
  };

  return (
    <>
      {/* Floating Toggle Trigger Button (Rendered only when chat is closed) */}
      {!isOpen && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 30 }} className="chat-trigger-wrapper">
          <button
            onClick={() => setIsOpen(true)}
            className="copilot-float-btn"
            title="Open Campus Copilot AI Concierge"
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Terminal size={18} />
              <span className="pulse-dot" style={{ position: 'absolute', top: -3, right: -3 }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.02em' }}>
              CampusCopilot AI
            </span>
          </button>
        </div>
      )}

      {/* When Chat is Open: ISOLATED Backdrop (z-40) + ISOLATED Modal Container (z-50) */}
      {isOpen && (
        <>
          {/* Backdrop Overlay (Strictly z-40, no blur, solid 45% black) */}
          <div 
            className="chat-backdrop"
            onClick={() => setIsOpen(false)}
            title="Click to dismiss chat"
          />

          {/* Chat Modal Drawer (Strictly z-50, 100% solid opacity, no blur) */}
          <div className="arch-card chat-drawer-container animate-fade-in">
            
            {/* Header */}
            <div style={{ 
              padding: '0.9rem 1.15rem', 
              backgroundColor: 'var(--editorial-bg)', 
              color: '#ffffff',
              borderBottom: '1px solid var(--border-color)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  backgroundColor: 'var(--color-aqua-teal)', 
                  color: '#0f1d21',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(0,0,0,0.2)'
                }}>
                  <Terminal size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem', letterSpacing: '0.01em' }}>
                    CampusCopilot AI <Sparkles size={14} color="var(--color-slate-blue)" />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-slate-blue)' }}>Live Handbook & Operations Assistant</div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Close Chat"
              >
                <X size={19} />
              </button>
            </div>

            {/* Messages Body */}
            <div style={{ 
              flex: 1, 
              padding: '1rem', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.85rem', 
              backgroundColor: 'var(--bg-page)',
              opacity: 1,
              filter: 'none'
            }}>
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    opacity: 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', maxWidth: '92%' }}>
                    {msg.sender === 'bot' && (
                      <div style={{ 
                        width: '28px', 
                        height: '28px', 
                        backgroundColor: 'var(--color-teal-primary)', 
                        color: '#ffffff',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        marginTop: '2px', 
                        flexShrink: 0 
                      }}>
                        <Bot size={15} />
                      </div>
                    )}

                    <div 
                      style={{ 
                        padding: '0.75rem 1rem', 
                        backgroundColor: msg.sender === 'user' 
                          ? 'var(--btn-primary-bg)' 
                          : 'var(--bg-card)',
                        color: msg.sender === 'user' ? 'var(--btn-primary-text)' : 'var(--text-headlines)',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--brutalist-shadow-sm)',
                        fontSize: '0.86rem',
                        lineHeight: '1.5',
                        opacity: 1,
                        filter: 'none'
                      }}
                    >
                      {renderFormattedText(msg.text)}

                      {/* Interactive Escalate Option if Bot is unsure */}
                      {msg.canEscalate && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)' }}>
                          <button
                            onClick={() => handleEscalate(msg.id, msg.originalQuery)}
                            disabled={escalatingId === msg.id}
                            className="btn-brutalist-primary"
                            style={{
                              width: '100%',
                              fontSize: '0.76rem',
                              padding: '0.45rem 0.75rem',
                              backgroundColor: 'var(--color-aqua-teal)',
                              color: '#0f1d21',
                              fontWeight: 800
                            }}
                          >
                            <ShieldAlert size={14} />
                            {escalatingId === msg.id ? "Connecting to Organizers..." : "🎫 Yes, Escalate to Event Organizers"}
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.sender === 'user' && (
                      <div style={{ 
                        width: '28px', 
                        height: '28px', 
                        backgroundColor: 'var(--color-aqua-teal)', 
                        color: '#0f1d21',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        marginTop: '2px', 
                        flexShrink: 0 
                      }}>
                        <User size={15} />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', paddingLeft: '2rem' }}>
                  <Bot size={15} color="var(--color-aqua-teal)" />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>Querying live handbook RAG...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div style={{ 
              padding: '0.45rem 0.75rem', 
              borderTop: '1px solid var(--border-color)', 
              backgroundColor: 'var(--bg-card)', 
              display: 'flex', 
              gap: '0.35rem', 
              overflowX: 'auto',
              flexShrink: 0
            }}>
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="pill-badge pill-badge-tech"
                  style={{
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    fontSize: '0.68rem',
                    padding: '0.25rem 0.55rem'
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              style={{ 
                padding: '0.75rem', 
                borderTop: '1px solid var(--border-color)', 
                display: 'flex', 
                gap: '0.45rem', 
                backgroundColor: 'var(--bg-card)',
                flexShrink: 0
              }}
            >
              <input
                type="text"
                className="arch-input"
                placeholder="Ask anything (e.g. meal time, wifi, tracks)..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                style={{ fontSize: '0.85rem', padding: '0.55rem 0.75rem' }}
              />
              <button 
                type="submit" 
                className="btn-brutalist-primary"
                disabled={loading || !inputQuery.trim()}
                style={{ padding: '0.55rem 0.95rem' }}
              >
                <Send size={15} />
              </button>
            </form>

          </div>
        </>
      )}
    </>
  );
};

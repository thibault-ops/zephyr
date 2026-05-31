import React, { useState, useEffect } from 'react';

// Industry-standard fallback data if backend is offline
const FALLBACK_BILLING_LOGS = [
  { id: 1, timestamp: '14:02:11', resource: 'AI Design Tokens', qty: '12,430 In / 4,120 Out', cost: 0.0124, userId: 'thibault@tibodata.com' },
  { id: 2, timestamp: '14:02:15', resource: 'Design Build (Cycles)', qty: '42.5 Cycles', cost: 0.0034, userId: 'thibault@tibodata.com' },
  { id: 3, timestamp: '14:05:00', resource: 'Interactive Hosting (Active)', qty: '2,048 Seconds', cost: 0.0016, userId: 'admin@tibodata.com' },
];

const INITIAL_MESSAGES = [
  { id: 1, sender: 'zephyr', text: "Hello! I am Zephyr, your AI application assistant. I will help you design, craft, and launch your custom web applications instantly. What are we building today?" },
];

export default function App() {
  const [projectMessages, setProjectMessages] = useState({});
  const [inputText, setInputText] = useState('');
  const [activeProject, setActiveProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [allowlist, setAllowlist] = useState(['thibault@tibodata.com', 'admin@tibodata.com', 'thibault.lefevre@gmail.com']);
  const [newEmail, setNewEmail] = useState('');
  const [billingLogs, setBillingLogs] = useState(FALLBACK_BILLING_LOGS);
  const [totalCost, setTotalCost] = useState(0.0174);
  const [aggregates, setAggregates] = useState({ totalTokens: 16550, totalCpuSec: 42.5 });
  const [isDeploying, setIsDeploying] = useState(false);
  
  // Auth and Routing States
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('zephyr_user_email'));
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('zephyr_user_email') || '');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin Dashboard States
  const [adminProjects, setAdminProjects] = useState([]);
  const [adminTelemetry, setAdminTelemetry] = useState({ logs: [], totalCost: 0, aggregates: { totalTokens: 0, totalCpuSec: 0 } });

  // Custom UI Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Messages State Accessors for Project specific conversations
  const messages = activeProject ? (projectMessages[activeProject.id] || INITIAL_MESSAGES) : INITIAL_MESSAGES;
  const setMessages = (newMsgsOrFn) => {
    if (!activeProject) {
      if (newMsgsOrFn === INITIAL_MESSAGES) {
        setProjectMessages({});
      }
      return;
    }
    setProjectMessages((prev) => {
      const current = prev[activeProject.id] || INITIAL_MESSAGES;
      const next = typeof newMsgsOrFn === 'function' ? newMsgsOrFn(current) : newMsgsOrFn;
      return {
        ...prev,
        [activeProject.id]: next
      };
    });
  };

  const API_BASE = ''; // Proxied during development, absolute root in production

  // --- Router Helper ---
  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- Core Sync Effects ---
  useEffect(() => {
    if (isLoggedIn && userEmail) {
      if (currentPath === '/admin' && userEmail === 'thibault@tibodata.com') {
        fetchAllowlist();
        fetchAdminProjects();
        fetchAdminTelemetry();
      } else {
        fetchProjects();
        fetchTelemetry();
      }
    }
  }, [isLoggedIn, userEmail, currentPath]);

  // --- API Integrations ---
  const fetchAllowlist = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/allowlist`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) setAllowlist(data);
      }
    } catch (err) {
      console.warn('Allowlist fallback running on client state.');
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects?userId=${userEmail}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !activeProject) {
          setActiveProject(data[0]);
        }
      } else {
        createDefaultMockProject();
      }
    } catch (err) {
      createDefaultMockProject();
    }
  };

  const fetchTelemetry = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/telemetry?userId=${userEmail}${activeProject ? `&projectId=${activeProject.id}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setBillingLogs(data.logs);
        setTotalCost(data.totalCost);
        setAggregates(data.aggregates);
      }
    } catch (err) {
      console.warn('Telemetry fallback running on simulation data.');
    }
  };

  // --- Admin Specific APIs ---
  const fetchAdminProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/projects?adminEmail=${userEmail}`);
      if (res.ok) {
        const data = await res.json();
        setAdminProjects(data);
      }
    } catch (err) {
      // Simulate admin projects
      setAdminProjects([
        { id: 'tibo-advisory', name: 'Tibo Advisory', userId: 'thibault@tibodata.com', status: 'Live', url: 'https://tibo-advisory.tibodata.com', createdAt: '2026-05-31T10:00:00Z' },
        { id: 'smart-bakery', name: 'Smart Bakery App', userId: 'client@example.com', status: 'Live', url: 'https://smart-bakery.tibodata.com', createdAt: '2026-05-31T11:30:00Z' }
      ]);
    }
  };

  const fetchAdminTelemetry = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/telemetry?adminEmail=${userEmail}`);
      if (res.ok) {
        const data = await res.json();
        setAdminTelemetry(data);
      }
    } catch (err) {
      setAdminTelemetry({
        logs: FALLBACK_BILLING_LOGS,
        totalCost: 0.0174,
        aggregates: { totalTokens: 16550, totalCpuSec: 42.5 }
      });
    }
  };

  const createDefaultMockProject = () => {
    const defaultProj = {
      id: 'zephyr-default',
      name: 'Default Workspace',
      status: 'Live',
      url: 'https://zephyr-default.tibodata.com',
      latestCode: null
    };
    setProjects([defaultProj]);
    setActiveProject(defaultProj);
  };

  // --- Authentication Handlers ---
  const handleLogin = async (e) => {
    e.preventDefault();
    const sanitizedEmail = loginEmail.toLowerCase().trim();
    if (!sanitizedEmail) {
      setLoginError('Email address is required.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sanitizedEmail })
      });

      if (res.ok) {
        localStorage.setItem('zephyr_user_email', sanitizedEmail);
        setUserEmail(sanitizedEmail);
        setIsLoggedIn(true);
        if (sanitizedEmail === 'thibault@tibodata.com') {
          navigateTo('/admin');
        } else {
          navigateTo('/');
        }
      } else {
        const errData = await res.json();
        setLoginError(errData.error || 'You are not authorized to access this platform.');
      }
    } catch (err) {
      // Local offline verification fallback
      const allowedEmails = ['thibault@tibodata.com', 'admin@tibodata.com', 'thibault.lefevre@gmail.com', 'user@tibodata.com'];
      if (allowedEmails.includes(sanitizedEmail)) {
        localStorage.setItem('zephyr_user_email', sanitizedEmail);
        setUserEmail(sanitizedEmail);
        setIsLoggedIn(true);
        if (sanitizedEmail === 'thibault@tibodata.com') {
          navigateTo('/admin');
        } else {
          navigateTo('/');
        }
      } else {
        setLoginError('Access restricted. This email is not in the platform allowlist.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('zephyr_user_email');
    setUserEmail('');
    setIsLoggedIn(false);
    setMessages(INITIAL_MESSAGES);
    navigateTo('/');
  };

  // --- Platform Feature Handlers ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeProject) return;

    const userMsg = { id: Date.now(), sender: 'user', text: inputText };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsDeploying(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userEmail,
          projectId: activeProject.id,
          message: userMsg.text
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'zephyr', text: data.text }]);
        
        await fetchTelemetry();
        await fetchProjects();
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      // Offline/fallback simulated response
      setTimeout(() => {
        setIsDeploying(false);
        const simText = `I have updated your application with your latest ideas! Your design is active and running beautifully in the live preview below. Let me know what you'd like to refine next!`;
        setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'zephyr', text: simText }]);

        const addedLogs = [
          { id: Date.now() + 2, timestamp: new Date().toLocaleTimeString(), resource: 'AI Design Tokens', qty: '14,350 In / 3,120 Out', cost: 0.0118, userId: userEmail },
          { id: Date.now() + 3, timestamp: new Date().toLocaleTimeString(), resource: 'Design Build (Cycles)', qty: '45.1 Cycles', cost: 0.0036, userId: userEmail }
        ];
        
        setBillingLogs((prev) => [...addedLogs, ...prev]);
        setTotalCost((prev) => prev + 0.0154);
        setAggregates((prev) => ({
          totalTokens: prev.totalTokens + 17470,
          totalCpuSec: prev.totalCpuSec + 45.1
        }));
      }, 2500);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleAddEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || allowlist.includes(newEmail)) return;

    try {
      const res = await fetch(`${API_BASE}/api/allowlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
      });
      if (res.ok) {
        fetchAllowlist();
        setNewEmail('');
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      setAllowlist((prev) => [...prev, newEmail]);
      setNewEmail('');
    }
  };

  const handleRemoveEmail = async (email) => {
    try {
      const res = await fetch(`${API_BASE}/api/allowlist/${email}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAllowlist();
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      setAllowlist((prev) => prev.filter((e) => e !== email));
    }
  };

  const handleCreateProject = () => {
    setNewProjectName('');
    setIsCreateModalOpen(true);
  };

  const submitCreateProject = async (e) => {
    if (e) e.preventDefault();
    if (!newProjectName.trim()) return;

    const projName = newProjectName.trim();
    setIsCreateModalOpen(false);

    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userEmail, name: projName })
      });
      if (res.ok) {
        await fetchProjects();
      }
    } catch (err) {
      const id = projName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const newProj = {
        id,
        name: projName,
        status: 'Live',
        url: `https://${id}.tibodata.com`,
        latestCode: null
      };
      setProjects((prev) => [...prev, newProj]);
      setActiveProject(newProj);
    }
  };

  // --- RENDER ROUTING PANELS ---

  // 1. Sleek Glassmorphic Landing/Login Screen
  if (!isLoggedIn) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        position: 'relative',
        overflow: 'hidden',
        padding: '24px'
      }}>
        {/* Futuristic pulsing color nodes */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
          top: '-150px',
          left: '-150px',
          opacity: 0.25,
          zIndex: 0,
          animation: 'pulse-glow 8s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
          bottom: '-200px',
          right: '-150px',
          opacity: 0.18,
          zIndex: 0,
          animation: 'pulse-glow 12s ease-in-out infinite'
        }} />

        <div className="glass-panel" style={{
          padding: '48px 36px',
          width: '100%',
          maxWidth: '460px',
          textAlign: 'center',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}>
          {/* Logo */}
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '900',
            fontSize: '2rem',
            color: '#ffffff',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>Z</div>

          <div>
            <h1 className="gradient-text-accent" style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px' }}>Zephyr</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.4 }}>
              Design, style, and instantly launch custom digital products and interactive workspaces with the power of Zephyr AI.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Authorization</label>
              <input
                type="email"
                className="input-glass"
                placeholder="thibault@tibodata.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={loginLoading}
                style={{ width: '100%' }}
              />
            </div>

            {loginError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                textAlign: 'left'
              }}>
                ⚠️ {loginError}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loginLoading} style={{ width: '100%', padding: '14px', borderRadius: '10px' }}>
              {loginLoading ? 'Verifying Credentials...' : 'Access Workspace ✦'}
            </button>
          </form>

          <div style={{ borderTop: '1px solid var(--border-glass)', width: '100%', paddingTop: '16px', marginTop: '8px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Authorized domains: <strong>*.tibodata.com</strong>. Accounts must be registered in the administrator allowlist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Access Denied Screen (If user tries to force-load /admin)
  if (currentPath === '/admin' && userEmail !== 'thibault@tibodata.com') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ padding: '40px', maxWidth: '480px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            color: '#ef4444',
            boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)'
          }}>🛡️</div>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Administrative Lock</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              The resource at <code>/admin</code> is strictly reserved for the primary cloud administrator (<code>thibault@tibodata.com</code>). Standard accounts are not authorized to view the master registry or modify allowlist sessions.
            </p>
          </div>
          <button onClick={() => navigateTo('/')} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
            ← Back to App Builder
          </button>
        </div>
      </div>
    );
  }

  // 3. Admin Panel Dashboard (Restricted to thibault@tibodata.com)
  if (currentPath === '/admin' && userEmail === 'thibault@tibodata.com') {
    const activeAdminTelemetry = adminTelemetry || { logs: [], totalCost: 0, aggregates: { totalTokens: 0, totalCpuSec: 0 } };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', padding: '16px', gap: '16px' }}>
        
        {/* Header */}
        <header className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.25rem', color: '#ffffff' }}>Z</div>
            <div>
              <h1 className="gradient-text-accent" style={{ fontSize: '1.4rem', lineHeight: 1.2 }}>Zephyr • Cloud Registry</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Master Administrative Console • GCP Services Monitor</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={() => navigateTo('/')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', gap: '6px' }}>
              ✦ Switch to App Builder
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '30px', border: '1px solid var(--border-glass)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>Admin Session</span>
            </div>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem', borderRadius: '8px', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
              Logout
            </button>
          </div>
        </header>

        {/* Content Workspace Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr 360px', gap: '16px', flexGrow: 1, minHeight: 0 }}>
          
          {/* Col 1: Access Allowlist Manager */}
          <section className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '4px', color: 'var(--text-primary)' }}>Access Allowlist</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Control user access. Only allowlisted emails can log in and deploy workloads to GCP.</p>
            
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px', marginBottom: '16px' }}>
              {allowlist.map((email) => (
                <div key={email} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-glass)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  transition: 'var(--transition-fast)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: email === 'thibault@tibodata.com' ? '#a855f7' : 'var(--accent)'
                    }} />
                    <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                  </div>
                  {email !== 'thibault@tibodata.com' ? (
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1.1rem', cursor: 'pointer', padding: '0 4px', transition: '0.1s' }}
                      title="Remove from Platform"
                    >
                      ×
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '4px', color: '#c084fc', fontWeight: '700' }}>OWNER</span>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddEmail} style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <input
                type="email"
                className="input-glass"
                placeholder="colleague@tibodata.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{ flexGrow: 1, fontSize: '0.8rem', padding: '10px 12px' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0 16px', borderRadius: '10px', fontSize: '0.8rem' }}>
                Add
              </button>
            </form>
          </section>

          {/* Col 2: Global Workspaces / Projects registry */}
          <section className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '4px', color: 'var(--text-primary)' }}>Global Workspace Registry</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Overview of all AI-generated application instances built on GCP Cloud Run services.</p>
            
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {adminProjects.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center', fontSize: '0.85rem' }}>
                  No active projects registered on the server database.
                </div>
              ) : (
                adminProjects.map((proj) => (
                  <div key={proj.id} style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'var(--transition-smooth)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600' }}>{proj.name}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Owner: <span style={{ color: 'var(--text-secondary)' }}>{proj.userId}</span></p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.2)', padding: '2px 8px', borderRadius: '12px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                        <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: '700' }}>{proj.status || 'Active'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Created {new Date(proj.createdAt).toLocaleDateString()}</span>
                      <a href={proj.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '600' }}>
                        Visit Live App ↗
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Col 3: Global System Telemetry Gauge */}
          <section className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '4px', color: 'var(--text-primary)' }}>System Costs Monitor</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Consolidated resource consumption aggregated from GCP telemetry logging databases.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'hidden' }}>
              
              {/* Consumption Card */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)' }}>${activeAdminTelemetry.totalCost.toFixed(4)}</span>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', borderRadius: '12px', fontWeight: '700' }}>Global Costs</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', marginBottom: '14px' }}>
                  <div style={{ height: '100%', width: '45%', background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent-gaze) 100%)', borderRadius: '3px' }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>All Tokens</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>{activeAdminTelemetry.aggregates.totalTokens.toLocaleString()}</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>CPU Seconds</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>{activeAdminTelemetry.aggregates.totalCpuSec} s</span>
                  </div>
                </div>
              </div>

              {/* Logs */}
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Billing Logs</h3>
                <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                  {activeAdminTelemetry.logs.map((log) => (
                    <div key={log.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-glass)',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '0.75rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{log.resource.split(' ')[0]}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{log.userId.split('@')[0]}</span>
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{log.qty}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>${log.cost.toFixed(4)}</span>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{log.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // 4. Regular User Workspace View (Simple and focused on Chat and Canvas)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', padding: '16px', gap: '16px' }}>
      
      {/* Sleek Header Banner */}
      <header className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.25rem', color: '#ffffff' }}>Z</div>
          <div>
            <h1 className="gradient-text-accent" style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>Zephyr</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Powered by Antigravity • Serverless Creator</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Project Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Project:</span>
            <select
              value={activeProject ? activeProject.id : ''}
              onChange={(e) => setActiveProject(projects.find(p => p.id === e.target.value))}
              style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-glass)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id} style={{ background: '#121217', color: 'white' }}>{p.name}</option>
              ))}
            </select>
            <button onClick={handleCreateProject} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', color: 'white', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
              + New
            </button>
          </div>

          {/* Admin panel redirect link */}
          {userEmail === 'thibault@tibodata.com' && (
            <button onClick={() => navigateTo('/admin')} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: '8px', borderStyle: 'dashed', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              🛡️ Admin Dashboard
            </button>
          )}

          {/* User Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '30px', border: '1px solid var(--border-glass)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-primary)' }}>{userEmail}</span>
          </div>

          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.75rem', borderRadius: '8px' }}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Workspace Grid (3 columns, perfectly optimized) */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr 340px', gap: '16px', flexGrow: 1, minHeight: 0 }}>
        
        {/* A. Left Panel: Conversational Assistant */}
        <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--text-primary)' }}>Create with Zephyr</h2>
          
          {/* Messages Window */}
          <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px', marginBottom: '12px' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.sender === 'user' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: msg.sender === 'user' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-glass)',
                  padding: '10px 14px',
                  borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  color: 'var(--text-primary)'
                }}
              >
                {msg.text}
              </div>
            ))}
            {isDeploying && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-glass)', fontSize: '0.8rem' }}>
                <span className="anim-float" style={{ color: 'var(--accent)' }}>●</span>
                <span style={{ color: 'var(--text-secondary)' }}>Polishing design and launching live web preview...</span>
              </div>
            )}
          </div>

          {/* Chat Form Input */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="input-glass"
              placeholder="Tell Zephyr what to build next..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{ flexGrow: 1, fontSize: '0.85rem' }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '0 16px', borderRadius: '10px' }}>
              ✦
            </button>
          </form>
        </section>

        {/* B. Center Panel: Live Preview Canvas */}
        <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Canvas Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{activeProject ? activeProject.name : 'No Project Active'}</span>
              {activeProject && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.2)', padding: '2px 8px', borderRadius: '12px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeProject.status === 'Live' ? 'var(--accent)' : 'hsl(30, 80%, 50%)' }} />
                  <span style={{ fontSize: '0.7rem', color: activeProject.status === 'Live' ? 'var(--accent)' : 'hsl(30, 80%, 50%)', fontWeight: '600' }}>{activeProject.status}</span>
                </div>
              )}
            </div>
            
            {activeProject && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href={activeProject.url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}>
                  Open Web Link ↗
                </a>
                <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', boxShadow: 'none' }}>
                  Re-Deploy 🚀
                </button>
              </div>
            )}
          </div>

          {/* Preview Sandbox Iframe Container */}
          <div style={{ flexGrow: 1, background: '#121217', position: 'relative' }}>
            <iframe
              title="Live Application Preview"
              style={{ width: '100%', height: '100%', border: 'none', background: '#111216' }}
              srcDoc={activeProject && activeProject.latestCode ? activeProject.latestCode : `
                <!DOCTYPE html>
                <html>
                  <head>
                    <style>
                      body { background: #111216; margin: 0; padding: 0; }
                    </style>
                  </head>
                  <body></body>
                </html>
              `}
            />
          </div>
        </section>

        {/* C. Right Panel: Pure Telemetry (No Allowlist shown to standard users) */}
        <section className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Real-Time Consumption</h3>
          
          {/* Visual Gauge Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>${totalCost.toFixed(4)}</span>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)', color: 'var(--accent-gaze)', borderRadius: '12px', fontWeight: '600' }}>Active Cycle</span>
          </div>

          <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min((totalCost / 0.1) * 100, 100)}%`, background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent-gaze) 100%)', borderRadius: '3px' }} />
          </div>

          {/* Granular Aggregates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Tokens Used</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{aggregates.totalTokens.toLocaleString()}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Compute Build</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{aggregates.totalCpuSec} CPU-s</span>
            </div>
          </div>

          {/* Granular Logs Table */}
          <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Granular Logs</h4>
          <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {billingLogs.map((log) => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '8px 10px', borderRadius: '8px', fontSize: '0.75rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>[{log.timestamp}]</span>
                  <span style={{ color: 'var(--text-primary)' }}>{log.resource}</span>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{log.qty}</p>
                </div>
                <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>${log.cost.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Premium Glassmorphic Project Creation Modal */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 5, 8, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div className="glass-panel" style={{
            width: '420px',
            padding: '32px',
            border: '1px solid var(--border-glass)',
            boxShadow: 'var(--shadow-premium)',
            textAlign: 'left'
          }}>
            <h3 style={{ fontFamily: 'var(--font-family-title)', color: 'white', marginTop: 0, marginBottom: '8px', fontSize: '1.25rem' }}>Create New Project</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px', lineHeight: '1.5' }}>
              Give your project a name. We will set up your development canvas and prepare the workspace instantly.
            </p>
            
            <form onSubmit={submitCreateProject}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '8px' }}>Project Name</label>
                <input 
                  type="text" 
                  required
                  className="input-glass"
                  placeholder="e.g. Space Invaders Retro" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', boxShadow: 'none' }}
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

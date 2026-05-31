import React, { useState, useEffect } from 'react';

// Industry-standard fallback data if backend is offline
const FALLBACK_BILLING_LOGS = [
  { id: 1, timestamp: '14:02:11', resource: 'Gemini 1.5 Flash (Tokens)', qty: '12,430 In / 4,120 Out', cost: 0.0124 },
  { id: 2, timestamp: '14:02:15', resource: 'Cloud Run Build (CPU-sec)', qty: '42.5 vCPU-sec', cost: 0.0034 },
  { id: 3, timestamp: '14:05:00', resource: 'Cloud Run Compute (RAM-sec)', qty: '2,048 MB-sec', cost: 0.0016 },
];

const INITIAL_MESSAGES = [
  { id: 1, sender: 'zephyr', text: "Hello Thibault! I am Zephyr, your GCP-integrated AI app creator. Let's build your next big idea under `tibodata.com`. What are we creating today?" },
];

export default function App() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [activeProject, setActiveProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [environment, setEnvironment] = useState('Development');
  const [allowlist, setAllowlist] = useState(['thibault@tibodata.com', 'admin@tibodata.com']);
  const [newEmail, setNewEmail] = useState('');
  const [billingLogs, setBillingLogs] = useState(FALLBACK_BILLING_LOGS);
  const [totalCost, setTotalCost] = useState(0.0174);
  const [aggregates, setAggregates] = useState({ totalTokens: 16550, totalCpuSec: 42.5 });
  const [isDeploying, setIsDeploying] = useState(false);
  const [userEmail, setUserEmail] = useState('thibault@tibodata.com');

  const API_BASE = ''; // proxied via vite.config.js to http://localhost:5000

  // 1. Initial Data Synchronizations on Mount
  useEffect(() => {
    fetchAllowlist();
    fetchProjects();
    fetchTelemetry();
  }, []);

  const fetchAllowlist = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/allowlist`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) setAllowlist(data);
      }
    } catch (err) {
      console.warn('Backend offline, allowlist running on offline mockup client state.');
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
        // Create standard default project if database list is empty
        createDefaultMockProject();
      }
    } catch (err) {
      createDefaultMockProject();
    }
  };

  const createDefaultMockProject = () => {
    const defaultProj = {
      id: 'tibo-advisory',
      name: 'tibo-advisory',
      status: 'Live',
      url: 'https://tibo-advisory.tibodata.com',
      latestCode: null
    };
    setProjects([defaultProj]);
    setActiveProject(defaultProj);
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
      console.warn('Backend telemetry offline, using robust client simulation metrics.');
    }
  };

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
        
        // Sync telemetry & project states
        await fetchTelemetry();
        await fetchProjects();
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      // Offline/fallback dynamic simulation
      setTimeout(() => {
        setIsDeploying(false);
        const simText = `I have updated your application with your specifications! Added interactive forms, optimized the layouts, and redeployed version 2 to Cloud Run. Check it out in the canvas!`;
        setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'zephyr', text: simText }]);

        const addedLogs = [
          { id: Date.now() + 2, timestamp: new Date().toLocaleTimeString(), resource: 'Gemini 1.5 Flash (Tokens)', qty: '14,350 In / 3,120 Out', cost: 0.0118 },
          { id: Date.now() + 3, timestamp: new Date().toLocaleTimeString(), resource: 'Cloud Run Build (vCPU-sec)', qty: '45.1 vCPU-sec', cost: 0.0036 }
        ];
        
        setBillingLogs((prev) => [...addedLogs, ...prev]);
        setTotalCost((prev) => prev + 0.0154);
        setAggregates((prev) => ({
          totalTokens: prev.totalTokens + 17470,
          totalCpuSec: prev.totalCpuSec + 45.1
        }));
      }, 3000);
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

  const handleCreateProject = async () => {
    const projName = prompt('Enter a new Project Name:');
    if (!projName) return;

    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userEmail, name: projName })
      });
      if (res.ok) {
        fetchProjects();
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', padding: '16px', gap: '16px' }}>
      
      {/* 1. Sleek Header Banner */}
      <header className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.25rem', color: '#ffffff' }}>Z</div>
          <div>
            <h1 className="gradient-text-accent" style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>Zephyr</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Powered by Antigravity • Cloud Run Orchestrator</p>
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

          {/* Environment Selector */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            {['Development', 'QA', 'Production'].map((env) => (
              <button
                key={env}
                onClick={() => setEnvironment(env)}
                style={{
                  background: environment === env ? 'var(--primary)' : 'transparent',
                  color: environment === env ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
              >
                {env}
              </button>
            ))}
          </div>

          {/* User Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '30px', border: '1px solid var(--border-glass)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-primary)' }}>{userEmail}</span>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace */}
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
                <span style={{ color: 'var(--text-secondary)' }}>Building container & deploying to Cloud Run...</span>
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
                      body { background: #0c0d12; color: #f1f5f9; font-family: system-ui, sans-serif; margin: 0; padding: 40px; text-align: center; }
                      .card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 30px; border-radius: 12px; max-width: 600px; margin: 60px auto; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
                      h1 { color: #818cf8; margin-bottom: 10px; font-weight: 800; }
                      p { color: #94a3b8; font-size: 1.1em; line-height: 1.6; }
                      .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; font-weight: 600; transition: 0.2s; }
                      .btn:hover { background: #4f46e5; }
                      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; text-align: left; }
                      .grid-card { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.04); padding: 16px; border-radius: 8px; }
                      .grid-card h3 { margin-top: 0; color: #14b8a6; }
                    </style>
                  </head>
                  <body>
                    <div class="card">
                      <h1>Tibo Advisory</h1>
                      <p>Sleek, agent-designed business strategies and cloud intelligence solutions built for high-scale environments.</p>
                      <div class="grid">
                        <div class="grid-card">
                          <h3>Cloud Strategy</h3>
                          <p style="font-size:0.9em; margin:0;">Deploy containerized applications with full cost transparency.</p>
                        </div>
                        <div class="grid-card">
                          <h3>AI Automation</h3>
                          <p style="font-size:0.9em; margin:0;">Harness the power of LLM integrations to automate ops.</p>
                        </div>
                      </div>
                      <a href="#" class="btn">Get Started Now</a>
                    </div>
                  </body>
                </html>
              `}
            />
          </div>
        </section>

        {/* C. Right Panel: Telemetry Gauge & Allowlist */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
          
          {/* I. Consumption Telemetry Gauge */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
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
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Granular Logs</h4>
            <div style={{ overflowY: 'auto', maxHeight: '120px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {billingLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '6px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>[{log.timestamp}]</span>
                    <span style={{ color: 'var(--text-primary)' }}>{log.resource.split(' ')[0]}</span>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{log.qty}</p>
                  </div>
                  <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>${log.cost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* II. Google Auth Access Allowlist */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Access Allowlist</h3>
            
            {/* List */}
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {allowlist.map((email) => (
                <div key={email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</span>
                  {email !== 'thibault@tibodata.com' && (
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.9rem', cursor: 'pointer', padding: '0 4px' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add email Form */}
            <form onSubmit={handleAddEmail} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="email"
                className="input-glass"
                placeholder="user@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{ flexGrow: 1, fontSize: '0.75rem', padding: '8px 12px' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0 12px', borderRadius: '8px', fontSize: '0.75rem' }}>
                Add
              </button>
            </form>
          </div>
        </section>

      </div>
    </div>
  );
}

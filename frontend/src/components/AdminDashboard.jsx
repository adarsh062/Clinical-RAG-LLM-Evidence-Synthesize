import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  RotateCcw, 
  Users, 
  Activity, 
  Baby, 
  Stethoscope, 
  ArrowLeft,
  FileText,
  Clock,
  Trash2,
  Database
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check URL key or localStorage for PIN
  const initialKey = searchParams.get('key') || searchParams.get('pin') || localStorage.getItem('medico_admin_pin') || '';
  const [pinInput, setPinInput] = useState('');
  const [pin, setPin] = useState(initialKey);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

  const fetchStats = async (keyToUse) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${backendBaseUrl}/api/stats?key=${encodeURIComponent(keyToUse)}`);
      const rawText = await res.text();

      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (res.status === 404) {
          throw new Error("Backend server par /api/stats nahi mila (404). Agar local Flask chal raha hai toh use restart karein.");
        }
        if (rawText.trim().startsWith('<')) {
          throw new Error("Server ne JSON ke badle HTML page return kiya. Agar backend chal raha hai toh restart karein.");
        }
        throw new Error(`Server response error: ${rawText.slice(0, 100)}`);
      }

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Invalid PIN');
        }
        throw new Error(data.error || `Server error (${res.status})`);
      }

      setStats(data);
      setIsAuthenticated(true);
      localStorage.setItem('medico_admin_pin', keyToUse);
    } catch (err) {
      setError(err.message || 'Access denied. Please check your PIN.');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Kya aap sure hain ki saare practice case records clear/delete karne hain?')) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${backendBaseUrl}/api/stats/clear?key=${encodeURIComponent(pin)}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to clear records');
      }
      // Re-fetch stats
      fetchStats(pin);
    } catch (err) {
      alert(`Error clearing records: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialKey) {
      fetchStats(initialKey);
    }
  }, [initialKey]);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setPin(pinInput.trim());
    fetchStats(pinInput.trim());
  };

  // If not authenticated, render the PIN Gate
  if (!isAuthenticated) {
    return (
      <div className="admin-gate-wrapper">
        <div className="admin-gate-card">
          <div className="admin-gate-icon">
            <Lock size={26} />
          </div>
          <h2 className="admin-gate-title">Admin Dashboard</h2>
          <p className="admin-gate-sub">Enter passkey to view practice analytics.</p>

          {error && <div className="admin-error-box">{error}</div>}

          <form onSubmit={handleUnlock} className="admin-gate-form">
            <input 
              type="password" 
              placeholder="Enter PIN" 
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="clinical-input admin-pin-input"
              autoFocus
            />
            <button type="submit" className="hero-cta-pill admin-unlock-btn" disabled={isLoading}>
              <span>{isLoading ? 'Verifying...' : 'Unlock Dashboard'}</span>
            </button>
          </form>

          <button 
            type="button" 
            className="admin-back-home" 
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    );
  }

  // Filter logs
  const filteredLogs = (stats?.recentLogs || []).filter(log => {
    if (filter === 'clinical') return log.specialty === 'clinical';
    if (filter === 'pediatrics') return log.specialty === 'pediatrics';
    return true;
  });

  return (
    <div className="case-workspace-wrapper admin-dashboard-page">
      <main className="workspace-main-container">
        {/* Top Header without lock button */}
        <section className="dashboard-hero-card admin-header-card">
          <div className="dashboard-hero-content">
            <div className="dashboard-badge-row">
              <div className="clinical-audience-tag">
                <ShieldCheck size={13} className="shield-icon" />
                <span>Practice Analytics</span>
              </div>
              {stats?.mongodb?.connected ? (
                <div 
                  className="admin-storage-pill connected" 
                  title={`Cluster: ${stats.mongodb.cluster} | Ping: ${stats.mongodb.pingMs}ms`}
                >
                  <span className="live-pulse-dot"></span>
                  <Database size={11} />
                  <span>MongoDB Atlas ({stats.mongodb.pingMs}ms)</span>
                </div>
              ) : (
                <div 
                  className="admin-storage-pill fallback"
                  title={stats?.error || stats?.mongodb?.error || 'MongoDB Atlas Disconnected'}
                >
                  <Database size={11} />
                  <span>MongoDB Atlas (Disconnected)</span>
                </div>
              )}
              <div className="admin-header-actions">
                <button 
                  type="button" 
                  className="admin-refresh-btn" 
                  onClick={() => fetchStats(pin)}
                  disabled={isLoading}
                  title="Refresh stats"
                >
                  <RotateCcw size={12} />
                  <span>Refresh</span>
                </button>
                <button 
                  type="button" 
                  className="admin-clear-records-btn" 
                  onClick={handleClearAll}
                  disabled={isLoading}
                  title="Clear all recorded test cases"
                >
                  <Trash2 size={12} />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            <h1 className="dashboard-primary-title">Practice Cases Dashboard</h1>
          </div>
        </section>

        {/* 4 Clean Essential Stats Cards */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-top">
              <span className="admin-stat-label">Total Practice Tests</span>
              <div className="admin-stat-icon total"><Users size={20} /></div>
            </div>
            <div className="admin-stat-val">{stats?.totalCases ?? 0}</div>
            <span className="admin-stat-hint">Evaluations recorded</span>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-top">
              <span className="admin-stat-label">Clinical Medicine</span>
              <div className="admin-stat-icon clinical"><Stethoscope size={20} /></div>
            </div>
            <div className="admin-stat-val">{stats?.clinicalCases ?? 0}</div>
            <span className="admin-stat-hint">Adult cases analyzed</span>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-top">
              <span className="admin-stat-label">Pediatrics</span>
              <div className="admin-stat-icon pediatrics"><Baby size={20} /></div>
            </div>
            <div className="admin-stat-val">{stats?.pediatricCases ?? 0}</div>
            <span className="admin-stat-hint">Pediatric cases analyzed</span>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-top">
              <span className="admin-stat-label">Today's Tests</span>
              <div className="admin-stat-icon today"><Clock size={20} /></div>
            </div>
            <div className="admin-stat-val">{stats?.todayCases ?? 0}</div>
            <span className="admin-stat-hint">Analyzed today</span>
          </div>
        </div>

        {/* Practice Logs Table */}
        <div className="admin-table-card">
          <div className="admin-table-header">
            <div className="admin-table-title-group">
              <FileText size={18} className="text-slate-600" />
              <h3>Practice History</h3>
              <span className="admin-count-badge">{filteredLogs.length} Cases</span>
            </div>

            {/* Filter tabs */}
            <div className="admin-filter-tabs">
              <button 
                type="button" 
                className={`admin-filter-pill ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({stats?.totalCases ?? 0})
              </button>
              <button 
                type="button" 
                className={`admin-filter-pill ${filter === 'clinical' ? 'active' : ''}`}
                onClick={() => setFilter('clinical')}
              >
                Clinical ({stats?.clinicalCases ?? 0})
              </button>
              <button 
                type="button" 
                className={`admin-filter-pill ${filter === 'pediatrics' ? 'active' : ''}`}
                onClick={() => setFilter('pediatrics')}
              >
                Pediatrics ({stats?.pediatricCases ?? 0})
              </button>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="admin-empty-state">
              <Activity size={32} className="text-slate-400" />
              <p>No practice sessions recorded.</p>
              <span>When users analyze cases from Clinical or Pediatrics, they will show here.</span>
            </div>
          ) : (
            <>
              {/* Desktop View Table */}
              <div className="admin-table-responsive admin-desktop-view">
                <table className="admin-logs-table">
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Specialty</th>
                      <th>Chief Complaint & Case Summary</th>
                      <th>Synthesized Diagnosis</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="log-time">{log.timestamp}</td>
                        <td>
                          <span className={`log-specialty-pill ${log.specialty}`}>
                            {log.specialty === 'pediatrics' ? 'Pediatrics' : 'Clinical'}
                          </span>
                        </td>
                        <td className="log-complaint" title={log.chiefComplaint}>
                          {log.chiefComplaint || 'Unspecified'}
                        </td>
                        <td className="log-diagnosis">
                          <strong>{log.mostLikely}</strong>
                        </td>
                        <td>
                          <span className="admin-count-badge">
                            {log.confidence || 'Moderate'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card List */}
              <div className="admin-mobile-cards-list admin-mobile-view">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="admin-mobile-record-card">
                    <div className="admin-card-header-row">
                      <span className={`log-specialty-pill ${log.specialty}`}>
                        {log.specialty === 'pediatrics' ? 'Pediatrics' : 'Clinical'}
                      </span>
                      <span className="log-time">{log.timestamp}</span>
                    </div>

                    <div className="admin-card-section">
                      <span className="admin-card-label">Chief Complaint:</span>
                      <p className="admin-card-complaint-text">{log.chiefComplaint || 'Unspecified'}</p>
                    </div>

                    <div className="admin-card-diagnosis-box">
                      <div className="admin-card-diag-top">
                        <span className="admin-card-label">Diagnosis:</span>
                        <span className="admin-count-badge">{log.confidence || 'Moderate'}</span>
                      </div>
                      <strong className="admin-card-diagnosis-title">{log.mostLikely}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

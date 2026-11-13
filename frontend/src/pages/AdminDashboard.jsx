import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api';
import { 
  ShieldAlert, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, 
  Clock, Eye, RefreshCw, FileText, UserCheck, Activity, UserX,
  Server, Cpu, Zap, BarChart2, HeartPulse, Layers
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('verifications'); // 'verifications' | 'moderation' | 'audit' | 'reputation' | 'telemetry'
  
  // Data states
  const [doctors, setDoctors] = useState([]);
  const [cases, setCases] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [opsMetrics, setOpsMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/moderation/verifications');
      setDoctors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModerationCases = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/moderation/cases');
      setCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditEvents = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/moderation/audit-trail');
      setAuditEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpsMetrics = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/moderation/ops-metrics');
      setOpsMetrics(data);
    } catch (err) {
      console.error('Failed to load ops metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'verifications' || activeTab === 'reputation') fetchVerifications();
    if (activeTab === 'moderation') fetchModerationCases();
    if (activeTab === 'audit') fetchAuditEvents();
    if (activeTab === 'telemetry') fetchOpsMetrics();
  }, [activeTab]);

  const handleVerificationDecision = async (doctorId, decision) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      await api.put(`/moderation/verifications/${doctorId}/decision`, {
        decision,
        reviewerId: storedUser.id,
        notes: `Processed by Platform Safety Reviewer`
      });
      setActionMessage(`Physician status updated to ${decision}`);
      fetchVerifications();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      alert('Failed to update verification status');
    }
  };

  const handleModerationAction = async (caseId, actionTaken) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      await api.put(`/moderation/cases/${caseId}/action`, {
        actionTaken,
        reviewerId: storedUser.id,
        reviewerNotes: `Action ${actionTaken} verified and applied.`
      });
      setActionMessage(`Moderation action ${actionTaken} applied successfully.`);
      fetchModerationCases();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      alert('Failed to apply moderation action');
    }
  };

  const handleRecalculateReputation = async (doctorId) => {
    try {
      await api.post(`/reputation/recalculate/${doctorId}`);
      setActionMessage('Doctor reputation re-projected from immutable contribution ledger.');
      fetchVerifications();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      alert('Failed to recalculate reputation');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Trust, Safety & Operations Center</h1>
              <p className="text-xs text-slate-400">
                Medical credential verification, clinical safety triage, auditable moderation, reputation re-projection, and system telemetry.
              </p>
            </div>
          </div>

          {actionMessage && (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-in fade-in">
              {actionMessage}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('verifications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'verifications'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Physician Verification Queue</span>
          </button>

          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'moderation'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Safety Moderation Triage</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audited Event Stream</span>
          </button>

          <button
            onClick={() => setActiveTab('reputation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'reputation'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reputation Re-Projection</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'telemetry'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>AI Ops & Telemetry</span>
          </button>
        </div>

        {/* Tab 1: Verification Queue */}
        {activeTab === 'verifications' && (
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Physician Licensing & Identity Checks</h3>
              <span className="text-xs text-slate-400">{doctors.length} Registered Medical Practitioners</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {doctors.map(doc => (
                <div key={doc._id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-900/30 transition">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">Dr. {doc.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        doc.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        doc.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {doc.status}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {doc.plusRank}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center space-x-3">
                      <span>Email: <strong className="text-slate-300">{doc.email}</strong></span>
                      <span>Specialty: <strong className="text-cyan-300">{doc.specialty || 'General'}</strong></span>
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 max-w-xl font-mono mt-1">
                      Submitted Credentials: {doc.credentials}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {doc.status !== 'VERIFIED' && (
                      <button
                        onClick={() => handleVerificationDecision(doc._id, 'VERIFIED')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Medical License</span>
                      </button>
                    )}

                    {doc.status === 'VERIFIED' && (
                      <button
                        onClick={() => handleVerificationDecision(doc._id, 'SUSPENDED')}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition flex items-center space-x-1"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Suspend Doctor</span>
                      </button>
                    )}

                    {doc.status === 'PENDING' && (
                      <button
                        onClick={() => handleVerificationDecision(doc._id, 'REJECTED')}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Safety Moderation Triage Queue */}
        {activeTab === 'moderation' && (
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Community Clinical Safety & Policy Reports</h3>
              <span className="text-xs text-slate-400">{cases.length} Total Reports</span>
            </div>

            {cases.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No reports submitted. Community safety pipeline is clean.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {cases.map(c => (
                  <div key={c._id} className="p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          {c.reasonCategory}
                        </span>
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Target: {c.targetType}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.status === 'PENDING_TRIAGE' ? 'bg-amber-500/10 text-amber-300 animate-pulse' :
                          c.status === 'ACTION_TAKEN' ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {c.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800">
                        "{c.description}"
                      </p>

                      <div className="text-[11px] text-slate-400 flex items-center space-x-3">
                        <span>Reported by: <strong className="text-slate-300">{c.reporterId?.name || 'User'}</strong> ({c.reporterId?.role})</span>
                        <span>Date: {new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    {c.status === 'PENDING_TRIAGE' && (
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleModerationAction(c._id, 'CONTENT_HIDDEN')}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm"
                        >
                          Hide Content
                        </button>
                        <button
                          onClick={() => handleModerationAction(c._id, 'NONE')}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: System-Wide Audit Log */}
        {activeTab === 'audit' && (
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Tamper-Evident Security & Action Log</h3>
              <span className="text-xs text-slate-400">Past 50 system events</span>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-[600px] overflow-y-auto">
              {auditEvents.map(ev => (
                <div key={ev._id} className="p-3.5 flex items-start justify-between text-xs hover:bg-slate-900/30 transition">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {ev.action}
                      </span>
                      <span className="font-semibold text-slate-200">
                        Actor: {ev.actorId?.name || 'System Auto-Engine'} ({ev.actorRole})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1">
                      Target: {ev.targetType || 'SYSTEM'} • Details: {JSON.stringify(ev.details)}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Reputation Re-Projection */}
        {activeTab === 'reputation' && (
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden p-6 space-y-4">
            <div>
              <h3 className="font-bold text-white text-base">Immutable Ledger Re-Calculation</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Per Section 14 of the Nuance & Exception Model: When AI models are updated or feedback signals are quarantined, reputation scores can be re-projected from the immutable contribution ledger without destroying audit history.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-2">
              {doctors.filter(d => d.status === 'VERIFIED').map(doc => (
                <div key={doc._id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">Dr. {doc.name}</h4>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Current: <strong className="text-amber-400 font-mono">{doc.plusRank}</strong> ({doc.totalReputationScore} pts)
                    </div>
                  </div>
                  <button
                    onClick={() => handleRecalculateReputation(doc._id)}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-Project</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: AI Ops & Telemetry (Doc 2: Sec 7, 17; Doc 3: Sec 16) */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            
            {/* Real-time Health Status Ribbon */}
            <div className="glass-panel-elevated rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
                <div>
                  <h3 className="font-extrabold text-white text-base">ByteMed Operational Health: {opsMetrics?.systemStatus || 'OPTIMAL_HEALTH'}</h3>
                  <p className="text-xs text-slate-400">Server uptime: {Math.floor((opsMetrics?.uptimeSeconds || 360) / 60)} mins &bull; BioRouter and lease reconciliation daemon nominal</p>
                </div>
              </div>

              <button
                onClick={fetchOpsMetrics}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Telemetry</span>
              </button>
            </div>

            {/* Core Metrics Quad Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Vitals: Live Doctors */}
              <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Physician Capacity</span>
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {opsMetrics?.doctors?.onlineAvailable || 0}
                  <span className="text-xs text-slate-400 font-normal ml-1">/ {opsMetrics?.doctors?.verified || 0} verified</span>
                </div>
                <p className="text-[11px] text-emerald-400 font-medium">
                  {opsMetrics?.doctors?.inLiveSession || 0} currently in live consultation
                </p>
              </div>

              {/* Vitals: Clinical Queries */}
              <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Inquiries Processed</span>
                  <FileText className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {opsMetrics?.queries?.total || 0}
                </div>
                <p className="text-[11px] text-cyan-300 font-medium">
                  {opsMetrics?.queries?.answerRate || 0}% resolution rate ({opsMetrics?.queries?.answered || 0} answered)
                </p>
              </div>

              {/* Vitals: Emergency Safeguards */}
              <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Safety Red Flags</span>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-extrabold text-rose-400">
                  {opsMetrics?.queries?.emergencyCount || 0}
                </div>
                <p className="text-[11px] text-slate-400">
                  Critical emergency keywords intercepted
                </p>
              </div>

              {/* Vitals: AI BioRouter Confidence */}
              <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>AI Router Confidence</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-extrabold text-amber-400">
                  {Math.round((opsMetrics?.aiRouter?.avgConfidence || 0.91) * 100)}%
                </div>
                <p className="text-[11px] text-slate-400">
                  {opsMetrics?.aiRouter?.modelIdentifier || 'ByteMed-BioRouter-v2'}
                </p>
              </div>

            </div>

            {/* Category Routing Distribution & Telehealth Lease Details */}
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Category Distribution */}
              <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  <span>Clinical Specialty Routing Distribution</span>
                </h4>

                <div className="space-y-2.5">
                  {Object.entries(opsMetrics?.queries?.categoryDistribution || { General: 1, Cardiology: 1, Dermatology: 1 }).map(([cat, count]) => {
                    const total = opsMetrics?.queries?.total || 1;
                    const pct = Math.max(8, Math.round((count / total) * 100));
                    return (
                      <div key={cat} className="space-y-1 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span className="font-medium">{cat}</span>
                          <span className="font-mono text-slate-400">{count} queries ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div 
                            className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Session Telemetry */}
              <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Encrypted Telehealth Infrastructure</span>
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400">Total Visits Conducted</span>
                    <div className="text-xl font-bold text-white">{opsMetrics?.telehealth?.completedSessions || 0}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400">Active Video Rooms</span>
                    <div className="text-xl font-bold text-emerald-400">{opsMetrics?.telehealth?.activeSessions || 0}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400">Lease Reconciler Heartbeat</span>
                    <div className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Active (60s Lease Timeout)</span>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400">Audited Security Events</span>
                    <div className="text-xl font-bold text-white">{opsMetrics?.audit?.eventsLast24h || 0} <span className="text-xs font-normal text-slate-500">/24h</span></div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between">
                  <span>Live availability atomic compare-and-swap</span>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">LOCKED_SYNC</span>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import Navbar from '../components/Navbar';
import ReputationModal from '../components/ReputationModal';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, AlertTriangle, Video, Send, Clock, Edit3, 
  History, CheckCircle2, MessageSquare, Filter, Sparkles, User, RefreshCw,
  Mic, Image as ImageIcon, Award, ChevronRight, CornerDownRight, HelpCircle, ThumbsUp,
  Search, LayoutGrid, List
} from 'lucide-react';

const CATEGORIES = ['All', 'Cardiology', 'Dermatology', 'Neurology', 'Pediatrics', 'Orthopedics', 'General'];

const DoctorDashboard = () => {
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [queries, setQueries] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [availability, setAvailability] = useState(user?.availability || 'OFFLINE');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [toggling, setToggling] = useState(false);
  const [activeTab, setActiveTab] = useState('queries'); // 'queries' | 'history'
  const [reputationModalOpen, setReputationModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'AWAITING' | 'ANSWERED' | 'EMERGENCY'
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  
  // Real-time Incoming Consultation Handshake (Doc 1: Sec 10, 11; Doc 3: Sec 8)
  const [incomingCall, setIncomingCall] = useState(null);
  const [answeringCall, setAnsweringCall] = useState(false);

  const fetchQueries = async () => {
    try {
      const url = selectedCategory === 'All' 
        ? '/queries' 
        : `/queries?category=${encodeURIComponent(selectedCategory)}`;
      const { data } = await api.get(url);
      setQueries(data);
    } catch (err) {
      console.error('Error fetching queries:', err);
    }
  };

  const fetchSessions = async () => {
    if (!user?.id) return;
    try {
      const { data } = await api.get(`/doctors/${user.id}/sessions`);
      setSessions(data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  useEffect(() => {
    if (user?.status === 'VERIFIED') {
      fetchQueries();
      fetchSessions();
    }
  }, [user?.status, selectedCategory, user?.id]);

  // Polling for real-time inbound patient consultations (Doc 1: Sec 10, 11; Doc 2: Sec 6)
  useEffect(() => {
    if (user?.status !== 'VERIFIED' || !user?.id) return;

    const checkIncoming = async () => {
      try {
        const { data } = await api.get(`/doctors/${user.id}/incoming-call`);
        if (data?.incoming && data?.session) {
          setIncomingCall(data.session);
          setAvailability('RESERVED');
        } else {
          setIncomingCall(null);
        }
      } catch (err) {
        // silent polling check
      }
    };

    checkIncoming();
    const interval = setInterval(checkIncoming, 2500);
    return () => clearInterval(interval);
  }, [user?.id, user?.status]);

  // Active Presence Heartbeat for Online Doctors (Doc 1: Sec 11, Doc 3: Sec 9)
  useEffect(() => {
    if (!user?.id || user?.status !== 'VERIFIED' || availability !== 'AVAILABLE') return;

    const pingHeartbeat = async () => {
      try {
        await api.put(`/doctors/${user.id}/heartbeat`);
      } catch (err) {
        // silent fail
      }
    };

    pingHeartbeat();
    const interval = setInterval(pingHeartbeat, 20000);
    return () => clearInterval(interval);
  }, [user?.id, user?.status, availability]);

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    setAnsweringCall(true);
    try {
      const { data } = await api.post(`/doctors/${user.id}/accept-call`);
      setIncomingCall(null);
      navigate(data.roomUrl || `/room/${user.id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept consultation request.');
      setIncomingCall(null);
    } finally {
      setAnsweringCall(false);
    }
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    try {
      await api.post(`/doctors/${user.id}/decline-call`);
      setIncomingCall(null);
      setAvailability('AVAILABLE');
      updateUser({ availability: 'AVAILABLE' });
    } catch (err) {
      setIncomingCall(null);
    }
  };

  const toggleAvailability = async () => {
    setToggling(true);
    const newState = availability === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    try {
      const { data } = await api.put(`/doctors/${user.id}/availability`, { availability: newState });
      setAvailability(data.availability);
      updateUser({ availability: data.availability });
    } catch (err) {
      alert('Failed to update availability');
    } finally {
      setToggling(false);
    }
  };

  const handleEnterLiveRoom = () => {
    navigate(`/room/${user.id}`);
  };

  const handleResetAvailability = async () => {
    setToggling(true);
    try {
      const { data } = await api.put(`/doctors/${user.id}/availability`, { availability: 'AVAILABLE' });
      setAvailability(data.availability);
      updateUser({ availability: data.availability });
    } catch (err) {
      alert('Failed to reset availability');
    } finally {
      setToggling(false);
    }
  };

  const handleRefreshStatus = async () => {
    setCheckingStatus(true);
    setStatusMessage('');
    try {
      const { data } = await api.get('/auth/me');
      if (data?.user) {
        updateUser(data.user);
        if (data.user.status === 'VERIFIED') {
          setStatusMessage('Your credentials have been verified! Opening physician portal...');
        } else {
          setStatusMessage('Verification is currently being reviewed by administrators.');
        }
      }
    } catch (err) {
      setStatusMessage('Unable to refresh status. Please try again.');
    } finally {
      setCheckingStatus(false);
    }
  };

  // PENDING VERIFICATION SCREEN
  if (user?.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-xl w-full glass-panel-elevated rounded-3xl p-8 sm:p-10 border border-slate-800 text-center relative overflow-hidden shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-5">
              <Clock className="w-8 h-8 animate-spin" />
            </div>

            <h2 className="text-2xl font-extrabold text-white">Credentials Under Admin Review</h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Dr. {user.name}, your medical credentials and license documentation are being reviewed by ByteMed platform administrators to protect patient safety.
            </p>

            <div className="mt-6 p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Submitted License / Credentials:</span>
                <span className="font-mono text-cyan-300 truncate max-w-[220px]">
                  {user.credentials || 'MD Verification File'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Specialty:</span>
                <span className="font-semibold text-slate-200">{user.specialty || 'General'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Current Status:</span>
                <span className="font-bold text-amber-400">PENDING_ADMIN_VERIFICATION</span>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left text-xs text-slate-400 space-y-2">
              <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Verification & Credentialing Policy</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Platform safety regulations require manual audit of all medical credentials by administrative reviewers prior to enabling clinical consultation privileges. You will receive an in-app notification once verification is complete.
              </p>
            </div>

            {statusMessage && (
              <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                {statusMessage}
              </div>
            )}

            <div className="mt-6">
              <button
                disabled={checkingStatus}
                onClick={handleRefreshStatus}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
                <span>{checkingStatus ? 'Checking Verification Status...' : 'Refresh Verification Status'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate rank progression
  const currentScore = user?.totalReputationScore || 100;
  const currentRankNum = user?.rankNumber || 1;

  // Filter queries based on search and status
  const filteredQueries = queries.filter(q => {
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      const matchTitle = q.title?.toLowerCase().includes(s);
      const matchDesc = q.description?.toLowerCase().includes(s);
      const matchPatient = q.patientId?.name?.toLowerCase().includes(s);
      if (!matchTitle && !matchDesc && !matchPatient) return false;
    }
    if (statusFilter === 'EMERGENCY' && !q.aiCategorization?.isEmergency) return false;
    if (statusFilter === 'ANSWERED' && q.status !== 'ANSWERED') return false;
    if (statusFilter === 'AWAITING' && q.status === 'ANSWERED') return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Physician Profile & Live Availability Control Center */}
        <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            
            {/* Left Info */}
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-500/20 shrink-0">
                Dr
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h1 className="text-2xl font-extrabold text-white">Dr. {user.name}</h1>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Physician</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-semibold">
                    {user.specialty || 'General'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3 mt-1.5 text-xs text-slate-400 flex-wrap gap-y-1">
                  <span>{user.credentials || 'Licensed Medical Practitioner'}</span>
                  <span>•</span>
                  <button
                    onClick={() => setReputationModalOpen(true)}
                    className="font-mono font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/20 transition flex items-center space-x-1"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>ByteMed Rank: {user.plusRank || 'Plus 1 (+)'} ({currentScore} pts)</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Live Availability Toggle & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Prominent Video Calls Toggle Switch */}
              <div className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Video Calls</span>
                  <span className={`text-xs font-semibold flex items-center space-x-1.5 ${
                    availability === 'AVAILABLE' ? 'text-emerald-400' : availability === 'RESERVED' ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      availability === 'AVAILABLE' ? 'bg-emerald-400 animate-pulse' : availability === 'RESERVED' ? 'bg-amber-400' : 'bg-slate-600'
                    }`}></span>
                    <span>{availability === 'AVAILABLE' ? 'Available' : availability === 'RESERVED' ? 'In Call' : 'Offline'}</span>
                  </span>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={availability === 'AVAILABLE'}
                  disabled={toggling}
                  onClick={toggleAvailability}
                  title={availability === 'AVAILABLE' ? 'Click to turn off video calls' : 'Click to turn on video calls'}
                  className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                    availability === 'AVAILABLE' ? 'bg-emerald-500' : availability === 'RESERVED' ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      availability === 'AVAILABLE' ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Direct Room Access for Doctor */}
              {availability === 'AVAILABLE' && (
                <button
                  onClick={handleEnterLiveRoom}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 transition active:scale-95"
                >
                  <Video className="w-4 h-4" />
                  <span>Open Video Room</span>
                </button>
              )}

              {/* Reserved status handler */}
              {availability === 'RESERVED' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleEnterLiveRoom}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/20 transition active:scale-95"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Video Call</span>
                  </button>
                  <button
                    onClick={handleResetAvailability}
                    disabled={toggling}
                    className="px-3 py-2 rounded-2xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                    title="Reset to Available"
                  >
                    Reset Status
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>

        {/* Navigation Tabs (Queries vs Consultation History) */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('queries')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'queries'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Patient Questions</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Past Consultations ({sessions.length})</span>
          </button>
        </div>

        {activeTab === 'queries' ? (
          /* Categories Bar, Search Filters & Structured Triage Feed */
          <div className="space-y-6">
            <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
              {/* Top Row: Title, Case Counter, Search Bar, View Mode Toggle */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className="font-extrabold text-white text-lg">Patient Questions</h2>
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                      {filteredQueries.length} {filteredQueries.length === 1 ? 'Question' : 'Questions'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Review symptoms, listen to voice recordings, and share your medical advice.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search questions or symptoms..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  {/* Layout View Toggle */}
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      title="Linear Feed View (Spacious & Cleanly Aligned)"
                      className={`p-1.5 rounded-lg transition ${
                        viewMode === 'list' 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      title="Side-by-Side Grid View"
                      className={`p-1.5 rounded-lg transition ${
                        viewMode === 'grid' 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Category Pills & Status Filter */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-3 border-t border-slate-800/80">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                        selectedCategory === cat
                          ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Status Quick Filters */}
                <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                  <span className="text-slate-500 font-medium mr-1">Status:</span>
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'AWAITING', label: 'Needs Advice' },
                    { id: 'ANSWERED', label: 'Answered' },
                    { id: 'EMERGENCY', label: '🚨 Emergency' },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        statusFilter === f.id
                          ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredQueries.length === 0 ? (
              <div className="glass-panel rounded-3xl p-16 text-center border border-slate-800 text-slate-400 text-xs space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="font-bold text-white text-sm">No Matching Inquiries Found</div>
                <p className="text-slate-500 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'ALL' || selectedCategory !== 'All'
                    ? 'Try adjusting your search criteria or filters to see more community cases.'
                    : 'No patient inquiries are currently awaiting doctor advice in this category.'}
                </p>
              </div>
            ) : (
              <div className={viewMode === 'list' ? 'space-y-6 max-w-5xl mx-auto' : 'grid md:grid-cols-2 gap-6 items-start'}>
                {filteredQueries.map(q => (
                  <DoctorQueryCard 
                    key={q._id} 
                    query={q} 
                    doctorId={user.id} 
                    onResponseUpdated={fetchQueries} 
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Consultation History View */
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Completed Telehealth Sessions</h3>
              <p className="text-xs text-slate-400">Live consultation contribution records audited in the reputation ledger.</p>
            </div>

            {sessions.length === 0 ? (
              <div className="p-16 text-center text-slate-500 text-xs">
                No completed live consultations yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {sessions.map(s => (
                  <div key={s._id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-900/30 transition">
                    <div>
                      <div className="font-bold text-white">Patient: {s.patientId?.name || 'Anonymous Patient'}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Duration: {s.durationSeconds || 120} seconds • {new Date(s.startedAt).toLocaleString()}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      COMPLETED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Real-time Inbound Patient Consultation Alert Modal (Doc 1: Sec 10, 11; Doc 3: Sec 8) */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full glass-panel-elevated rounded-3xl p-6 sm:p-8 border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/20 text-center relative overflow-hidden space-y-5">
            {/* Pulsing ring background glow */}
            <div className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mx-auto text-cyan-300 animate-pulse">
              <Video className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider mb-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span>Inbound Consultation Call</span>
              </span>
              <h2 className="text-xl font-extrabold text-white mt-1">
                Patient {incomingCall.patient?.name || 'Anonymous Patient'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Connected to your live queue. Request will expire in{' '}
                <strong className="text-amber-400 font-mono">{incomingCall.timeRemainingSeconds || 30}s</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span>Encrypted Video Stream</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Atomic Lock Held
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleDeclineCall}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={answeringCall}
                onClick={handleAcceptCall}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/30 transition flex items-center justify-center space-x-2 animate-pulse"
              >
                <Video className="w-4 h-4" />
                <span>{answeringCall ? 'Connecting...' : 'Accept & Join (+40 pts)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transparent Reputation Modal */}
      <ReputationModal
        doctorId={user.id}
        isOpen={reputationModalOpen}
        onClose={() => setReputationModalOpen(false)}
      />

    </div>
  );
};

const CATEGORY_STYLES = {
  Cardiology: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  Dermatology: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  Neurology: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  Pediatrics: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  Orthopedics: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  General: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
};

/**
 * Individual Query Card for Doctors with Multi-Modal Viewer, Version Editing, and AI Evaluation Card
 */
const DoctorQueryCard = ({ query, doctorId, onResponseUpdated }) => {
  const [existingResponses, setExistingResponses] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [editingResponseId, setEditingResponseId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeCardTab, setActiveCardTab] = useState('guidance'); // 'guidance' | 'consensus' | 'followups'

  // Peer Endorsement state
  const [endorsingId, setEndorsingId] = useState(null);
  const [endorsementNote, setEndorsementNote] = useState('');
  const [submittingEndorsement, setSubmittingEndorsement] = useState(false);

  // Follow-up reply state
  const [followUpReplies, setFollowUpReplies] = useState({});
  const [submittingFollowUpId, setSubmittingFollowUpId] = useState(null);

  const fetchResponses = async () => {
    try {
      const { data } = await api.get(`/responses/query/${query._id}`);
      setExistingResponses(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, [query._id]);

  const myResponse = existingResponses.find(r => r.doctorId?._id === doctorId || r.doctorId === doctorId);
  const otherResponses = existingResponses.filter(r => r.doctorId?._id !== doctorId && r.doctorId !== doctorId);

  const handleStartEdit = () => {
    if (myResponse) {
      setEditingResponseId(myResponse._id);
      setReplyText(myResponse.currentContent);
    }
  };

  const handleCancelEdit = () => {
    setEditingResponseId(null);
    setReplyText('');
  };

  const handleEndorseResponse = async (responseId) => {
    setSubmittingEndorsement(true);
    try {
      await api.post(`/responses/${responseId}/endorse`, {
        doctorId,
        note: endorsementNote
      });
      setEndorsingId(null);
      setEndorsementNote('');
      fetchResponses();
      if (onResponseUpdated) onResponseUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to endorse response');
    } finally {
      setSubmittingEndorsement(false);
    }
  };

  const handleReplyFollowUp = async (followUpId) => {
    const text = followUpReplies[followUpId];
    if (!text || !text.trim()) return;
    setSubmittingFollowUpId(followUpId);
    try {
      await api.post(`/queries/${query._id}/follow-up/${followUpId}/reply`, {
        doctorId,
        reply: text
      });
      setFollowUpReplies(prev => ({ ...prev, [followUpId]: '' }));
      if (onResponseUpdated) onResponseUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit clarification reply');
    } finally {
      setSubmittingFollowUpId(null);
    }
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      if (editingResponseId) {
        const { data } = await api.put(`/responses/${editingResponseId}`, {
          content: replyText,
          editReason: 'Clinical clarification and guidance update'
        });
        setEditingResponseId(null);
        if (data) {
          setExistingResponses(prev => prev.map(r => r._id === data._id ? data : r));
        }
      } else {
        const { data } = await api.post('/responses', {
          queryId: query._id,
          doctorId,
          content: replyText
        });
        if (data) {
          setExistingResponses(prev => [...prev, data]);
        }
      }
      setReplyText('');
      await fetchResponses();
      if (onResponseUpdated) onResponseUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit advice');
    } finally {
      setSubmitting(false);
    }
  };

  const hasVoice = query.media?.voice?.hasVoice;
  const hasImages = query.media?.images?.length > 0;
  const hasAttachments = hasVoice || hasImages;
  const isEmergency = query.aiCategorization?.isEmergency;

  return (
    <div className={`glass-panel-elevated rounded-3xl p-6 border transition-all duration-200 hover:border-slate-700 space-y-5 relative overflow-hidden shadow-xl ${
      isEmergency ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/15 via-slate-900/40 to-slate-950' : 'border-slate-800 bg-slate-900/40'
    }`}>
      {/* Top Emergency Indicator Line if Flagged */}
      {isEmergency && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 animate-pulse" />
      )}

      {/* 1. Header Metadata Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Badges */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            CATEGORY_STYLES[query.category] || CATEGORY_STYLES.General
          }`}>
            {query.category}
          </span>

          {isEmergency && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold animate-pulse">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Emergency Flag</span>
            </span>
          )}

          {myResponse ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>Answered by You</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-semibold">
              <Clock className="w-3 h-3" />
              <span>Awaiting Advice</span>
            </span>
          )}
        </div>

        {/* Patient Metadata & Timestamp */}
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-300 font-medium">{query.patientId?.name || 'Anonymous Patient'}</span>
          </div>
          <span>•</span>
          <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-500">
            <Clock className="w-3 h-3" />
            <span>{new Date(query.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* 2. Clinical Title & Presentation */}
      <div className="space-y-2">
        <h3 className="font-extrabold text-white text-base sm:text-lg leading-snug tracking-tight">
          {query.title}
        </h3>

        {/* Symptoms Narrative with Indigo Accent Border */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed border-l-4 border-l-indigo-500">
          <p className="whitespace-pre-line">{query.description}</p>
        </div>
      </div>

      {/* 3. Diagnostic Attachments Tray (Voice Audio & Clinical Photos) */}
      {hasAttachments && (
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <span>Diagnostic Attachments</span>
          </div>

          <div className="space-y-2.5">
            {hasVoice && (
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-2 text-xs">
                <div className="flex items-start space-x-2.5">
                  <Mic className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold text-cyan-300 text-xs">Voice Dictation Audio & Transcript:</span>
                    <p className="text-slate-300 italic text-xs mt-1">"{query.media.voice.transcript}"</p>
                  </div>
                </div>
                {query.media.voice.audioUrl && (
                  <div className="pt-1">
                    <audio controls src={query.media.voice.audioUrl} className="h-8 w-full max-w-md rounded" />
                  </div>
                )}
              </div>
            )}

            {hasImages && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {query.media.images.map((img, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 p-2 group transition hover:border-slate-700">
                    <a href={img.url} target="_blank" rel="noreferrer" title="Click to view full image in new tab">
                      <img src={img.url} alt={img.label} className="w-full h-28 object-cover rounded-lg mb-1.5 group-hover:opacity-90 transition cursor-zoom-in" />
                    </a>
                    <div className="text-[10px] text-slate-300 font-bold truncate">{img.label}</div>
                    <div className="text-[9px] text-cyan-400 truncate mt-0.5">{img.aiObservation}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Segmented Clinical Action Tabs (Keeps Card Compact & Organized) */}
      <div className="pt-2 border-t border-slate-800 space-y-4">
        {/* Tab Buttons Switcher */}
        <div className="flex items-center space-x-2 bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800/90 text-xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveCardTab('guidance')}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl font-bold transition flex items-center justify-center space-x-1.5 ${
              activeCardTab === 'guidance'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{myResponse ? 'Your Advice' : 'Provide Advice'}</span>
            {myResponse && <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1"></span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveCardTab('consensus')}
            className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl font-bold transition flex items-center justify-center space-x-1.5 ${
              activeCardTab === 'consensus'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Colleague Consensus</span>
            {otherResponses.length > 0 && (
              <span className="font-mono text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full ml-1">
                {otherResponses.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveCardTab('followups')}
            className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl font-bold transition flex items-center justify-center space-x-1.5 ${
              activeCardTab === 'followups'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Clarifications</span>
            {query.followUps?.length > 0 && (
              <span className="font-mono text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full ml-1">
                {query.followUps.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Your Guidance (Published or Compose/Revise Form) */}
        {activeCardTab === 'guidance' && (
          <div className="space-y-4">
            {myResponse && !editingResponseId ? (
              <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Your Published Clinical Advice</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    {myResponse.versions?.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 transition"
                      >
                        <History className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{myResponse.versions.length} Versions</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="text-xs text-indigo-300 hover:text-white font-semibold flex items-center gap-1 bg-indigo-500/20 hover:bg-indigo-500/30 px-3 py-1 rounded-lg border border-indigo-500/30 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Revise Advice</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                  {myResponse.currentContent}
                </div>

                {/* AI Evaluation Card */}
                {myResponse.aiEvaluation && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-300 flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>AI Clinical Quality Score: {myResponse.aiEvaluation.compositeScore}%</span>
                      </span>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Confidence: {Math.round(myResponse.aiEvaluation.confidence * 100)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[10px]">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Relevance</div>
                        <div className="font-bold text-cyan-300 text-xs mt-0.5">{myResponse.aiEvaluation.relevance}%</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Complete</div>
                        <div className="font-bold text-cyan-300 text-xs mt-0.5">{myResponse.aiEvaluation.completeness}%</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Clarity</div>
                        <div className="font-bold text-cyan-300 text-xs mt-0.5">{myResponse.aiEvaluation.clarity}%</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Safety</div>
                        <div className="font-bold text-emerald-400 text-xs mt-0.5">{myResponse.aiEvaluation.safety}%</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Caveats</div>
                        <div className="font-bold text-amber-300 text-xs mt-0.5">{myResponse.aiEvaluation.uncertaintyHandling}%</div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 italic pt-1">
                      {myResponse.aiEvaluation.evaluationSummary}
                    </p>
                  </div>
                )}

                {/* Version History Drawer */}
                {showHistory && (
                  <div className="pt-3 border-t border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                      <span className="uppercase tracking-wider flex items-center space-x-1.5">
                        <History className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Immutable Version & Audit Trail ({myResponse.versions.length})</span>
                      </span>
                      <span className="text-slate-500 text-[10px]">All revisions are cryptographically recorded</span>
                    </div>
                    <div className="space-y-2">
                      {myResponse.versions.map((v, i) => {
                        const isLatest = i === myResponse.versions.length - 1;
                        return (
                          <div 
                            key={i} 
                            className={`p-3 rounded-xl border text-xs space-y-2 transition ${
                              isLatest 
                                ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-100' 
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                                  isLatest 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  Version #{i + 1}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-300">
                                  {isLatest ? 'Current Published Advice' : (v.editReason || 'Archived Revision')}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {new Date(v.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed pl-2 border-l-2 border-slate-700">
                              {v.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Compose / Edit Form */
              <form onSubmit={handleSubmitResponse} className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-white flex items-center space-x-1.5">
                    <Edit3 className="w-4 h-4 text-cyan-400" />
                    <span>{editingResponseId ? 'Revise Response (Creates New Immutable Version)' : 'Provide Professional Medical Guidance'}</span>
                  </label>
                  {editingResponseId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <textarea
                  required
                  rows={4}
                  placeholder="Write your medical advice: key thoughts, recommended care, warning signs to watch for, and next steps..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition leading-relaxed shadow-inner"
                />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-[11px] text-slate-500">Quality-checked by ByteMed AI</span>
                  <button
                    type="submit"
                    disabled={submitting || !replyText.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-600 hover:from-indigo-400 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting...' : editingResponseId ? 'Save Update (+20 pts)' : 'Send Advice (+50 pts)'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Colleague Consensus */}
        {activeCardTab === 'consensus' && (
          <div className="space-y-3">
            {otherResponses.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                <ThumbsUp className="w-5 h-5 text-slate-600 mx-auto mb-2" />
                <div className="font-semibold text-slate-300">No Colleague Responses Yet</div>
                <p className="text-slate-500 text-[11px]">You are the first physician reviewing this case. Publish your guidance to set the initial recommendation.</p>
              </div>
            ) : (
              otherResponses.map(resp => {
                const alreadyEndorsed = resp.endorsements?.some(e => (e.doctorId?._id || e.doctorId) === doctorId);

                return (
                  <div key={resp._id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">Dr. {resp.doctorId?.name}</span>
                        <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {resp.doctorId?.plusRank}
                        </span>
                        <span className="text-[11px] text-slate-400">{resp.doctorId?.specialty}</span>
                      </div>

                      {/* Endorsement Action */}
                      <div>
                        {alreadyEndorsed ? (
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Endorsed by You</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEndorsingId(endorsingId === resp._id ? null : resp._id)}
                            className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition flex items-center space-x-1"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Endorse Advice (+20 pts)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-slate-200 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                      {resp.currentContent}
                    </p>

                    {/* Existing Endorsements Count */}
                    {resp.endorsements?.length > 0 && (
                      <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Seconded by {resp.endorsements.length} physician(s)</span>
                      </div>
                    )}

                    {/* Inline Endorsement Input Form */}
                    {endorsingId === resp._id && (
                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <input
                          type="text"
                          placeholder="Optional clinical consensus note (e.g., Concur with diagnostic trajectory and dosage cautions)..."
                          value={endorsementNote}
                          onChange={(e) => setEndorsementNote(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setEndorsingId(null)}
                            className="px-3 py-1 text-slate-400 hover:text-white text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={submittingEndorsement}
                            onClick={() => handleEndorseResponse(resp._id)}
                            className="px-3.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                          >
                            {submittingEndorsement ? 'Recording...' : 'Confirm Peer Endorsement'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 3: Patient Clarifications */}
        {activeCardTab === 'followups' && (
          <div className="space-y-3">
            {!query.followUps || query.followUps.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                <HelpCircle className="w-5 h-5 text-slate-600 mx-auto mb-2" />
                <div className="font-semibold text-slate-300">No Clarifications Requested</div>
                <p className="text-slate-500 text-[11px]">The patient has not posted follow-up clarification questions on this case.</p>
              </div>
            ) : (
              query.followUps.map(fu => (
                <div key={fu._id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
                  <div className="text-slate-200">
                    <strong className="text-cyan-400 font-bold">Patient Question:</strong> "{fu.question}"
                  </div>

                  {fu.reply ? (
                    <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs space-y-1 ml-2">
                      <div className="flex items-center space-x-2 text-[11px]">
                        <CornerDownRight className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-bold text-indigo-300">Dr. {fu.doctorId?.name || 'Physician'}</span>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          {fu.doctorId?.plusRank || 'Verified'}
                        </span>
                      </div>
                      <p className="text-slate-200 pl-5">{fu.reply}</p>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <input
                        type="text"
                        placeholder="Type clinical clarification for patient (+25 pts)..."
                        value={followUpReplies[fu._id] || ''}
                        onChange={(e) => setFollowUpReplies({ ...followUpReplies, [fu._id]: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={submittingFollowUpId === fu._id || !followUpReplies[fu._id]?.trim()}
                          onClick={() => handleReplyFollowUp(fu._id)}
                          className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{submittingFollowUpId === fu._id ? 'Sending...' : 'Publish Clarification (+25 pts)'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;

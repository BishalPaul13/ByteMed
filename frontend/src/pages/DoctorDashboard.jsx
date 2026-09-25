import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, AlertTriangle, Video, Send, Clock, Edit3, 
  History, CheckCircle2, MessageSquare, Filter, Sparkles, User, RefreshCw
} from 'lucide-react';

const CATEGORIES = ['All', 'General', 'Cardiology', 'Dermatology', 'Neurology', 'Pediatrics', 'Orthopedics'];

const DoctorDashboard = () => {
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [queries, setQueries] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [availability, setAvailability] = useState(user?.availability || 'OFFLINE');
  const [approving, setApproving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [activeTab, setActiveTab] = useState('queries'); // 'queries' | 'history'

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

  useEffect(() => {
    if (user?.status === 'VERIFIED') {
      fetchQueries();
    }
  }, [user?.status, selectedCategory]);

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

  const handleTestConsultation = async () => {
    try {
      const { data } = await api.post(`/doctors/${user.id}/book`);
      navigate(data.roomUrl);
    } catch (err) {
      alert('Doctor already in consultation or unavailable.');
    }
  };

  const handleApproveAccount = async () => {
    try {
      setApproving(true);
      const { data } = await api.put(`/doctors/${user.id}/approve`);
      updateUser({ status: data.status || 'VERIFIED' });
      navigate('/doctor');
    } catch (err) {
      alert('Failed to approve account');
    } finally {
      setApproving(false);
    }
  };

  // PENDING VERIFICATION SCREEN
  if (user?.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-xl w-full glass-panel-elevated rounded-2xl p-8 sm:p-10 border border-slate-800 text-center relative overflow-hidden shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-5">
              <Clock className="w-8 h-8 animate-spin" />
            </div>

            <h2 className="text-2xl font-extrabold text-white">Credentials Under Admin Review</h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Dr. {user.name}, your medical credentials and license documentation are being reviewed by ByteMed administrators to protect patient safety.
            </p>

            <div className="mt-6 p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Submitted License / Credentials:</span>
                <span className="font-mono text-cyan-300 truncate max-w-[220px]">
                  {user.credentials || 'MD Verification File'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Current Status:</span>
                <span className="font-bold text-amber-400">PENDING_ADMIN_VERIFICATION</span>
              </div>
            </div>

            {/* Mock Verification Fast-Track */}
            <div className="mt-8 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-left">
              <div className="flex items-center space-x-2 text-emerald-300 font-bold text-xs mb-1">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Prototype Fast-Track Verification</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">
                Simulate instant admin approval to immediately unlock verified physician privileges, open query responding, and live consultations.
              </p>
              <button
                disabled={approving}
                onClick={handleApproveAccount}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {approving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Credentials & Open Doctor Dashboard</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VERIFIED DOCTOR DASHBOARD
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Physician Profile & Live Availability Control Center */}
        <div className="glass-panel-elevated rounded-2xl p-6 sm:p-8 border border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            
            {/* Left Info */}
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-500/20">
                Dr
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h1 className="text-2xl font-extrabold text-white">Dr. {user.name}</h1>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Physician</span>
                  </span>
                </div>
                <div className="flex items-center space-x-3 mt-1.5 text-xs text-slate-400">
                  <span>{user.credentials || 'Licensed Medical Practitioner'}</span>
                  <span>•</span>
                  <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    ByteMed Rank: {user.plusRank || 'Plus 1 (+)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Live Availability Toggle & Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Availability Switch */}
              <div className="flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs font-semibold text-slate-300">Live Status:</span>
                <button
                  disabled={toggling}
                  onClick={toggleAvailability}
                  className={`relative inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                    availability === 'AVAILABLE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10'
                      : availability === 'RESERVED'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    availability === 'AVAILABLE' ? 'bg-emerald-400 animate-ping' : availability === 'RESERVED' ? 'bg-amber-400' : 'bg-slate-500'
                  }`}></span>
                  <span>{availability}</span>
                </button>
              </div>

              {/* Instant Test Consultation Launch */}
              {availability === 'AVAILABLE' && (
                <button
                  onClick={handleTestConsultation}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 transition"
                >
                  <Video className="w-4 h-4" />
                  <span>Test Video Room (Patient Lock)</span>
                </button>
              )}

            </div>

          </div>
        </div>

        {/* Categories Bar & Query Feed */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="font-bold text-white text-base">Community Triage Board</h2>
              <p className="text-xs text-slate-400">Review open patient inquiries, submit medical advice, and version previous responses.</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Queries Grid */}
          {queries.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 text-slate-400 text-sm">
              No inquiries currently awaiting doctor advice in this category.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 items-start">
              {queries.map(q => (
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

      </main>
    </div>
  );
};

// Subcomponent: Individual Query Card for Doctors with Response & Version Editing
const DoctorQueryCard = ({ query, doctorId, onResponseUpdated }) => {
  const [existingResponses, setExistingResponses] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [editingResponseId, setEditingResponseId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  // Check if current doctor already has a response
  const myResponse = existingResponses.find(r => r.doctorId?._id === doctorId || r.doctorId === doctorId);

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

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      if (editingResponseId) {
        // Edit existing response -> Creates a new version (ResponseVersion) in MongoDB
        await api.put(`/responses/${editingResponseId}`, { content: replyText });
        setEditingResponseId(null);
      } else {
        // New initial response
        await api.post('/responses', {
          queryId: query._id,
          doctorId,
          content: replyText
        });
      }
      setReplyText('');
      fetchResponses();
      onResponseUpdated();
    } catch (err) {
      alert('Failed to submit advice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`glass-panel rounded-2xl p-6 border flex flex-col justify-between space-y-4 ${
      query.aiTriage?.isEmergency ? 'border-rose-500/60 bg-rose-950/15' : 'border-slate-800'
    }`}>
      
      {/* Emergency Ribbon if flagged */}
      {query.aiTriage?.isEmergency && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Emergency Keywords Flagged</span>
          </div>
          <span className="text-[10px] font-mono bg-rose-500/20 px-2 py-0.5 rounded">
            Conf: {Math.round((query.aiTriage?.confidenceScore || 0.9) * 100)}%
          </span>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
            {query.category}
          </span>
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(query.createdAt).toLocaleDateString()}
          </span>
        </div>
        <h3 className="font-bold text-base text-white">{query.title}</h3>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          {query.description}
        </p>
      </div>

      {/* Responses Summary or Existing Contribution */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        {myResponse ? (
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Your Submitted Advice
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                v{myResponse.versions?.length || 1}.0
              </span>
            </div>
            
            <p className="text-xs text-slate-200">
              {myResponse.currentContent}
            </p>

            {/* Actions: Edit response to create new version or view history */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={handleStartEdit}
                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Revise Advice (New Version)</span>
              </button>

              {myResponse.versions?.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-slate-400 hover:text-white flex items-center space-x-1 text-[11px]"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{showHistory ? 'Hide Versions' : `Audit (${myResponse.versions.length} versions)`}</span>
                </button>
              )}
            </div>

            {/* Version Audit Log Drawer */}
            {showHistory && myResponse.versions && (
              <div className="mt-3 pt-3 border-t border-indigo-500/20 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Immutable Version Audit Log
                </div>
                {myResponse.versions.map((v, i) => (
                  <div key={i} className="p-2 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300">
                    <div className="text-slate-500 text-[10px] mb-0.5">
                      Revision {i + 1} • {new Date(v.timestamp).toLocaleString()}
                    </div>
                    <div>{v.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic">
            You have not contributed advice to this query yet.
          </div>
        )}

        {/* Advice Submission or Edit Form */}
        {(!myResponse || editingResponseId) && (
          <form onSubmit={handleSubmitResponse} className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300">
                {editingResponseId ? 'Revise Medical Advice (Will create new version)' : 'Provide Medical Advice:'}
              </label>
              {editingResponseId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-rose-400 hover:underline text-[11px]"
                >
                  Cancel
                </button>
              )}
            </div>
            
            <textarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              required
              placeholder="Write clear, compassionate, and evidence-based guidance..."
              className="w-full p-3 text-xs rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-md shadow-indigo-600/20 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{editingResponseId ? 'Save & Publish New Version' : 'Submit Medical Advice'}</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>

    </div>
  );
};

export default DoctorDashboard;

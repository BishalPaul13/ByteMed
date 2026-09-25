import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, Send, HeartPulse, Video, Star, Clock, 
  MessageSquare, ShieldCheck, Activity, Search, Sparkles, Filter 
} from 'lucide-react';

const CATEGORIES = ['All', 'General', 'Cardiology', 'Dermatology', 'Neurology', 'Pediatrics', 'Orthopedics'];
const EMERGENCY_KEYWORDS = ['chest pain', 'bleeding', 'heart attack', 'stroke', 'unconscious', 'breathing difficulty'];

const PatientDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [queries, setQueries] = useState([]);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New query form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [submitting, setSubmitting] = useState(false);
  const [bookingDocId, setBookingDocId] = useState(null);

  // Live detection of emergency keywords for UX
  const isEmergencyTyping = EMERGENCY_KEYWORDS.some(kw => 
    (title + ' ' + description).toLowerCase().includes(kw)
  );

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

  const fetchAvailableDoctors = async () => {
    try {
      const { data } = await api.get('/doctors/available');
      setAvailableDoctors(data);
    } catch (err) {
      console.error('Error fetching available doctors:', err);
    }
  };

  useEffect(() => {
    fetchQueries();
    fetchAvailableDoctors();
    const interval = setInterval(fetchAvailableDoctors, 6000);
    return () => clearInterval(interval);
  }, [selectedCategory]);

  const handleSubmitQuery = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/queries', {
        title,
        description,
        category,
        patientId: user.id
      });
      setTitle('');
      setDescription('');
      fetchQueries();
    } catch (err) {
      alert('Failed to submit query');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookDoctor = async (doctorId) => {
    setBookingDocId(doctorId);
    try {
      const { data } = await api.post(`/doctors/${doctorId}/book`);
      navigate(data.roomUrl);
    } catch (err) {
      alert(err.response?.data?.message || 'Doctor is no longer available. Another patient may have booked just now.');
      fetchAvailableDoctors();
    } finally {
      setBookingDocId(null);
    }
  };

  // Filter queries by search
  const filteredQueries = queries.filter(q => {
    const term = searchQuery.toLowerCase();
    return q.title.toLowerCase().includes(term) || q.description.toLowerCase().includes(term);
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero / Patient Greeting & Quick Stats */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-2">
                <HeartPulse className="w-3.5 h-3.5 animate-pulse" />
                <span>Patient Health Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Hello, {user.name}
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-xl">
                Get asynchronous physician reviews on the community board or initiate instantaneous live video consultations with verified doctors.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center min-w-[110px]">
                <div className="text-xl font-extrabold text-cyan-400">{availableDoctors.length}</div>
                <div className="text-[11px] font-medium text-slate-400">Live Doctors</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center min-w-[110px]">
                <div className="text-xl font-extrabold text-white">{queries.length}</div>
                <div className="text-[11px] font-medium text-slate-400">Open Queries</div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Doctors Online Banner */}
        <div className="glass-panel-elevated rounded-2xl p-6 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="font-bold text-white text-base">On-Demand Live Consultations</h2>
            </div>
            <span className="text-xs text-slate-400">Real-time availability lock guard enabled</span>
          </div>

          {availableDoctors.length === 0 ? (
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-sm text-slate-400">
              No physicians are currently live. Submit an asynchronous query below and verified doctors will respond promptly.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableDoctors.map(doc => (
                <div key={doc._id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-between gap-3 hover:border-cyan-500/40 transition">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-sm text-white truncate">Dr. {doc.name}</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    </div>
                    <div className="text-xs font-mono font-semibold text-amber-400 mt-0.5">
                      {doc.plusRank || 'Plus 1 (+)'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-1">
                      {doc.credentials || 'Licensed Medical Practitioner'}
                    </div>
                  </div>

                  <button
                    disabled={bookingDocId === doc._id}
                    onClick={() => handleBookDoctor(doc._id)}
                    className="flex-shrink-0 flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 transition disabled:opacity-50"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>{bookingDocId === doc._id ? 'Connecting...' : 'Consult Live'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main 2-Column Section: Query Creation & Community Board */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Ask Query Form */}
          <div className="lg:col-span-4 glass-panel rounded-2xl p-6 border border-slate-800/80 sticky top-24">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm">
                +
              </div>
              <h2 className="font-bold text-white text-base">Submit Medical Query</h2>
            </div>

            <form onSubmit={handleSubmitQuery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-900 border border-slate-700/80 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="General">General Medicine</option>
                  <option value="Cardiology">Cardiology (Heart/Vascular)</option>
                  <option value="Dermatology">Dermatology (Skin)</option>
                  <option value="Neurology">Neurology (Brain/Nerve)</option>
                  <option value="Pediatrics">Pediatrics (Children)</option>
                  <option value="Orthopedics">Orthopedics (Bones/Joints)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Summary / Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Persistent sharp headache for 3 days"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Detailed Symptoms & Context
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Describe your symptoms, onset, medication, and triggers..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>

              {/* Real-time AI Triage Preview Warning */}
              {isEmergencyTyping && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">AI Safety Guard Active:</span> We detected emergency keywords in your input. If this is a life-threatening crisis, call emergency services (e.g. 911/112) immediately!
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Post to Community Board</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Community Board */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Filter & Search Header */}
            <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search symptoms or queries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div className="text-xs text-slate-400 self-end sm:self-center">
                  Showing <strong className="text-white">{filteredQueries.length}</strong> inquiries
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20'
                        : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Queries Feed */}
            {filteredQueries.length === 0 ? (
              <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 text-slate-400 text-sm">
                No queries found in this category. Be the first to ask!
              </div>
            ) : (
              <div className="space-y-5">
                {filteredQueries.map(q => (
                  <div
                    key={q._id}
                    className={`glass-panel rounded-2xl p-6 border transition-all ${
                      q.aiTriage?.isEmergency
                        ? 'border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-950/30'
                        : 'border-slate-800/80'
                    }`}
                  >
                    {/* Emergency Alert Banner */}
                    {q.aiTriage?.isEmergency && (
                      <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce flex-shrink-0" />
                          <span className="font-semibold">Urgent AI Safety Alert: Emergency keywords flagged</span>
                        </div>
                        <span className="font-mono text-[11px] bg-rose-500/20 px-2 py-0.5 rounded text-rose-300 border border-rose-500/30">
                          Confidence: {Math.round((q.aiTriage?.confidenceScore || 0.9) * 100)}%
                        </span>
                      </div>
                    )}

                    {/* Query Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                            {q.category}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(q.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white tracking-tight">{q.title}</h3>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-slate-900 border border-slate-800 text-slate-300">
                        Asked by {q.patientId?.name || 'Patient'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 mt-2.5 leading-relaxed">
                      {q.description}
                    </p>

                    {/* Responses Component */}
                    <div className="mt-6 pt-5 border-t border-slate-800/80">
                      <ResponsesSection queryId={q._id} />
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
};

// Subcomponent for Doctor Responses list & Star Rating
const ResponsesSection = ({ queryId }) => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoverRating, setHoverRating] = useState({});

  const fetchResponses = async () => {
    try {
      const { data } = await api.get(`/responses/query/${queryId}`);
      setResponses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, [queryId]);

  const handleRate = async (responseId, rating) => {
    try {
      await api.post(`/responses/${responseId}/rate`, { rating });
      fetchResponses();
    } catch (err) {
      alert('Could not submit rating');
    }
  };

  if (loading) {
    return <div className="text-xs text-slate-500 animate-pulse">Loading responses...</div>;
  }

  if (responses.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-xs text-slate-500 italic">
        <MessageSquare className="w-3.5 h-3.5" />
        <span>Awaiting verified doctor advice. Responses will be version-tracked.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
        <span>Verified Physician Advice ({responses.length})</span>
      </div>

      {responses.map(r => (
        <div key={r._id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          
          {/* Doctor Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-xs">
                MD
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-xs text-white">Dr. {r.doctorId?.name || 'Physician'}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="font-mono text-[11px] font-bold text-amber-400">
                  {r.doctorId?.plusRank || 'Plus 1 (+)'}
                </span>
              </div>
            </div>

            {/* Version Badge */}
            {r.versions && r.versions.length > 1 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Revised (v{r.versions.length}.0)
              </span>
            )}
          </div>

          {/* Advice content */}
          <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
            {r.currentContent}
          </p>

          {/* Rating Section */}
          <div className="pt-2 flex items-center justify-between text-xs">
            {r.rating ? (
              <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                <span className="text-yellow-400 flex">
                  {'★'.repeat(r.rating)}
                </span>
                <span>You rated this helpful ({r.rating}/5)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 text-[11px]">Helpful advice? Rate response:</span>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(prev => ({ ...prev, [r._id]: star }))}
                      onMouseLeave={() => setHoverRating(prev => ({ ...prev, [r._id]: 0 }))}
                      onClick={() => handleRate(r._id, star)}
                      className="p-0.5 text-base transition-transform hover:scale-125 focus:outline-none"
                    >
                      <span className={star <= (hoverRating[r._id] || 0) ? 'text-yellow-400' : 'text-slate-600'}>
                        ★
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      ))}
    </div>
  );
};

export default PatientDashboard;

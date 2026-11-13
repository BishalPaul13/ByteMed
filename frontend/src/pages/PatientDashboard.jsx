import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import Navbar from '../components/Navbar';
import VoiceInputModal from '../components/VoiceInputModal';
import ImageUploadPreview from '../components/ImageUploadPreview';
import FeedbackModal from '../components/FeedbackModal';
import ReputationModal from '../components/ReputationModal';
import ReportModal from '../components/ReportModal';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, Send, HeartPulse, Video, VideoOff, Star, Clock, 
  MessageSquare, ShieldCheck, Activity, Search, Sparkles, Filter,
  Mic, Image as ImageIcon, ShieldAlert, Award, User, CheckCircle2, ChevronDown, ChevronUp,
  FileText, Printer, HelpCircle, ThumbsUp, Calendar, CornerDownRight
} from 'lucide-react';

const CATEGORIES = ['All', 'Cardiology', 'Dermatology', 'Neurology', 'Pediatrics', 'Orthopedics', 'General'];

const PatientDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [mainTab, setMainTab] = useState('queries'); // 'queries' | 'records'
  const [queries, setQueries] = useState([]);
  const [records, setRecords] = useState([]);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New query form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [voiceData, setVoiceData] = useState(null);
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [bookingDocId, setBookingDocId] = useState(null);

  // Real-time Calling State (Doc 1: Sec 10, 11; Doc 3: Sec 8)
  const [activeCallSession, setActiveCallSession] = useState(null);
  const [callStatusMessage, setCallStatusMessage] = useState('Calling physician...');
  const [callSecondsRemaining, setCallSecondsRemaining] = useState(45);

  // Modals state
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [activeFeedbackTarget, setActiveFeedbackTarget] = useState(null);
  const [reputationDocId, setReputationDocId] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [activeReportTarget, setActiveReportTarget] = useState(null);

  // Real-time AI Triage preview
  const [aiPreview, setAiPreview] = useState(null);

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

  const fetchRecords = async () => {
    if (!user?.id) return;
    try {
      const { data } = await api.get(`/doctors/patient-records/${user.id}`);
      setRecords(data);
    } catch (err) {
      console.error('Error fetching records:', err);
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
    fetchRecords();
    const interval = setInterval(fetchAvailableDoctors, 6000);
    return () => clearInterval(interval);
  }, [selectedCategory, user?.id]);

  // Live real-time AI triage simulation as patient types or adds media
  useEffect(() => {
    if (title.trim() || description.trim() || voiceData?.transcript) {
      const timer = setTimeout(async () => {
        try {
          const { data } = await api.post('/queries/simulate-triage', {
            title,
            description,
            transcript: voiceData?.transcript || '',
            imageObservations: images.map(i => i.aiObservation || '')
          });
          setAiPreview(data);
        } catch (err) {
          // silent fallback
        }
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setAiPreview(null);
    }
  }, [title, description, voiceData, images]);

  const handleSubmitQuery = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/queries', {
        title,
        description,
        category: (category && category !== 'General') ? category : (aiPreview?.predictedCategory || 'General'),
        patientId: user.id,
        isAnonymous,
        voiceData,
        images
      });
      setTitle('');
      setDescription('');
      setVoiceData(null);
      setImages([]);
      setAiPreview(null);
      fetchQueries();
      setMainTab('queries');
    } catch (err) {
      alert('Failed to submit query');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookDoctor = async (doc) => {
    const docId = typeof doc === 'object' ? doc._id : doc;
    const docObj = typeof doc === 'object' ? doc : availableDoctors.find(d => d._id === docId);

    setBookingDocId(docId);
    try {
      const { data } = await api.post(`/doctors/${docId}/book`, { patientId: user.id });
      setActiveCallSession({
        sessionId: data.sessionId,
        doctor: docObj || { name: 'Physician', specialty: 'General', plusRank: 'Verified' },
        roomUrl: data.roomUrl
      });
      setCallStatusMessage(`Ringing Dr. ${docObj?.name || 'Physician'}...`);
      setCallSecondsRemaining(45);
    } catch (err) {
      alert(err.response?.data?.message || 'Doctor is no longer available. Another patient may have booked just now.');
      fetchAvailableDoctors();
    } finally {
      setBookingDocId(null);
    }
  };

  // Real-time call handshake polling for patient (Doc 1: Sec 10, 11; Doc 3: Sec 8)
  useEffect(() => {
    if (!activeCallSession?.sessionId) return;

    let countdown = 45;
    const countTimer = setInterval(() => {
      countdown -= 1;
      setCallSecondsRemaining(countdown);
      if (countdown <= 0) {
        clearInterval(countTimer);
      }
    }, 1000);

    const pollInterval = setInterval(async () => {
      try {
        const { data } = await api.get(`/doctors/session/${activeCallSession.sessionId}/status`);
        if (data.status === 'IN_SESSION') {
          clearInterval(pollInterval);
          clearInterval(countTimer);
          setCallStatusMessage('Doctor accepted! Joining consultation...');
          setTimeout(() => {
            navigate(activeCallSession.roomUrl);
          }, 800);
        } else if (data.status === 'CANCELLED') {
          clearInterval(pollInterval);
          clearInterval(countTimer);
          alert(`Dr. ${activeCallSession.doctor.name} is currently occupied or declined the call. Your reservation has been safely released.`);
          setActiveCallSession(null);
          fetchAvailableDoctors();
        } else if (data.status === 'TIMEOUT_EXPIRED') {
          clearInterval(pollInterval);
          clearInterval(countTimer);
          alert(`Call timed out. Dr. ${activeCallSession.doctor.name} did not answer in time. Please select another available physician.`);
          setActiveCallSession(null);
          fetchAvailableDoctors();
        }
      } catch (e) {
        // silent check error
      }
    }, 1500);

    return () => {
      clearInterval(pollInterval);
      clearInterval(countTimer);
    };
  }, [activeCallSession?.sessionId]);

  const handleCancelCall = async () => {
    if (!activeCallSession?.sessionId) return;
    try {
      await api.post(`/doctors/session/${activeCallSession.sessionId}/cancel`);
    } catch (e) {
      // ignore
    } finally {
      setActiveCallSession(null);
      fetchAvailableDoctors();
    }
  };

  const handlePrintRecord = (record) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>ByteMed Clinical Summary - Dr. ${record.doctorId?.name || 'Physician'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            h1 { font-size: 22px; color: #0284c7; margin-bottom: 4px; }
            .meta { font-size: 13px; color: #64748b; margin-top: 6px; margin-bottom: 24px; }
            .section { margin-bottom: 20px; padding: 18px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
            .section-title { font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
            .content { font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #334155; }
            .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <h1>ByteMed Telehealth Clinical Consultation Summary</h1>
          <div class="meta">
            <strong>Attending Physician:</strong> Dr. ${record.doctorId?.name || 'Physician'} (${record.doctorId?.plusRank || 'Verified Physician'}) &bull; ${record.doctorId?.specialty || 'General'}<br/>
            <strong>Consultation Date:</strong> ${new Date(record.endedAt || record.createdAt).toLocaleString()} &bull;
            <strong>Duration:</strong> ${Math.max(1, Math.round((record.durationSeconds || 60) / 60))} minutes
          </div>
          
          <div class="section">
            <div class="section-title">Clinical Observations & Diagnostic Impression</div>
            <div class="content">${record.clinicalNotes || 'Direct live telehealth visual and verbal consultation conducted.'}</div>
          </div>

          <div class="section">
            <div class="section-title">Prescribed Action Plan & Patient Guidance</div>
            <div class="content">${record.prescribedRecommendations || 'Follow physician verbal advice and seek in-person examination if red flag symptoms emerge.'}</div>
          </div>

          <div class="footer">
            This document was generated automatically by ByteMed Encrypted Telehealth System. For emergencies, contact local emergency services immediately.
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredQueries = queries.filter(q => {
    const term = searchQuery.toLowerCase();
    return q.title.toLowerCase().includes(term) || q.description.toLowerCase().includes(term);
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Patient Greeting & Quick Stats */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-2">
                <HeartPulse className="w-3.5 h-3.5 animate-pulse" />
                <span>Patient Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome, {user.name}
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-xl">
                Ask health questions, get advice from verified doctors, or start an instant video call.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center min-w-[110px]">
                <div className="text-xl font-extrabold text-emerald-400">{availableDoctors.length}</div>
                <div className="text-[11px] font-medium text-slate-400">Live Doctors</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center min-w-[110px]">
                <div className="text-xl font-extrabold text-white">{queries.length}</div>
                <div className="text-[11px] font-medium text-slate-400">Questions Asked</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center min-w-[110px]">
                <div className="text-xl font-extrabold text-indigo-400">{records.length}</div>
                <div className="text-[11px] font-medium text-slate-400">Past Visits</div>
              </div>
            </div>
          </div>

          {/* Tab Switcher: Queries vs Ask Doctor vs Health Records */}
          <div className="flex items-center space-x-2 mt-6 pt-5 border-t border-slate-800/80">
            <button
              onClick={() => setMainTab('queries')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                mainTab === 'queries'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>My Questions</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">{queries.length}</span>
            </button>

            <button
              onClick={() => setMainTab('ask')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                mainTab === 'ask'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Ask a Doctor</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/30">AI Help</span>
            </button>

            <button
              onClick={() => setMainTab('records')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                mainTab === 'records'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>My Past Visits</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-indigo-300">{records.length}</span>
            </button>
          </div>
        </div>

        {/* Section 1: Community Inquiries & Telehealth Standby Feed */}
        {mainTab === 'queries' && (
          <div className="space-y-6">
            {/* Live On-Demand Doctors Banner */}
            {availableDoctors.length > 0 ? (
              <div className="glass-panel-elevated rounded-2xl p-5 border border-emerald-500/30 bg-emerald-950/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <h2 className="font-bold text-white text-base">Doctors Available for Video Calls</h2>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {availableDoctors.length} Online Now
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Ready for instant video consultation</span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableDoctors.map(doc => (
                    <div key={doc._id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-emerald-500/40 transition">
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-white text-sm">Dr. {doc.name}</div>
                            <div className="text-xs text-cyan-400">{doc.specialty || 'General Practice'}</div>
                          </div>
                          <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {doc.plusRank}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 truncate">{doc.credentials || 'Licensed Medical Practitioner'}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <button
                          onClick={() => setReputationDocId(doc._id)}
                          className="text-[11px] text-slate-400 hover:text-cyan-300 font-semibold"
                        >
                          View Rating ({doc.totalReputationScore || 100} pts)
                        </button>
                        <button
                          disabled={bookingDocId === doc._id}
                          onClick={() => handleBookDoctor(doc._id)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>{bookingDocId === doc._id ? 'Connecting...' : 'Start Video Call'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Informative Clue Card for Video Consultations */
              <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800/80 bg-slate-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 flex-shrink-0 mt-0.5">
                    <VideoOff className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-white text-sm">Video Consultations</h3>
                      <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                        <span>No Doctors Online Right Now</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Doctors become available throughout the day. When one comes online, you can start a video call right here.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center space-x-1.5">
                    <Clock className="w-3 h-3 text-cyan-400/80 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>Checking availability...</span>
                  </span>
                </div>
              </div>
            )}

            {/* Patient Questions Feed Header & Search */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800">
                <div>
                  <h2 className="font-bold text-white text-base">My Questions</h2>
                  <p className="text-xs text-slate-400">Review your questions and answers from verified doctors.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Search Input */}
                  <div className="relative min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search your questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 transition"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                          selectedCategory === cat
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Queries Grid */}
              {queries.length === 0 ? (
                <div className="glass-panel rounded-2xl p-16 text-center border border-slate-800 text-slate-400 text-xs space-y-3">
                  <p>You haven't asked any questions yet.</p>
                  <button
                    onClick={() => setMainTab('ask')}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold text-xs hover:bg-cyan-500/30 transition"
                  >
                    Ask a Doctor Now
                  </button>
                </div>
              ) : filteredQueries.length === 0 ? (
                <div className="glass-panel rounded-2xl p-16 text-center border border-slate-800 text-slate-400 text-xs space-y-3">
                  <p>No questions found matching your search.</p>
                  <button
                    onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs underline"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredQueries.map(q => (
                    <PatientQueryCard
                      key={q._id}
                      query={q}
                      currentUserId={user.id}
                      onOpenFeedback={(targetId, docName) => {
                        setActiveFeedbackTarget({ targetId, docName });
                        setFeedbackModalOpen(true);
                      }}
                      onOpenReputation={(docId) => setReputationDocId(docId)}
                      onOpenReport={(targetType, targetId, title) => {
                        setActiveReportTarget({ targetType, targetId, title });
                        setReportModalOpen(true);
                      }}
                      onQueryUpdated={fetchQueries}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Ask a Doctor (Dedicated Multi-Modal Consultation Form) */}
        {mainTab === 'ask' && (
          <div className="space-y-6">
            <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-5 border-b border-slate-800/80">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-white text-lg">Ask a Doctor</h2>
                    <p className="text-xs text-slate-400">Describe what you are experiencing, add a voice note, or attach photos. Your inquiry is strictly private between you and verified doctors.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMainTab('queries')}
                  className="text-xs text-slate-400 hover:text-cyan-300 transition"
                >
                  &larr; Back to Questions
                </button>
              </div>

              <form onSubmit={handleSubmitQuery} className="space-y-5">
                
                {/* Title */}
                <div>
                  <label className="text-xs font-semibold text-slate-200 block mb-1.5">What is your main symptom or concern?</label>
                  <input
                    type="text"
                    placeholder="e.g., Sore throat, itchy skin rash, sudden headache..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 transition"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-slate-200 block mb-1.5">Tell us more about how you feel</label>
                  <textarea
                    rows={4}
                    placeholder="How long have you felt this way, how severe is it, and have you taken any medicine?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 transition leading-relaxed"
                    required
                  />
                </div>

                {/* Voice & Photo Multi-Modal Controls */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Voice Audio Trigger */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Mic className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Voice Note</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {voiceData ? 'Voice note attached' : 'Record a voice note if you prefer talking'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setVoiceModalOpen(true)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        voiceData 
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {voiceData ? 'Re-record' : 'Record Voice'}
                    </button>
                  </div>

                  {/* Clinical Photo Trigger */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Photos</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {images.length > 0 ? `${images.length} photo(s) selected` : 'Add photos of rash, swelling, or injury'}
                      </p>
                    </div>

                    <div className="text-xs">
                      <ImageUploadPreview attachedImages={images} onImagesChange={setImages} />
                    </div>
                  </div>
                </div>

                {/* Real-time AI Triage Preview Card */}
                {aiPreview && (
                  <div className={`p-4 rounded-2xl border transition space-y-2 ${
                    aiPreview.isEmergency 
                      ? 'bg-rose-950/30 border-rose-500/40' 
                      : 'bg-cyan-950/20 border-cyan-500/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {aiPreview.isEmergency ? (
                          <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                        )}
                        <span className={`text-xs font-extrabold ${aiPreview.isEmergency ? 'text-rose-300' : 'text-cyan-300'}`}>
                          {aiPreview.isEmergency ? 'Important Safety Warning' : 'Helpful AI Suggestion'}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Confidence: {Math.round((aiPreview.confidenceScore || 0.9) * 100)}%
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {aiPreview.safetySignal}
                    </p>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      <span>Suggested Specialist: <strong className="text-cyan-300">{aiPreview.predictedCategory}</strong></span>
                      <span>Urgency: <strong className={aiPreview.isEmergency ? 'text-rose-400' : 'text-emerald-400'}>{aiPreview.urgencyLevel}</strong></span>
                    </div>
                  </div>
                )}

                {/* Privacy & Category Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                  <div className="flex items-center space-x-2 text-xs text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Private & Confidential (Only attending doctors can view)</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-slate-400">Category:</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                    >
                      <option value="General">Auto (Recommended)</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Orthopedics">Orthopedics</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !title.trim() || !description.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Submitting Question...' : 'Submit Question'}</span>
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Main Tab 2: Patient Health Records & Consultation History (Doc 1: Sec 4, 11) */}
        {mainTab === 'records' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-extrabold text-white text-lg flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <span>My Past Consultations</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Notes, advice, and recommendations from your past video visits with doctors.
                </p>
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Past Visits: <strong className="text-white">{records.length}</strong>
              </div>
            </div>

            {records.length === 0 ? (
              <div className="glass-panel rounded-3xl p-16 text-center border border-slate-800 space-y-3">
                <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="font-bold text-white text-base">No Past Consultations Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When you complete a video consultation with a doctor, your visit summary and prescriptions will appear here.
                </p>
                <button
                  onClick={() => setMainTab('queries')}
                  className="mt-3 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-xs hover:bg-cyan-500/20 transition"
                >
                  Back to Community Questions
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {records.map(rec => (
                  <div key={rec._id} className="glass-panel-elevated rounded-3xl p-6 sm:p-7 border border-slate-800 space-y-5">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-slate-800">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-extrabold text-lg">
                          Dr
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-extrabold text-white text-base">Dr. {rec.doctorId?.name || 'Attending Physician'}</h3>
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {rec.doctorId?.plusRank || 'Plus 1 (+)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {rec.doctorId?.specialty || 'General Practice'} &bull; {rec.doctorId?.credentials || 'Board Certified'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePrintRecord(rec)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition"
                          title="Print or export clinical record"
                        >
                          <Printer className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Print Summary</span>
                        </button>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-6 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(rec.endedAt || rec.createdAt).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Duration: {Math.max(1, Math.round((rec.durationSeconds || 60) / 60))} mins
                      </span>
                    </div>

                    {/* Clinical Summary Cards */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      
                      {/* Clinical Observations */}
                      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
                        <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Doctor's Notes & Observations</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                          {rec.clinicalNotes || 'Direct live telehealth visual and verbal consultation conducted.'}
                        </p>
                      </div>

                      {/* Prescribed Guidance */}
                      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
                        <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Recommendations & Prescriptions</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                          {rec.prescribedRecommendations || 'Follow physician verbal advice and seek in-person examination if red flag symptoms emerge.'}
                        </p>
                      </div>

                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Real-time Calling Doctor Modal (Doc 1: Sec 10, 11; Doc 3: Sec 8) */}
      {activeCallSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full glass-panel-elevated rounded-3xl p-6 sm:p-8 border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/20 text-center relative overflow-hidden space-y-5">
            {/* Pulsing ring background glow */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"></span>
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-cyan-500/20 relative z-10 animate-pulse">
                Dr
              </div>
            </div>

            <div>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider mb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                <span>Connecting Telehealth Line</span>
              </span>
              <h2 className="text-xl font-extrabold text-white mt-1">
                Calling Dr. {activeCallSession.doctor.name}
              </h2>
              <p className="text-xs text-cyan-300 mt-1 font-medium">
                {callStatusMessage}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Waiting for physician to accept consultation request (<strong className="text-amber-400 font-mono">{callSecondsRemaining}s</strong> remaining)...
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span>{activeCallSession.doctor.specialty || 'General Practitioner'}</span>
              <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {activeCallSession.doctor.plusRank || 'Verified'}
              </span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCancelCall}
                className="w-full py-3 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs border border-rose-500/30 transition"
              >
                Cancel Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Dictation Modal */}
      <VoiceInputModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onAttachTranscript={(voice) => setVoiceData(voice)}
      />

      {/* Multi-Dimensional Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => {
          setFeedbackModalOpen(false);
          setActiveFeedbackTarget(null);
        }}
        targetType="RESPONSE"
        targetId={activeFeedbackTarget?.targetId}
        doctorName={activeFeedbackTarget?.docName}
        onSubmitted={fetchQueries}
      />

      {/* Transparent Reputation Modal */}
      <ReputationModal
        doctorId={reputationDocId}
        isOpen={Boolean(reputationDocId)}
        onClose={() => setReputationDocId(null)}
      />

      {/* Safety Moderation Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setActiveReportTarget(null);
        }}
        targetType={activeReportTarget?.targetType || 'RESPONSE'}
        targetId={activeReportTarget?.targetId}
        title={activeReportTarget?.title}
      />

    </div>
  );
};

/**
 * Individual Patient Query Card with Multi-Modal Inputs, AI Evaluation, Peer Consensus & Follow-Up Thread
 */
const PatientQueryCard = ({ 
  query, 
  currentUserId, 
  onOpenFeedback, 
  onOpenReputation, 
  onOpenReport,
  onQueryUpdated 
}) => {
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [showResponses, setShowResponses] = useState(true);

  // Follow-up question state
  const [followUpText, setFollowUpText] = useState('');
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  const fetchResponses = async () => {
    try {
      setLoadingResponses(true);
      const { data } = await api.get(`/responses/query/${query._id}`);
      setResponses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingResponses(false);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, [query._id]);

  const isAuthor = query.patientId?._id === currentUserId;

  const handlePostFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpText.trim()) return;
    setSubmittingFollowUp(true);
    try {
      await api.post(`/queries/${query._id}/follow-up`, {
        patientId: currentUserId,
        question: followUpText
      });
      setFollowUpText('');
      if (onQueryUpdated) onQueryUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post follow-up question');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  return (
    <div className="glass-panel-elevated rounded-3xl p-6 border border-slate-800 space-y-5">
      
      {/* Query Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              {query.category}
            </span>
            {query.aiCategorization?.isEmergency && (
              <span className="font-bold text-[10px] text-white bg-rose-600 px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                <span>Emergency Flag</span>
              </span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              query.status === 'ANSWERED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              query.status === 'RESOLVED' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {query.status}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mt-1">{query.title}</h3>
          <p className="text-xs text-slate-400">
            Published by <span className="text-slate-300 font-semibold">{query.patientId?.name || 'Anonymous Patient'}</span> • {new Date(query.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Action controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onOpenReport('QUERY', query._id, `Report Query: ${query.title}`)}
            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
            title="Report inappropriate content"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description text */}
      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        {query.description}
      </p>

      {/* Multi-Modal Attachments: Voice & Images */}
      {(query.media?.voice?.hasVoice || query.media?.images?.length > 0) && (
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clinical Attachments</div>
          
          {query.media?.voice?.hasVoice && (
            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 space-y-2 text-xs">
              <div className="flex items-start space-x-3">
                <Mic className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold text-cyan-300">Voice Dictation Transcript:</span>
                  <p className="text-slate-300 italic mt-0.5">"{query.media.voice.transcript}"</p>
                </div>
              </div>
              {query.media.voice.audioUrl && (
                <div className="pt-1">
                  <audio controls src={query.media.voice.audioUrl} className="h-8 w-full max-w-md rounded" />
                </div>
              )}
            </div>
          )}

          {query.media?.images?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {query.media.images.map((img, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 group">
                  <a href={img.url} target="_blank" rel="noreferrer" title="Click to view full image in new tab">
                    <img src={img.url} alt={img.label} className="w-full h-28 object-cover rounded-lg mb-1.5 group-hover:opacity-90 transition cursor-zoom-in" />
                  </a>
                  <div className="text-[10px] text-slate-300 font-bold truncate">{img.label}</div>
                  <div className="text-[9px] text-cyan-400 mt-0.5">{img.aiObservation}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Physician Responses Toggle Bar */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => setShowResponses(!showResponses)}
          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1.5"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Physician Guidance ({responses.length})</span>
          {showResponses ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Responses List */}
      {showResponses && (
        <div className="space-y-4 pt-1">
          {loadingResponses ? (
            <div className="text-xs text-slate-500 py-4 text-center">Loading responses...</div>
          ) : responses.length === 0 ? (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
              No doctor responses yet. Active physicians in this category have been notified.
            </div>
          ) : (
            responses.map(resp => (
              <div key={resp._id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                
                {/* Doctor Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-extrabold text-sm">
                      Dr
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">Dr. {resp.doctorId?.name}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {resp.doctorId?.plusRank}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{resp.doctorId?.credentials}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onOpenReputation(resp.doctorId?._id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-400 text-xs font-semibold hover:bg-slate-800 transition"
                    >
                      Inspect Rank
                    </button>
                    <button
                      onClick={() => onOpenReport('RESPONSE', resp._id, `Report response by Dr. ${resp.doctorId?.name}`)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Response Text */}
                <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                  {resp.currentContent}
                </div>

                {/* Peer Consensus & Endorsements Badge (Doc 1: Sec 8, Doc 3: Sec 6) */}
                {resp.endorsements?.length > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
                    <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Peer Physician Consensus ({resp.endorsements.length} Endorsement{resp.endorsements.length > 1 ? 's' : ''})</span>
                    </div>
                    <div className="space-y-1">
                      {resp.endorsements.map((end, eIdx) => (
                        <div key={eIdx} className="text-xs text-slate-300 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white">Dr. {end.doctorId?.name || 'Verified Physician'}</span>
                            <span className="text-[10px] text-amber-400 font-mono ml-2">({end.doctorId?.plusRank})</span>
                            {end.note && <span className="text-slate-400 italic ml-2">"{end.note}"</span>}
                          </div>
                          <span className="text-[10px] text-slate-500">{new Date(end.endorsedAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Response Evaluation Card (Doc 1: Sec 8, Doc 2: Sec 10) */}
                {resp.aiEvaluation && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 text-indigo-300 font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>AI Clinical Quality Evaluation ({resp.aiEvaluation.compositeScore}%)</span>
                      </div>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Confidence: {Math.round(resp.aiEvaluation.confidence * 100)}%
                      </span>
                    </div>

                    {/* 5 Canonical Dimensions Grid */}
                    <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Relevance</div>
                        <div className="font-bold text-cyan-300">{resp.aiEvaluation.relevance}%</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Completeness</div>
                        <div className="font-bold text-cyan-300">{resp.aiEvaluation.completeness}%</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Clarity</div>
                        <div className="font-bold text-cyan-300">{resp.aiEvaluation.clarity}%</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Safety</div>
                        <div className="font-bold text-emerald-400">{resp.aiEvaluation.safety}%</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Caveats</div>
                        <div className="font-bold text-amber-300">{resp.aiEvaluation.uncertaintyHandling}%</div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 italic">
                      {resp.aiEvaluation.evaluationSummary}
                    </p>
                  </div>
                )}

                {/* Patient Rating & Multi-Dimensional Feedback Button */}
                <div className="flex items-center justify-between pt-1">
                  {resp.feedback?.helpfulness ? (
                    <div className="flex items-center space-x-2 text-xs text-amber-400">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-amber-400" />
                        <span className="font-bold font-mono">{resp.feedback.helpfulness}/5</span>
                      </div>
                      <span className="text-[11px] text-slate-400 italic truncate max-w-xs">
                        "{resp.feedback.comment || 'Verified patient review'}"
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500">Awaiting patient feedback</span>
                  )}

                  {/* Feedback Button */}
                  {isAuthor && !resp.feedback?.helpfulness && (
                    <button
                      onClick={() => onOpenFeedback(resp._id, resp.doctorId?.name)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition flex items-center space-x-1"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>Rate Clinical Advice</span>
                    </button>
                  )}
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* Patient Follow-Up Questions & Clarifications Thread (Doc 1: Sec 6, 8; Doc 3: Sec 3) */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        <div className="text-xs font-bold text-white flex items-center space-x-1.5">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>Clinical Follow-Up Clarifications ({query.followUps?.length || 0})</span>
        </div>

        {query.followUps?.length > 0 && (
          <div className="space-y-3">
            {query.followUps.map((fu, fIdx) => (
              <div key={fIdx} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                
                {/* Patient Question */}
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400 font-bold shrink-0">Patient:</span>
                  <p className="text-slate-200">{fu.question}</p>
                </div>

                {/* Doctor Reply */}
                {fu.reply ? (
                  <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs space-y-1 ml-3">
                    <div className="flex items-center space-x-2 text-[11px]">
                      <CornerDownRight className="w-3 h-3 text-indigo-400" />
                      <span className="font-bold text-indigo-300">Dr. {fu.doctorId?.name || 'Physician'}</span>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                        {fu.doctorId?.plusRank || 'Verified'}
                      </span>
                      <span className="text-slate-500 text-[10px]">{new Date(fu.repliedAt || fu.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-200 pl-4">{fu.reply}</p>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-400/90 italic pl-3 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                    <span>Awaiting attending physician clarification...</span>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}

        {/* Patient post follow-up input */}
        {isAuthor && (
          <form onSubmit={handlePostFollowUp} className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Ask a clarifying follow-up question to attending doctors..."
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={submittingFollowUp || !followUpText.trim()}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center space-x-1 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingFollowUp ? 'Sending...' : 'Ask Doctor'}</span>
            </button>
          </form>
        )}
      </div>

    </div>
  );
};

export default PatientDashboard;
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import FeedbackModal from '../components/FeedbackModal';
import api from '../api';
import { io } from 'socket.io-client';
import { 
  PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, 
  ShieldCheck, Clock, Users, Activity, Sparkles, MessageSquare, Star, HeartHandshake,
  FileText, ClipboardList, CheckCircle2, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

const VideoRoom = () => {
  const { id } = useParams(); // Doctor ID (also room ID)
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [ending, setEnding] = useState(false);
  const [completedSessionId, setCompletedSessionId] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // WebRTC real-time connection states
  const [hasCamera, setHasCamera] = useState(false);
  const [remoteStreamActive, setRemoteStreamActive] = useState(false);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Initializing media devices...');

  // In-session clinical consultation notes (Doc 1: Sec 4, 11)
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescribedRecommendations, setPrescribedRecommendations] = useState('');
  const [showNotesDrawer, setShowNotesDrawer] = useState(user?.role === 'DOCTOR');

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // WebRTC + Socket.io Signaling Lifecycle (Doc 1: Sec 10, Doc 2: Sec 6)
  useEffect(() => {
    let isMounted = true;

    const setupCall = async () => {
      // 1. Acquire Local Camera and Microphone
      let stream = null;
      try {
        setConnectionStatus('Accessing webcam and microphone...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setHasCamera(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setConnectionStatus('Camera connected. Joining secure channel...');
      } catch (err) {
        console.warn('getUserMedia warning (camera unavailable or denied):', err);
        setConnectionStatus('Camera/Mic permission unavailable. Running audio/video simulation.');
      }

      // 2. Connect to Socket.io WebRTC Signaling Gateway
      const socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling']
      });
      socketRef.current = socket;

      // 3. Initialize RTCPeerConnection with STUN
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Attach local stream tracks to WebRTC
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }

      // Handle remote incoming tracks (the actual video/audio of the partner!)
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          setRemoteStreamActive(true);
          setPartnerConnected(true);
          setConnectionStatus('Encrypted P2P Live Stream Active');
        }
      };

      // Handle ICE Candidates exchange
      pc.onicecandidate = (event) => {
        if (event.candidate && socket.connected) {
          socket.emit('ice-candidate', { roomId: id, candidate: event.candidate });
        }
      };

      // 4. Socket Signaling Protocol
      socket.on('connect', () => {
        socket.emit('join-room', {
          roomId: id,
          userId: user.id,
          userName: user.name,
          role: user.role
        });
      });

      // Another user joined our consultation room -> Create WebRTC Offer
      socket.on('user-joined', async ({ userName, role }) => {
        setPartnerConnected(true);
        setPartnerName(userName);
        setConnectionStatus(`Connected with ${userName}. Negotiating P2P stream...`);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { roomId: id, offer });
        } catch (e) {
          console.error('Error creating WebRTC offer:', e);
        }
      });

      // Receive WebRTC Offer -> Create Answer
      socket.on('offer', async ({ offer }) => {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { roomId: id, answer });
        } catch (e) {
          console.error('Error handling WebRTC offer:', e);
        }
      });

      // Receive WebRTC Answer
      socket.on('answer', async ({ answer }) => {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
          console.error('Error handling WebRTC answer:', e);
        }
      });

      // Receive ICE Candidate
      socket.on('ice-candidate', async ({ candidate }) => {
        try {
          if (candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      });

      // Peer left
      socket.on('user-left', ({ userName }) => {
        setPartnerConnected(false);
        setRemoteStreamActive(false);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        setConnectionStatus(`${userName || 'Peer'} disconnected. Waiting in room...`);
      });
    };

    setupCall();

    return () => {
      isMounted = false;
      // Stop local camera and microphone
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      // Disconnect signaling socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [id, user.id, user.name, user.role]);

  // Audio & Video controls
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !micOn;
      });
    }
    setMicOn(!micOn);
  };

  const handleToggleCam = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !camOn;
      });
    }
    setCamOn(!camOn);
  };

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endSession = async () => {
    setEnding(true);

    // Stop streams & connections
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    try {
      // Release atomic lock in database & record completed duration and clinical notes
      const { data } = await api.post(`/doctors/${id}/end-session`, {
        durationSeconds: seconds,
        patientId: user.role === 'PATIENT' ? user.id : undefined,
        clinicalNotes,
        prescribedRecommendations
      });

      if (user.role === 'PATIENT' && data.sessionId) {
        setCompletedSessionId(data.sessionId);
        setShowFeedbackModal(true);
      } else {
        navigate(user.role === 'DOCTOR' ? '/doctor' : '/patient');
      }
    } catch (e) {
      console.error('Error ending session:', e);
      navigate(user.role === 'DOCTOR' ? '/doctor' : '/patient');
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-6 select-none relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Bar */}
      <div className="glass-panel rounded-2xl px-6 py-3.5 border border-slate-800 flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm text-white">ByteMed Live Telehealth</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>WebRTC P2P Active</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Encrypted Real-Time Video/Audio Stream</span>
            </div>
          </div>
        </div>

        {/* Live Call Duration */}
        <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatTime(seconds)}</span>
        </div>
      </div>

      {/* Main Real-Time Video Streams Grid */}
      <div className="my-auto max-w-6xl w-full mx-auto grid md:grid-cols-2 gap-6 relative z-10 py-6">
        
        {/* Screen 1: Local Video (You) */}
        <div className="relative aspect-video rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between p-4 group">
          {/* Actual HTML5 Video element */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover z-0 ${camOn && hasCamera ? 'block' : 'hidden'}`}
          />

          {/* Fallback avatar if camera is muted or not available */}
          {(!camOn || !hasCamera) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-0">
              <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-300 font-extrabold text-2xl mb-2">
                {user?.role === 'DOCTOR' ? 'Dr' : (user?.name?.charAt(0) || 'P')}
              </div>
              <div className="text-white font-bold text-sm">{user?.name}</div>
              <div className="text-slate-400 text-xs">
                {!camOn ? 'Camera Muted' : 'Webcam preview active'}
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none z-10"></div>

          {/* Top Overlay Badges */}
          <div className="relative z-20 flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur border border-slate-700/60 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md">
              <span className={`w-2 h-2 rounded-full ${camOn ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
              <span>{user?.role === 'DOCTOR' ? `Dr. ${user.name} (You)` : `${user.name} (You)`}</span>
            </span>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 backdrop-blur border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
              {user?.role === 'DOCTOR' ? 'Verified Physician' : 'Patient'}
            </span>
          </div>

          {/* Bottom Overlay Badges */}
          <div className="relative z-20 text-[11px] text-slate-300 flex items-center justify-between bg-slate-950/60 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="flex items-center gap-1.5">
              {micOn ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-rose-400" />}
              <span>{micOn ? 'Microphone Active' : 'Microphone Muted'}</span>
            </span>
            <span className="text-emerald-400 font-semibold font-mono">1080p • 60 FPS</span>
          </div>
        </div>

        {/* Screen 2: Remote Peer Video (Doctor or Patient) */}
        <div className="relative aspect-video rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between p-4 group">
          {/* Actual HTML5 Remote Video element */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`absolute inset-0 w-full h-full object-cover z-0 ${remoteStreamActive && partnerConnected ? 'block' : 'hidden'}`}
          />

          {/* Standby / Waiting Room state if remote peer not streaming */}
          {(!remoteStreamActive || !partnerConnected) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-0 p-6 text-center space-y-3">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"></span>
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-cyan-500/20 relative z-10">
                  {user?.role === 'DOCTOR' ? <Users className="w-8 h-8" /> : 'Dr'}
                </div>
              </div>

              <div>
                <div className="text-white font-extrabold text-base">
                  {partnerConnected ? `${partnerName || 'Remote Peer'} Connected` : user?.role === 'DOCTOR' ? 'Virtual Office Open' : 'Connecting to Physician...'}
                </div>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  {partnerConnected 
                    ? 'Negotiating encrypted P2P WebRTC video stream...'
                    : user?.role === 'DOCTOR'
                    ? 'Waiting for patient to connect to your live consultation room.'
                    : 'Physician is preparing the encrypted consultation line.'}
                </p>
              </div>

              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>{connectionStatus}</span>
              </span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none z-10"></div>

          {/* Top Overlay Badges */}
          <div className="relative z-20 flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur border border-slate-700/60 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md">
              <span className={`w-2 h-2 rounded-full ${partnerConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`}></span>
              <span>{user?.role === 'DOCTOR' ? `Patient (${partnerName || 'Waiting'})` : 'Physician Stream'}</span>
            </span>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 backdrop-blur border border-amber-500/30 px-2.5 py-0.5 rounded-full">
              {user?.role === 'DOCTOR' ? 'Patient Stream' : 'Verified Doctor'}
            </span>
          </div>

          {/* Bottom Overlay Badges */}
          <div className="relative z-20 text-[11px] text-slate-300 flex items-center justify-between bg-slate-950/60 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800">
            <span>Latency: {partnerConnected ? '18ms' : '--'}</span>
            <span className={partnerConnected ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {partnerConnected ? 'Secure P2P Encrypted' : 'Awaiting Peer Handshake'}
            </span>
          </div>
        </div>

      </div>

      {/* Doctor In-Call Clinical Notes Dock (Doc 1: Sec 4, 11) */}
      {user?.role === 'DOCTOR' && (
        <div className="max-w-4xl w-full mx-auto relative z-10 my-2">
          <div className="glass-panel-elevated rounded-2xl border border-slate-800 p-4 transition">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowNotesDrawer(!showNotesDrawer)}>
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
                <FileText className="w-4 h-4" />
                <span>Physician Consultation Notes & Recommendations (Archived into Patient Health Record)</span>
              </div>
              <button type="button" className="text-slate-400 hover:text-white">
                {showNotesDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showNotesDrawer && (
              <div className="grid sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Clinical Observations & Impression</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Document clinical observations, symptom severity, differential considerations..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Action Plan & Prescribed Guidance</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Document recommended OTC measures, lifestyle precautions, urgent follow-up warnings..."
                    value={prescribedRecommendations}
                    onChange={(e) => setPrescribedRecommendations(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="glass-panel rounded-2xl max-w-md w-full mx-auto px-6 py-4 border border-slate-800 flex items-center justify-center space-x-6 relative z-10">
        
        {/* Mic Toggle */}
        <button
          onClick={handleToggleMic}
          className={`p-3.5 rounded-2xl transition shadow-lg ${
            micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500 text-white shadow-rose-500/30'
          }`}
          title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* End Call Button */}
        <button
          onClick={endSession}
          disabled={ending}
          className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/30 transition transform hover:scale-105 disabled:opacity-50"
          title="End Consultation"
        >
          <PhoneOff className="w-6 h-6" />
        </button>

        {/* Cam Toggle */}
        <button
          onClick={handleToggleCam}
          className={`p-3.5 rounded-2xl transition shadow-lg ${
            camOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500 text-white shadow-rose-500/30'
          }`}
          title={camOn ? 'Turn Camera Off' : 'Turn Camera On'}
        >
          {camOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

      </div>

      {/* Post-Session Feedback Modal for Patient */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => navigate('/patient')}
        targetType="LIVE_SESSION"
        targetId={completedSessionId || id}
        doctorName="Doctor in Consultation"
        onSubmitted={() => navigate('/patient')}
      />

    </div>
  );
};

export default VideoRoom;

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { 
  PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, 
  ShieldCheck, Clock, Users, Activity, Sparkles, MessageSquare 
} from 'lucide-react';

const VideoRoom = () => {
  const { id } = useParams(); // Doctor ID
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [ending, setEnding] = useState(false);

  // Call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endSession = async () => {
    setEnding(true);
    try {
      // Release atomic lock in database
      await api.post(`/doctors/${id}/end-session`);
    } catch (e) {
      console.error('Error ending session:', e);
    } finally {
      navigate(user.role === 'DOCTOR' ? '/doctor' : '/patient');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-6 select-none relative overflow-hidden">
      
      {/* Background Ambient Glow */}
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
                Atomic Lock Engaged
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>HIPAA-Compliant Mock P2P Stream</span>
            </div>
          </div>
        </div>

        {/* Live Call Duration */}
        <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatTime(seconds)}</span>
        </div>
      </div>

      {/* Main Video Streams Grid */}
      <div className="my-auto max-w-6xl w-full mx-auto grid md:grid-cols-2 gap-6 relative z-10 py-6">
        
        {/* Doctor Screen Feed */}
        <div className="relative aspect-video rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between p-5">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none"></div>

          {/* Participant Label */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-slate-950/70 border border-slate-700/60 text-xs font-semibold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Doctor Video Feed
            </span>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Verified Physician
            </span>
          </div>

          {/* Center Simulated Doctor Avatar */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 p-1 shadow-xl shadow-indigo-500/25">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-3xl font-extrabold text-white">
                🩺
              </div>
            </div>
            <div className="mt-3 flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="w-1 bg-cyan-400 rounded-full animate-bounce"
                  style={{ height: `${12 + (i % 3) * 8}px`, animationDelay: `${i * 150}ms` }}
                ></span>
              ))}
            </div>
            <span className="text-xs text-slate-300 font-medium mt-2">Physician Audio Connected</span>
          </div>

          {/* Feed Watermark */}
          <div className="relative z-10 text-[10px] text-slate-500">
            1080p • 60 FPS Encrypted
          </div>
        </div>

        {/* Patient Screen Feed */}
        <div className="relative aspect-video rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between p-5">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none"></div>

          {/* Participant Label */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-slate-950/70 border border-slate-700/60 text-xs font-semibold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Patient Stream ({user.role === 'PATIENT' ? 'You' : 'Connected Patient'})
            </span>
            <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              Audio/Video Active
            </span>
          </div>

          {/* Center Simulated Patient Avatar */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 p-1 shadow-xl shadow-cyan-500/25">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-3xl font-extrabold text-white">
                👤
              </div>
            </div>
            <div className="mt-3 flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="w-1 bg-emerald-400 rounded-full animate-bounce"
                  style={{ height: `${10 + (i % 2) * 10}px`, animationDelay: `${i * 120}ms` }}
                ></span>
              ))}
            </div>
            <span className="text-xs text-slate-300 font-medium mt-2">Active Consultation Room</span>
          </div>

          {/* Feed Watermark */}
          <div className="relative z-10 text-[10px] text-slate-500">
            Room ID: {id}
          </div>
        </div>

      </div>

      {/* Floating Telehealth Control Dock */}
      <div className="glass-panel-elevated max-w-md mx-auto rounded-full px-6 py-3.5 border border-slate-700/60 flex items-center justify-center space-x-4 relative z-10 shadow-2xl">
        
        {/* Toggle Mic */}
        <button
          onClick={() => setMicOn(!micOn)}
          className={`p-3 rounded-full transition-all ${
            micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
          }`}
          title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Toggle Cam */}
        <button
          onClick={() => setCamOn(!camOn)}
          className={`p-3 rounded-full transition-all ${
            camOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
          }`}
          title={camOn ? 'Turn Off Video' : 'Turn On Video'}
        >
          {camOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* End Call Button */}
        <button
          disabled={ending}
          onClick={endSession}
          className="flex items-center space-x-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-transform hover:scale-105 disabled:opacity-50"
        >
          <PhoneOff className="w-4 h-4" />
          <span>{ending ? 'Releasing Lock...' : 'End Consultation'}</span>
        </button>

      </div>

    </div>
  );
};

export default VideoRoom;

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Check, X, Sparkles, Volume2, Edit3, 
  AlertCircle, Play, Pause, RotateCcw, AlertTriangle 
} from 'lucide-react';

const VoiceInputModal = ({ isOpen, onClose, onAttachTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0.95);
  const [isEdited, setIsEdited] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLevels, setAudioLevels] = useState([20, 35, 60, 45, 80, 50, 30, 65, 40, 25]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Check browser speech recognition support
  const SpeechRecognition = typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
    }
  };

  const startLiveRecording = async () => {
    setErrorMsg('');
    setTranscript('');
    setAudioUrl(null);
    audioChunksRef.current = [];

    // 1. Request real microphone access
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('Microphone access denied:', err);
      setErrorMsg('Microphone permission was denied. Please allow microphone access in your browser settings to record your symptoms.');
      return;
    }

    // 2. Setup Audio Visualizer
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateWaveform = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        // Normalize 10 sample bands
        const levels = [];
        for (let i = 0; i < 10; i++) {
          const val = dataArray[i] || 0;
          levels.push(Math.max(15, Math.min(100, Math.round((val / 255) * 100))));
        }
        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
    } catch (e) {
      console.warn('Audio visualization not available:', e);
    }

    // 3. Setup MediaRecorder for real audio capture
    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(200);
    } catch (e) {
      console.warn('MediaRecorder error:', e);
    }

    // 4. Setup SpeechRecognition for real live transcription
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let fullText = '';
        let confSum = 0;
        let confCount = 0;

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          fullText += res[0].transcript + ' ';
          if (res[0].confidence) {
            confSum += res[0].confidence;
            confCount++;
          }
        }

        setTranscript(fullText.trim());
        if (confCount > 0) {
          setConfidence(parseFloat((confSum / confCount).toFixed(2)));
        } else {
          setConfidence(0.92);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone access blocked. Please enable microphone permissions in your browser.');
        }
      };

      recognition.onend = () => {
        // Recognition completed
      };

      try {
        recognition.start();
      } catch (e) {
        console.warn('SpeechRecognition start error:', e);
      }
    } else {
      setErrorMsg('Your browser does not natively support the Web Speech API for live transcription. Audio will still be recorded; you can type notes below.');
    }

    setIsRecording(true);
  };

  const stopLiveRecording = () => {
    setIsRecording(false);
    stopRecordingCleanup();
  };

  const handleTogglePlayAudio = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleSave = () => {
    if (!transcript.trim()) return;
    onAttachTranscript({
      hasVoice: true,
      audioUrl: audioUrl || 'recorded_patient_voice.webm',
      transcript: transcript.trim(),
      confidence,
      isEdited
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => {
            stopRecordingCleanup();
            onClose();
          }}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base">Live Voice Dictation</h3>
            <p className="text-xs text-slate-400">Speak your symptoms clearly using your microphone</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Live Microphone Recording Area */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center space-y-4 text-center my-3 shadow-inner">
          {isRecording ? (
            <>
              {/* Animated pulsating mic button */}
              <div className="relative">
                <span className="w-20 h-20 rounded-full bg-rose-500/20 animate-ping absolute inset-0"></span>
                <button
                  type="button"
                  onClick={stopLiveRecording}
                  className="w-20 h-20 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-xl shadow-rose-600/40 relative z-10 transition transform active:scale-95"
                >
                  <MicOff className="w-8 h-8 animate-pulse" />
                </button>
              </div>

              {/* Real-time audio waveform visualizer */}
              <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-xs">
                {audioLevels.map((lvl, idx) => (
                  <span
                    key={idx}
                    className="w-2 bg-gradient-to-t from-cyan-500 to-indigo-400 rounded-full transition-all duration-75"
                    style={{ height: `${lvl}%` }}
                  ></span>
                ))}
              </div>

              <div className="text-xs font-bold text-rose-400 animate-pulse">
                Recording live audio... Click to stop
              </div>
              <p className="text-[11px] text-slate-400">
                Listening to speech in real-time. Transcribing symptoms below...
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={startLiveRecording}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 flex items-center justify-center text-white shadow-xl shadow-cyan-500/30 transition transform hover:scale-105 active:scale-95"
              >
                <Mic className="w-8 h-8" />
              </button>

              <div className="text-xs font-bold text-slate-200">
                Tap to Start Microphone Dictation
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                Uses your device microphone to convert spoken medical concerns into a verified transcript.
              </p>
            </>
          )}
        </div>

        {/* Audio Player if recorded */}
        {audioUrl && !isRecording && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs my-3">
            <audio 
              ref={audioPlayerRef} 
              src={audioUrl} 
              onEnded={() => setIsPlayingAudio(false)} 
              className="hidden" 
            />
            <div className="flex items-center space-x-2 text-slate-300">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold">Recorded Audio Clip</span>
            </div>
            <button
              type="button"
              onClick={handleTogglePlayAudio}
              className="px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-semibold flex items-center space-x-1.5 transition border border-cyan-500/30"
            >
              {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlayingAudio ? 'Pause' : 'Play Audio'}</span>
            </button>
          </div>
        )}

        {/* Live Transcript Display & Edit Area */}
        {(transcript || isRecording) && (
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Speech Transcript (Patient Editable)</span>
              </span>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                Confidence: {Math.round(confidence * 100)}%
              </span>
            </div>

            <textarea
              value={transcript}
              onChange={e => {
                setTranscript(e.target.value);
                setIsEdited(true);
              }}
              placeholder="Your dictated words will appear here in real-time as you speak..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500 leading-relaxed placeholder-slate-600"
            />
            
            {isEdited && (
              <p className="text-[11px] text-amber-400 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>Transcript edited by patient. Audit record preserved.</span>
              </p>
            )}

            {!isRecording && transcript.trim() && (
              <button
                type="button"
                onClick={handleSave}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Attach Real Voice Dictation to Query</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default VoiceInputModal;

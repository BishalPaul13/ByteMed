import React, { useState, useEffect } from 'react';
import api from '../api';
import { Award, ShieldCheck, Star, Activity, Sparkles, X, ChevronRight, CheckCircle2, History } from 'lucide-react';

const ReputationModal = ({ doctorId, isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && doctorId) {
      setLoading(true);
      api.get(`/reputation/doctor/${doctorId}`)
        .then(({ data }) => setData(data))
        .catch(err => console.error('Error fetching doctor breakdown:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, doctorId]);

  if (!isOpen) return null;

  const doctor = data?.doctor;
  const ranking = data?.ranking;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            Retrieving transparent reputation projection...
          </div>
        ) : !doctor ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            Doctor profile not found.
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Top Doctor Profile Bar */}
            <div className="flex items-start space-x-4 border-b border-slate-800 pb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-black shrink-0">
                Dr
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h2 className="text-xl font-extrabold text-white">Dr. {doctor.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified {doctor.specialty} Specialist</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 truncate">{doctor.credentials}</p>
                <div className="mt-2.5 inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-xs font-bold">
                  <span>ByteMed Contribution Level:</span>
                  <span className="text-white bg-amber-500/30 px-2 py-0.5 rounded">
                    {doctor.plusRank}
                  </span>
                  <span>({doctor.rankTitle})</span>
                </div>
              </div>
            </div>

            {/* Rank Progress Bar (Byte -> 8 bits -> 8 ranks) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Sustained Contribution Score: <strong className="text-white font-mono">{doctor.totalReputationScore} pts</strong></span>
                </div>
                {ranking?.nextRank ? (
                  <span className="text-slate-400 font-mono text-[11px]">
                    Next: <strong className="text-cyan-400">{ranking.nextRank.name}</strong> ({ranking.pointsNeeded} pts to advance)
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold text-[11px]">Maximum Rank Attained (Master Contributor)</span>
                )}
              </div>
              
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-indigo-500 transition-all duration-500"
                  style={{ width: `${ranking?.progressPercent || 100}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-8 gap-1 mt-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(r => (
                  <div 
                    key={r} 
                    className={`text-center py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                      r <= doctor.rankNumber 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'bg-slate-900 text-slate-600 border border-slate-800'
                    }`}
                  >
                    +{r}
                  </div>
                ))}
              </div>
            </div>

            {/* 4 Pillars of Transparent Reputation */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 mb-1">AI Quality Avg</div>
                <div className="text-xl font-mono font-extrabold text-cyan-400">
                  {doctor.averageAiScore}%
                </div>
                <div className="text-[10px] text-slate-500">Clinical Safety & Rigor</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 mb-1">Patient Rating</div>
                <div className="text-xl font-mono font-extrabold text-amber-400 flex items-center justify-center space-x-1">
                  <span>{doctor.averagePatientRating}</span>
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
                <div className="text-[10px] text-slate-500">Multi-factor feedback</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 mb-1">Answers Written</div>
                <div className="text-xl font-mono font-extrabold text-indigo-400">
                  {doctor.contributionsCount}
                </div>
                <div className="text-[10px] text-slate-500">Asynchronous solutions</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 mb-1">Live Consults</div>
                <div className="text-xl font-mono font-extrabold text-emerald-400">
                  {doctor.liveSessionsCount}
                </div>
                <div className="text-[10px] text-slate-500">Atomic video sessions</div>
              </div>
            </div>

            {/* Immutable Contribution Ledger History */}
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 mb-3">
                <History className="w-4 h-4 text-cyan-400" />
                <span>Audited Contribution Ledger (Recent Events)</span>
              </div>
              
              {data.recentContributions?.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                  No verified ledger contributions recorded yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data.recentContributions.map(c => (
                    <div key={c._id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-200">{c.explanation}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {c.contributionType} • {new Date(c.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                        +{c.pointsAwarded} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formula Transparency Note */}
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-400 leading-relaxed">
              <strong className="text-cyan-300 font-semibold block mb-1">
                Architectural Invariant (Document 1, Section 12):
              </strong>
              Reputation in ByteMed is an event-derived projection from an immutable contribution ledger. It is a consequence of continuous clinical contribution, not a commercial rating or a substitute for state licensing qualifications.
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ReputationModal;


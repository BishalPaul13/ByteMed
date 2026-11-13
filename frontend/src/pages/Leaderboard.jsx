import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ReputationModal from '../components/ReputationModal';
import api from '../api';
import { 
  Award, ShieldCheck, Star, Activity, Sparkles, Filter, 
  Search, ExternalLink, ChevronRight, CheckCircle2 
} from 'lucide-react';

const CATEGORIES = ['All', 'Cardiology', 'Dermatology', 'Neurology', 'Pediatrics', 'Orthopedics', 'General'];

const Leaderboard = () => {
  const [doctors, setDoctors] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedRank, setSelectedRank] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [inspectDoctorId, setInspectDoctorId] = useState(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      let url = '/reputation/leaderboard?';
      if (selectedSpecialty !== 'All') url += `specialty=${encodeURIComponent(selectedSpecialty)}&`;
      if (selectedRank) url += `rank=${selectedRank}&`;
      const { data } = await api.get(url);
      setDoctors(data.doctors || []);
      setRanks(data.ranks || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedSpecialty, selectedRank]);

  const filteredDoctors = doctors.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.specialty?.toLowerCase().includes(search.toLowerCase()) ||
    doc.credentials?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Header */}
        <div className="glass-panel-elevated rounded-3xl p-6 sm:p-10 border border-slate-800 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              <Award className="w-4 h-4" />
              <span>ByteMed 8-Bit Brand Architecture</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Physician Contribution Leaderboard
            </h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Byte → 8 bits → 8 contribution ranks (<strong className="text-amber-400 font-mono">Plus 1</strong> through <strong className="text-amber-400 font-mono">Plus 8</strong>). Doctor reputation is an auditable consequence of sustained clinical quality, AI-evaluated safety, and patient trust.
            </p>
          </div>

          {/* Canonical 8-Rank Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-8 pt-6 border-t border-slate-800/80">
            {ranks.map(r => (
              <div 
                key={r.rank}
                onClick={() => setSelectedRank(selectedRank === String(r.rank) ? '' : String(r.rank))}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  selectedRank === String(r.rank)
                    ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-md shadow-amber-500/10 scale-102'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-mono text-xs font-extrabold text-amber-400">{r.name}</div>
                <div className="text-[10px] font-semibold text-slate-200 truncate mt-0.5">{r.title}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">{r.minScore}+ pts</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
          
          {/* Specialty Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedSpecialty(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                  selectedSpecialty === cat
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by physician or license..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

        </div>

        {/* Ranked Physician Table / List */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              Loading verified physician rankings...
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              No verified physicians found matching current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Rank & Physician</th>
                    <th className="py-3.5 px-4">Specialty</th>
                    <th className="py-3.5 px-4">ByteMed Level</th>
                    <th className="py-3.5 px-4 text-center">AI Clinical Score</th>
                    <th className="py-3.5 px-4 text-center">Patient Rating</th>
                    <th className="py-3.5 px-4 text-right">Reputation Score</th>
                    <th className="py-3.5 px-6 text-center">Transparency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {filteredDoctors.map((doc, idx) => (
                    <tr 
                      key={doc._id}
                      className="hover:bg-slate-900/40 transition-colors group"
                    >
                      {/* Name & Position */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3.5">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' :
                            idx === 1 ? 'bg-slate-300/20 text-slate-200 border border-slate-400/30' :
                            idx === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-white text-sm flex items-center space-x-1.5">
                              <span>Dr. {doc.name}</span>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">{doc.credentials}</div>
                          </div>
                        </div>
                      </td>

                      {/* Specialty */}
                      <td className="py-4 px-4 text-slate-300 font-medium">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
                          {doc.specialty || 'General'}
                        </span>
                      </td>

                      {/* Rank (Plus 1 to Plus 8) */}
                      <td className="py-4 px-4">
                        <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 inline-block">
                          {doc.plusRank}
                        </span>
                      </td>

                      {/* AI Quality Average */}
                      <td className="py-4 px-4 text-center">
                        <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                          {doc.averageAiScore || 85}%
                        </span>
                      </td>

                      {/* Patient Star Rating */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center space-x-1 text-amber-400 font-bold font-mono">
                          <span>{doc.averagePatientRating || 5.0}</span>
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                        </div>
                      </td>

                      {/* Score */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-mono font-black text-white text-sm">
                          {doc.totalReputationScore || 100}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {doc.contributionsCount || 0} answers • {doc.liveSessionsCount || 0} live
                        </div>
                      </td>

                      {/* Inspect Breakdown Button */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => setInspectDoctorId(doc._id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-cyan-400 text-xs font-semibold inline-flex items-center space-x-1 transition shadow-sm"
                        >
                          <span>Explain Rank</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Transparent Reputation Modal */}
      <ReputationModal
        doctorId={inspectDoctorId}
        isOpen={!!inspectDoctorId}
        onClose={() => setInspectDoctorId(null)}
      />
    </div>
  );
};

export default Leaderboard;


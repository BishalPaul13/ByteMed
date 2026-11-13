import React, { useState } from 'react';
import api from '../api';
import { ShieldAlert, X, AlertTriangle } from 'lucide-react';

const REASON_CATEGORIES = [
  { id: 'CLINICALLY_UNSAFE', label: 'Clinically Unsafe Advice', desc: 'Overconfident diagnosis, dangerous remedies, or failure to escalate emergency symptoms' },
  { id: 'PRIVACY_VIOLATION', label: 'Privacy or Identity Leak', desc: 'Contains patient names, addresses, phone numbers, or identifiable medical photos' },
  { id: 'HARASSMENT_ABUSE', label: 'Harassment or Inappropriate Behavior', desc: 'Abusive language, disrespect, or unprofessional conduct' },
  { id: 'SPAM_PROMOTION', label: 'Spam or Commercial Solicitation', desc: 'Off-platform selling, advertisements, or scam links' },
  { id: 'OTHER_RULE_VIOLATION', label: 'Platform Rule Breach', desc: 'Other violations of ByteMed healthcare community guidelines' }
];

const ReportModal = ({ isOpen, onClose, targetType, targetId, title = 'Report Content' }) => {
  const [reasonCategory, setReasonCategory] = useState('CLINICALLY_UNSAFE');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide details for the safety review team.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      await api.post('/moderation/report', {
        targetType,
        targetId,
        reporterId: storedUser.id,
        reasonCategory,
        description,
        severity
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-lg">{title}</h3>
            <p className="text-xs text-slate-400">Triage with ByteMed Trust & Safety moderation</p>
          </div>
        </div>

        {submitted ? (
          <div className="p-6 text-center text-emerald-400 text-sm font-semibold space-y-2">
            <AlertTriangle className="w-8 h-8 mx-auto text-emerald-400" />
            <p>Report received. Our clinical safety board will review the flagged evidence.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Reason Category</label>
              <div className="space-y-2">
                {REASON_CATEGORIES.map(cat => (
                  <label
                    key={cat.id}
                    className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      reasonCategory === cat.id
                        ? 'bg-rose-950/20 border-rose-500/50 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reasonCategory"
                      value={cat.id}
                      checked={reasonCategory === cat.id}
                      onChange={() => setReasonCategory(cat.id)}
                      className="mt-0.5 text-rose-500 focus:ring-rose-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-200">{cat.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{cat.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Clinical or Conduct Explanation</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Specify the specific sentence, dosage, or issue for moderators to review..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">Reports do not instantly ban accounts; evidence is audited.</span>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Incident Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportModal;


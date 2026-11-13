import React, { useState } from 'react';
import api from '../api';
import { Star, X, CheckCircle2, ShieldCheck, HeartHandshake } from 'lucide-react';

const StarPicker = ({ label, value, onChange, description }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-200">{label}</label>
        <span className="text-xs font-mono font-bold text-amber-400">{value} / 5</span>
      </div>
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 text-slate-600 hover:text-amber-400 focus:outline-none transition-colors"
          >
            <Star
              className={`w-6 h-6 transition-all ${
                star <= value ? 'text-amber-400 fill-amber-400 scale-105' : 'text-slate-700'
              }`}
            />
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">{description}</p>
    </div>
  );
};

const FeedbackModal = ({ isOpen, onClose, targetType, targetId, doctorName, onSubmitted }) => {
  const [helpfulness, setHelpfulness] = useState(5);
  const [clarity, setClarity] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const patientId = storedUser.id;

      if (targetType === 'RESPONSE') {
        await api.post(`/responses/${targetId}/feedback`, {
          patientId,
          helpfulness,
          clarity,
          communication,
          comment
        });
      } else {
        // Live session feedback
        await api.post(`/responses/${targetId}/feedback`, {
          patientId,
          helpfulness,
          clarity,
          communication,
          comment
        });
      }

      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-lg">Rate Doctor's Clinical Advice</h3>
            <p className="text-xs text-slate-400">
              Evaluating contribution by <span className="text-cyan-300 font-semibold">{doctorName || 'Verified Physician'}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dimension 1: Helpfulness */}
          <StarPicker
            label="Practical Helpfulness"
            description="Did this advice offer meaningful next steps and actionable guidance?"
            value={helpfulness}
            onChange={setHelpfulness}
          />

          {/* Dimension 2: Clarity */}
          <StarPicker
            label="Clarity & Readability"
            description="Was the medical explanation straightforward and easy to understand?"
            value={clarity}
            onChange={setClarity}
          />

          {/* Dimension 3: Communication & Respect */}
          <StarPicker
            label="Bedside Manner & Communication"
            description="Was the tone empathetic, respectful, and appropriately professional?"
            value={communication}
            onChange={setCommunication}
          />

          {/* Qualitative Comment */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-200">Patient Note (Optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Provide constructive thoughts on the advice or consultation..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Anti-gaming verified interaction</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Verified Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;


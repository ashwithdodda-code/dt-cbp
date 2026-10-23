import React, { useState } from 'react';
import { Recommendation } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle,
  XCircle,
  Sliders,
  AlertTriangle,
  X,
  ShieldAlert,
  Sparkles,
  Info
} from 'lucide-react';

interface ApprovalModalProps {
  recommendation: Recommendation | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  recommendation,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [actionType, setActionType] = useState<'approved' | 'rejected' | 'overridden'>('approved');
  const [notes, setNotes] = useState('');
  const [overrideQuantity, setOverrideQuantity] = useState<number>(1);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !recommendation) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    const overrideDetails =
      actionType === 'overridden'
        ? {
            transferQuantity: overrideQuantity,
            overrideNotes,
            originalAction: recommendation.proposed_action,
          }
        : undefined;

    try {
      const res = await fetch(`/api/recommendations/${recommendation.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          notes: notes || (actionType === 'approved' ? 'Approved by clinical operations officer' : 'Declined per operational protocol'),
          overrideDetails,
          userId: user?.id || 'admin',
          userName: user?.name || 'Administrator',
          userRole: user?.role || 'admin',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process recommendation action');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                {recommendation.rec_code}
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  recommendation.priority === 'critical'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                }`}
              >
                {recommendation.priority} Priority
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {recommendation.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Situation & Action */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Observed Situation
              </span>
              <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                {recommendation.current_situation}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
                Proposed Operational Action
              </span>
              <p className="text-slate-900 dark:text-white font-medium mt-0.5">
                {recommendation.proposed_action}
              </p>
            </div>
          </div>

          {/* Reasons */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Derived Algorithmic Reasons
            </span>
            <ul className="space-y-1.5">
              {recommendation.reasons.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-slate-700 dark:text-slate-300 p-2 rounded-lg bg-slate-100/60 dark:bg-slate-800/40"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Choice Tabs */}
          <div className="pt-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
              Decision Selection
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActionType('approved')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  actionType === 'approved'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve</span>
              </button>
              <button
                type="button"
                onClick={() => setActionType('overridden')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  actionType === 'overridden'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Override</span>
              </button>
              <button
                type="button"
                onClick={() => setActionType('rejected')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  actionType === 'rejected'
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>
            </div>
          </div>

          {/* Override Form Fields */}
          {actionType === 'overridden' && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-2.5">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <Sliders className="w-4 h-4" />
                <span>Custom Override Parameters</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adjust Allocation Quantity / Bed Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={overrideQuantity}
                  onChange={(e) => setOverrideQuantity(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Override Rationale & Directives
                </label>
                <textarea
                  rows={2}
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="Explain why the algorithmic proposal was altered..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Decision Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Decision Note / Audit Log Entry
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved following morning telemetry briefing"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Validation or Precondition Error</p>
                <p className="text-[11px] mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>Updates local SQLite database atomically</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 ${
                actionType === 'approved'
                  ? 'bg-teal-600 hover:bg-teal-700'
                  : actionType === 'overridden'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <span>Confirm {actionType.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

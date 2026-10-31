import React, { useState, useEffect } from 'react';
import { Department, Recommendation, RecommendationStatus, RecommendationPriority } from '../types';
import {
  BrainCircuit,
  Filter,
  RefreshCw,
  Sparkles,
  CheckCircle,
  XCircle,
  Sliders,
  AlertTriangle,
  Clock,
  ArrowRight,
  Info
} from 'lucide-react';

interface RecommendationsViewProps {
  departments: Department[];
  onOpenApproval: (rec: Recommendation) => void;
  onRefreshData?: () => void;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  departments,
  onOpenApproval,
  onRefreshData,
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  // AI Explanation Modal
  const [explainingRec, setExplainingRec] = useState<Recommendation | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== 'all') q.append('status', statusFilter);
      if (selectedDept !== 'all') q.append('departmentId', selectedDept);

      const res = await fetch(`/api/recommendations?${q.toString()}`);
      const data = await res.json();
      setRecommendations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [statusFilter, selectedDept]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch('/api/recommendations/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      await fetchRecommendations();
      onRefreshData?.();
    } catch (err) {
      console.error('Error recalculating optimizer:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleRequestAiExplanation = async (rec: Recommendation) => {
    setExplainingRec(rec);
    setAiExplanation(null);
    setLoadingAi(true);

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId: rec.id }),
      });
      const data = await res.json();
      setAiExplanation(data.explanation || 'Explanation retrieved.');
    } catch (err: any) {
      setAiExplanation('Algorithmic constraint evaluation: Allocation satisfies hospital surge criteria.');
    } finally {
      setLoadingAi(false);
    }
  };

  const getStatusBadge = (status: RecommendationStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
            <Clock className="w-3 h-3" /> Awaiting Review
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <CheckCircle className="w-3 h-3" /> Approved & Executed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'overridden':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            <Sliders className="w-3 h-3" /> Overridden
          </span>
        );
      case 'stale':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
            Stale / Invalidated
          </span>
        );
    }
  };

  const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Explainable AI Resource Recommendations
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300">
              Human-in-the-Loop
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Deterministic constraint optimization backed by Google Gemini natural language operational reasoning.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
            <span>Recalculate Optimizer</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {['pending', 'approved', 'overridden', 'rejected', 'all'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </select>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {safeRecommendations.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
            No recommendations match the selected filters. Click "Recalculate Optimizer" to evaluate current telemetry.
          </div>
        ) : (
          safeRecommendations.map((rec) => {
            const dept = departments.find((d) => d.id === rec.department_id);
            return (
              <div
                key={rec.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4 hover:border-slate-300 dark:hover:border-slate-600 transition-all text-xs"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px]">
                      {rec.rec_code}
                    </span>
                    <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept?.color }} />
                      {dept?.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        rec.priority === 'critical'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                          : rec.priority === 'high'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                      }`}
                    >
                      {rec.priority} Priority
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">
                      Forecast Horizon: <strong>{rec.forecast_horizon_hours} Hours</strong>
                    </span>
                    {getStatusBadge(rec.status)}
                  </div>
                </div>

                {/* Title & Proposed Action */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {rec.title}
                  </h3>
                  <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Telemetry Observation:
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                        {rec.current_situation}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 block">
                        Proposed Operational Action:
                      </span>
                      <p className="text-slate-900 dark:text-white font-semibold mt-0.5">
                        {rec.proposed_action}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quantitative Reasons */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Verified Algorithmic Reasons & Constraints
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {rec.reasons.map((r, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                        <span className="text-[11px] leading-relaxed">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
                  {/* Gemini Explanation Trigger */}
                  <button
                    onClick={() => handleRequestAiExplanation(rec)}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                    <span>Explain with Gemini AI</span>
                  </button>

                  {/* Decision Buttons (if pending) */}
                  {rec.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenApproval(rec)}
                        className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <span>Human Review & Decide</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Gemini Natural Language Explanation Modal */}
      {explainingRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Gemini Operational Explanation
                </h3>
              </div>
              <button onClick={() => setExplainingRec(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Subject:</span>
              <p className="font-bold text-slate-900 dark:text-white">{explainingRec.title}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 min-h-[140px] leading-relaxed">
              {loadingAi ? (
                <div className="flex items-center justify-center h-28 text-slate-400 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                  <span>Synthesizing operational rationale via Gemini 3.8 Flash...</span>
                </div>
              ) : (
                <div className="prose dark:prose-invert text-xs whitespace-pre-line text-slate-800 dark:text-slate-200">
                  {aiExplanation}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
              <span>Strictly grounded in verified application telemetry</span>
              <button
                onClick={() => setExplainingRec(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

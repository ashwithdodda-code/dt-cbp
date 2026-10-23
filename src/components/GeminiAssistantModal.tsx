import React, { useState } from 'react';
import { Sparkles, Send, X, Bot, User, RefreshCw, MessageSquare, Lightbulb } from 'lucide-react';

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Hello, I am the AI-HRO Clinical Operations Assistant. I monitor real-time bed capacity, 12-hour admission forecasts, nurse ratios, and equipment margins. How can I assist you with shift logistics?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'Which department is expected to need more beds?',
    'Why was the ED surge recommendation generated?',
    'What equipment shortages need attention?',
    'Summarize the pending approvals for shift handover.',
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend }),
      });
      const data = await res.json();
      const reply = data.answer || 'Operational analysis processed.';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Unable to connect to operational intelligence. Deterministic rules are continuing in fallback mode.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[600px] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Hospital Operations AI Assistant
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                  Gemini 3.8 Flash
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Grounded in verified live telemetry • Explainable operational logistics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 text-xs leading-relaxed ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-xs ${
                  m.role === 'user'
                    ? 'bg-teal-600 text-white rounded-tr-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none whitespace-pre-line'
                }`}
              >
                <div className="prose dark:prose-invert text-xs">{m.text}</div>
                <div
                  className={`text-[9px] mt-1 text-right ${
                    m.role === 'user' ? 'text-teal-100' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-slate-500 dark:text-slate-400">
              <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-700 flex items-center justify-center shrink-0">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
              </div>
              <span className="italic">Querying live telemetry & formulating operational explanation...</span>
            </div>
          )}
        </div>

        {/* Quick Suggested Queries */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Suggested Inquiries:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => handleSend(p)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors text-left"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about hospital bed forecasts, nurse staffing, or equipment transfers..."
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

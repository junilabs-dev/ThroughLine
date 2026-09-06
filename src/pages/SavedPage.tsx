import { useState, useEffect, useMemo } from 'react';
import {
  BookmarkCheck,
  Trash2,
  Copy,
  ExternalLink,
  Bot,
  FileText,
  Sparkles,
  Tag,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  getBookmarks,
  deleteBookmark,
  getJournalSession,
} from '../services/firestoreService';
import type { Bookmark, JournalSession } from '../types';

interface SavedPageProps {
  onOpenSessionById: (sessionId: string) => void;
}

export default function SavedPage({ onOpenSessionById }: SavedPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<'all' | 'entry' | 'ai_response'>('all');

  useEffect(() => {
    if (!user) return;
    loadBookmarks();
  }, [user]);

  const loadBookmarks = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getBookmarks(user.uid);
      setBookmarks(data);
    } catch (err) {
      console.error(err);
      toast('Failed to load saved items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteBookmark(user.uid, id);
      setBookmarks(bookmarks.filter((b) => b.id !== id));
      toast('Bookmark removed', 'info');
    } catch (err) {
      toast('Failed to remove bookmark', 'error');
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast('Copied to clipboard', 'success');
  };

  const filteredBookmarks = useMemo(() => {
    if (activeType === 'all') return bookmarks;
    return bookmarks.filter((b) => b.type === activeType);
  }, [bookmarks, activeType]);

  return (
    <div id="saved-page" className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <BookmarkCheck className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Saved Items</h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Your collection of bookmarked reflections, standout AI companion responses, and core insights.
          </p>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveType('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeType === 'all'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({bookmarks.length})
          </button>
          <button
            onClick={() => setActiveType('entry')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeType === 'entry'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Entries
          </button>
          <button
            onClick={() => setActiveType('ai_response')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeType === 'ai_response'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            AI Responses
          </button>
        </div>
      </div>

      {/* Bookmarks Grid */}
      {loading ? (
        <div className="p-16 text-center text-zinc-500 text-sm">Loading bookmarks...</div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="p-16 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-center space-y-3">
          <BookmarkCheck className="w-8 h-8 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-200">No saved items yet</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Click the bookmark icon on any reflection entry or companion message to save it here for fast retrieval.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookmarks.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold flex items-center gap-1 ${
                      item.type === 'ai_response'
                        ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                        : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {item.type === 'ai_response' ? (
                      <>
                        <Bot className="w-3 h-3" /> AI Insight
                      </>
                    ) : (
                      <>
                        <FileText className="w-3 h-3" /> Journal
                      </>
                    )}
                  </span>

                  <span className="text-[11px] font-mono text-zinc-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-zinc-100 mt-2.5 line-clamp-1">{item.title}</h3>

                <div className="mt-2 text-xs text-zinc-300 leading-relaxed font-serif prose prose-invert prose-xs line-clamp-4 max-w-none">
                  <ReactMarkdown>{item.content}</ReactMarkdown>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(item.content)}
                    className="p-1 hover:text-zinc-200 transition-colors"
                    title="Copy text"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 hover:text-rose-400 transition-colors"
                    title="Remove bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {item.referenceId && (
                  <button
                    onClick={() => onOpenSessionById(item.referenceId!)}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] font-medium"
                  >
                    <span>Open Session</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

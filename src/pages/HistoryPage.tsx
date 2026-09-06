import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Smile,
  Tag,
  Clock,
  ArrowUpDown,
  Bookmark,
  Trash2,
  ArrowRight,
  Target,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  getJournalSessions,
  deleteJournalSession,
  saveBookmark,
} from '../services/firestoreService';
import type { JournalSession, MoodType } from '../types';

interface HistoryPageProps {
  onOpenSession: (session: JournalSession) => void;
  onNewReflection: () => void;
}

export default function HistoryPage({ onOpenSession, onNewReflection }: HistoryPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'words'>('newest');

  useEffect(() => {
    if (!user) return;
    loadSessions();
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getJournalSessions(user.uid);
      setSessions(data);
    } catch (err) {
      console.error(err);
      toast('Failed to load past reflections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    if (!user) return;
    if (!window.confirm('Are you sure you want to permanently delete this reflection?')) return;
    try {
      await deleteJournalSession(user.uid, sid);
      setSessions(sessions.filter((s) => s.id !== sid));
      toast('Reflection deleted', 'info');
    } catch (err) {
      toast('Failed to delete reflection', 'error');
    }
  };

  const handleBookmark = async (e: React.MouseEvent, session: JournalSession) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await saveBookmark(user.uid, {
        id: `bm-${session.id}`,
        title: session.title || 'Untitled Reflection',
        type: 'entry',
        content: session.content.slice(0, 500),
        referenceId: session.id,
        createdAt: new Date().toISOString(),
        tags: session.tags,
      });
      toast('Saved to Bookmarks', 'success');
    } catch (err) {
      toast('Failed to bookmark', 'error');
    }
  };

  // Collect unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => (s.tags || []).forEach((t) => set.add(t)));
    return Array.from(set);
  }, [sessions]);

  // Filter & Sort Logic
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        // Search
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchTitle = s.title.toLowerCase().includes(term);
          const matchContent = s.content.toLowerCase().includes(term);
          const matchTag = (s.tags || []).some((t) => t.toLowerCase().includes(term));
          if (!matchTitle && !matchContent && !matchTag) return false;
        }
        // Mood
        if (selectedMood !== 'all' && s.mood !== selectedMood) return false;
        // Tag
        if (selectedTag !== 'all' && !(s.tags || []).includes(selectedTag)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
        }
        if (sortBy === 'words') {
          return (b.content?.length || 0) - (a.content?.length || 0);
        }
        return 0;
      });
  }, [sessions, searchTerm, selectedMood, selectedTag, sortBy]);

  return (
    <div id="history-page" className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Reflection History</h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Search, filter, and review your previous reflections and multi-turn companion dialogues.
          </p>
        </div>

        <button
          onClick={onNewReflection}
          className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-all shadow-sm active:scale-95"
        >
          + New Reflection
        </button>
      </div>

      {/* Search & Filtering Controls */}
      <div className="space-y-3 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/70">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus-within:border-zinc-700">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="Search by title, keywords, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent flex-1 focus:outline-none placeholder:text-zinc-600"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="words">Longest Entry</option>
            </select>
          </div>
        </div>

        {/* Filter Pills: Mood & Tags */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-mono text-[11px]">Mood:</span>
            <select
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="all">All Moods</option>
              <option value="Great">Great</option>
              <option value="Good">Good</option>
              <option value="Neutral">Neutral</option>
              <option value="Low">Low</option>
              <option value="Difficult">Difficult</option>
            </select>
          </div>

          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono text-[11px]">Tag:</span>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="all">All Tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(searchTerm || selectedMood !== 'all' || selectedTag !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedMood('all');
                setSelectedTag('all');
              }}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 ml-auto font-mono"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Reflections Grid */}
      {loading ? (
        <div className="p-16 text-center text-zinc-500 text-sm">Loading past reflections...</div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-16 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-center space-y-3">
          <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-200">No reflections found</h3>
          <p className="text-xs text-zinc-500">
            {searchTerm || selectedMood !== 'all' || selectedTag !== 'all'
              ? 'Try changing your search or filter parameters.'
              : 'Write your first reflection to start building your personal archive.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onOpenSession(session)}
              className="p-5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-mono text-zinc-500">
                    {new Date(session.updatedAt || session.createdAt).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>

                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <button
                      onClick={(e) => handleBookmark(e, session)}
                      title="Bookmark"
                      className="p-1 hover:text-amber-400 transition-colors"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      title="Delete"
                      className="p-1 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-1 mt-1">
                  {session.title || 'Untitled Reflection'}
                </h3>

                <p className="text-xs text-zinc-400 mt-2 line-clamp-3 leading-relaxed font-serif">
                  {session.content || '(No writing recorded)'}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 flex-wrap">
                  {session.mood && (
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                      {session.mood}
                    </span>
                  )}
                  {(session.tags || []).slice(0, 2).map((t) => (
                    <span key={t} className="text-zinc-500">
                      #{t}
                    </span>
                  ))}
                </div>

                <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-medium">
                  Open &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

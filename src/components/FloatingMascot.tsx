import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Wind, MessageSquare, ChevronDown } from 'lucide-react';
import { MindMascot, MascotMood } from './MindMascot';

interface FloatingMascotProps {
  onStartReflection: (prompt: string) => void;
}

export function FloatingMascot({ onStartReflection }: FloatingMascotProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mood, setMood] = useState<MascotMood>('idle');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      id="floating-mind-mascot"
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end select-none"
    >
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.92 }}
            className="mb-3 w-72 p-4 rounded-2xl bg-zinc-900/95 border border-zinc-700/80 shadow-2xl backdrop-blur-md text-zinc-200 space-y-3"
          >
            <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-semibold text-zinc-100">Lumie is listening</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 font-serif italic leading-relaxed">
              "When your mind feels crowded, putting one thought onto paper clears space for the next."
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  onStartReflection('What is feeling heavy on my mind right now, and how can I gently unpack it?');
                  setIsExpanded(false);
                }}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 text-[11px] font-medium transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                <span>Quick Write</span>
              </button>
              <button
                onClick={() => {
                  setMood('breathing');
                  setTimeout(() => setMood('idle'), 8000);
                }}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-200 border border-teal-500/30 text-[11px] font-medium transition-colors"
              >
                <Wind className="w-3 h-3" />
                <span>Breathe</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button with Floating Animated Lumie */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-700/80 shadow-xl backdrop-blur-md transition-all active:scale-95 group"
          title="Talk with Lumie"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-950/70 border border-indigo-500/40 flex items-center justify-center overflow-hidden">
            <MindMascot mood={mood} size="xs" interactive={false} />
          </div>
          <span className="text-xs font-medium text-zinc-200 group-hover:text-white transition-colors">
            Lumie
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
        </button>

        <button
          onClick={() => setDismissed(true)}
          title="Minimize Lumie"
          className="p-1.5 rounded-full bg-zinc-900/80 text-zinc-500 hover:text-zinc-300 border border-zinc-800/80 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

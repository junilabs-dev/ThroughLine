import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Heart, Brain, RefreshCw, X, Wind, ArrowRight, MessageSquareQuote } from 'lucide-react';

export type MascotMood = 'idle' | 'peaceful' | 'thinking' | 'celebrate' | 'breathing' | 'curious';

interface MindMascotProps {
  mood?: MascotMood;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  onSelectPrompt?: (prompt: string) => void;
  showSpeechBubble?: boolean;
  customMessage?: string;
  className?: string;
}

const LUMIE_PROMPTS = [
  'What is one thought you are ready to let go of today?',
  'Notice what you are resisting right now. What is it trying to tell you?',
  'What would this look like if it were peaceful and simple?',
  'If you made this decision from courage instead of caution, what would you choose?',
  'What is one small truth you have been avoiding saying out loud?',
  'Where in your body are you holding tension right now? Breathe into it.',
  'What did you learn about yourself in the last 48 hours?',
];

export function MindMascot({
  mood = 'idle',
  size = 'md',
  interactive = true,
  onSelectPrompt,
  showSpeechBubble = false,
  customMessage,
  className = '',
}: MindMascotProps) {
  const [currentMood, setCurrentMood] = useState<MascotMood>(mood);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  const [breathCount, setBreathCount] = useState(4);

  // Sync external mood changes
  useEffect(() => {
    setCurrentMood(mood);
  }, [mood]);

  // Periodic blinking effect for life-like feel
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 220);
    }, 4500 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Breathing exercise timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isBreathingActive) {
      setCurrentMood('breathing');
      let seconds = 4;
      const phases: Array<'Inhale' | 'Hold' | 'Exhale' | 'Rest'> = ['Inhale', 'Hold', 'Exhale', 'Rest'];
      let phaseIdx = 0;

      timer = setInterval(() => {
        seconds -= 1;
        if (seconds <= 0) {
          phaseIdx = (phaseIdx + 1) % phases.length;
          setBreathPhase(phases[phaseIdx]);
          seconds = 4;
        }
        setBreathCount(seconds);
      }, 1000);
    } else if (currentMood === 'breathing') {
      setCurrentMood(mood);
    }
    return () => clearInterval(timer);
  }, [isBreathingActive, mood]);

  const sizePixels = {
    xs: 28,
    sm: 36,
    md: 48,
    lg: 72,
    xl: 108,
  }[size];

  const handleMascotClick = () => {
    if (!interactive) return;
    setIsDialogOpen(!isDialogOpen);
    if (currentMood === 'idle') {
      setCurrentMood('curious');
      setTimeout(() => setCurrentMood(mood), 3000);
    }
  };

  const handleNextPrompt = () => {
    setActivePromptIndex((prev) => (prev + 1) % LUMIE_PROMPTS.length);
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Interactive Tooltip / Speech Bubble */}
      <AnimatePresence>
        {showSpeechBubble && (customMessage || LUMIE_PROMPTS[activePromptIndex]) && !isDialogOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.92 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-[11px] font-medium text-zinc-200 shadow-xl backdrop-blur-md flex items-center gap-1.5 pointer-events-none"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>{customMessage || LUMIE_PROMPTS[activePromptIndex]}</span>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-zinc-900 border-b border-r border-zinc-700/80" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Floating Mascot Core Container */}
      <motion.div
        onClick={handleMascotClick}
        animate={
          currentMood === 'celebrate'
            ? {
                y: [-6, 2, -6],
                rotate: [-6, 6, -6],
                scale: [1, 1.08, 1],
              }
            : currentMood === 'thinking'
            ? {
                y: [-2, 2, -2],
                rotate: [-2, 2, -2],
                scale: [0.98, 1.02, 0.98],
              }
            : currentMood === 'breathing'
            ? {
                scale: breathPhase === 'Inhale' || breathPhase === 'Hold' ? [1, 1.15] : [1.15, 1],
                transition: { duration: 4, ease: 'easeInOut' },
              }
            : {
                y: [-4, 4, -4],
                rotate: [-1, 1, -1],
              }
        }
        transition={
          currentMood === 'breathing'
            ? undefined
            : {
                duration: currentMood === 'celebrate' ? 1.2 : currentMood === 'thinking' ? 2 : 3.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
        className={`relative cursor-pointer transition-transform ${
          interactive ? 'hover:scale-105 active:scale-95' : ''
        }`}
        style={{ width: sizePixels, height: sizePixels }}
        title="Lumie — The Throughline Thought Companion"
      >
        {/* Luminous Ambient Glow Behind Lumie */}
        <motion.div
          animate={{
            opacity: currentMood === 'thinking' ? [0.35, 0.7, 0.35] : [0.2, 0.45, 0.2],
            scale: currentMood === 'thinking' ? [1, 1.25, 1] : [0.95, 1.1, 0.95],
          }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full blur-md bg-gradient-to-tr from-indigo-500 via-teal-400 to-amber-300 pointer-events-none"
        />

        {/* Orbiting Satellite Thought Particles (when thinking or celebrating) */}
        {(currentMood === 'thinking' || currentMood === 'celebrate') && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-[-6px] pointer-events-none"
          >
            <div className="w-2 h-2 rounded-full bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.8)] absolute top-0 left-1/2 -translate-x-1/2" />
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)] absolute bottom-0 left-1/2 -translate-x-1/2" />
          </motion.div>
        )}

        {/* Vector SVG Character: Lumie the Mind Spark */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full relative z-10 drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lumieBodyGrad" x1="20%" y1="15%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="45%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
            <linearGradient id="lumieBellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.08" />
            </linearGradient>
            <radialGradient id="lumieEyeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="80%" stopColor="#c7d2fe" />
              <stop offset="100%" stopColor="#818cf8" />
            </radialGradient>
          </defs>

          {/* Floating Feather/Crystal Wings */}
          <motion.path
            d="M 22 52 C 10 44 8 28 20 32 C 26 34 26 46 22 52 Z"
            fill="#a5b4fc"
            opacity="0.65"
            animate={{ rotate: [-4, 6, -4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '22px 52px' }}
          />
          <motion.path
            d="M 78 52 C 90 44 92 28 80 32 C 74 34 74 46 78 52 Z"
            fill="#2dd4bf"
            opacity="0.65"
            animate={{ rotate: [4, -6, 4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '78px 52px' }}
          />

          {/* Lumie Soft Body (Tear-drop / Pebble Shape) */}
          <path
            d="M 50 14 C 70 14 84 32 82 56 C 80 76 68 88 50 88 C 32 88 20 76 18 56 C 16 32 30 14 50 14 Z"
            fill="url(#lumieBodyGrad)"
          />

          {/* Inner Luminous Belly Highlight */}
          <ellipse cx="50" cy="62" rx="20" ry="17" fill="url(#lumieBellyGrad)" />

          {/* Forehead Mind Spark Gem */}
          <motion.path
            d="M 50 21 L 52.5 28 L 59 30 L 52.5 32 L 50 39 L 47.5 32 L 41 30 L 47.5 28 Z"
            fill="#ffffff"
            animate={{
              opacity: [0.7, 1, 0.7],
              scale: [0.92, 1.1, 0.92],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '50px 30px' }}
          />

          {/* Expressive Luminous Eyes */}
          {isBlinking ? (
            // Blinking Slit Eyes
            <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round">
              <line x1="36" y1="48" x2="44" y2="48" />
              <line x1="56" y1="48" x2="64" y2="48" />
            </g>
          ) : currentMood === 'celebrate' || currentMood === 'breathing' ? (
            // Happy Curved Arc Eyes (^_^)
            <g stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" fill="none">
              <path d="M 35 50 Q 40 43 45 50" />
              <path d="M 55 50 Q 60 43 65 50" />
            </g>
          ) : currentMood === 'thinking' ? (
            // Contemplative Focused Eyes
            <g>
              <circle cx="40" cy="48" r="4.2" fill="url(#lumieEyeGlow)" />
              <circle cx="60" cy="48" r="4.2" fill="url(#lumieEyeGlow)" />
              <circle cx="42" cy="46" r="1.6" fill="#ffffff" />
              <circle cx="62" cy="46" r="1.6" fill="#ffffff" />
              <path d="M 35 43 Q 40 41 45 44" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 55 44 Q 60 41 65 43" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          ) : (
            // Standard Friendly Eyes
            <g>
              <circle cx="39" cy="49" r="4.5" fill="url(#lumieEyeGlow)" />
              <circle cx="61" cy="49" r="4.5" fill="url(#lumieEyeGlow)" />
              <circle cx="41" cy="47" r="1.8" fill="#ffffff" />
              <circle cx="63" cy="47" r="1.8" fill="#ffffff" />
            </g>
          )}

          {/* Cheeks: Soft Rosy Glow */}
          <circle cx="30" cy="56" r="3.5" fill="#f43f5e" opacity="0.35" />
          <circle cx="70" cy="56" r="3.5" fill="#f43f5e" opacity="0.35" />

          {/* Gentle Smile Mouth */}
          <path
            d={
              currentMood === 'celebrate'
                ? 'M 44 56 Q 50 64 56 56'
                : currentMood === 'thinking'
                ? 'M 46 59 Q 50 61 54 58'
                : 'M 45 57 Q 50 62 55 57'
            }
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Celebration Sparkles burst */}
        {currentMood === 'celebrate' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="absolute -top-3 -right-2 text-amber-300 pointer-events-none"
          >
            <Sparkles className="w-4 h-4 fill-amber-300" />
          </motion.div>
        )}
      </motion.div>

      {/* Interactive Popover Modal: Meet Lumie */}
      <AnimatePresence>
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 12 }}
              className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-zinc-200 relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsDialogOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header with Mascot Avatar */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-700/50 flex items-center justify-center relative overflow-hidden">
                  <MindMascot mood={currentMood} size="sm" interactive={false} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                    <span>Lumie</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-950/70 border border-teal-800/60 text-teal-300">
                      Thought Companion
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">Here to hold space for your reflection</p>
                </div>
              </div>

              {/* Interactive Mood Controller */}
              <div className="flex items-center justify-between gap-1 p-1 bg-zinc-950/70 rounded-xl border border-zinc-800/80 text-[11px]">
                <button
                  onClick={() => {
                    setCurrentMood('peaceful');
                    setIsBreathingActive(false);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                    currentMood === 'peaceful' || currentMood === 'idle'
                      ? 'bg-zinc-800 text-zinc-100 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Calm
                </button>
                <button
                  onClick={() => {
                    setCurrentMood('thinking');
                    setIsBreathingActive(false);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                    currentMood === 'thinking' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Contemplate
                </button>
                <button
                  onClick={() => {
                    setCurrentMood('celebrate');
                    setIsBreathingActive(false);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                    currentMood === 'celebrate'
                      ? 'bg-zinc-800 text-zinc-100 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Celebrate
                </button>
                <button
                  onClick={() => setIsBreathingActive(!isBreathingActive)}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
                    isBreathingActive ? 'bg-teal-900/60 text-teal-200 border border-teal-700/50' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Wind className="w-3 h-3" />
                  <span>Breathe</span>
                </button>
              </div>

              {/* Breathing Exercise Card if active */}
              {isBreathingActive ? (
                <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-800/50 text-center space-y-3">
                  <p className="text-xs text-teal-300 font-mono font-medium">Box Breathing with Lumie</p>
                  <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                    <motion.div
                      animate={{
                        scale: breathPhase === 'Inhale' ? [1, 1.4] : breathPhase === 'Exhale' ? [1.4, 1] : 1.4,
                      }}
                      transition={{ duration: 4, ease: 'easeInOut' }}
                      className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-400/40 absolute"
                    />
                    <div className="relative z-10 text-center">
                      <span className="block text-sm font-bold text-teal-200">{breathPhase}</span>
                      <span className="text-xs font-mono text-teal-400">{breathCount}s</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Feel your lungs expand and release. You don't have to carry every thought at once.
                  </p>
                </div>
              ) : (
                /* Thought Prompt Card */
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-indigo-400 font-semibold flex items-center gap-1">
                      <MessageSquareQuote className="w-3 h-3" />
                      Lumie's Mindful Nudge
                    </span>
                    <button
                      onClick={handleNextPrompt}
                      title="Next prompt"
                      className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs font-serif text-zinc-100 leading-relaxed italic">
                    "{LUMIE_PROMPTS[activePromptIndex]}"
                  </p>
                  {onSelectPrompt && (
                    <button
                      onClick={() => {
                        onSelectPrompt(LUMIE_PROMPTS[activePromptIndex]);
                        setIsDialogOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 text-xs font-medium transition-all"
                    >
                      <span>Write about this</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Footer encouragement */}
              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-400/80" />
                  Your calm thinking ally
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Brain className="w-3 h-3 text-indigo-400/80" />
                  Private & Safe
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

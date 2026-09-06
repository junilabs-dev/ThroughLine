import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Wind, ArrowRight, RefreshCw, Smile, Lightbulb } from 'lucide-react';
import { MindMascot, MascotMood } from './MindMascot';

interface LumieCheckInProps {
  onStartReflection: (prompt: string) => void;
}

const MINDFUL_REFLECTIONS = [
  {
    prompt: 'What thought is asking for your patience rather than your urgency right now?',
    tag: 'Patience & Flow',
  },
  {
    prompt: 'Where are you assuming an obstacle exists before even trying?',
    tag: 'Assumptions',
  },
  {
    prompt: 'What would a 1% lighter day look like tomorrow?',
    tag: 'Ease',
  },
  {
    prompt: 'What truth are you proud of having realized recently?',
    tag: 'Self-Trust',
  },
];

export function LumieCheckIn({ onStartReflection }: LumieCheckInProps) {
  const [mood, setMood] = useState<MascotMood>('peaceful');
  const [promptIdx, setPromptIdx] = useState(0);
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathText, setBreathText] = useState('Inhale deeply (4s)');

  const currentReflection = MINDFUL_REFLECTIONS[promptIdx];

  const handleNextPrompt = () => {
    setPromptIdx((prev) => (prev + 1) % MINDFUL_REFLECTIONS.length);
    setMood('curious');
    setTimeout(() => setMood('peaceful'), 2500);
  };

  const handleToggleBreath = () => {
    if (!breathingActive) {
      setBreathingActive(true);
      setMood('breathing');
      let step = 0;
      const texts = [
        'Inhale deeply... (4s)',
        'Gently hold... (4s)',
        'Exhale and let go... (4s)',
        'Settle in peace... (4s)',
      ];
      const timer = setInterval(() => {
        step = (step + 1) % texts.length;
        setBreathText(texts[step]);
      }, 4000);
      setTimeout(() => {
        clearInterval(timer);
        setBreathingActive(false);
        setMood('celebrate');
        setTimeout(() => setMood('peaceful'), 3000);
      }, 16000);
    } else {
      setBreathingActive(false);
      setMood('peaceful');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/30 via-zinc-900/60 to-zinc-950/80 border border-indigo-500/20 p-5 sm:p-6 shadow-sm">
      {/* Background soft ambient radial light */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left Side: Mascot Avatar and Story */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 flex items-center justify-center p-2 rounded-2xl bg-zinc-900/90 border border-indigo-500/30 shadow-inner">
            <MindMascot mood={mood} size="lg" onSelectPrompt={onStartReflection} />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                <span>Lumie</span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
                Reflection Companion
              </span>
            </div>
            <p className="text-xs text-zinc-300 font-serif italic max-w-md">
              "{currentReflection.prompt}"
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-400" />
                Focus: {currentReflection.tag}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Actions */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            onClick={handleToggleBreath}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all min-h-[40px] ${
              breathingActive
                ? 'bg-teal-950/80 text-teal-200 border border-teal-500/60 animate-pulse'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-teal-400" />
            <span>{breathingActive ? breathText : 'Mindful Breath'}</span>
          </button>

          <button
            onClick={handleNextPrompt}
            title="Next thought prompt"
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onStartReflection(currentReflection.prompt)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 text-xs font-medium transition-all shadow-sm active:scale-95 min-h-[40px]"
          >
            <span>Reflect on this</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

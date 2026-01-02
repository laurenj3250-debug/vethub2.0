'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMilestones, useCelebrateMilestone } from '@/hooks/useResidencyStats';
import { Trophy, Brain, Users, Scissors, Target, PartyPopper } from 'lucide-react';

const MILESTONE_CONFIG: Record<string, { icon: typeof Trophy; color: string; emoji: string }> = {
  mri: { icon: Brain, color: 'text-purple-500', emoji: '🧠' },
  appointment: { icon: Users, color: 'text-blue-500', emoji: '👥' },
  surgery: { icon: Scissors, color: 'text-red-500', emoji: '✂️' },
  case: { icon: Target, color: 'text-green-500', emoji: '🎯' },
};

const CELEBRATION_MESSAGES = [
  "You're crushing it!",
  "Look at you go!",
  "Neuro superstar!",
  "Keep that momentum!",
  "One step closer to freedom!",
  "The spinal cord would be proud!",
  "Your neurons are firing!",
];

interface MilestoneData {
  uncelebrated: Array<{ id: string; type: string; count: number }>;
}

export function MilestoneCelebration() {
  const { data: milestoneData, refetch } = useMilestones() as { data: MilestoneData | undefined; refetch: () => void };
  const celebrateMutation = useCelebrateMilestone();
  const [currentMilestone, setCurrentMilestone] = useState<{
    id: string;
    type: string;
    count: number;
  } | null>(null);
  const [message] = useState(() =>
    CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)]
  );

  useEffect(() => {
    if (milestoneData?.uncelebrated?.length && milestoneData.uncelebrated.length > 0) {
      setCurrentMilestone(milestoneData.uncelebrated[0]);
    }
  }, [milestoneData]);

  useEffect(() => {
    if (currentMilestone) {
      // Dynamic import for canvas-confetti to avoid SSR issues
      import('canvas-confetti').then((confettiModule) => {
        const confetti = confettiModule.default;
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#6366f1', '#8b5cf6', '#ec4899'],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#6366f1', '#8b5cf6', '#ec4899'],
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      });
    }
  }, [currentMilestone]);

  const handleCelebrate = async () => {
    if (!currentMilestone) return;
    await celebrateMutation.mutateAsync(currentMilestone.id);
    setCurrentMilestone(null);
    refetch();
  };

  if (!currentMilestone) return null;

  const config = MILESTONE_CONFIG[currentMilestone.type];
  const Icon = config?.icon || Trophy;

  return (
    <Dialog open={!!currentMilestone} onOpenChange={() => handleCelebrate()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <PartyPopper className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
            </motion.div>
            <span className="text-2xl">Milestone Achieved!</span>
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="py-6 space-y-4"
        >
          <div className="flex items-center justify-center gap-3">
            <Icon className={`h-12 w-12 ${config?.color || 'text-primary'}`} />
            <div className="text-left">
              <p className="text-4xl font-bold">{currentMilestone.count}</p>
              <p className="text-muted-foreground capitalize">{currentMilestone.type}s</p>
            </div>
          </div>

          <p className="text-lg text-muted-foreground">{message}</p>

          <div className="text-6xl">{config?.emoji || '🏆'}</div>
        </motion.div>

        <Button onClick={handleCelebrate} size="lg" className="w-full">
          <Trophy className="mr-2 h-5 w-5" />
          Celebrate!
        </Button>
      </DialogContent>
    </Dialog>
  );
}

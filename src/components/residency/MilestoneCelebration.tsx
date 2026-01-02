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
import { CSSConfetti } from './CSSConfetti';
import {
  MILESTONE_CONFIG as CENTRALIZED_CONFIG,
  getRandomCelebrationMessage,
} from '@/lib/residency-milestones';

const ICON_MAP: Record<string, typeof Trophy> = {
  mri: Brain,
  appointment: Users,
  surgery: Scissors,
  case: Target,
};

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
  const [message] = useState(() => getRandomCelebrationMessage());
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (milestoneData?.uncelebrated?.length && milestoneData.uncelebrated.length > 0) {
      setCurrentMilestone(milestoneData.uncelebrated[0]);
    }
  }, [milestoneData]);

  useEffect(() => {
    if (currentMilestone) {
      setShowConfetti(true);
    } else {
      setShowConfetti(false);
    }
  }, [currentMilestone]);

  const handleCelebrate = async () => {
    if (!currentMilestone) return;
    await celebrateMutation.mutateAsync(currentMilestone.id);
    setCurrentMilestone(null);
    refetch();
  };

  if (!currentMilestone) return null;

  const config = CENTRALIZED_CONFIG[currentMilestone.type as keyof typeof CENTRALIZED_CONFIG];
  const Icon = ICON_MAP[currentMilestone.type] || Trophy;

  return (
    <>
      <CSSConfetti active={showConfetti} duration={3000} />
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
              <p className="text-muted-foreground capitalize">{config?.label || currentMilestone.type}</p>
            </div>
          </div>

          <p className="text-lg text-muted-foreground">{message}</p>

          <div className="text-6xl">{config?.emoji || '🏆'}</div>
        </motion.div>

        <Button onClick={handleCelebrate} size="lg" className="w-full min-h-[44px]">
          <Trophy className="mr-2 h-5 w-5" />
          Celebrate!
        </Button>
      </DialogContent>
    </Dialog>
    </>
  );
}

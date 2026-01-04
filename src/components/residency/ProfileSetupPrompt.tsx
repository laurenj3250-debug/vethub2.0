'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Calendar, Trophy, TrendingUp } from 'lucide-react';

interface ProfileSetupPromptProps {
  onSetupClick: () => void;
}

export function ProfileSetupPrompt({ onSetupClick }: ProfileSetupPromptProps) {
  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10 w-fit">
          <Settings className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-xl">Welcome to Residency Stats!</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">
          Set up your profile to unlock all tracking features and start counting down to freedom.
        </p>

        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs text-muted-foreground text-center">Days Until Freedom</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <span className="text-xs text-muted-foreground text-center">Milestone Tracking</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs text-muted-foreground text-center">Progress Charts</span>
          </div>
        </div>

        <Button onClick={onSetupClick} size="lg" className="min-h-[44px] px-8">
          <Settings className="mr-2 h-4 w-4" />
          Set Up Profile
        </Button>

        <p className="text-xs text-muted-foreground">
          You can start logging stats without a profile, but the countdown timer requires your program start date.
        </p>
      </CardContent>
    </Card>
  );
}

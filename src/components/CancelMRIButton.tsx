'use client';

import { useState } from 'react';
import { XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface CancelMRIButtonProps {
  patientName: string;
  patientType: string;
  patientId: number;
  mriCancelled?: boolean;
  onCancelled?: () => void;
}

export function CancelMRIButton({
  patientName,
  patientType,
  patientId,
  mriCancelled,
  onCancelled,
}: CancelMRIButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  if (patientType !== 'MRI' || mriCancelled) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Cancel scheduled MRI for ${patientName}? This decrements your MRI count.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/cancel-mri`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to cancel MRI');
      }

      queryClient.invalidateQueries({ queryKey: ['residency-stats'] });
      queryClient.invalidateQueries({ queryKey: ['daily-entry'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });

      toast({ title: '↩️ MRI cancelled', description: `${patientName}'s scheduled MRI was removed from the count.` });
      onCancelled?.();
    } catch (error) {
      console.error('Error cancelling MRI:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to cancel MRI',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isSubmitting}
      className="p-1.5 rounded-lg transition hover:-translate-y-0.5 disabled:opacity-50"
      style={{ backgroundColor: '#FFE4B5', border: '1.5px solid #000' }}
      title={`Cancel scheduled MRI for ${patientName}`}
    >
      <XCircle size={16} className="text-gray-900" />
    </button>
  );
}

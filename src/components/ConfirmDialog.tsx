'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Neo-pop styling
const NEO_BORDER = '2px solid #000';
const COLORS = {
  mint: '#B8E6D4',
  pink: '#FFBDBD',
  cream: '#FFF8F0',
};

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
}

/**
 * Neo-pop styled confirmation dialog
 * Replaces browser confirm() with a proper modal
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="rounded-xl"
        style={{
          backgroundColor: COLORS.cream,
          border: NEO_BORDER,
          boxShadow: '6px 6px 0 #000',
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900 font-bold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-700">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            className="rounded-lg font-bold transition-all hover:-translate-y-0.5"
            style={{
              backgroundColor: 'white',
              border: NEO_BORDER,
              boxShadow: '2px 2px 0 #000',
            }}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="rounded-lg font-bold transition-all hover:-translate-y-0.5"
            style={{
              backgroundColor: variant === 'destructive' ? COLORS.pink : COLORS.mint,
              border: NEO_BORDER,
              boxShadow: '2px 2px 0 #000',
              color: '#000',
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

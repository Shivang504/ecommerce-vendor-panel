'use client';

import { MailWarning } from 'lucide-react';
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
import { DUPLICATE_EMAIL_MESSAGE } from '@/lib/duplicate-email';

export function DuplicateEmailDialog({
  email,
  open,
  onClose,
  loginLabel,
  onLogin,
}: {
  email?: string;
  open: boolean;
  onClose: () => void;
  loginLabel?: string;
  onLogin?: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={next => !next && onClose()}>
      <AlertDialogContent className='z-[1000] max-w-[calc(100vw-32px)] sm:max-w-[440px]' data-testid='duplicate-email-dialog'>
        <AlertDialogHeader>
          <div className='mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 sm:mx-0'>
            <MailWarning className='h-6 w-6' />
          </div>
          <AlertDialogTitle>Email already registered</AlertDialogTitle>
          <AlertDialogDescription className='space-y-2'>
            {email && <span className='block break-all font-semibold text-slate-800 dark:text-slate-100'>{email}</span>}
            <span className='block'>{DUPLICATE_EMAIL_MESSAGE}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Use a different email</AlertDialogCancel>
          {onLogin && (
            <AlertDialogAction
              onClick={() => {
                onClose();
                onLogin();
              }}>
              {loginLabel || 'Log in'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

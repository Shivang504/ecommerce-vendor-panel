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
import { X } from 'lucide-react';
import React from 'react';

interface CommonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title?: string;
  description?: string;
  children?: React.ReactNode;

  loading?: boolean;

  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

export const CommonDialog: React.FC<CommonDialogProps> = ({
  open,
  onOpenChange,

  title,
  description,
  children,

  loading = false,

  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent maxWidth className=' w-full'>
        <button className='absolute right-3 top-3 text-gray-500 hover:text-gray-700 transition cursor-pointer hover:bg-gray-100 p-2 rounded-lg' onClick={() => onOpenChange(false)}>
          <X size={20} />
        </button>
        

        <AlertDialogHeader>
          {title && <AlertDialogTitle>{title}</AlertDialogTitle>}
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        {/* Loader or Content */}
        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <div className='text-center'>
              <div className='w-12 h-12 rounded-full border-4 border-muted border-t-yellow-500 animate-spin mx-auto mb-4'></div>
              <p className='text-muted-foreground'>Loading...</p>
            </div>
          </div>
        ) : (
          children && (
            <div
              className='
                py-4 
                max-h-[50vh]      
                overflow-y-auto    
                pr-2                
                space-y-4          
              '>
              {children}
            </div>
          )
        )}

        <AlertDialogFooter className='pt-4'>
          {/* <AlertDialogCancel>{cancelText}</AlertDialogCancel> */}

          {onConfirm && <AlertDialogAction onClick={onConfirm}>{confirmText}</AlertDialogAction>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

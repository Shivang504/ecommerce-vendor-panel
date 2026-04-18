'use client';

import { useState, useRef, useEffect } from 'react';
import { Share2, Facebook, Twitter, MessageCircle, Mail, Link2, Copy, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ShareButtonProps {
  productName: string;
  productUrl: string;
  productImage?: string;
  productPrice?: number;
  className?: string;
}

export function ShareButton({ productName, productUrl, productImage, productPrice, className = '' }: ShareButtonProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = `Check out ${productName}${productPrice ? ` - ₹${productPrice.toFixed(2)}` : ''} on our store!`;
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${productUrl}` : productUrl;

  // Native Web Share API (for mobile devices)
  const handleNativeShare = async () => {
    if (typeof window === 'undefined' || !navigator.share) {
      return false;
    }

    try {
      const shareData: ShareData = {
        title: productName,
        text: shareText,
        url: fullUrl,
      };

      if (productImage) {
        try {
          // Fetch image as blob for sharing
          const response = await fetch(productImage);
          const blob = await response.blob();
          const file = new File([blob], 'product-image.jpg', { type: blob.type });
          shareData.files = [file];
        } catch (error) {
          // If image fetch fails, continue without image
          console.log('Could not fetch image for sharing');
        }
      }

      await navigator.share(shareData);
      setShowShareMenu(false);
      return true;
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
      return false;
    }
  };

  // Facebook Share
  const handleFacebookShare = () => {
    const url = encodeURIComponent(fullUrl);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
    setShowShareMenu(false);
  };

  // Twitter/X Share
  const handleTwitterShare = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(fullUrl);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
    setShowShareMenu(false);
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`${shareText} ${fullUrl}`);
    const whatsappUrl = `https://wa.me/?text=${text}`;
    window.open(whatsappUrl, '_blank');
    setShowShareMenu(false);
  };

  // Email Share
  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out ${productName}`);
    const body = encodeURIComponent(`${shareText}\n\nView here: ${fullUrl}`);
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = emailUrl;
    setShowShareMenu(false);
  };

  // Copy Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setShowShareMenu(false);
      }, 1500);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => {
          setCopied(false);
          setShowShareMenu(false);
        }, 1500);
      } catch (err) {
        toast.error('Failed to copy link');
      }
      document.body.removeChild(textArea);
    }
  };

  // Check if native share is available
  const isNativeShareAvailable = typeof window !== 'undefined' && navigator.share;

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      action: handleFacebookShare,
      iconColor: 'text-blue-600',
      textColor: 'text-blue-600',
    },
    {
      name: 'Twitter',
      icon: Twitter,
      action: handleTwitterShare,
      iconColor: 'text-sky-500',
      textColor: 'text-sky-500',
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      action: handleWhatsAppShare,
      iconColor: 'text-green-600',
      textColor: 'text-green-600',
    },
    {
      name: 'Email',
      icon: Mail,
      action: handleEmailShare,
      iconColor: 'text-gray-600',
      textColor: 'text-gray-600',
    },
    {
      name: copied ? 'Copied!' : 'Copy Link',
      icon: copied ? Check : Link2,
      action: handleCopyLink,
      iconColor: copied ? 'text-green-600' : 'text-gray-600',
      textColor: copied ? 'text-green-600' : 'text-gray-600',
    },
  ];

  // Add native share option if available (desktop)
  if (isNativeShareAvailable && !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    shareOptions.unshift({
      name: 'Share',
      icon: Share2,
      action: handleNativeShare,
      iconColor: 'text-web',
      textColor: 'text-web',
    });
  }

  const handleButtonClick = async (e: React.MouseEvent) => {
    // Try native share first on mobile
    if (isNativeShareAvailable && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      e.preventDefault();
      e.stopPropagation();
      const shared = await handleNativeShare();
      if (shared) {
        setShowShareMenu(false);
        return;
      }
    }
    // For desktop, let Popover handle it
    setShowShareMenu(!showShareMenu);
  };

  return (
    <Popover open={showShareMenu} onOpenChange={setShowShareMenu}>
      <PopoverTrigger asChild>
        <button
          onClick={handleButtonClick}
          className={`flex items-center justify-center gap-2 border border-gray-300 text-gray-700 rounded-full px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 font-semibold hover:bg-gray-100 active:scale-95 transition text-xs sm:text-sm md:text-base ${className}`}
          aria-label='Share product'>
          <Share2 className='w-4 h-4 sm:w-4 md:w-5 sm:h-4 md:h-5' />
          <span className='hidden xs:inline'>Share</span>
          <span className='xs:hidden'>Share</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className='w-[calc(100vw-2rem)] sm:w-80 max-w-[90vw] p-0' align='end' side='bottom' sideOffset={8}>
        <div className='p-3 sm:p-4'>
          {/* Header */}
          <div className='flex items-center justify-between mb-3 sm:mb-4'>
            <h3 className='text-base sm:text-lg font-semibold text-gray-900'>Share Product</h3>
            <button onClick={() => setShowShareMenu(false)} className='p-1.5 hover:bg-gray-100 rounded-full transition' aria-label='Close'>
              <X className='w-4 h-4 text-gray-500' />
            </button>
          </div>

          {/* Share Options Grid */}
          <div className='grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4'>
            {shareOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.name}
                  onClick={option.action}
                  className='flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-web hover:bg-web/5 transition-all group active:scale-95'>
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${option.iconColor} group-hover:scale-110 transition-transform`} />
                  <span className={`text-xs sm:text-sm font-medium ${option.textColor} text-center`}>{option.name}</span>
                </button>
              );
            })}
          </div>

          {/* Copy Link Section */}
          <div className='border-t border-gray-200 pt-3 sm:pt-4'>
            <label className='text-xs sm:text-sm font-medium text-gray-700 block mb-2'>Or copy link</label>
            <div className='flex flex-col sm:flex-row gap-2'>
              <input
                type='text'
                value={fullUrl}
                readOnly
                className='flex-1 px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-web focus:border-transparent truncate'
              />
              {/* <button
                onClick={handleCopyLink}
                className='w-full sm:w-auto px-4 py-2 bg-web text-white rounded-md hover:bg-web/90 active:scale-95 transition flex items-center justify-center gap-2 text-xs sm:text-sm font-medium whitespace-nowrap'
                aria-label='Copy link'>
                {copied ? (
                  <>
                    <Check className='w-4 h-4' />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className='w-4 h-4' />
                    <span>Copy</span>
                  </>
                )}
              </button> */}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

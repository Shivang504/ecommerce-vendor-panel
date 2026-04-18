'use client';

import { Facebook, Instagram, Twitter, Globe } from 'lucide-react';

interface SocialMediaLinksProps {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
}

export function SocialMediaLinks({ 
  facebook, 
  instagram, 
  twitter, 
  website 
}: SocialMediaLinksProps) {
  const socialLinks = [
    {
      name: 'Facebook',
      url: facebook,
      icon: Facebook,
      color: 'text-blue-600 hover:text-blue-700'
    },
    {
      name: 'Instagram',
      url: instagram,
      icon: Instagram,
      color: 'text-pink-600 hover:text-pink-700'
    },
    {
      name: 'Twitter',
      url: twitter,
      icon: Twitter,
      color: 'text-blue-400 hover:text-blue-500'
    },
    {
      name: 'Website',
      url: website,
      icon: Globe,
      color: 'text-gray-600 hover:text-gray-700'
    }
  ].filter(link => link.url && link.url.trim()); // Only show links that have URLs

  if (socialLinks.length === 0) {
    return null;
  }

  const normalizeUrl = (url: string) => {
    if (!url) return '';
    url = url.trim();
    // If URL doesn't start with http:// or https://, add https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  return (
    <div className='flex items-center gap-3 mt-2'>
      {socialLinks.map((link) => (
        <a
          key={link.name}
          href={normalizeUrl(link.url!)}
          target='_blank'
          rel='noopener noreferrer'
          className={`${link.color} transition-colors p-1.5 rounded-full hover:bg-gray-100`}
          aria-label={`Visit ${link.name}`}
          title={link.name}
        >
          <link.icon className='w-4 h-4' />
        </a>
      ))}
    </div>
  );
}

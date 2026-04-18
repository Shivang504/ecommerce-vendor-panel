'use client';

import { useEffect } from 'react';

export function FontLoader() {
  useEffect(() => {
    // Check if fonts are already loaded
    const existingLink = document.querySelector('link[href*="fonts.googleapis.com"]');
    if (existingLink) return;

    // Add preconnect links for performance
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect2);

    // Add Google Fonts stylesheet
    const fontLink = document.createElement('link');
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Playfair+Display:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&family=Lato:wght@400;700&family=Montserrat:wght@400;500;600;700&family=Raleway:wght@400;500;600;700&family=Merriweather:wght@400;700&family=Inter:wght@400;500;600;700&family=Source+Sans+Pro:wght@400;600;700&family=Ubuntu:wght@400;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }, []);

  return null;
}


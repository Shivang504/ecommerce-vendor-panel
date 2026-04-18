'use client';

import Link from 'next/link';
import { useSettings } from '@/components/settings/settings-provider';
import { Facebook, Twitter, Youtube, Instagram, ShoppingBag, Gift, HelpCircle, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FooterPage {
  _id: string;
  title: string;
  slug: string;
  section: 'about' | 'help' | 'consumer-policy';
}

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

const sectionLabels: Record<string, string> = {
  about: 'ABOUT',
  help: 'HELP',
  'consumer-policy': 'CONSUMER POLICY',
};

export function HomeFooter() {
  const { settings } = useSettings();
  const siteName = settings.siteName || '';
  const primaryColor = settings.primaryColor || '#16a34a';
  const [footerPages, setFooterPages] = useState<FooterPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  // Fetch footer pages from CMS
  useEffect(() => {
    const fetchFooterPages = async () => {
      try {
        const response = await fetch('/api/footer-pages');
        if (response.ok) {
          const data = await response.json();
          setFooterPages(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to fetch footer pages:', error);
      } finally {
        setLoadingPages(false);
      }
    };
    fetchFooterPages();
  }, []);

  // Build footer columns dynamically from CMS data
  const buildFooterColumns = (): FooterColumn[] => {
    const columns: FooterColumn[] = [];
    const sections: Record<string, FooterPage[]> = {
      about: [],
      help: [],
      'consumer-policy': [],
    };

    // Group pages by section
    footerPages.forEach(page => {
      if (sections[page.section]) {
        sections[page.section].push(page);
      }
    });

    // Build columns for each section that has pages
    Object.entries(sections).forEach(([section, pages]) => {
      if (pages.length > 0) {
        columns.push({
          title: sectionLabels[section] || section.toUpperCase(),
          links: pages.map(page => ({
            label: page.title,
            href: `/pages/${page.slug}`,
          })),
        });
      }
    });

    return columns;
  };

  // Fallback footer columns (used if no CMS data or during loading)
  const fallbackFooterColumns: FooterColumn[] = [
    {
      title: 'ABOUT',
      links: [
        { label: 'Contact Us', href: '/contact' },
        { label: 'About Us', href: '/about' },
        { label: 'Careers', href: '/careers' },
        { label: `${siteName} Stories`, href: '/stories' },
      ],
    },
    {
      title: 'HELP',
      links: [
        { label: 'Payments', href: '/help/payments' },
        { label: 'Shipping', href: '/help/shipping' },
        { label: 'Cancellation & Returns', href: '/help/returns' },
        { label: 'FAQ', href: '/help/faq' },
      ],
    },
    {
      title: 'CONSUMER POLICY',
      links: [
        { label: 'Cancellation & Returns', href: '/policy/returns' },
        { label: 'Terms Of Use', href: '/terms-conditions' },
        { label: 'Security', href: '/policy/security' },
        { label: 'Privacy', href: '/privacy-policy' },
      ],
    },
  ];

  // Use CMS data if available, otherwise use fallback
  const footerColumns = !loadingPages && footerPages.length > 0 ? buildFooterColumns() : fallbackFooterColumns;

  // Action buttons for lower section
  const actionButtons = [
    { label: 'Become a Seller', href: '/seller', icon: ShoppingBag },
    { label: 'Gift Cards', href: '/gift-cards', icon: Gift },
    { label: 'Help Center', href: '/help', icon: HelpCircle },
  ];

  // Contact information from settings (with fallbacks)
  // Check if values exist and are not empty strings
  const defaultAddress = `${siteName} Internet Private Limited, Buildings Alyssa, Begonia & Clove Embassy Tech Village, Outer Ring Road, Devarabeesanahalli Village, Bengaluru, 560103, Karnataka, India`;
  const contactInfo = {
    mailUs: (settings.mailUsAddress && settings.mailUsAddress.trim()) || defaultAddress,
    registeredOffice: (settings.registeredOfficeAddress && settings.registeredOfficeAddress.trim()) || defaultAddress,
    cin: (settings.cin && settings.cin.trim()) || 'U51109KA2012PTC066107',
    telephone: (settings.phoneNumber && settings.phoneNumber.trim()) || '044-45614700 / 044-67415800',
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className='bg-web text-white mt-16'>
      <div className='site-container'>
        {/* UPPER SECTION - Main Footer Content */}
        <div className='py-8 lg:py-12'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12'>
            {/* Left Side - Footer Columns */}
            <div
              className={`grid grid-cols-2 sm:grid-cols-2 ${
                footerColumns.length === 1
                  ? 'lg:grid-cols-1'
                  : footerColumns.length === 2
                  ? 'lg:grid-cols-2'
                  : footerColumns.length === 3
                  ? 'lg:grid-cols-3'
                  : 'lg:grid-cols-4'
              } gap-6 lg:gap-8`}>
              {footerColumns.map((column, index) => (
                <div key={index}>
                  <h4 className='text-gray-400 text-xs font-semibold uppercase mb-4'>{column.title}</h4>
                  <ul className='space-y-3'>
                    {column.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <Link
                          href={link.href}
                          className='text-white text-sm hover:text-blue-400 transition-colors block'
                          style={{ '--hover-color': primaryColor } as React.CSSProperties}
                          onMouseEnter={e => {
                            e.currentTarget.style.color = primaryColor;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.color = 'white';
                          }}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Right Side - Contact Information */}
            <div className='space-y-4'>
              {/* Mail Us */}
              <div className='flex flex-col lg:flex-row gap-4'>
                <div>
                  <h4 className='text-gray-400 text-xs font-semibold uppercase mb-3'>Mail Us</h4>
                  <p className='text-white text-sm leading-relaxed'>{contactInfo.mailUs}</p>
                </div>

                {/* Registered Office Address */}
                <div>
                  <h4 className='text-gray-400 text-xs font-semibold uppercase mb-3'>Registered Office Address</h4>
                  <p className='text-white text-sm leading-relaxed'>{contactInfo.registeredOffice}</p>
                </div>
              </div>

              {/* CIN */}
              <div className='flex flex-row gap-2 items-center'>
                <h4 className='text-gray-400 text-xs font-semibold uppercase'>CIN</h4>
                <p className='text-white text-sm'>{contactInfo.cin}</p>
              </div>

              {/* Telephone */}
              {contactInfo.telephone && (
                <div>
                  <a
                    href={`tel:${contactInfo.telephone.split('/')[0].trim().replace(/\s/g, '')}`}
                    className='text-primary text-sm transition-colors inline-flex items-center gap-2'
                    style={{ color: primaryColor }}
                    onMouseEnter={e => {
                      e.currentTarget.style.opacity = '0.8';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.opacity = '1';
                    }}>
                    <Phone className='w-4 h-4' />
                    {contactInfo.telephone}
                  </a>
                </div>
              )}

              {/* Social Media */}
              <div>
                <h4 className='text-gray-400 text-xs font-semibold uppercase mb-3'>Social</h4>
                <div className='flex gap-3'>
                  {[
                    { icon: Facebook, href: '#', label: 'Facebook' },
                    { icon: Twitter, href: '#', label: 'Twitter' },
                    { icon: Youtube, href: '#', label: 'YouTube' },
                    { icon: Instagram, href: '#', label: 'Instagram' },
                  ].map((social, index) => (
                    <Link
                      key={index}
                      href={social.href}
                      className='w-9 h-9 border border-gray-600 rounded-full flex items-center justify-center hover:border-white hover:bg-white/10 transition-colors'
                      aria-label={social.label}>
                      <social.icon className='w-4 h-4 text-white' />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className='border-t border-gray-700'></div>

        {/* LOWER SECTION - Action Buttons, Copyright, Payment Options */}
        <div className='py-6'>
          <div className='flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6'>
            {/* Left Side - Action Buttons */}
            <div className='flex flex-wrap xl:flex-nowrap items-center gap-3 sm:gap-4 xl:gap-6'>
              {/* Other Action Buttons */}
              {actionButtons.map((button, index) => (
                <Link
                  key={index}
                  href={button.href}
                  className='inline-flex items-center gap-1.5 sm:gap-2 text-white text-xs sm:text-sm hover:border-b transition-colors whitespace-nowrap'
                  style={{ '--hover-color': primaryColor } as React.CSSProperties}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'white';
                  }}>
                  <button.icon className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                  <span className='hidden sm:inline'>{button.label}</span>
                  <span className='sm:hidden'>{button.label.split(' ')[0]}</span>
                </Link>
              ))}
            </div>

            {/* Center - Copyright */}
            <div className='text-center w-full xl:w-auto'>
              <p className='text-white text-sm whitespace-nowrap'>
                {currentYear} {siteName}.com
              </p>
            </div>

            {/* Right Side - Trust Icons */}
            {settings.trustIcons &&
            Array.isArray(settings.trustIcons) &&
            settings.trustIcons.length > 0 &&
            settings.trustIcons.filter(url => url && url.trim()).length > 0 ? (
              <div className='flex flex-wrap items-center justify-center lg:justify-end gap-3'>
                {settings.trustIcons
                  .filter(url => url && url.trim())
                  .map((iconUrl, index) => (
                    <div
                      key={index}
                      className='h-10 w-auto flex items-center justify-center bg-white rounded px-2 py-1 border border-gray-200 hover:border-gray-300 transition-colors'>
                      <img
                        src={iconUrl}
                        alt={`Trust icon ${index + 1}`}
                        className='max-h-full max-w-full object-contain'
                        onError={e => {
                          // Hide broken images
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}

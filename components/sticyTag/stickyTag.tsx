'use client';
import { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';

export default function StickyTag() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setShow(true);
      } else {
        setShow(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`
        fixed bottom-6 z-50
        transition-all duration-300
        ${show ? 'translate-x-0 right-4' : 'translate-x-full right-0 '}
      `}>
      <a
        href='/products'
        className='
          flex items-center gap-2
          bg-web text-white shadow-lg 
          px-4 py-2 rounded-full
          font-medium 
          transition
        '>
        <ShoppingBag className='w-5 h-5' />
        <span>See all products</span>
      </a>
    </div>
  );
}

'use client';

import { Moon, Sun, User, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Slider } from '@/components/ui/slider';

export function AdminHeader() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [textSize, setTextSize] = useState('medium');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedSize = localStorage.getItem('textSize') || 'medium';
    setTextSize(savedSize);
  }, []);

  const handleTextSizeChange = (value: number[]) => {
    const sizes = ['small', 'medium', 'large'];
    const newSize = sizes[value[0]];
    setTextSize(newSize);
    localStorage.setItem('textSize', newSize);
  };

  const getTextSizeIndex = () => {
    const sizes = ['small', 'medium', 'large'];
    return sizes.indexOf(textSize);
  };

  if (!mounted) return null;

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-20">
      <div className="h-full px-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Dashboard</h2>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Button>
            
            {showSettings && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-6 space-y-6">
                {/* Theme Selector */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-300 to-yellow-400 dark:from-yellow-500 dark:to-yellow-600 flex items-center justify-center">
                      <Sun className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Theme</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setTheme('light')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        theme === 'light'
                          ? 'bg-green-500 text-white shadow-lg'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <Sun className="w-4 h-4 mx-auto mb-1" />
                      Light
                    </button>
                    <button
                      onClick={() => setTheme('system')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        theme === 'system'
                          ? 'bg-green-500 text-white shadow-lg'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <div className="w-4 h-4 mx-auto mb-1 flex items-center justify-center">⚙</div>
                      Auto
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        theme === 'dark'
                          ? 'bg-green-500 text-white shadow-lg'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <Moon className="w-4 h-4 mx-auto mb-1" />
                      Dark
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

                {/* Text Size Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-300 to-blue-400 dark:from-blue-500 dark:to-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">A</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Text Size</span>
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                      {textSize === 'small' ? 'S' : textSize === 'medium' ? 'M' : 'L'}
                    </span>
                  </div>

                  <Slider
                    value={[getTextSizeIndex()]}
                    onValueChange={handleTextSizeChange}
                    min={0}
                    max={2}
                    step={1}
                    className="w-full"
                  />

                  <div className="flex justify-between px-1">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Small</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Medium</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Large</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
            <div className="w-8 h-8 rounded-full bg-green-600 dark:bg-green-700 flex items-center justify-center text-white text-sm font-medium">
              A
            </div>
            <span className="text-sm font-medium text-slate-900 dark:text-white hidden sm:inline">Admin</span>
          </div>
        </div>
      </div>

      {/* Close settings on outside click */}
      {showSettings && (
        <div
          className="fixed inset-0"
          onClick={() => setShowSettings(false)}
          style={{ zIndex: 40 }}
        />
      )}
    </header>
  );
}

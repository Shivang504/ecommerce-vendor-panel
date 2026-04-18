'use client';

import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, List, ListOrdered, Quote, Underline, Link, Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

type ToolbarCommand = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList' | 'formatBlock' | 'createLink' | 'justifyLeft' | 'justifyCenter' | 'justifyRight';

type FontFamily =
  | 'Poppins'
  | 'Roboto'
  | 'Playfair Display'
  | 'Open Sans'
  | 'Lato'
  | 'Montserrat'
  | 'Raleway'
  | 'Merriweather'
  | 'Inter'
  | 'Source Sans Pro'
  | 'Ubuntu'
  | 'Georgia'
  | 'Times New Roman'
  | 'Arial'
  | 'Courier New'
  | 'serif'
  | 'sans-serif'
  | 'monospace';

type FontCategory = 'sans-serif' | 'serif' | 'monospace' | 'generic';

interface FontFamilyItem {
  value: FontFamily;
  label: string;
  cssValue: string;
  category: FontCategory;
}

const FONT_FAMILIES: FontFamilyItem[] = [
  // Sans-serif fonts
  { value: 'Poppins', label: 'Poppins', cssValue: 'Poppins, sans-serif', category: 'sans-serif' },
  { value: 'Roboto', label: 'Roboto', cssValue: 'Roboto, sans-serif', category: 'sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', cssValue: '"Open Sans", sans-serif', category: 'sans-serif' },
  { value: 'Lato', label: 'Lato', cssValue: 'Lato, sans-serif', category: 'sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', cssValue: 'Montserrat, sans-serif', category: 'sans-serif' },
  { value: 'Raleway', label: 'Raleway', cssValue: 'Raleway, sans-serif', category: 'sans-serif' },
  { value: 'Inter', label: 'Inter', cssValue: 'Inter, sans-serif', category: 'sans-serif' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro', cssValue: '"Source Sans Pro", sans-serif', category: 'sans-serif' },
  { value: 'Ubuntu', label: 'Ubuntu', cssValue: 'Ubuntu, sans-serif', category: 'sans-serif' },
  { value: 'Arial', label: 'Arial', cssValue: 'Arial, sans-serif', category: 'sans-serif' },
  // Serif fonts
  { value: 'Playfair Display', label: 'Playfair Display', cssValue: '"Playfair Display", serif', category: 'serif' },
  { value: 'Merriweather', label: 'Merriweather', cssValue: 'Merriweather, serif', category: 'serif' },
  { value: 'Georgia', label: 'Georgia', cssValue: 'Georgia, serif', category: 'serif' },
  { value: 'Times New Roman', label: 'Times New Roman', cssValue: '"Times New Roman", serif', category: 'serif' },
  // Monospace fonts
  { value: 'Courier New', label: 'Courier New', cssValue: '"Courier New", monospace', category: 'monospace' },
  // Generic font families
  { value: 'sans-serif', label: 'Sans-serif', cssValue: 'sans-serif', category: 'generic' },
  { value: 'serif', label: 'Serif', cssValue: 'serif', category: 'generic' },
  { value: 'monospace', label: 'Monospace', cssValue: 'monospace', category: 'generic' },
];

// Group fonts by category for organized display
const FONT_CATEGORIES: { category: FontCategory; label: string }[] = [
  { category: 'sans-serif', label: 'Sans-serif' },
  { category: 'serif', label: 'Serif' },
  { category: 'monospace', label: 'Monospace' },
  { category: 'generic', label: 'Generic' },
];

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  id?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = 'Write something...',
  required,
  error,
  helperText,
  id,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [currentFontFamily, setCurrentFontFamily] = useState<FontFamily>('sans-serif');

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
      // Detect font family after content is loaded
      setTimeout(() => {
        detectFontFamily();
      }, 0);
    }
  }, [value]);

  const exec = (command: ToolbarCommand, value?: string) => {
    if (disabled || typeof document === 'undefined') return;
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    
    // Clean up zero-width spaces that are no longer needed (optional cleanup)
    // This is not critical but keeps HTML cleaner
    const editor = editorRef.current;
    const zeroWidthSpans = editor.querySelectorAll('span[style*="font-family"]');
    zeroWidthSpans.forEach((span) => {
      const el = span as HTMLElement;
      if (el.textContent === '\u200B' && el.children.length === 0) {
        // If it's just a zero-width space with no other content, we could remove it
        // But for now, we'll keep it as it helps maintain font context
      }
    });
    
    onChange(editor.innerHTML);
  };

  const handleLink = () => {
    if (showLinkInput && linkUrl) {
      exec('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    } else {
      setShowLinkInput(true);
    }
  };

  const handleHeading = (level: 'h1' | 'h2' | 'h3') => {
    exec('formatBlock', level);
  };

  const applyFontFamily = (fontFamily: FontFamily) => {
    if (disabled || typeof document === 'undefined' || !editorRef.current) return;
    
    editorRef.current.focus();
    
    const fontFamilyObj = FONT_FAMILIES.find(f => f.value === fontFamily);
    const cssFontFamily = fontFamilyObj?.cssValue || fontFamily;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // No selection - create range at end of editor
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      
      const span = document.createElement('span');
      span.style.fontFamily = cssFontFamily;
      span.innerHTML = '\u200B';
      range.insertNode(span);
      
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      setCurrentFontFamily(fontFamily);
      handleInput();
      return;
    }

    const range = selection.getRangeAt(0);
    
    // If cursor is collapsed (no selection), insert span for future typing
    if (range.collapsed) {
      const span = document.createElement('span');
      span.style.fontFamily = cssFontFamily;
      span.innerHTML = '\u200B';
      range.insertNode(span);
      
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      setCurrentFontFamily(fontFamily);
      handleInput();
      return;
    }

    // For selected text - wrap in span with font-family style
    // This is the most reliable method that works with all browsers
    try {
      const span = document.createElement('span');
      span.setAttribute('style', `font-family: ${cssFontFamily} !important;`);
      
      // Try surroundContents first (works for most cases)
      try {
        range.surroundContents(span);
      } catch (surroundError) {
        // If surroundContents fails (selection crosses boundaries), use extractContents
        const contents = range.extractContents();
        
        // If we have text content, wrap it
        if (contents.textContent || contents.childNodes.length > 0) {
          span.appendChild(contents);
          range.insertNode(span);
        } else {
          // Fallback: get text from range and wrap it
          const text = range.toString();
          if (text) {
            span.textContent = text;
            range.deleteContents();
            range.insertNode(span);
          }
        }
      }
      
      // Restore selection after the span
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.addRange(newRange);
      
      setCurrentFontFamily(fontFamily);
      handleInput();
    } catch (error) {
      // Ultimate fallback: apply style directly to common ancestor
      try {
        const commonAncestor = range.commonAncestorContainer;
        if (commonAncestor.nodeType === Node.ELEMENT_NODE) {
          (commonAncestor as HTMLElement).style.fontFamily = cssFontFamily;
        } else if (commonAncestor.parentElement) {
          commonAncestor.parentElement.style.fontFamily = cssFontFamily;
        }
        setCurrentFontFamily(fontFamily);
        handleInput();
      } catch (finalError) {
        console.error('Failed to apply font family:', finalError);
        setCurrentFontFamily(fontFamily);
      }
    }
  };

  // Detect current font family at cursor position
  const detectFontFamily = () => {
    if (!editorRef.current || typeof document === 'undefined') return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setCurrentFontFamily('sans-serif');
      return;
    }

    const range = selection.getRangeAt(0);
    let node: Node | null = range.startContainer;
    
    // Walk up the DOM tree to find the element with font-family style
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        // Check inline style first
        if (element.style && element.style.fontFamily) {
          const inlineFont = element.style.fontFamily.toLowerCase();
          const matched = FONT_FAMILIES.find(f => {
            const fontName = f.value.toLowerCase();
            const cssValue = f.cssValue.toLowerCase().replace(/['"]/g, '');
            return inlineFont.includes(fontName) || inlineFont.includes(cssValue);
          });
          if (matched) {
            setCurrentFontFamily(matched.value);
            return;
          }
        }
        
        // Check computed style
        const computedFont = window.getComputedStyle(element).fontFamily.toLowerCase();
        if (computedFont) {
          const matched = FONT_FAMILIES.find(f => {
            const fontName = f.value.toLowerCase();
            const cssValue = f.cssValue.toLowerCase().replace(/['"]/g, '');
            // Check if the computed font includes our font name
            return computedFont.includes(fontName) || computedFont.includes(cssValue);
          });
          if (matched) {
            setCurrentFontFamily(matched.value);
            return;
          }
        }
      }
      node = node.parentNode;
    }
    
    // Default to sans-serif if not found
    setCurrentFontFamily('sans-serif');
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleSelectionChange = () => {
      if (document.activeElement === editor) {
        detectFontFamily();
      }
    };

    editor.addEventListener('click', handleSelectionChange);
    editor.addEventListener('keyup', handleSelectionChange);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      editor.removeEventListener('click', handleSelectionChange);
      editor.removeEventListener('keyup', handleSelectionChange);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  return (
    <div className='space-y-2'>
      <label htmlFor={id} className='block text-sm font-medium text-slate-700 dark:text-slate-300'>
        {label}
        {required && <span className='text-red-500'> *</span>}
      </label>

      <div
        className={cn(
          'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40',
          disabled && 'opacity-70 pointer-events-none',
          error && 'border-red-500',
        )}
      >
        <div className='border-b border-slate-200 dark:border-slate-800'>
          <div className='flex items-center gap-1 px-3 py-2 flex-wrap'>
            {/* Font Family */}
            <div className='flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2 mr-2'>
              <DropdownMenu>
                <DropdownMenuTrigger
                  type='button'
                  className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1'
                  aria-label='Font Family'
                  title='Font Family'
                >
                  <Type className='w-4 h-4' />
                  <span className='text-xs font-medium hidden sm:inline-block max-w-[80px] truncate'>
                    {FONT_FAMILIES.find(f => f.value === currentFontFamily)?.label || 'Font'}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='start' className='min-w-[180px] max-h-[400px] overflow-y-auto'>
                  {FONT_CATEGORIES.map((cat, catIndex) => {
                    const fontsInCategory = FONT_FAMILIES.filter(f => f.category === cat.category);
                    if (fontsInCategory.length === 0) return null;
                    
                    return (
                      <div key={cat.category}>
                        {catIndex > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel className='text-xs text-slate-500 dark:text-slate-400 px-2 py-1.5'>
                          {cat.label}
                        </DropdownMenuLabel>
                        {fontsInCategory.map((font) => (
                          <DropdownMenuItem
                            key={font.value}
                            onClick={() => applyFontFamily(font.value)}
                            className={cn(
                              'cursor-pointer',
                              currentFontFamily === font.value && 'bg-slate-100 dark:bg-slate-800'
                            )}
                            style={{
                              fontFamily: font.cssValue,
                            }}
                          >
                            {font.label}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Text Formatting */}
            <div className='flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2 mr-2'>
              <button
                type='button'
                onClick={() => exec('bold')}
                className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                aria-label='Bold'
                title='Bold (Ctrl+B)'
              >
                <Bold className='w-4 h-4' />
              </button>
              <button
                type='button'
                onClick={() => exec('italic')}
                className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                aria-label='Italic'
                title='Italic (Ctrl+I)'
              >
                <Italic className='w-4 h-4' />
              </button>
              <button
                type='button'
                onClick={() => exec('underline')}
                className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                aria-label='Underline'
                title='Underline (Ctrl+U)'
              >
                <Underline className='w-4 h-4' />
              </button>
            </div>

            {/* Headings */}
            <div className='flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2 mr-2'>
              <button
                type='button'
                onClick={() => handleHeading('h1')}
                className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                aria-label='Heading 1'
                title='Heading 1'
              >
                <Heading1 className='w-4 h-4' />
              </button>
              <button
                type='button'
                onClick={() => handleHeading('h2')}
                className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                aria-label='Heading 2'
                title='Heading 2'
              >
                <Heading2 className='w-4 h-4' />
              </button>
              <button
                type='button'
                onClick={() => handleHeading('h3')}
                className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                aria-label='Heading 3'
                title='Heading 3'
              >
                <Heading3 className='w-4 h-4' />
              </button>
            </div>

            {/* Lists */}
            <div className='flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2 mr-2'>
              <button
                type='button'
                onClick={() => exec('insertUnorderedList')}
                className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                aria-label='Bullet list'
                title='Bullet List'
              >
                <List className='w-4 h-4' />
              </button>
              <button
                type='button'
                onClick={() => exec('insertOrderedList')}
                className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                aria-label='Numbered list'
                title='Numbered List'
              >
                <ListOrdered className='w-4 h-4' />
              </button>
            </div>

            {/* Alignment */}
            <div className='flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2 mr-2'>
              <button
                type='button'
                onClick={() => exec('justifyLeft')}
                className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                aria-label='Align Left'
                title='Align Left'
              >
                <AlignLeft className='w-4 h-4' />
              </button>
              <button
                type='button'
                onClick={() => exec('justifyCenter')}
                className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                aria-label='Align Center'
                title='Align Center'
              >
                <AlignCenter className='w-4 h-4' />
              </button>
              <button
                type='button'
                onClick={() => exec('justifyRight')}
                className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                aria-label='Align Right'
                title='Align Right'
              >
                <AlignRight className='w-4 h-4' />
              </button>
            </div>

            {/* Quote & Link */}
            <div className='flex items-center gap-1'>
              <button
                type='button'
                onClick={() => exec('formatBlock', 'blockquote')}
                className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                aria-label='Quote'
                title='Quote'
              >
                <Quote className='w-4 h-4' />
              </button>
              <button
                type='button'
                onClick={handleLink}
                className='p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                aria-label='Insert Link'
                title='Insert Link'
              >
                <Link className='w-4 h-4' />
              </button>
            </div>
          </div>

          {/* Link Input */}
          {showLinkInput && (
            <div className='px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2'>
              <input
                type='text'
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder='Enter URL (e.g., https://example.com)'
                className='flex-1 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900'
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLink();
                  } else if (e.key === 'Escape') {
                    setShowLinkInput(false);
                    setLinkUrl('');
                  }
                }}
                autoFocus
              />
              <button
                type='button'
                onClick={handleLink}
                className='px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors'
              >
                Insert
              </button>
              <button
                type='button'
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkUrl('');
                }}
                className='px-3 py-1 text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors'
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className='relative'>
          {!value && (
            <div className='absolute left-4 top-3 text-sm text-slate-400 pointer-events-none select-none'>
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            id={id}
            role='textbox'
            aria-multiline='true'
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={handleInput}
            className='min-h-[200px] px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none prose prose-sm max-w-none'
          />
        </div>
      </div>

      {helperText && <p className='text-xs text-slate-500'>{helperText}</p>}
      {error && <p className='text-xs text-red-500'>{error}</p>}
    </div>
  );
}


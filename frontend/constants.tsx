import React from 'react';
import type { Language } from './types';

export const LANGUAGES: Language[] = [
  { code: 'Tamil', name: 'Tamil' },
  { code: 'Hindi', name: 'Hindi' },
  { code: 'Malayalam', name: 'Malayalam' },
  { code: 'Telugu', name: 'Telugu' },
  { code: 'Kannada', name: 'Kannada' },
  { code: 'English', name: 'English' },
];

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" />
    <path d="M12.25 15.25H9.75V14H12.25C12.66 14 13 13.66 13 13.25C13 12.84 12.66 12.5 12.25 12.5H11C10.45 12.5 10 12.95 10 13.5V15C10 15.55 10.45 16 11 16H12.25V17.5H9.75C9.34 17.5 9 17.84 9 18.25C9 18.66 9.34 19 9.75 19H11.5C12.05 19 12.5 18.55 12.5 18V16.5C12.5 15.95 12.05 15.5 11.5 15.5H9.75V14H12.25C12.66 14 13 13.66 13 13.25C13 12.84 12.66 12.5 12.25 12.5H11C10.45 12.5 10 12.95 10 13.5V15C10 15.55 10.45 16 11 16H13.25C13.66 16 14 15.66 14 15.25V13.5C14 12.67 13.33 12 12.5 12H11C10.45 12 10 12.45 10 13V11.5C10 11.22 10.22 11 10.5 11H13.25C13.66 11 14 11.34 14 11.75C14 12.16 13.66 12.5 13.25 12.5H11V14H13.25C13.66 14 14 14.34 14 14.75C14 15.16 13.66 15.5 13.25 15.5H12.25V15.25Z" fillOpacity="0.3" />
  </svg>
);

export const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
  </svg>
);

export const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

export const TranslateIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502" />
  </svg>
);

export const SummarizeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
  </svg>
);

export const ChatIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const DeleteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
  </svg>
);


export const BUTTON = {
  primary:
    'inline-flex items-center justify-center rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-slate-900 transition-all duration-200 hover:shadow-[0_0_0_3px_rgba(56,189,248,0.16)] disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-colors duration-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition-colors duration-200 hover:bg-white/5 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed',
  icon:
    'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition-colors duration-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed',
} as const;


export const Spinner: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// Helper component for loading states
export const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-black/55 backdrop-blur-sm">
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 shadow-soft">
      <Spinner className="w-6 h-6 text-accent-primary" />
      <span className="text-sm font-medium text-white/80">{message}</span>
    </div>
  </div>
);
import React, { useEffect } from 'react';
import { BUTTON } from '../constants';

export default function ConfirmModal({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1224]/95 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="text-sm font-semibold text-white">{title}</div>
          {description ? <div className="mt-2 text-sm leading-relaxed text-white/60">{description}</div> : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className={BUTTON.secondary}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={
                danger
                  ? 'inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-400 hover:shadow-[0_0_0_3px_rgba(239,68,68,0.22)]'
                  : BUTTON.primary
              }
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

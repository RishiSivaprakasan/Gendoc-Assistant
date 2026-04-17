import React, { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { BUTTON } from '../constants';
import { useTheme } from '../theme/ThemeContext';

export default function Settings() {
  const auth = useAuth();
  const { theme, setTheme } = useTheme();
  const email = auth.user?.email || '';
  const initialName = useMemo(() => {
    const base = String(email || '').split('@')[0] || '';
    return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'User';
  }, [email]);

  const [displayName, setDisplayName] = useState(auth.profile.displayName || initialName);
  const [avatar, setAvatar] = useState(auth.profile.avatar || 'A');

  const avatarOptions = useMemo(() => ['A', 'B', 'C', 'D', 'E', 'F'], []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-soft">
        <div className="text-sm font-semibold text-white">Profile</div>

        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
          <div>
            <div className="text-xs font-medium text-white/50">Avatar</div>
            <div className="mt-3 grid grid-cols-6 gap-2">
              {avatarOptions.map((opt) => {
                const active = opt === avatar;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAvatar(opt)}
                    className={
                      active
                        ? 'grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-sm font-semibold text-white ring-2 ring-[rgba(56,189,248,0.45)]'
                        : 'grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-sm font-semibold text-white/80 ring-1 ring-white/10 hover:bg-white/10'
                    }
                    aria-label={`Select avatar ${opt}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => auth.updateProfile({ displayName: displayName.trim() || initialName, avatar })}
              className={`${BUTTON.primary} mt-4 w-full`}
            >
              Save
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-white/50">Name</div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none focus:ring-2 focus:ring-[rgba(56,189,248,0.25)]"
                placeholder="Your name"
              />
            </div>

            <div>
              <div className="text-xs font-medium text-white/50">Email</div>
              <input
                value={email}
                readOnly
                className="mt-2 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/65 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-soft">
        <div className="text-sm font-semibold text-white">Theme</div>
        <div className="mt-2 text-sm text-white/60">Choose how the app looks on this device.</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={
              theme === 'dark'
                ? 'inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-2 ring-[rgba(56,189,248,0.45)]'
                : 'inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 hover:bg-white/10 transition-colors'
            }
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={
              theme === 'light'
                ? 'inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-2 ring-[rgba(56,189,248,0.45)]'
                : 'inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 hover:bg-white/10 transition-colors'
            }
          >
            Light
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-soft">
        <div className="text-sm font-semibold text-white">Account</div>
        <div className="mt-2 text-sm text-white/60">Sign out to switch accounts.</div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void auth.logout()}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-soft">
        <div className="text-sm font-semibold text-white">About</div>
        <div className="mt-2 text-sm text-white/60">
          Gendoc Assistant helps you turn long documents into clear, usable information.
        </div>
        <div className="mt-4 space-y-2 text-sm text-white/60">
          <div>
            Upload or paste text, translate it into supported languages, generate a concise summary, and ask questions with an AI assistant — all in one workspace.
          </div>
          <div className="text-white/70 font-medium">Key features</div>
          <div className="space-y-1">
            <div>Multilingual translation with layout-aware formatting</div>
            <div>Document summarization in bullet points</div>
            <div>Chat-based Q&A grounded in your document</div>
            <div>Saved documents with quick search and reuse</div>
          </div>
        </div>
      </div>
    </div>
  );
}

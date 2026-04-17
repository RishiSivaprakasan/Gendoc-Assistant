import React, { useMemo, useState } from 'react';
import { BUTTON, Logo } from '../constants';

type NavKey = 'workspace' | 'documents' | 'settings' | 'search';

type Props = {
  active: NavKey;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
  onNav: (key: NavKey) => void | Promise<void>;
  onCreateNew: () => void | Promise<void>;
  children: React.ReactNode;
};

export default function AppShell({
  active,
  userEmail,
  userName,
  userAvatar,
  onNav,
  onCreateNew,
  children,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = useMemo(
    () =>
      [
        { key: 'documents' as const, label: 'Saved Documents' },
        { key: 'settings' as const, label: 'Settings' },
      ],
    []
  );

  function handleNav(key: NavKey) {
    setMobileOpen(false);
    void onNav(key);
  }

  return (
    <div className="h-screen overflow-hidden bg-base-bg text-white/90">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1100px_circle_at_15%_10%,rgba(56,189,248,0.16),transparent_55%),radial-gradient(900px_circle_at_85%_20%,rgba(34,197,94,0.10),transparent_55%),radial-gradient(800px_circle_at_50%_85%,rgba(245,158,11,0.08),transparent_50%)]" />

      <div className="relative mx-auto flex h-full max-w-[1440px] gap-6 px-4 py-6">
        <button
          type="button"
          className={`fixed left-4 top-4 z-40 lg:hidden ${BUTTON.icon}`}
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <span className="text-lg leading-none">☰</span>
        </button>

        <div className="lg:hidden">
          {mobileOpen ? (
            <div className="fixed inset-0 z-40">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
              <div className="absolute left-0 top-0 h-full w-[86%] max-w-[320px] p-4">
                <Sidebar
                  active={active}
                  userEmail={userEmail}
                  userName={userName}
                  userAvatar={userAvatar}
                  navItems={navItems}
                  onNav={handleNav}
                  onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
                  onExpand={() => setSidebarCollapsed(false)}
                  collapsed={false}
                  onCreateNew={onCreateNew}
                />
              </div>
            </div>
          ) : null}
        </div>

        <aside className={sidebarCollapsed ? 'hidden shrink-0 lg:block w-[84px] transition-[width] duration-200' : 'hidden shrink-0 lg:block w-[270px] transition-[width] duration-200'}>
          <div className="sticky top-6">
            <Sidebar
              collapsed={sidebarCollapsed}
              active={active}
              userEmail={userEmail}
              userName={userName}
              userAvatar={userAvatar}
              navItems={navItems}
              onNav={handleNav}
              onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
              onExpand={() => setSidebarCollapsed(false)}
              onCreateNew={onCreateNew}
            />
          </div>
        </aside>

        <main className="min-w-0 flex-1 min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  collapsed,
  active,
  userEmail,
  userName,
  userAvatar,
  navItems,
  onNav,
  onToggleCollapse,
  onExpand,
  onCreateNew,
}: {
  collapsed?: boolean;
  active: NavKey;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
  navItems: Array<{ key: NavKey; label: string }>;
  onNav: (key: NavKey) => void | Promise<void>;
  onToggleCollapse: () => void;
  onExpand: () => void;
  onCreateNew: () => void | Promise<void>;
}) {
  const iconByKey = useMemo(
    () =>
      ({
        workspace: DocumentsIcon,
        search: SearchIcon,
        documents: DocumentsIcon,
        settings: SettingsIcon,
      }) satisfies Record<NavKey, React.FC<{ className?: string }>>,
    []
  );

  return (
    <div
      className={
        collapsed
          ? 'flex h-[calc(100vh-48px)] w-[84px] flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl shadow-soft transition-[width] duration-200'
          : 'flex h-[calc(100vh-48px)] w-[270px] flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-soft transition-[width] duration-200'
      }
    >
      <div className={collapsed ? 'flex items-center justify-center gap-2 rounded-xl px-1 py-2' : 'flex items-center justify-between gap-2 rounded-xl px-2 py-2'}>
        <button
          type="button"
          onClick={() => {
            if (collapsed) {
              onExpand();
              return;
            }
            void onNav('workspace');
          }}
          className={collapsed ? 'flex items-center justify-center rounded-xl px-2 py-2 hover:bg-white/5 transition-colors' : 'flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5 transition-colors'}
          title={collapsed ? 'Gendoc Assistant' : undefined}
          aria-label="Go to workspace"
        >
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <Logo className="h-6 w-6 text-accent-primary" />
          </div>
          {collapsed ? null : (
            <div className="min-w-0 text-left">
              <div className="truncate text-sm font-semibold tracking-tight text-white">Gendoc Assistant</div>
            </div>
          )}
        </button>

        {collapsed ? null : (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`shrink-0 ${BUTTON.icon}`}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <SidebarToggleIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-1">
        <NavButton
          label="New Document"
          icon={PlusIcon}
          collapsed={collapsed}
          active={active === 'workspace'}
          onClick={() => void onNav('workspace')}
        />

        <NavButton
          label="Search"
          icon={SearchIcon}
          collapsed={collapsed}
          active={active === 'search'}
          onClick={() => void onNav('search')}
        />

        {navItems.map((item) => (
          <NavButton
            key={item.key}
            label={item.label}
            icon={iconByKey[item.key]}
            collapsed={collapsed}
            active={active === item.key}
            onClick={() => void onNav(item.key)}
          />
        ))}
      </div>

      <div className="mt-auto border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => void onNav('settings')}
          className={collapsed ? 'flex w-full items-center justify-center rounded-xl px-2 py-2 hover:bg-white/5 transition-colors' : 'flex w-full items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5 transition-colors'}
          aria-label="Open profile settings"
          title="Profile"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10" title={userEmail ?? 'Signed in'}>
            <span className="text-sm font-semibold text-white/85">{(userAvatar || 'A').slice(0, 1)}</span>
          </div>
          {collapsed ? null : (
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white/85">{userName || userEmail || 'Signed in'}</div>
              {userName ? <div className="mt-0.5 truncate text-xs text-white/50">{userEmail}</div> : null}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

function NavButton({
  label,
  icon: Icon,
  collapsed,
  active,
  onClick,
}: {
  label: string;
  icon: React.FC<{ className?: string }>;
  collapsed?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={
        active
          ? collapsed
            ? 'group relative flex w-full items-center justify-center rounded-xl bg-white/10 px-2 py-2 text-sm text-white ring-1 ring-white/10'
            : 'group relative flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-2 text-sm text-white ring-1 ring-white/10'
          : collapsed
            ? 'group relative flex w-full items-center justify-center rounded-xl px-2 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors'
            : 'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors'
      }
    >
      <Icon className={active ? 'h-4 w-4 text-white' : 'h-4 w-4 text-white/70 group-hover:text-white'} />
      {collapsed ? null : <span className="truncate">{label}</span>}
    </button>
  );
}

function SidebarToggleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function DocumentsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 4v4h4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6M9 17h6" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2-1.5-2-3.5-2.4.7a7.6 7.6 0 0 0-1.7-1L15 3H9l-.3 2.4a7.6 7.6 0 0 0-1.7 1L4.6 5.7l-2 3.5L4.6 10a7.8 7.8 0 0 0-.1 1 7.8 7.8 0 0 0 .1 1l-2 1.5 2 3.5 2.4-.7a7.6 7.6 0 0 0 1.7 1L9 21h6l.3-2.4a7.6 7.6 0 0 0 1.7-1l2.4.7 2-3.5-2-1.5z"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
      <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

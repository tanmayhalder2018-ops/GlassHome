import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Bell, BookOpen, CalendarCheck, CalendarDays, ChevronsLeft, ChevronsRight, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, Mic2, Moon, Receipt, Settings, Sun, Users, Wallet, X } from 'lucide-react';
import { useApp } from '../lib/store';
import { cx } from '../lib/format';
import { Avatar, IconButton } from './ui';

interface NavItem { to: string; label: string; icon: ReactNode; admin?: boolean }
const NAV: { group: string; items: NavItem[] }[] = [
  { group: '', items: [{ to: '/', label: 'Dashboard', icon: <LayoutDashboard /> }] },
  { group: 'Academy', items: [
    { to: '/students', label: 'Students', icon: <Users /> },
    { to: '/courses', label: 'Courses & Batches', icon: <BookOpen /> },
    { to: '/attendance', label: 'Attendance', icon: <CalendarCheck /> },
    { to: '/schedule', label: 'Class Schedule', icon: <CalendarDays /> },
    { to: '/teachers', label: 'Teachers', icon: <GraduationCap /> },
  ] },
  { group: 'Finance', items: [
    { to: '/payments', label: 'Payments', icon: <Wallet /> },
    { to: '/invoices', label: 'Invoices', icon: <FileText /> },
    { to: '/reminders', label: 'Reminders', icon: <Bell /> },
    { to: '/expenses', label: 'Expenses', icon: <Receipt />, admin: true },
    { to: '/reports', label: 'Reports', icon: <BarChart3 /> },
  ] },
  { group: 'Studio', items: [{ to: '/studio', label: 'T Music Lab', icon: <Mic2 /> }] },
  { group: '', items: [{ to: '/settings', label: 'Settings', icon: <Settings /> }] },
];

export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('rzams_theme', next ? 'dark' : 'light'); } catch { /* ignore */ }
  };
  return { dark, toggle };
}

export default function Layout() {
  const { user, logout, isAdmin, data } = useApp();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('rzams_sidebar') === 'collapsed'; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const loc = useLocation();
  useEffect(() => { setMobileOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);
  // while the phone menu is open, lock the page behind it so only the menu scrolls
  useEffect(() => {
    if (!mobileOpen) return;
    const html = document.documentElement, body = document.body, y = window.scrollY, path = window.location.pathname;
    const prev = { h: html.style.overflow, b: body.style.overflow, pos: body.style.position, top: body.style.top, w: body.style.width };
    html.style.overflow = 'hidden'; body.style.overflow = 'hidden';
    body.style.position = 'fixed'; body.style.top = `-${y}px`; body.style.width = '100%'; // iOS Safari ignores overflow:hidden alone
    return () => { html.style.overflow = prev.h; body.style.overflow = prev.b; body.style.position = prev.pos; body.style.top = prev.top; body.style.width = prev.w; window.scrollTo(0, window.location.pathname === path ? y : 0); };
  }, [mobileOpen]);
  useEffect(() => { try { localStorage.setItem('rzams_sidebar', collapsed ? 'collapsed' : 'open'); } catch { /* ignore */ } }, [collapsed]);
  const logo = data?.settings.logo || '/brand/rza-logo.png';

  const sidebar = (mobile: boolean) => (
    <nav className="flex h-full flex-col">
      <div className={cx('flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border)] px-4', collapsed && !mobile && 'justify-center px-0')}>
        <img src={logo} alt="" className="size-8 rounded-lg object-cover" />
        {(!collapsed || mobile) && <div className="min-w-0 leading-tight"><p className="truncate text-[13.5px] font-semibold">{data?.settings.academyName || 'Rhythm Zone Academy'}</p><p className="text-[11.5px] faint">RZAMS Pro</p></div>}
        {mobile && <IconButton label="Close menu" className="ml-auto" onClick={() => setMobileOpen(false)}><X className="size-4" /></IconButton>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {NAV.map((g, gi) => {
          const items = g.items.filter((i) => !i.admin || isAdmin);
          if (!items.length) return null;
          return (
            <div key={gi} className="mb-3">
              {g.group && (!collapsed || mobile) && <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wide faint">{g.group}</p>}
              {items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.to === '/'} title={collapsed && !mobile ? i.label : undefined} onClick={() => mobile && setMobileOpen(false)}
                  className={({ isActive }) => cx('group relative mb-0.5 flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-[13.5px] font-medium transition-colors [&>svg]:size-[18px] [&>svg]:shrink-0',
                    collapsed && !mobile && 'justify-center px-0',
                    isActive ? 'bg-[var(--surface-2)] text-[var(--text)]' : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]')}>
                  {({ isActive }) => <>{isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-brand-500" />}{i.icon}{(!collapsed || mobile) && <span className="truncate">{i.label}</span>}</>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </div>
      {!mobile && (
        <div className="border-t border-[var(--border)] p-3">
          <button onClick={() => setCollapsed(!collapsed)} className={cx('flex h-9 w-full items-center gap-3 rounded-[10px] px-2.5 text-[13px] text-[var(--text-2)] hover:bg-[var(--surface-2)]', collapsed && 'justify-center px-0')} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronsRight className="size-[18px]" /> : <><ChevronsLeft className="size-[18px]" />Collapse</>}
          </button>
        </div>
      )}
    </nav>
  );

  return (
    <div className="min-h-full">
      <aside className={cx('no-print fixed inset-y-0 left-0 z-30 hidden border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 lg:block', collapsed ? 'w-[68px]' : 'w-[248px]')}>{sidebar(false)}</aside>
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-40 overscroll-contain lg:hidden">
          <div className="anim-fade absolute inset-0 touch-none bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex h-[100dvh] w-[272px] max-w-[85vw] flex-col overscroll-contain border-r border-[var(--border)] bg-[var(--surface)] shadow-xl">{sidebar(true)}</aside>
        </div>
      )}
      <div className={cx('transition-[padding] duration-200', collapsed ? 'lg:pl-[68px]' : 'lg:pl-[248px]')}>
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] px-4 backdrop-blur sm:px-6">
          <IconButton label="Open menu" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="size-5" /></IconButton>
          <img src={logo} alt="" className="size-7 rounded-md object-cover lg:hidden" />
          <div className="ml-auto flex items-center gap-1">
            <IconButton label={dark ? 'Light theme' : 'Dark theme'} onClick={toggle}>{dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}</IconButton>
            <div className="ml-1 flex items-center gap-2.5 rounded-[10px] py-1 pl-1 pr-1 sm:pr-2">
              <Avatar name={user?.name || ''} size={30} />
              <div className="hidden leading-tight sm:block"><p className="text-[13px] font-medium">{user?.name}</p><p className="text-[11.5px] faint">{user?.role}</p></div>
            </div>
            <IconButton label="Log out" onClick={logout}><LogOut className="size-[18px]" /></IconButton>
          </div>
        </header>
        <main className="print-area mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  );
}

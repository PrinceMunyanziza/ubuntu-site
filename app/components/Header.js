'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

const links = [['/', 'Home'], ['/about', 'About'], ['/contact', 'Contact']];
const msgs = ['UBUNTU: We live for His Glory', 'Every act of kindness has a face', 'Share a story of hope'];

export default function Header() {
  const path = usePathname();
  const [sc, setSc] = useState(false);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const f = () => setSc(window.scrollY > 20);
    f();
    window.addEventListener('scroll', f);
    return () => window.removeEventListener('scroll', f);
  }, []);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark');
  }, []);

  useEffect(() => setOpen(false), [path]);
  const prev = useRef(path);
useEffect(() => {
  if (prev.current === '/admin' && path !== '/admin') supabase.auth.signOut();
  prev.current = path;
}, [path]);

  function toggleTheme() {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    setDark(!dark);
  }

  const strip = Array.from({ length: 8 }).map((_, k) => msgs[k % 3]);
  const track = [...strip, ...strip];
  if (path.startsWith('/admin')) return null;

  return (
    <>
      <div className="strip" aria-hidden="true">
        <div className="strip-track">
          {track.map((m, k) => <span key={k}>&#10022; {m}</span>)}
        </div>
      </div>
      <div className={`hd${sc ? ' sc' : ''}`}>
        <div className="hd-in">
          <Link href="/" className="hlogo">
            <i>
              <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="#0f3d2e" strokeWidth="2.2">
                <circle cx="12" cy="13" r="6.500" />
                <circle cx="20" cy="13" r="6.500" />
                <circle cx="16" cy="20" r="6.500" />
              </svg>
            </i>
            <span className="wm">
              <em>UBUNTU</em>
             <small>We live for His Glory</small>
            </span>
          </Link>
          <nav className={`links${open ? ' open' : ''}`}>
            {links.map(([href, label]) => (
              <Link key={href} href={href} className={path === href ? 'on' : ''}>{label}</Link>
            ))}
            <Link href="/login" className="adm">Admin Login</Link>
            <button type="button" className="theme" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? '\u2600\uFE0E' : '\u263E\uFE0E'}
              <span className="lbl">{dark ? 'Light mode' : 'Dark mode'}</span>
            </button>
          </nav>
          <button className="burger" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? '\u2715' : '\u2630'}</button>
        </div>
      </div>
    </>
  );
}

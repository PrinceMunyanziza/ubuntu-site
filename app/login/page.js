'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) setError('Wrong email or password. Please try again.');
    else router.push('/admin');
  }

  return (
    <div className="login">
      <div className="lcard">
        <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#f2a33a" /><path d="M16 24s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 24 13c0 6-8 11-8 11z" fill="#0f3d2e" /></svg>
        <h1>Welcome back</h1>
        <p className="hint">Log in to manage your stories.</p>
        <form onSubmit={submit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="pw">
            <input type={show ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button>
          </div>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
          {error && <p className="msg">{error}</p>}
        </form>
      </div>
    </div>
  );
}
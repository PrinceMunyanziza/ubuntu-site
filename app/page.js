'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const pad = (n) => String(n).padStart(2, '0');
const tilt = [-2, 1.5, -1, 2];
    const hues = ['#e0663a', '#2f5d50', '#8a6d3b', '#4a4a6a', '#a23e2b', '#3d6b7d'];
const color = (name) => hues[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length];

function ago(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  const m = s / 60;
  if (m < 60) return Math.floor(m) + ' min ago';
  const h = m / 60;
  if (h < 24) return Math.floor(h) + ' h ago';
  return Math.floor(h / 24) + ' d ago';
}

export default function Home() {
  const [items, setItems] = useState([]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(null);
  const [comments, setComments] = useState([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from('highlights').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setItems(data || []));
  }, []);

  async function loadComments(id) {
    const { data } = await supabase.from('comments').select('*')
      .eq('highlight_id', id).order('created_at', { ascending: false });
    setComments(data || []);
  }

  useEffect(() => {
    setComments([]);
    setName('');
    setText('');
    setNote('');
    if (open) loadComments(open.id);
  }, [open]);

  async function sendComment(e) {
    e.preventDefault();
    setSending(true);
    setNote('');
    const { error } = await supabase.from('comments').insert({
      highlight_id: open.id,
      name: name.trim(),
      message: text.trim(),
    });
    setSending(false);
    if (error) return setNote('Sorry, your comment could not be sent.');
    setName('');
    setText('');
    setNote('Thank you! Your words of kindness are now live.');
    loadComments(open.id);
  }

  const featured = items.filter((x) => x.featured);
  const slides = featured.length ? featured : items.slice(0, 5);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setTimeout(() => setI((n) => (n + 1) % slides.length), 5000);
    return () => clearTimeout(t);
  }, [paused, i, slides.length]);

  const go = (d) => setI((n) => (n + d + slides.length) % slides.length);
  const cur = slides[i];
  const reps = items.length ? 2 * Math.ceil(6 / items.length) : 0;
  const names = Array.from({ length: reps }).flatMap(() => items);

  return (
    <>
      <section className={`hero${paused ? ' paused' : ''}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {slides.map((s, k) => (
          <div key={s.id} className={`bg${k === i ? ' on' : ''}`} style={{ backgroundImage: `url(${s.photo_url})` }} />
        ))}
        <div className="shade" />
        <div className="hero-text">
          <p className="eyebrow">UBUNTU</p>
             <h1>We live for <em>His Glory.</em></h1>
          <a href="#moments" className="btn sun">See our work</a>
        </div>
        {cur && (
          <div className="now" key={cur.id}>
            <span className="num">{pad(i + 1)} / {pad(slides.length)}</span>
            <h2>{cur.title}</h2>
            <p>{cur.caption}</p>
          </div>
        )}
        {slides.length > 1 && (
          <>
            <div className="ctl">
              <button className="arrow" aria-label="Previous" onClick={() => go(-1)}>&#8592;</button>
              <button className="arrow" aria-label="Next" onClick={() => go(1)}>&#8594;</button>
            </div>
            <div className="bar" key={`${i}-${paused}`} />
          </>
        )}
      </section>

      {names.length > 0 && (
        <div className="marq" aria-hidden="true">
          <div className="track">{names.map((s, k) => <span key={k}>{s.title}</span>)}</div>
        </div>
      )}

      <section className="sec" id="moments">
        <h2 className="big">Moments of hope</h2>
        <p className="sub">{items.length ? `${items.length} stories of lives we have touched. Tap a photo to read it and leave a comment.` : 'No stories yet. Log in as admin to add the first one.'}</p>
        <div className="pols">
          {items.map((s, k) => (
            <button key={s.id} className="pol" style={{ '--r': `${tilt[k % 4]}deg` }} onClick={() => setOpen(s)}>
              <img src={s.photo_url} alt={s.title} />
              <h3>{s.title}</h3>
              <p>{s.caption}</p>
              {s.location && <small>{s.location}</small>}
            </button>
          ))}
        </div>
      </section>

      <section className="cta">
        <h2>Want to be part of the next story?</h2>
        <Link href="/contact" className="btn">Get in touch</Link>
      </section>

      {open && (
        <div className="lb" onClick={() => setOpen(null)}>
          <div className="lbbox" onClick={(e) => e.stopPropagation()}>
            <button className="x" aria-label="Close" onClick={() => setOpen(null)}>&#10005;</button>
            <img src={open.photo_url} alt={open.title} />
            <h3>{open.title}</h3>
            <p>{open.caption}</p>

            <div className="cwrap">
              <h4>Words of kindness <span className="cnt">{comments.length}</span></h4>
              <div className="clist">
                {comments.length === 0 && <p className="cempty">Be the first to leave a kind word.</p>}
                {comments.map((c) => (
                  <div className="cmt" key={c.id}>
                    <div className="av" style={{ background: color(c.name) }}>{c.name.trim().charAt(0).toUpperCase()}</div>
                    <div className="bubble">
                      <b>{c.name}</b> <small>{ago(c.created_at)}</small>
                      <p>{c.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <form className="cform" onSubmit={sendComment}>
                <h5>Leave a note of kindness</h5>
                <input placeholder="Your name" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="off" />
                <textarea placeholder="Share a kind word, a prayer, or a thank you..." rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} required />
                <div className="cfoot">
                  <span className="count">{text.length}/500</span>
                  <button className="btn" type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send with love \u2665'}</button>
                </div>
                {note && <p className="cnote">{note}</p>}
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

async function shrink(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
    if (blob && blob.size < file.size) return { body: blob, ext: 'jpg' };
  } catch {}
  return { body: file, ext };
}

async function uploadPhoto(file) {
  const { body, ext } = await shrink(file);
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await supabase.storage.from('photos').upload(name, body, { contentType: body.type || file.type });
  if (up.error) throw up.error;
  return supabase.storage.from('photos').getPublicUrl(name).data.publicUrl;
}

async function dropPhoto(url) {
  const part = (url || '').split('/photos/')[1];
  if (part) await supabase.storage.from('photos').remove([decodeURIComponent(part)]);
}

function PwField({ value, onChange, placeholder, show, setShow, auto }) {
  return (
    <div className="pw">
      <input type={show ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={auto} required />
      <button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
    </div>
  );
}

export default function Admin() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState([]);
  const [comments, setComments] = useState([]);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [featured, setFeatured] = useState(false);
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [preview, setPreview] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from('highlights').select('*').order('created_at', { ascending: false });
    setItems(data || []);
    const c = await supabase.from('comments').select('*, highlights(title)').order('created_at', { ascending: false });
    setComments(c.data || []);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login');
      else { setReady(true); load(); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/login');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  function reset() {
    setEditing(null); setTitle(''); setCaption(''); setLocation('');
    setFeatured(false); setFile(null); setPreview(''); setFileKey((k) => k + 1);
  }

  function pick(e) {
    const f = e.target.files[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : editing ? editing.photo_url : '');
  }

  function startEdit(s) {
    setEditing(s); setTitle(s.title); setCaption(s.caption || ''); setLocation(s.location || '');
    setFeatured(!!s.featured); setFile(null); setPreview(s.photo_url); setFileKey((k) => k + 1);
    setMsg('');
    document.getElementById('form-top')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function save(e) {
    e.preventDefault();
    if (!editing && !file) return setMsg('Please choose a photo.');
    setBusy(true);
    setMsg(editing ? 'Saving...' : 'Uploading...');
    try {
      let photo_url = editing ? editing.photo_url : '';
      if (file) photo_url = await uploadPhoto(file);
      const row = { title, caption, location, featured, photo_url };
      if (editing) {
        const r = await supabase.from('highlights').update(row).eq('id', editing.id);
        if (r.error) throw r.error;
        if (file) await dropPhoto(editing.photo_url);
        setMsg('Changes saved!');
      } else {
        const r = await supabase.from('highlights').insert(row);
        if (r.error) throw r.error;
        setMsg('Saved! It is now on your website.');
      }
      reset();
      load();
    } catch (err) {
      setMsg('Error: ' + err.message);
    }
    setBusy(false);
  }

  async function toggle(s) {
    await supabase.from('highlights').update({ featured: !s.featured }).eq('id', s.id);
    load();
  }

  async function remove(s) {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    await supabase.from('highlights').delete().eq('id', s.id);
    await dropPhoto(s.photo_url);
    if (editing && editing.id === s.id) reset();
    load();
  }

  async function removeComment(c) {
    if (!confirm('Delete this comment?')) return;
    await supabase.from('comments').delete().eq('id', c.id);
    load();
  }

  async function changePassword(e) {
    e.preventDefault();
    if (newPw.length < 8) return setPwMsg('The new password must be at least 8 characters.');
    if (newPw !== confirmPw) return setPwMsg('The new passwords do not match.');
    setPwBusy(true);
    setPwMsg('');
    const { data: s } = await supabase.auth.getSession();
    const email = s.session?.user?.email;
    const check = await supabase.auth.signInWithPassword({ email, password: oldPw });
    if (check.error) {
      setPwBusy(false);
      return setPwMsg('Your current password is wrong.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwBusy(false);
    if (error) return setPwMsg('Error: ' + error.message);
    setOldPw(''); setNewPw(''); setConfirmPw('');
    setPwMsg('Password changed! Use the new one the next time you log in.');
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  if (!ready) return <div className="ad">Loading...</div>;

  return (
    <div className="ad">
      <div className="ad-stats">
        <div className="stat"><b>{items.length}</b><span>Stories shared</span></div>
        <div className="stat"><b>{items.filter((x) => x.featured).length}</b><span>In the slideshow</span></div>
        <div className="stat"><b>{comments.length}</b><span>Comments received</span></div>
      </div>

      <div className="ad-grid">
        <div className="ad-card" id="form-top">
          <h2>{editing ? 'Edit story' : 'Add a new story'}</h2>
          <form onSubmit={save}>
            <label className="drop">
              {preview ? <img src={preview} alt="Preview" /> : (<><b>Click to choose a photo</b><span>JPG or PNG. Big photos are shrunk automatically.</span></>)}
              <input key={fileKey} type="file" accept="image/*" onChange={pick} />
            </label>
            {editing && <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>Click the photo to replace it, or leave it as is.</p>}
            <input placeholder="Title (e.g. Food for a family)" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <textarea placeholder="Caption" rows={3} value={caption} onChange={(e) => setCaption(e.target.value)} />
            <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
            <label><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Show in the slideshow</label>
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Please wait...' : editing ? 'Save changes' : 'Publish story'}</button>
            {editing && <button className="btn ghost" type="button" onClick={() => { reset(); setMsg(''); }}>Cancel editing</button>}
            {msg && <p>{msg}</p>}
          </form>
        </div>

        <div className="ad-card">
          <h2>Your stories</h2>
          {items.length === 0 && <p>No stories yet. Add your first one.</p>}
          <div className="ad-list">
            {items.map((s) => (
              <div className="ent" key={s.id}>
                {s.featured && <span className="badge">In slideshow</span>}
                <img src={s.photo_url} alt="" />
                <div className="in">
                  <h3>{s.title}</h3>
                  <div className="acts">
                    <button className="btn" onClick={() => startEdit(s)}>Edit</button>
                    <button className="btn ghost" onClick={() => toggle(s)}>{s.featured ? 'Remove from slideshow' : 'Add to slideshow'}</button>
                    <button className="btn red" onClick={() => remove(s)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ad-card ad-wide">
        <h2>Comments</h2>
        {comments.length === 0 && <p>No comments yet.</p>}
        {comments.map((c) => (
          <div className="bub" key={c.id}>
            <div>
              <small>{c.name} on "{c.highlights?.title}"</small>
              {c.message}
            </div>
            <div className="acts">
              <button className="btn red" onClick={() => removeComment(c)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="ad-card ad-wide">
        <h2>Account</h2>
        <form onSubmit={changePassword}>
          <PwField value={oldPw} onChange={setOldPw} placeholder="Current password" show={showPw} setShow={setShowPw} auto="current-password" />
          <PwField value={newPw} onChange={setNewPw} placeholder="New password (at least 8 characters)" show={showPw} setShow={setShowPw} auto="new-password" />
          <PwField value={confirmPw} onChange={setConfirmPw} placeholder="Confirm new password" show={showPw} setShow={setShowPw} auto="new-password" />
          <button className="btn" type="submit" disabled={pwBusy}>{pwBusy ? 'Changing...' : 'Change password'}</button>
          {pwMsg && <p>{pwMsg}</p>}
        </form>
        <button className="btn red" style={{ marginTop: 24 }} onClick={logout}>Log out</button>
      </div>
    </div>
  );
}
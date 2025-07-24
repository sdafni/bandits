import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const initialState = {
  name: '',
  family_name: '',
  age: '',
  city: '',
  occupation: '',
  image: null as File | null,
  description: '',
  why_follow: '',
};

type State = typeof initialState;

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS as string || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

  console.log('VITE_ADMIN_EMAILS:', import.meta.env.VITE_ADMIN_EMAILS);

function App() {
  const [form, setForm] = useState<State>(initialState);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any | undefined>(undefined); // undefined = loading, null = not logged in, object = logged in

  useEffect(() => {
    // Always try to get the session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase());

  if (user === undefined) {
    // Still loading user info
    return (
      <div style={{ maxWidth: 400, margin: '2rem auto', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    // Not logged in
    return (
      <div style={{ maxWidth: 400, margin: '2rem auto' }}>
        <h2>Sign in to upload bandits</h2>
        <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />
      </div>
    );
  }

  if (!isAdmin) {
    // Not an admin
    return (
      <div style={{ maxWidth: 400, margin: '2rem auto', textAlign: 'center' }}>
        <h2>Unauthorized</h2>
        <p>You must be an admin to upload bandits.</p>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as any;
    if (name === 'image') {
      setForm(f => ({ ...f, image: files[0] }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setMessage('');
    let image_url = '';
    try {
      if (form.image) {
        const fileExt = form.image.name.split('.').pop();
        const fileName = `${form.name}_${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from('banditsassets')
          .upload(fileName, form.image);
        if (error) throw error;
        image_url = supabase.storage.from('banditsassets').getPublicUrl(fileName).data.publicUrl;
      }
      const { error: insertError } = await supabase.from('bandits').insert([
        {
          name: form.name,
          family_name: form.family_name,
          age: Number(form.age),
          city: form.city,
          occupation: form.occupation,
          image_url,
          description: form.description,
          why_follow: form.why_follow,
        },
      ]);
      if (insertError) throw insertError;
      setMessage('Bandit uploaded successfully!');
      setForm(initialState);
    } catch (err: any) {
      setMessage(err.message || 'Error uploading bandit');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Upload Bandit</h2>
      <form onSubmit={handleSubmit}>
        <label>Name:<br />
          <input name="name" value={form.name} onChange={handleChange} required />
        </label><br /><br />
        <label>Family Name:<br />
          <input name="family_name" value={form.family_name} onChange={handleChange} required />
        </label><br /><br />
        <label>Age:<br />
          <input name="age" type="number" value={form.age} onChange={handleChange} required min={0} />
        </label><br /><br />
        <label>City:<br />
          <input name="city" value={form.city} onChange={handleChange} required />
        </label><br /><br />
        <label>Occupation:<br />
          <input name="occupation" value={form.occupation} onChange={handleChange} required />
        </label><br /><br />
        <label>Description:<br />
          <textarea name="description" value={form.description} onChange={handleChange} />
        </label><br /><br />
        <label>Why Follow:<br />
          <textarea name="why_follow" value={form.why_follow} onChange={handleChange} />
        </label><br /><br />
        <label>Image:<br />
          <input name="image" type="file" accept="image/*" onChange={handleChange} required />
        </label><br /><br />
        <button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload Bandit'}</button>
      </form>
      {message && <p style={{ marginTop: 20 }}>{message}</p>}
      <button style={{ marginTop: 20 }} onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  );
}

export default App;

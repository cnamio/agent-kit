'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

interface Started { domain: string; provider: string; setup: 'manual' | 'automatic'; jobId: string; status: string; records: { type: string; host: string; value: string }[] }

export default function Page() {
  const [mode, setMode] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [started, setStarted] = useState<Started | null>(null);
  const [state, setState] = useState('');

  useEffect(() => { fetch('/api/mode').then(r => r.json()).then(body => setMode(body.mode)).catch(() => setMode(null)); }, []);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setMessage('Checking…'); setStarted(null);
    const r = await fetch('/api/domains', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: form.get('domain'), providerToken: form.get('providerToken') || undefined }) });
    const body = await r.json();
    (formElement.elements.namedItem('providerToken') as HTMLInputElement).value = ''; // never kept in the page
    if (!r.ok) { setMessage(body.message ?? body.error); return; }
    setMessage(''); setStarted(body); setState(body.status);
  }

  async function check() {
    if (!started) return;
    const s = await (await fetch(`/api/domains/${encodeURIComponent(started.jobId)}`)).json();
    setState(s.connected ? 'connected' : (s.status ?? s.error));
  }

  return (
    <main>
      <h1>Connect your domain</h1>
      <p style={{ opacity: 0.75 }}>
        {mode === 'sandbox' ? 'Sandbox: no account, nothing real is changed. Try shop.example.com, conflict.example.com or pending.example.com.'
          : mode ? 'Using your Cnamio application.' : ''}
      </p>
      <form onSubmit={connect} style={{ display: 'grid', gap: '.5rem' }}>
        <label htmlFor="domain">Domain</label>
        <input id="domain" name="domain" placeholder="shop.example.com" required autoComplete="off" />
        <label htmlFor="providerToken">DNS provider API token (optional, used once and never stored)</label>
        <input id="providerToken" name="providerToken" type="password" autoComplete="off" />
        <button>Connect</button>
      </form>
      <div aria-live="polite">
        {message && <p>{message}</p>}
        {started && (
          <>
            <p>DNS at <strong>{started.provider}</strong>, {started.setup === 'automatic' ? 'records created with your token' : 'create these records'}:</p>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '.85rem' }}>
              <thead><tr><th align="left">Type</th><th align="left">Name</th><th align="left">Value</th></tr></thead>
              <tbody>{started.records.map(r => <tr key={`${r.type}${r.host}`}><td>{r.type}</td><td>{r.host}</td><td style={{ wordBreak: 'break-all' }}>{r.value}</td></tr>)}</tbody>
            </table>
            <p><button onClick={check}>Check status</button> {state}</p>
          </>
        )}
      </div>
    </main>
  );
}

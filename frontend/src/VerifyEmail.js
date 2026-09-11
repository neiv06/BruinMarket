import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, ArrowRight } from 'lucide-react';
import logo from './BruinMarketTransparent.svg';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const TERMS = [
  ['Data usage', 'Your email and profile exist to connect you with other students. We never sell or share it.'],
  ['Account security', 'Passwords are hashed, never stored in plain text, and moved over encrypted connections.'],
  ['Communication', 'You will receive transactional email about your listings and messages — nothing else.'],
  ['Ethical use', "Respect other bruins and UCLA's code of conduct. Fraud, harassment and illegal items are out."],
  ['Data retention', 'Your data lives as long as your account does. Ask for deletion at any time and it goes.'],
];

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Check your email for the correct one.');
      return;
    }
    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-email?token=${token}`, { method: 'GET' });
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully.');
        if (data.token && data.user) localStorage.setItem('token', data.token);
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to connect to server. Please try again later.');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-ink p-4">
      <div className="blueprint absolute inset-0 opacity-70" />
      <div className="grain" />

      <div className="relative w-full max-w-lg border border-line bg-panel">
        <span className="absolute inset-x-0 top-0 h-[2px] bg-sun" />

        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <img src={logo} alt="" className="h-7 w-7 brightness-0 invert" />
          <span className="type-head text-[15px]">
            Bruin<span className="text-sun">Market</span>
          </span>
          <span className="meta ml-auto">Verification</span>
        </div>

        <div className="p-6 md:p-8">
          {status === 'verifying' && (
            <div className="py-6 text-center">
              <div className="relative mx-auto h-px w-40 overflow-hidden bg-line">
                <span className="absolute inset-y-0 left-0 w-1/3 animate-[marquee_1.2s_linear_infinite] bg-sun" />
              </div>
              <h2 className="type-display mt-6 text-2xl">Checking your link</h2>
              <p className="meta mt-3">One moment</p>
            </div>
          )}

          {status === 'success' && (
            <>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-mint/40 bg-mint/10">
                  <Check size={22} className="text-mint" />
                </div>
                <div>
                  <h2 className="type-display text-2xl">You're in</h2>
                  <p className="meta mt-2">{message}</p>
                </div>
              </div>

              <div className="mt-7 border border-line">
                <div className="meta border-b border-line px-4 py-2.5">Privacy & ethics</div>
                <div className="max-h-52 overflow-y-auto">
                  {TERMS.map(([title, body]) => (
                    <div key={title} className="border-b border-line px-4 py-3 last:border-b-0">
                      <div className="meta-hi mb-1.5">{title}</div>
                      <p className="text-xs leading-relaxed text-dim">{body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { window.location.href = '/'; }}
                className="btn btn-sun mt-6 w-full py-4"
              >
                Enter the market <ArrowRight size={16} />
              </button>
              <p className="meta mt-4 text-center">You are now logged in</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-ember/40 bg-ember/10">
                  <X size={22} className="text-ember" />
                </div>
                <div>
                  <h2 className="type-display text-2xl">Link didn't work</h2>
                  <p className="meta mt-2">Verification failed</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-ash">{message}</p>
              <button onClick={() => navigate('/')} className="btn btn-ghost mt-6 w-full py-3.5">
                Back to BruinMarket
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

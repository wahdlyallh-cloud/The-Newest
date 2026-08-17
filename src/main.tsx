// Global Fail-Safe Error Listeners (Prevents Blank White Screen on Uncaught Boot Exceptions)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Global window error caught:', event.error || event.message);
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `<div style="padding:24px;color:#991B1B;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:16px;margin:20px;font-family:sans-serif;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);">
        <h2 style="margin-top:0;font-size:18px;font-weight:800;">Application Runtime Error 🛡️</h2>
        <p style="font-size:13px;color:#7F1D1D;">An unhandled boot error occurred. Detailed diagnostic stack trace:</p>
        <pre style="background:#FFF;padding:12px;border-radius:8px;font-size:11px;overflow:auto;max-height:300px;border:1px solid #FECACA;white-space:pre-wrap;">${event.error?.stack || event.message}</pre>
        <button onclick="window.location.reload()" style="margin-top:12px;padding:8px 16px;background:#DC2626;color:#FFF;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Reload Page 🔄</button>
      </div>`;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Global unhandled rejection caught:', event.reason);
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `<div style="padding:24px;color:#991B1B;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:16px;margin:20px;font-family:sans-serif;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);">
        <h2 style="margin-top:0;font-size:18px;font-weight:800;">Unhandled Promise Rejection 🛡️</h2>
        <p style="font-size:13px;color:#7F1D1D;">An asynchronous promise error occurred during startup:</p>
        <pre style="background:#FFF;padding:12px;border-radius:8px;font-size:11px;overflow:auto;max-height:300px;border:1px solid #FECACA;white-space:pre-wrap;">${event.reason?.stack || event.reason}</pre>
        <button onclick="window.location.reload()" style="margin-top:12px;padding:8px 16px;background:#DC2626;color:#FFF;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Reload Page 🔄</button>
      </div>`;
    }
  });
}

import './lib/fetchInterceptor.ts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register the PWA service worker. We use a relative path so it works
// regardless of the GitHub Pages deployment subpath. Registration is
// best-effort: if the browser doesn't support SW, alarms still work in
// foreground.
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL || ''}/sw.js`)
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('SW registration failed:', err);
      });
  });
}

reportWebVitals();

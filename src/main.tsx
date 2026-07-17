import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// تسجيل Service Worker للعمل دون اتصال بالإنترنت في بيئة التشغيل فقط لتجنب مشاكل إعادة التوجيه في بيئة التطوير
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registered with scope: ', registration.scope);
      })
      .catch((err) => {
        console.warn('ServiceWorker registration failed: ', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

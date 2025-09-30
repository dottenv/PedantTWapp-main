import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadRuntimeConfig } from './config/api'

// Загружаем runtime конфиг перед монтированием приложения
;(async () => {
  await loadRuntimeConfig().catch(() => {})
  // In production we only mount the SPA when running inside Telegram WebApp
  const isProd = import.meta.env.PROD === true || import.meta.env.MODE === 'production';
  const inTelegram = !!(window as any).Telegram && !!(window as any).Telegram.WebApp;

  if (!isProd || inTelegram) {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } else {
    // Show a minimal message when opened outside of Telegram in production
    const el = document.getElementById('root');
    if (el) {
      el.innerHTML = '<div style="padding:24px;font-family:sans-serif;max-width:720px;margin:40px auto;text-align:center;">Это приложение предназначено для работы внутри Telegram WebApp. Пожалуйста, откройте его через Telegram.</div>';
    }
    console.warn('App not mounted: running outside Telegram WebApp in production.');
  }
})()

'use client';

import { useEffect } from 'react';

/* Đăng ký service worker để cài web như app trên điện thoại */
export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}

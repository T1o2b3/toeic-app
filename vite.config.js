/**
 * Cấu hình Vite + PWA.
 *
 * PWA (Progressive Web App) = trang web cài được lên màn hình chính như một app.
 * Hai mảnh ghép: manifest (tên, icon, màu — để iOS/Android biết cách cài) và
 * service worker (một đoạn JS chạy nền, giữ bản sao file để mở được khi không có mạng).
 * Dùng vite-plugin-pwa thay vì tự viết service worker để tránh lỗi kẹt bản cũ sau khi deploy (D22).
 */
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Nhúng thời điểm build để màn chính hiện được "đang chạy bản nào" —
  // giúp phân biệt "lỗi chưa sửa" với "máy đang dùng bản cũ trong bộ nhớ đệm".
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  plugins: [
    VitePWA({
      // Tự cập nhật khi có bản mới, không bắt người dùng bấm gì.
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-180.png'],
      manifest: {
        name: 'TOEIC — ôn Listening & Reading',
        short_name: 'TOEIC',
        description: 'App cá nhân ôn TOEIC: từ vựng ngắt quãng và luyện Part 5',
        lang: 'vi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f7f9',
        theme_color: '#2f5fd0',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Nội dung JSON phải nằm trong bản sao offline, nếu không thì mở offline là trắng trơn.
        globPatterns: ['**/*.{js,css,html,png,json}'],
        // Deck từ vựng ~1,4 MB, vượt ngưỡng mặc định 2 MB khi thêm ngân hàng câu hỏi.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Âm thanh KHÔNG nhét vào precache (hàng MB, tải hết lúc cài app là quá nặng): lưu dần khi nghe.
        // Bộ phát tải trọn file (không dùng Range) nên nhận về 200 và lưu được; nghe lại/offline đọc từ đây.
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.startsWith('/audio/'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'toeic-audio',
            expiration: { maxEntries: 800 },
            cacheableResponse: { statuses: [200] },
          },
        }],
      },
    }),
  ],
});

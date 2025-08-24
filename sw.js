const CACHE_NAME = 'calculator-app-v3';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './privacy.html',
  './icon-192.png',
  './icon-512.png'
];

// Service Worker のインストール
self.addEventListener('install', event => {
  console.log('Service Worker: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.log('Service Worker: Cache failed', error);
      })
  );
});

// Service Worker の起動
self.addEventListener('activate', event => {
  console.log('Service Worker: Activate event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// ネットワークリクエストの処理
self.addEventListener('fetch', event => {
  console.log('Service Worker: Fetch event for', event.request.url);
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュにある場合はキャッシュから返す
        if (response) {
          console.log('Service Worker: Found in cache', event.request.url);
          return response;
        }
        
        // キャッシュにない場合はネットワークから取得
        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request)
          .then(response => {
            // レスポンスが有効でない場合はそのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // レスポンスをクローンしてキャッシュに保存
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('Service Worker: Network request failed', error);
            
            // オフライン時のフォールバック
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// プッシュ通知（将来の機能拡張用）
self.addEventListener('push', event => {
  console.log('Service Worker: Push event received');
  // 将来的にプッシュ通知機能を追加する場合はここに実装
});

// 通知クリック処理（将来の機能拡張用）
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click event');
  event.notification.close();
  // 将来的に通知クリック処理を追加する場合はここに実装
});
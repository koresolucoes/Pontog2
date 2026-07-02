// public/service-worker.js
const CACHE_NAME = 'ponto-g-cache-v4';

// Evento de instalação
self.addEventListener('install', event => {
  self.skipWaiting();
  console.log('Service Worker instalado');
});

// Evento de ativação
self.addEventListener('activate', event => {
  console.log('Service Worker ativado');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Evento de push
self.addEventListener('push', event => {
  try {
    let data = {};
    try {
      data = event.data ? event.data.json() : {};
    } catch (e) {
      console.error('Erro ao processar dados da notificação push:', e);
      data = { 
        title: 'Novo aviso', 
        body: 'Você tem uma nova notificação' 
      };
    }

    const options = {
      body: data.body || 'Você tem uma nova notificação',
      icon: data.icon || 'https://placehold.co/192x192/db2777/FFFFFF/png?text=G&font=sans',
      badge: 'https://placehold.co/192x192/db2777/FFFFFF/png?text=G&font=sans',
      data: data.data || {},
      actions: data.actions || [],
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      tag: data.tag || 'ponto-g-notification'
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Ponto G',
        options
      )
    );
  } catch (error) {
    console.error('Erro no evento push:', error);
  }
});

// Evento de clique na notificação
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Verifica se já existe uma aba aberta
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Se não houver uma aba aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
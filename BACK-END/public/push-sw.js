self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Notificacao do sistema",
      body: event.data.text(),
    };
  }

  const title = payload.title || "Notificacao do sistema";
  const options = {
    body: payload.body || "Voce tem uma nova notificacao.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: {
      url: payload.url || "/",
      pedidoId: payload.pedidoId || null,
      tipo: payload.tipo || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            if (client.url.includes(targetUrl)) {
              return client.focus();
            }
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});

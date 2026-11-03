// Shows the phone notifications sent by sendPushNotifications (src/lib/push.ts) and opens the
// notification's link when it's tapped. Registered by PushNotificationToggle.

self.addEventListener("push", (event) => {
  const { title, body, url } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});

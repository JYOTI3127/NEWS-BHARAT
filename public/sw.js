self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    void error;
  }

  const title = data.title || "News4Bharat";
  const notificationOptions = {
    body: data.body || "",
    icon: data.icon || "/news4bharat-share.png",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/";
  event.waitUntil(clients.openWindow(targetUrl));
});

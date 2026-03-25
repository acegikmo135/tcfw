importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

// These will be replaced by the build process or should be manually updated
// However, for this environment, we can try to use environment variables if we can inject them
// But usually service workers are static.
// We'll use a placeholder and instruct the user to update it if needed.

firebase.initializeApp({
  apiKey: "AIzaSyB7_PWHoY22W6fDR2qQvxXucmsTbE0B3HQ",
  authDomain: "gen-lang-client-0585758602.firebaseapp.com",
  projectId: "gen-lang-client-0585758602",
  storageBucket: "gen-lang-client-0585758602.firebasestorage.app",
  messagingSenderId: "193816846730",
  appId: "1:193816846730:web:fa28adf7a0c84af63ca873"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-icon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

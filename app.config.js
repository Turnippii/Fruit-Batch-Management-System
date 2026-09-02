// Expo CLI tự nạp .env (biến EXPO_PUBLIC_*) vào process.env trước khi gọi hàm
// này, và tự merge app.json vào tham số `config` — không cần require('./app.json')
// thủ công. Chỉ thêm extra.firebase để đọc lại qua expo-constants trong
// src/services/firebase.ts.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FB_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FB_AUTH_DOMAIN,
      databaseURL: process.env.EXPO_PUBLIC_FB_DATABASE_URL,
      projectId: process.env.EXPO_PUBLIC_FB_PROJECT_ID,
      appId: process.env.EXPO_PUBLIC_FB_APP_ID,
    },
  },
});

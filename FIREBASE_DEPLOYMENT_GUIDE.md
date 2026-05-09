# Firebase 部署清單

## 目標

把目前專案改成 Firebase shared mode，讓登入、聊天室、排行榜、通知、亮點、歷史都能跨使用者共享。

## 你要先建立的 Firebase 專案

1. 到 Firebase Console 建立一個新專案。
2. 啟用 Authentication。
3. 啟用 Firestore Database。
4. 從專案設定複製 Web App 設定值。

## 必要環境變數

把以下值放進 Vercel 的 Environment Variables：

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

如果你要強制啟用 Firebase shared mode，也可以加：

- `VITE_ZERO_CARD_MODE=false`

### 依你目前 Firebase 專案可直接貼上的值

```bash
VITE_FIREBASE_API_KEY=AIzaSyD7-4vzRjxZ0Uq_AZz_R0Xs-rZqw7X3egs
VITE_FIREBASE_AUTH_DOMAIN=guesser-67.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=guesser-67
VITE_FIREBASE_STORAGE_BUCKET=guesser-67.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=794512558292
VITE_FIREBASE_APP_ID=1:794512558292:web:55f93587d98b3443d51341
VITE_ZERO_CARD_MODE=false
```

如果你之後要加 Firebase Analytics，可以另外補：

- `VITE_FIREBASE_MEASUREMENT_ID=G-QHYWCNM917`

## 建議的 Auth 設定

目前前端是保留 username / password UX，但內部會把 username 映射成 Firebase Auth 的 synthetic email。

你不用改前端介面，只要：

1. 在 Firebase Authentication 開啟 Email/Password。
2. 讓前端使用同一組 Firebase 配置。
3. 部署後，登入 / 註冊會自動把使用者 profile 寫進 Firestore。

## Firestore 資料結構

### `users`

每個使用者一筆。

```json
{
  "id": 1,
  "uid": "firebase-auth-uid",
  "email": "demo@porn-guesser.local",
  "username": "demo",
  "name": "Demo User",
  "role": "user",
  "totalScore": 12000,
  "gamesPlayed": 48,
  "gamesWon": 30,
  "correctAnswers": 132,
  "totalAnswers": 198,
  "createdAt": "2026-05-09T00:00:00.000Z",
  "updatedAt": "2026-05-09T00:00:00.000Z",
  "lastSignedIn": "2026-05-09T00:00:00.000Z"
}
```

### `lobbyMessages`

```json
{
  "id": "msg_xxx",
  "userId": "firebase-auth-uid",
  "userName": "Demo User",
  "message": "Hello world",
  "createdAt": "2026-05-09T00:00:00.000Z"
}
```

### `notifications`

```json
{
  "id": "notif_xxx",
  "userId": "firebase-auth-uid",
  "type": "game_invite",
  "title": "Welcome",
  "content": "Shared data is now stored in Firestore.",
  "isRead": false,
  "createdAt": "2026-05-09T00:00:00.000Z"
}
```

### `highlights`

```json
{
  "id": "hl_xxx",
  "title": "Shared Firebase highlight",
  "thumbnail": "https://...",
  "player1Name": "Demo User",
  "player2Name": "Curtis",
  "player1Score": 850,
  "player2Score": 760,
  "likes": 12,
  "createdAt": "2026-05-09T00:00:00.000Z"
}
```

### `queue`

```json
{
  "id": "queue_xxx",
  "userId": "firebase-auth-uid",
  "username": "demo",
  "joinedAt": 1710000000000,
  "rating": 1000
}
```

### `history`

```json
{
  "id": "history_xxx",
  "userId": "firebase-auth-uid",
  "gameMode": "video",
  "roomType": "random",
  "score": 850,
  "rank": 1,
  "result": "win",
  "createdAt": "2026-05-09T00:00:00.000Z"
}
```

## Firestore 建議索引

先不用複雜索引，最少先確保這些查詢可用：

- `users`：依 `totalScore` 排序
- `lobbyMessages`：依 `createdAt` 排序
- `notifications`：依 `userId` + `createdAt` 查詢
- `highlights`：依 `createdAt` 排序
- `history`：依 `userId` + `createdAt` 查詢

如果 Firestore 提示要建立 index，照畫面點擊建立即可。

## Firestore 安全規則建議

這份專案的共享資料最好不要完全開放寫入。建議至少限制成「登入後可讀，只有本人可寫自己的使用者文件，其它集合只允許建立新文件或更新自己的資料」。

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isSignedIn() && request.auth.uid == userId;
      allow delete: if false;
    }

    match /lobbyMessages/{messageId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if false;
    }

    match /notifications/{notificationId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn();
      allow delete: if false;
    }

    match /highlights/{highlightId} {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn();
      allow delete: if false;
    }

    match /queue/{queueId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isSignedIn();
    }

    match /history/{historyId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if false;
    }
  }
}
```

如果你要更嚴格，可以把 `lobbyMessages` / `notifications` / `history` 的 `allow create` 改成只允許對應 userId 等於 `request.auth.uid` 的情況。

## Vercel 部署步驟

1. 在本機確認 build 通過：

```bash
npm run build:frontend
```

2. 到 Vercel 專案設定新增 Firebase 環境變數。
3. 重新部署前端。
4. 開啟網站，註冊一個新帳號。
5. 到 Firestore 檢查 `users` / `lobbyMessages` / `notifications` 是否有資料。

### Vercel 需要設定的精確內容

- Project name: `phguesser`
- Firebase project: `guesser-67`
- Hosting site: `guesser-67`

建議你在 Vercel 先把 production / preview / development 三個環境都設同樣的 Firebase 值，避免本機可以、正式站不能的情況。

## 驗證重點

- 登入後 `users` collection 會自動新增 / 更新 profile。
- 發送 lobby message 後，其他裝置會讀到同一份 Firestore 資料。
- 排行榜、通知、歷史都會以 Firestore 為準。
- 若 Firebase env 沒設定，會自動退回本機 zero-card 模式。

## 最後建議

如果你真的要「跨使用者共享」，Firebase 是目前這份專案最容易維持現有 UI 的做法。

你目前這組 Firebase Web App 設定已足夠直接上線，不需要再另外建立新的 Web App。


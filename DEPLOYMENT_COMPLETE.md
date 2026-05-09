# Porn Guesser 全部署完成指南

## ✅ 已完成

### 前端部署 (Vercel)
- ✅ 用户名/密码认证系统已添加
- ✅ 登录页面 (`/login`) 已创建
- ✅ Home.tsx 已更新使用本地登录路由
- ✅ useAuth 钩子已添加 login/register 功能
- ✅ 前端已部署到 Vercel: https://porn-guesser.vercel.app

### 后端准备
- ✅ 数据库 schema 已更新（添加 username/passwordHash 字段）
- ✅ tRPC routers 已添加 login/register 端点
- ✅ Demo 用户创建脚本已添加（启动时自动创建）
- ✅ Docker 构建配置已设置
- ✅ 代码已推送到 GitHub

## 🚀 部署后端到 Railway

### 选项 A：使用 Railway CLI（推荐）

```bash
npm install -g @railway/cli
railway login
railway init
# 选择 porn_guesser GitHub 仓库
railway up
# 等待部署完成（约 3-5 分钟）
# 复制生成的后端 URL
```

### 选项 B：使用 Railway Web UI

1. 登入 [railway.app](https://railway.app)
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 搜索并选择 "porn_guesser"
4. Railway 将自动检测 Dockerfile 并部署
5. 部署完成后，访问 "Settings" → "Domain" 获取 URL

## 📝 环境变量配置

### 在 Railway 项目中设置：

```
JWT_SECRET=your-secure-random-string (生成: openssl rand -base64 32)
DATABASE_URL=mysql://user:password@host:3306/porn_guesser (自动配置，如果使用 Railway MySQL)
NODE_ENV=production
PORT=8080
```

### 在 Vercel 项目中设置：

```
VITE_BACKEND_URL=https://your-railway-domain.railway.app
```

**步骤：**
1. Vercel 项目页面 → "Settings" → "Environment Variables"
2. 添加 VITE_BACKEND_URL
3. 值设置为 Railway 后端 URL
4. 选择环境：Production
5. 点击 "Save"

## 🧪 验证部署

### Demo 用户登录信息：
- **用户名**: demo
- **密码**: demo123

### 测试流程：
1. 访问 https://porn-guesser.vercel.app/
2. 点击 "Login to Play"
3. 输入 demo/demo123
4. 登录成功后应该看到 "Enter Game" 按钮

## 📊 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     用户浏览器                              │
└────────────────┬──────────────────────────────┬──────────────┘
                 │                              │
         HTTPS (SPA 路由)              HTTP/WebSocket (API)
                 │                              │
         ┌───────▼──────────┐           ┌──────▼──────────┐
         │  Vercel Hosting   │           │  Railway 後端    │
         │  (React + Vite)   │◄──────────│ (Node.js/Express)│
         │  https://porn-    │           │  + tRPC + Socket │
         │  guesser.vercel   │           │  + MySQL DB      │
         │  .app             │           │                  │
         └───────────────────┘           └──────────────────┘
```

## 🔐 安全建议

1. **JWT_SECRET**: 使用强随机字符串
2. **数据库密码**: 使用强密码
3. **CORS**: 后端应配置允许 https://porn-guesser.vercel.app
4. **HTTPS**: 所有连接使用 HTTPS

## 📚 核心文件

- `client/src/pages/Login.tsx` - 登录/注册页面
- `client/src/_core/hooks/useAuth.ts` - 认证逻辑
- `server/routers.ts` - API 端点定义
- `server/_core/index.ts` - 服务器启动和 demo 用户创建
- `drizzle/schema.ts` - 数据库模式

## ❓ 常见问题

**Q: 登录后仍然显示登录按钮？**
- A: 刷新页面或清除浏览器缓存

**Q: 连接失败错误？**
- A: 检查 VITE_BACKEND_URL 环境变量是否正确设置

**Q: 后端无法启动？**
- A: 检查数据库连接字符串（DATABASE_URL）

## 🎯 下一步

1. Railway 后端部署完成
2. 设置 Vercel 环境变量
3. 测试登录流程
4. 配置自定义域名（可选）
5. 部署其他游戏功能

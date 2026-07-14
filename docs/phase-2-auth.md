# 阶段 2：账号与登录

## 已实现接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 患者注册（创建 household） |
| POST | `/api/auth/login` | 登录（body 含 `role: patient\|admin`） |
| POST | `/api/auth/admin/register` | 管理员凭邀请码注册 |
| GET | `/api/auth/me` | 校验 JWT，返回当前用户 |

## 本地 / Vercel 环境变量

确认已配置：

- `DATABASE_URL`
- `JWT_SECRET`（至少 32 位）

## 本地验证

1. 重启 `npm run dev`（读取最新 API 路由）
2. 打开 App，应进入登录页（不能直接进主界面）
3. **患者 Tab → 注册**：用户名 4–20 英文数字，密码 6–32 且含字母+数字
4. 注册成功后进入主 App
5. **设置 → 账号 → 退出登录**，再登录同一账号

若本地 `/api/auth/*` 报 DATABASE_UNREACHABLE / timeout，可在配好 Vercel 环境变量后 `git push`，用线上域名验证。

## 管理员注册说明

管理员注册需要：

1. 患者已开启「管理员模式」（阶段 4）
2. 患者生成邀请码（阶段 4）

本阶段 UI 已预留管理员注册表单；邀请码功能在阶段 4 完成。

## 账号规则（定稿）

- 用户名：英文+数字，4–20 位，全局唯一
- 密码：6–32 位，至少一个字母、一个数字
- JWT 有效期 7 天，存 `localStorage` 键 `auth-token-v1`

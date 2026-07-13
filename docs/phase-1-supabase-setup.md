# 阶段 1：Supabase 与 Vercel 环境配置

本文说明如何完成患者/管理员双端的 **数据库与环境变量** 配置。代码侧已提供建表脚本与健康检查 API。

## 你需要完成的步骤

### 1. 注册 Supabase

1. 打开 [https://supabase.com](https://supabase.com) 并注册/登录
2. **New project** → 填写项目名称、数据库密码（请妥善保存）
3. 等待项目创建完成（约 1–2 分钟）

### 2. 执行建表 SQL

1. 在 Supabase 左侧打开 **SQL Editor**
2. 新建 Query，粘贴 [`server/db/migrations/001_initial.sql`](../server/db/migrations/001_initial.sql) 的全部内容
3. 点击 **Run**
4. 在 **Table Editor** 中应能看到：`households`、`users`、`invite_codes`

### 3. 获取 DATABASE_URL

1. Supabase → **Project Settings** → **Database**
2. 找到 **Connection string** → **URI**
3. **Mode** 选择 **Transaction pooler**（Vercel Serverless 推荐，端口一般为 `6543`）
4. 复制连接串，将 `[YOUR-PASSWORD]` 替换为建项目时设的数据库密码

示例格式：

```text
postgresql://postgres.xxxxx:你的密码@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

### 4. 生成 JWT_SECRET

在终端执行（PowerShell 示例）：

```powershell
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
```

或使用任意 **32 字符以上** 的随机字符串。

### 5. 配置本地 .env

1. 复制 `.env.example` 为 `.env`（若已有 `.env` 则追加变量）
2. 填入真实的 `DATABASE_URL` 和 `JWT_SECRET`
3. 保留已有的 `OPENAI_*` 配置

### 6. 配置 Vercel 环境变量

1. 打开 [vercel.com](https://vercel.com) → 你的 **chronic-care-mobile** 项目
2. **Settings** → **Environment Variables**
3. 添加：

| 变量名 | 说明 |
|--------|------|
| `DATABASE_URL` | Supabase Transaction pooler 连接串 |
| `JWT_SECRET` | 与本地相同的随机密钥 |
| `OPENAI_API_KEY` | 已有则保持不变 |
| `OPENAI_MODEL` | 已有则保持不变 |
| `OPENAI_BASE_URL` | 已有则保持不变 |

4. 环境勾选 **Production**、**Preview**、**Development**（至少 Production）

### 7. 验证连接

**本地：**

```bash
npm run dev
```

另开终端或浏览器访问：

```text
http://localhost:5173/api/db/health
```

成功应返回：

```json
{ "ok": true, "db": "connected" }
```

未配置 `DATABASE_URL` 时返回 `503` 及 `DATABASE_NOT_CONFIGURED`。

**线上（配置 Vercel 并部署后）：**

```text
https://你的域名/api/db/health
```

## 阶段 1 验收清单

- [ ] Supabase 项目已创建
- [ ] 三张表已建好（households / users / invite_codes）
- [ ] 本地 `.env` 已配置 `DATABASE_URL`、`JWT_SECRET`
- [ ] Vercel 环境变量已配置
- [ ] `/api/db/health` 返回 `{ "ok": true, "db": "connected" }`

## 常见问题

**连接超时 / SSL 错误**

- 确认使用的是 **pooler** 连接串（端口 6543），不是直连 5432
- 密码中若有特殊字符需 URL 编码

**本地 health 返回 DATABASE_NOT_CONFIGURED**

- 确认 `.env` 在项目根目录，且变量名为 `DATABASE_URL`
- 修改 `.env` 后需重启 `npm run dev`

**Vercel 上 health 失败但本地正常**

- 检查 Vercel 环境变量是否已保存并重新部署
- Production 与 Preview 需分别配置或勾选 “All Environments”

## 下一步

阶段 1 验收通过后，进入 **阶段 2**：实现 `/api/auth/*` 登录注册与 `AuthPage` 双 Tab 门禁。

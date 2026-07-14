# 阶段 3：云端数据同步

## 已实现

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/sync/state` | 读取当前账号所属 household 的 `app_state` |
| PUT | `/api/sync/state` | 写入完整 `state`（body: `{ state }`） |

前端行为：

1. 登录成功后拉取云端 state 再进入主界面
2. 本地改动防抖约 800ms 后 `PUT` 到云端
3. 按 `householdId` 缓存到 `localStorage`（键 `chronic-care-mobile-v1-user-{id}`）
4. App 切回前台时尝试重新 `GET`（后保存覆盖策略）
5. 401/403 时自动退出登录

## 验收建议

1. 患者 A 登录，添加药品 / 计划
2. 稍等 1 秒（等同步）后换浏览器或无痕窗口，同账号再登录 → 应能看到相同数据
3.（阶段 4 完成邀请码后）管理员登录同一家庭 → 应看到相同数据

## 本地注意

若本地连 Supabase 超时，可优先在 Vercel 线上验证同步；本机缓存仍会写入。

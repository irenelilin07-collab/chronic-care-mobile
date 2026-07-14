import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const ROLE_TABS = [
  { key: "patient", label: "患者" },
  { key: "admin", label: "管理员" },
];

const inputClass =
  "w-full rounded-full border-0 bg-[#f3f4f5] px-5 py-3.5 text-[15px] text-[#1a1a1a] outline-none placeholder:text-[#b0b3b8] focus:bg-[#eef0f2]";

function PillField({
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  trailing = null,
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${inputClass} ${trailing ? "pr-28" : ""}`}
      />
      {trailing ? (
        <div className="absolute inset-y-0 right-4 flex items-center">{trailing}</div>
      ) : null}
    </div>
  );
}

export default function AuthPage() {
  const { login, registerPatient, registerAdmin } = useAuth();
  const [roleTab, setRoleTab] = useState("patient");
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isPatient = roleTab === "patient";
  const isRegister = mode === "register";

  const title = isRegister
    ? isPatient
      ? "注册患者账号"
      : "注册管理员账号"
    : isPatient
      ? "患者登录"
      : "管理员登录";

  const subtitle = isPatient
    ? isRegister
      ? "注册后即可管理用药与打卡"
      : "登录后管理用药与打卡"
    : isRegister
      ? "使用患者提供的邀请码完成注册"
      : "登录后可协助患者管理用药";

  const canSubmit =
    Boolean(username.trim() && password) &&
    (isPatient || !isRegister || Boolean(inviteCode.trim()));

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || !canSubmit) return;
    setError("");
    setSubmitting(true);

    try {
      if (isPatient && isRegister) {
        await registerPatient({ username, password });
      } else if (!isPatient && isRegister) {
        await registerAdmin({
          username,
          password,
          inviteCode,
        });
      } else {
        await login({
          username,
          password,
          role: roleTab,
        });
      }
    } catch (err) {
      setError(err.message || "操作失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-white">
      <div className="flex flex-1 flex-col px-6 pb-10 pt-10">
        <div className="mb-8 text-center">
          <h1 className="text-[26px] font-bold leading-tight text-[#2b2f36]">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-[#9aa0a6]">{subtitle}</p>
        </div>

        <div className="mb-5 flex justify-center gap-2">
          {ROLE_TABS.map((tab) => {
            const active = roleTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setRoleTab(tab.key);
                  setError("");
                }}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#e8faf4] text-[#00a87a]"
                    : "bg-[#f3f4f5] text-[#8a8f98]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="space-y-3.5">
            <PillField
              value={username}
              onChange={setUsername}
              placeholder="请输入用户名"
              autoComplete="username"
            />
            <PillField
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="请输入密码"
              autoComplete={isRegister ? "new-password" : "current-password"}
            />

            {!isPatient && isRegister ? (
              <PillField
                value={inviteCode}
                onChange={setInviteCode}
                placeholder="请输入邀请码"
                autoComplete="off"
              />
            ) : null}

            {isRegister && isPatient ? (
              <p className="px-1 text-[12px] leading-5 text-[#9aa0a6]">
                注：用户名由自己设定，需不与平台其他用户名重复（英文或者数字，4–20 位）
              </p>
            ) : null}

            {isRegister && !isPatient ? (
              <div className="px-1 text-[12px] leading-5 text-[#9aa0a6]">
                <p>注：</p>
                <ol className="mt-0.5 list-none space-y-0.5">
                  <li>1. 用户名由自己设定，需不与平台其他用户名重复（英文或者数字，4–20 位）</li>
                  <li>2. 用户名和密码为您自己的管理员账号</li>
                  <li>3. 邀请码仅用于首次绑定患者，注册后登录无需再填</li>
                </ol>
              </div>
            ) : null}
          </div>

          {!isPatient && !isRegister ? (
            <div className="mt-4 px-1 text-left text-[12px] leading-5 text-[#9aa0a6]">
              <p>注：</p>
              <ol className="mt-0.5 list-none space-y-0.5">
                <li>1. 请使用您自己的管理员用户名和密码登录，不是患者账号</li>
                <li>2. 日常登录无需邀请码；需患者先开启管理员模式</li>
              </ol>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 text-center text-sm leading-5 text-[#e05b5b]">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className={`mt-6 w-full rounded-full py-3.5 text-[16px] font-semibold text-white transition-colors ${
              canSubmit && !submitting
                ? "bg-[#00c896] active:bg-[#00a87a]"
                : "bg-[#d7dbdf]"
            }`}
          >
            {submitting ? "请稍候…" : isRegister ? "注册" : "登录"}
          </button>

          <div className="mt-auto pt-10 text-center text-sm text-[#8a8f98]">
            {isRegister ? (
              <>
                已有账号？
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="ml-1 font-medium text-[#00c896]"
                >
                  去登录
                </button>
              </>
            ) : (
              <>
                还没有账号？
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className="ml-1 font-medium text-[#00c896]"
                >
                  去注册
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

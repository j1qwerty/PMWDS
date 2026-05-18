import { useState, type FormEvent } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";

type LoginMode = "signin" | "signup" | "forgot" | "reset";

export function LoginPage() {
  const [email, setEmail] = useState("admin@pmwds.com");
  const [password, setPassword] = useState("Pmwds@123");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get("token") ?? "");
  const [mode, setMode] = useState<LoginMode>(() => new URLSearchParams(window.location.search).get("token") ? "reset" : "signin");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};
    
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (mode === "signin" && !validateForm()) return;
    
    setLoading(true);
    try {
      if (mode === "signin") {
        await login(email, password);
      } else if (mode === "signup") {
        await api.signup({ firstName, lastName, email, password });
        setSuccess("Account created with Viewer access. An admin can assign your department and role.");
        setMode("signin");
      } else if (mode === "forgot") {
        const result = await api.forgotPassword(email);
        setSuccess(result.message);
      } else {
        const result = await api.resetPassword(email, resetToken, password);
        setSuccess(result.message);
        setMode("signin");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      
      if (message.toLowerCase().includes("invalid credentials") || message.toLowerCase().includes("unauthorized")) {
        setError("Invalid email or password. Please try again.");
      } else if (message.toLowerCase().includes("network")) {
        setError("Network error. Please check your connection.");
      } else if (message.toLowerCase().includes("locked")) {
        setError("Account is locked. Please contact your administrator.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "signup" ? "Create account" : mode === "forgot" ? "Reset request" : mode === "reset" ? "Set new password" : "Sign in";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#f7f9fb] to-[#e0e3e5] p-6 font-sans">
      {/* Background decorative elements */}
      <div className="fixed -top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-[rgba(70,72,212,0.06)] blur-[80px] pointer-events-none" />
      <div className="fixed -bottom-[20%] -left-[10%] w-[400px] h-[400px] rounded-full bg-[rgba(129,39,207,0.04)] blur-[80px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-[420px] rounded-2xl border border-[rgba(224,227,229,0.8)] bg-white/85 backdrop-blur-[20px] p-10 shadow-[0_20px_60px_rgba(70,72,212,0.08),0_0_0_1px_rgba(255,255,255,0.5)] relative z-[1]">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="text-[28px] font-extrabold text-[#4648d4] tracking-[0.15em] uppercase mb-2">
            PMWDS
          </div>
          <p className="text-sm text-[#767586] leading-relaxed">
            Project Monitoring & Workflow Distribution System
          </p>
        </div>

        {/* <h2 className="text-2xl font-bold text-[#191c1e] text-center mb-2">
          Welcome Back
        </h2>
        <p className="text-sm text-[#767586] text-center mb-7">
          Sign in to your account to continue
        </p> */}

        {/* Error Banner */}
        {error && (
          <div className="bg-[#ffdad6] border border-[rgba(186,26,26,0.3)] rounded-lg p-3 mb-5 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#ba1a1a] text-xl shrink-0 mt-px">
              error
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[#ba1a1a] mb-0.5">
                Login Failed
              </p>
              <p className="text-xs text-[#93000a] leading-relaxed">
                {error}
              </p>
            </div>
            <button
              onClick={() => setError("")}
              className="bg-transparent border-none cursor-pointer p-0.5 ml-auto shrink-0"
            >
              <span className="material-symbols-outlined text-[#ba1a1a] text-base">
                close
              </span>
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
              {success}
            </div>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#191c1e]">{title}</h2>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
                setSuccess("");
              }}
              className="text-xs font-semibold text-[#4648d4]"
            >
              {mode === "signin" ? "Create account" : "Back to sign in"}
            </button>
          </div>

          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="First name"
                className="h-11 rounded-[10px] border border-[#e0e3e5] px-3.5 text-sm outline-none focus:border-[#4648d4] focus:shadow-[0_0_0_3px_rgba(70,72,212,0.1)]"
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Last name"
                className="h-11 rounded-[10px] border border-[#e0e3e5] px-3.5 text-sm outline-none focus:border-[#4648d4] focus:shadow-[0_0_0_3px_rgba(70,72,212,0.1)]"
              />
            </div>
          )}
          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#191c1e] tracking-[0.08em] uppercase">
              Email Address
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#767586] text-xl pointer-events-none">
                mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder="Enter your email"
                disabled={loading}
                className={`
                  w-full h-11 pl-10 pr-3.5 rounded-[10px] text-sm text-[#191c1e] outline-none transition-all duration-200 box-border
                  ${fieldErrors.email 
                    ? "border-[1.5px] border-[#ba1a1a]" 
                    : "border border-[#e0e3e5] focus:border-[#4648d4] focus:shadow-[0_0_0_3px_rgba(70,72,212,0.1)]"
                  }
                  ${loading ? "bg-[#f2f4f6]" : "bg-white"}
                `}
                autoComplete="email"
                autoFocus
              />
            </div>
            {fieldErrors.email && (
              <p className="text-[11px] text-[#ba1a1a] ml-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span>
                {fieldErrors.email}
              </p>
            )}
          </div>

          {mode !== "forgot" && mode === "reset" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#191c1e] tracking-[0.08em] uppercase">
                Reset Token
              </label>
              <input
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
                disabled={loading}
                placeholder="Paste reset token"
                className="w-full h-11 rounded-[10px] border border-[#e0e3e5] px-3.5 text-sm text-[#191c1e] outline-none transition-all duration-200 focus:border-[#4648d4] focus:shadow-[0_0_0_3px_rgba(70,72,212,0.1)]"
              />
            </div>
          )}

          {/* Password Field */}
          {mode !== "forgot" && <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-[#191c1e] tracking-[0.08em] uppercase">
                {mode === "reset" ? "New Password" : "Password"}
              </label>
              {mode === "signin" && (
                <button
                  type="button"
                  className="text-[11px] text-[#4648d4] font-medium bg-transparent border-none cursor-pointer p-0"
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                    setSuccess("");
                  }}
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#767586] text-xl pointer-events-none">
                lock
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder="Enter your password"
                disabled={loading}
                className={`
                  w-full h-11 pl-10 pr-11 rounded-[10px] text-sm text-[#191c1e] outline-none transition-all duration-200 box-border
                  ${fieldErrors.password 
                    ? "border-[1.5px] border-[#ba1a1a]" 
                    : "border border-[#e0e3e5] focus:border-[#4648d4] focus:shadow-[0_0_0_3px_rgba(70,72,212,0.1)]"
                  }
                  ${loading ? "bg-[#f2f4f6]" : "bg-white"}
                `}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-2 text-[#767586] flex items-center"
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-[11px] text-[#ba1a1a] ml-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span>
                {fieldErrors.password}
              </p>
            )}
          </div>}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`
              w-full h-11 text-sm font-semibold tracking-[0.5px] border-none rounded-[10px] cursor-pointer flex items-center justify-center gap-2 transition-all duration-300
              ${loading 
                ? "bg-gradient-to-br from-[#a5a6d6] to-[#b893df] cursor-not-allowed" 
                : "bg-gradient-to-br from-[#4648d4] to-[#8127cf] hover:shadow-[0_6px_20px_rgba(70,72,212,0.4)] hover:-translate-y-px shadow-[0_4px_15px_rgba(70,72,212,0.3)]"
              }
              text-white
            `}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {mode === "signup" ? "Creating..." : mode === "forgot" ? "Sending..." : mode === "reset" ? "Saving..." : "Signing in..."}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">login</span>
                {mode === "signup" ? "Create Account" : mode === "forgot" ? "Send Reset Link" : mode === "reset" ? "Reset Password" : "Sign In"}
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-3 bg-[rgba(70,72,212,0.04)] rounded-lg border border-[rgba(70,72,212,0.1)]">
          <p className="text-[11px] text-[#767586] text-center font-semibold tracking-[0.05em] mb-1">
            DEMO CREDENTIALS
          </p>
          <p className="text-[11px] text-[#464554] text-center">
            admin@pmwds.com, pm@pmwds.com, head@pmwds.com, lead@pmwds.com, member@pmwds.com, viewer@pmwds.com / Pmwds@123
          </p>
        </div>
      </div>
    </div>
  );
}

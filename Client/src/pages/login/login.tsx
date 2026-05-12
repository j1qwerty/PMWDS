import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth";

export function LoginPage() {
  const [email, setEmail] = useState("admin@pmwds.com");
  const [password, setPassword] = useState("Pmwds@123");
  const [error, setError] = useState("");
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
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      
      // Map common error messages to user-friendly ones
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

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #f7f9fb 0%, #e0e3e5 100%)",
      padding: "24px",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Background decorative elements */}
      <div style={{
        position: "fixed",
        top: "-20%",
        right: "-10%",
        width: "500px",
        height: "500px",
        borderRadius: "50%",
        background: "rgba(70,72,212,0.06)",
        filter: "blur(80px)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed",
        bottom: "-20%",
        left: "-10%",
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background: "rgba(129,39,207,0.04)",
        filter: "blur(80px)",
        pointerEvents: "none",
      }} />

      {/* Login Card */}
      <div style={{
        width: "100%",
        maxWidth: "420px",
        borderRadius: "16px",
        border: "1px solid rgba(224,227,229,0.8)",
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        padding: "40px",
        boxShadow: "0 20px 60px rgba(70,72,212,0.08), 0 0 0 1px rgba(255,255,255,0.5)",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Logo & Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            fontSize: "28px",
            fontWeight: 800,
            color: "#4648d4",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}>
            PMWDS
          </div>
          <p style={{
            fontSize: "14px",
            color: "#767586",
            margin: 0,
            lineHeight: "1.5",
          }}>
            Project Monitoring & Workflow Distribution System
          </p>
        </div>

        <h2 style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#191c1e",
          margin: "0 0 8px 0",
          textAlign: "center",
        }}>
          Welcome Back
        </h2>
        <p style={{
          fontSize: "14px",
          color: "#767586",
          margin: "0 0 28px 0",
          textAlign: "center",
        }}>
          Sign in to your account to continue
        </p>

        {/* Error Banner */}
        {error && (
          <div style={{
            backgroundColor: "#ffdad6",
            border: "1px solid rgba(186,26,26,0.3)",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}>
            <span className="material-symbols-outlined" style={{
              color: "#ba1a1a",
              fontSize: "20px",
              flexShrink: 0,
              marginTop: "1px",
            }}>
              error
            </span>
            <div>
              <p style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#ba1a1a",
                margin: "0 0 2px 0",
              }}>
                Login Failed
              </p>
              <p style={{
                fontSize: "12px",
                color: "#93000a",
                margin: 0,
                lineHeight: "1.4",
              }}>
                {error}
              </p>
            </div>
            <button
              onClick={() => setError("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                marginLeft: "auto",
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{
                color: "#ba1a1a",
                fontSize: "16px",
              }}>
                close
              </span>
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Email Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#191c1e",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <span className="material-symbols-outlined" style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#767586",
                fontSize: "20px",
                pointerEvents: "none",
              }}>
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
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px 0 40px",
                  borderRadius: "10px",
                  border: fieldErrors.email ? "1.5px solid #ba1a1a" : "1px solid #e0e3e5",
                  backgroundColor: loading ? "#f2f4f6" : "#ffffff",
                  fontSize: "14px",
                  color: "#191c1e",
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  if (!fieldErrors.email) e.target.style.borderColor = "#4648d4";
                  e.target.style.boxShadow = "0 0 0 3px rgba(70,72,212,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = fieldErrors.email ? "#ba1a1a" : "#e0e3e5";
                  e.target.style.boxShadow = "none";
                }}
                autoComplete="email"
                autoFocus
              />
            </div>
            {fieldErrors.email && (
              <p style={{
                fontSize: "11px",
                color: "#ba1a1a",
                margin: "0 0 0 4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>error</span>
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#191c1e",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>
                Password
              </label>
              <button
                type="button"
                style={{
                  fontSize: "11px",
                  color: "#4648d4",
                  fontWeight: 500,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
                onClick={() => {/* Add forgot password logic */}}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <span className="material-symbols-outlined" style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#767586",
                fontSize: "20px",
                pointerEvents: "none",
              }}>
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
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 44px 0 40px",
                  borderRadius: "10px",
                  border: fieldErrors.password ? "1.5px solid #ba1a1a" : "1px solid #e0e3e5",
                  backgroundColor: loading ? "#f2f4f6" : "#ffffff",
                  fontSize: "14px",
                  color: "#191c1e",
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  if (!fieldErrors.password) e.target.style.borderColor = "#4648d4";
                  e.target.style.boxShadow = "0 0 0 3px rgba(70,72,212,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = fieldErrors.password ? "#ba1a1a" : "#e0e3e5";
                  e.target.style.boxShadow = "none";
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "4px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  color: "#767586",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {fieldErrors.password && (
              <p style={{
                fontSize: "11px",
                color: "#ba1a1a",
                margin: "0 0 0 4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>error</span>
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: "44px",
              background: loading 
                ? "linear-gradient(135deg, #a5a6d6 0%, #b893df 100%)" 
                : "linear-gradient(135deg, #4648d4 0%, #8127cf 100%)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.5px",
              border: "none",
              borderRadius: "10px",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.3s",
              boxShadow: "0 4px 15px rgba(70,72,212,0.3)",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(70,72,212,0.4)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(70,72,212,0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#ffffff",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                Signing in...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>login</span>
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div style={{
          marginTop: "24px",
          padding: "12px",
          backgroundColor: "rgba(70,72,212,0.04)",
          borderRadius: "8px",
          border: "1px solid rgba(70,72,212,0.1)",
        }}>
          <p style={{
            fontSize: "11px",
            color: "#767586",
            margin: "0 0 4px 0",
            textAlign: "center",
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}>
            DEMO CREDENTIALS
          </p>
          <p style={{
            fontSize: "11px",
            color: "#464554",
            margin: 0,
            textAlign: "center",
          }}>
            admin@pmwds.com / Pmwds@123
          </p>
        </div>
      </div>

      {/* Loading spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
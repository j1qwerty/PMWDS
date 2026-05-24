import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../shared/auth";

export function LoginPage() {
  const { auth, login, loginDemo } = useAuth();
  const [email, setEmail] = useState("admin@pmwds.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (auth) return <Navigate to="/" replace />;

  return (
    <main className="login-page">
      <form
        className="login-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          try {
            await login(email, password);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Login failed");
          }
        }}
      >
        <span className="eyebrow">PMWDS client2</span>
        <h1>Project workspace</h1>
        <p>Use backend credentials or enter demo mode to inspect the new UI without an API.</p>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <div className="message-line">{error}</div> : null}
        <button type="submit">Sign in</button>
        <button className="secondary" type="button" onClick={loginDemo}>
          Open demo workspace
        </button>
      </form>
    </main>
  );
}

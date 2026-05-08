import { useState, type FormEvent } from "react";
import { useAuth } from "../../auth";

export function LoginPage() {
  const [email, setEmail] = useState("admin@pmwds.com");
  const [password, setPassword] = useState("Pmwds@123");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[var(--pmwds-bg)] p-6">
      <div className="w-full max-w-sm rounded-xl border border-[var(--pmwds-border)] bg-[var(--pmwds-surface)] p-8 shadow-[var(--pmwds-shadow)]">
        <h2>PMWDS Login</h2>
        {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}
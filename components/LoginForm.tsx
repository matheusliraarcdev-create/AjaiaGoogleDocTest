"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_PASSWORD, SEED_USERS } from "@/lib/constants";
import { readError } from "@/lib/read-error";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState<string>(SEED_USERS[0].email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signIn(nextEmail: string, nextPassword: string) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      router.push("/documents");
      router.refresh();
    } catch {
      setError("Could not reach Folio. Check that the server is running.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="login-form"
      onSubmit={(event) => {
        event.preventDefault();
        void signIn(email, password);
      }}
    >
      <div className="account-list">
        {SEED_USERS.map((account) => (
          <button
            key={account.id}
            type="button"
            className="account-button"
            disabled={pending}
            onClick={() => {
              setEmail(account.email);
              setPassword(DEMO_PASSWORD);
              void signIn(account.email, DEMO_PASSWORD);
            }}
          >
            <span className="account-name">{account.name}</span>
            <span className="account-email">{account.email}</span>
            <span className="account-hint">{account.hint}</span>
          </button>
        ))}
      </div>

      <label className="field" htmlFor="email">
        Email
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="field" htmlFor="password">
        Password
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <p className="helper">
        Demo password for every account: <code>{DEMO_PASSWORD}</code>
      </p>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="button button-primary" disabled={pending}>
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}

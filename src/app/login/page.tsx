"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getAuthClient } from "@/lib/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const auth = getAuthClient();

  useEffect(() => { auth?.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user))); }, [auth]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!auth) { setMessage("Login is not configured yet."); return; }
    setMessage("Sending your secure login link…");
    const { error } = await auth.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/login` } });
    setMessage(error ? error.message : "Check your email and open the link. No password needed.");
  }

  if (!auth) return <main className="login-page"><Link href="/">← Back to matches</Link><p className="eyebrow">HOMESPORTS ACCOUNT</p><h1>Accounts are coming later.</h1><p>The public beta does not collect account data yet. Team follows stay in this browser, and calendars use public schedule data.</p></main>;
  return <main className="login-page"><Link href="/">← Back to matches</Link><p className="eyebrow">HOMESPORTS ACCOUNT</p><h1>{signedIn ? "You’re signed in." : "Sign in without a password."}</h1>{signedIn ? <p>Your account session is active.</p> : <form onSubmit={submit}><label htmlFor="email">EMAIL</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /><button type="submit">Email me a login link</button></form>}{message && <p className="login-message">{message}</p>}</main>;
}

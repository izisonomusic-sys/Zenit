"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const signup = mode === "signup";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setSubmitted(false);
    if (signup && password !== confirmPassword) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      if (signup) {
        const redirectBase = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: new URL("/auth/callback?next=%2Fdashboard", redirectBase).toString(),
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
        } else {
          setSubmitted(true);
          setMessage(`Inscription enregistrée. Un e-mail de confirmation vient d’être envoyé à ${email.trim()}. Ouvrez cet e-mail et cliquez sur « Confirmer mon adresse e-mail » pour accéder à votre tableau de bord.`);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Une erreur est survenue. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {signup && <label>Nom complet<input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" /></label>}
      <label>Adresse e-mail<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@entreprise.com" /></label>
      <label>
        Mot de passe
        <span className="password-field">
          <input required type={showPassword ? "text" : "password"} minLength={8} autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="8 caractères minimum" />
          <button className="password-toggle" type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
        </span>
      </label>
      {signup && <label>
        Confirmer le mot de passe
        <span className="password-field">
          <input required type={showConfirm ? "text" : "password"} minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Saisissez à nouveau le mot de passe" />
          <button className="password-toggle" type="button" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? "Masquer la confirmation" : "Afficher la confirmation"}>{showConfirm ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
        </span>
      </label>}
      {message && <div className={submitted ? "form-message auth-confirm-message" : "form-message"} role="status">{submitted && <CheckCircle2 size={19}/>}<span>{message}</span></div>}
      <button className="button auth-submit" disabled={busy}>{busy ? "Veuillez patienter…" : signup ? "Créer mon compte →" : "Accéder à mon espace →"}</button>
      <small className="auth-legal">Vos informations servent à créer et sécuriser votre compte ZENIT.</small>
    </form>
  );
}

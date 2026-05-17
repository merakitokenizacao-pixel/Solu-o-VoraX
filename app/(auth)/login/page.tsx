"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error("Erro ao enviar link", { description: error.message });
      return;
    }

    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm px-6">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <h1 className="font-display text-5xl text-brand mb-1">VoraX</h1>
          <p className="text-sm text-muted-brand">
            CRM Inteligente para Clínicas Estéticas
          </p>
        </div>

        <div className="bg-surface rounded-lg border border-border-subtle p-8 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="font-display text-2xl text-text mb-2">
                Link enviado!
              </h2>
              <p className="text-sm text-muted-brand">
                Verifique seu e-mail{" "}
                <span className="font-medium text-text-2">{email}</span> e clique
                no link para entrar.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-6 text-xs text-muted-brand hover:text-brand transition-colors"
              >
                Usar outro e-mail
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl text-text mb-1">Entrar</h2>
              <p className="text-sm text-muted-brand mb-6">
                Enviaremos um link de acesso pro seu e-mail.
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-text-2">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="bg-bg border-border-subtle focus:border-brand"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-brand hover:bg-brand-dark text-white font-sans"
                >
                  {loading ? "Enviando..." : "Enviar link de acesso"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-brand mt-6">
          VoraX © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

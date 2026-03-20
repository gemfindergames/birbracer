"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username.trim(), password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="card">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4 overflow-visible">
            <img src="/icon.png" alt="BirbRacers" className="object-contain logo-img" style={{ height: "72px", width: "72px" }} />
          </div>
          <h1 className="font-display font-bold text-2xl mb-1">
            {t("auth.login.title")}
          </h1>
          <p className="text-surface-500 text-sm">
            {t("auth.login.subtitle")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("auth.username")}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            autoComplete="username"
            required
          />

          <Input
            label={t("auth.password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            required
          />

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm animate-shake">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full"
          >
            {t("auth.login")}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-surface-500">
          {t("auth.no.account")}{" "}
          <Link
            href="/signup"
            className="text-brand-500 hover:text-brand-400 font-semibold transition-colors"
          >
            {t("auth.signup")}
          </Link>
        </div>
      </div>
    </div>
  );
}

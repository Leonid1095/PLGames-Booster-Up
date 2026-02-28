import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Titlebar from "../components/Titlebar";
import * as api from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Titlebar />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xs">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 rounded-md bg-brand" />
            </div>
            <h1 className="text-xl font-bold text-text-primary">
              PLGames Booster
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Войдите в аккаунт
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Пароль"
              type="password"
              placeholder="Минимум 8 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              Войти
            </Button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm text-text-muted mt-6">
            Нет аккаунта?{" "}
            <Link
              to="/register"
              className="text-brand hover:text-brand-light transition-colors"
            >
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

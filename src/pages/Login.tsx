import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Field";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("a.olamide@smhp.ng");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Enter both your email and password to continue.");
      return;
    }

    setBusy(true);
    await new Promise((r) => setTimeout(r, 650));
    signIn(email);
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="relative z-10 grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
      {/* Brand rail */}
      <div className="hidden flex-col justify-between rounded-2xl border border-border bg-gradient-surface p-8 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-primary shadow-glow-primary">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">SMHP Sentinel</div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Election Command Infrastructure
              </div>
            </div>
          </div>

          <h1 className="mt-12 text-4xl font-bold leading-tight">
            National command,
            <br />
            <span className="text-gradient-primary">down to the polling unit.</span>
          </h1>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Real-time situational awareness, field operations, message distribution and
            incident command — all from a single secure interface.
          </p>

          <dl className="mt-10 grid grid-cols-3 gap-3">
            {[
              { k: "States covered", v: "36 + FCT" },
              { k: "Field agents", v: "5,337" },
              { k: "Polling units", v: "176k" },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-lg border border-border bg-card/40 px-3 py-2.5"
              >
                <dd className="font-mono text-base font-semibold tabular-nums">{s.v}</dd>
                <dt className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.k}
                </dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-success/15">
              <Wifi className="h-4 w-4 text-success" />
            </div>
            <div>
              <div className="text-sm font-semibold">All systems operational</div>
              <div className="text-[11px] text-muted-foreground">
                3 regions live · last sync just now
              </div>
            </div>
            <span className="ml-auto h-2 w-2 animate-ticker rounded-full bg-success" />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            ⚠ Authorized personnel only · All sessions are logged
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-elevated backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex items-center gap-2.5 lg:hidden">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-gradient-primary shadow-glow-primary">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-bold">SMHP Sentinel</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Command Platform
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold tracking-tight">Sign in to command</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your credentials to continue.
        </p>

        <form onSubmit={handleSignIn} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email or Phone</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@smhp.ng"
                className="h-11 pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => setError("Contact your National Admin to reset.")}
                className="cursor-pointer text-[11px] text-primary hover:underline"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 pl-9 pr-10"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer accent-[oklch(68%_0.19_245)]"
              />
              Remember this device
            </label>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="h-2.5 w-2.5" /> Encrypted session
            </span>
          </div>

          {error && <ErrorNote message={error} />}

          <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Sign in
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Authorized personnel
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Contact your National Admin for account provisioning. All sign-ins are
            audit-logged.
          </p>
        </div>

        <div className="mt-6 border-t border-border pt-4 text-center text-[10px] text-muted-foreground">
          SMHP Sentinel v2 · ISO 27001 aligned · all sessions audit-logged
        </div>
      </div>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

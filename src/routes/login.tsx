import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Siren, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/types/auth";
import { ApiError } from "@/types/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Smart EMS" },
      { name: "description", content: "Sign in to the Smart EMS Emergency Operations Platform." },
    ],
  }),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z
    .string()
    .min(7, "Phone number is required (min 7 digits)")
    .regex(/^\+?[0-9\s\-()]{7,20}$/, "Please enter a valid phone number"),
  role: z.enum(["citizen", "driver"]),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

const ROLE_LABELS: Record<UserRole, string> = {
  citizen: "Citizen — report emergencies",
  dispatcher: "Dispatcher — command center",
  driver: "Driver — field responder",
  admin: "Admin — system management",
};

const ROLE_ROUTES: Record<UserRole, string> = {
  dispatcher: "/dispatch",
  admin: "/admin",
  driver: "/driver",
  citizen: "/citizen",
};

function LoginPage() {
  const { user, isAuthenticated, isLoading, login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      navigate({ to: ROLE_ROUTES[user.role] ?? "/dispatch" });
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "citizen" },
  });

  async function onLogin(values: LoginValues) {
    try {
      const loggedInUser = await login(values);
      toast.success("Welcome back!");
      navigate({ to: ROLE_ROUTES[loggedInUser.role] ?? "/dispatch" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed";
      toast.error(msg);
    }
  }

  async function onRegister(values: RegisterValues) {
    try {
      const registeredUser = await register(values);
      toast.success("Account created — welcome to Smart EMS");
      navigate({ to: ROLE_ROUTES[registeredUser.role] ?? "/dispatch" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Registration failed";
      toast.error(msg);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-glow">
            <Siren className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold tracking-tight">Smart EMS</div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Emergency Operations Platform
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border-strong bg-elevated p-6 shadow-xl">
          {/* Tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md py-1.5 text-xs font-semibold capitalize transition-all ${
                  tab === t
                    ? "bg-surface-3 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          {/* Login Form */}
          {tab === "login" && (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <Field label="Email" error={loginForm.formState.errors.email?.message}>
                <input
                  {...loginForm.register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="dispatcher@smartems.io"
                  className="input-base"
                />
              </Field>
              <Field label="Password" error={loginForm.formState.errors.password?.message}>
                <div className="relative">
                  <input
                    {...loginForm.register("password")}
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input-base pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <SubmitButton loading={loginForm.formState.isSubmitting} label="Sign in" />
            </form>
          )}

          {/* Register Form */}
          {tab === "register" && (
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
              <Field label="Full name" error={registerForm.formState.errors.name?.message}>
                <input
                  {...registerForm.register("name")}
                  placeholder="Jane Smith"
                  className="input-base"
                />
              </Field>
              <Field label="Email" error={registerForm.formState.errors.email?.message}>
                <input
                  {...registerForm.register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="jane@smartems.io"
                  className="input-base"
                />
              </Field>
              <Field label="Password" error={registerForm.formState.errors.password?.message}>
                <input
                  {...registerForm.register("password")}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
                  className="input-base"
                />
              </Field>
              <Field label="Phone number *" error={registerForm.formState.errors.phone?.message}>
                <input
                  {...registerForm.register("phone")}
                  placeholder="+1 555 000 0000"
                  className="input-base"
                />
              </Field>
              <div>
                <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Role
                </label>
                <div className="space-y-1.5">
                  {(["citizen", "driver"] as const).map((r) => {
                    const checked = registerForm.watch("role") === r;
                    return (
                      <label
                        key={r}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 transition-all ${
                          checked
                            ? "border-primary/50 bg-primary/5"
                            : "border-border bg-surface-2 hover:border-border-strong"
                        }`}
                      >
                        <input
                          type="radio"
                          {...registerForm.register("role")}
                          value={r}
                          className="mt-0.5 accent-primary"
                        />
                        <span className="text-xs">
                          <span className="font-semibold capitalize">{r}</span>
                          <span className="ml-2 text-muted-foreground">
                            — {ROLE_LABELS[r].split("—")[1]?.trim()}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <SubmitButton loading={registerForm.formState.isSubmitting} label="Create account" />
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Smart EMS · Emergency Operations Platform
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-br from-primary to-primary-glow py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:opacity-90 disabled:opacity-60"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}

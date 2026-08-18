import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Siren,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Phone,
  Radio,
  LifeBuoy,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/types/auth";
import { ApiError } from "@/types/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · ResQ" },
      { name: "description", content: "Sign in to the ResQ Emergency Operations Platform." },
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
      toast.success("Account created — welcome to ResQ");
      navigate({ to: ROLE_ROUTES[registeredUser.role] ?? "/dispatch" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Registration failed";
      toast.error(msg);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[450px] w-[650px] -translate-x-1/2 rounded-full bg-primary/10 blur-[130px]" />
      </div>

      <div className="w-full max-w-[420px]">
        {/* Header Branding */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface-2/90 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-available opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-status-available" />
            </span>
            <span>Secure Operations Portal</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-glow text-primary-foreground">
              <Siren className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">ResQ</h1>
              <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Emergency Response Platform
              </p>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-xl border border-border bg-elevated/95 p-6 shadow-2xl backdrop-blur-sm sm:p-7">
          {/* Segmented Tab Switcher */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
                tab === "login"
                  ? "bg-surface-3 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
                tab === "register"
                  ? "bg-surface-3 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Register
            </button>
          </div>

          {/* Login Form */}
          {tab === "login" && (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <Field label="Email Address" error={loginForm.formState.errors.email?.message}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    {...loginForm.register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="dispatcher@resq.io"
                    className="input-base pl-9.5 text-sm"
                  />
                </div>
              </Field>

              <Field label="Password" error={loginForm.formState.errors.password?.message}>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    {...loginForm.register("password")}
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input-base pl-9.5 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <div className="pt-1">
                <SubmitButton
                  loading={loginForm.formState.isSubmitting}
                  label="Sign in to console"
                />
              </div>
            </form>
          )}

          {/* Register Form */}
          {tab === "register" && (
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-3.5">
              <Field label="Full Name" error={registerForm.formState.errors.name?.message}>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    {...registerForm.register("name")}
                    placeholder="Jane Smith"
                    className="input-base pl-9.5 text-sm"
                  />
                </div>
              </Field>

              <Field label="Email Address" error={registerForm.formState.errors.email?.message}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    {...registerForm.register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="jane@resq.io"
                    className="input-base pl-9.5 text-sm"
                  />
                </div>
              </Field>

              <Field label="Password" error={registerForm.formState.errors.password?.message}>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    {...registerForm.register("password")}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min 8 characters"
                    className="input-base pl-9.5 text-sm"
                  />
                </div>
              </Field>

              <Field label="Phone Number *" error={registerForm.formState.errors.phone?.message}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    {...registerForm.register("phone")}
                    placeholder="+91 98765 43210"
                    className="input-base pl-9.5 text-sm"
                  />
                </div>
              </Field>

              <div>
                <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-2.5 transition-all ${
                      registerForm.watch("role") === "citizen"
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-surface-2 hover:border-border-strong hover:bg-surface-3"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <LifeBuoy className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold">Citizen</span>
                      </div>
                      <input
                        type="radio"
                        {...registerForm.register("role")}
                        value="citizen"
                        className="accent-primary"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Report emergencies</span>
                  </label>

                  <label
                    className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-2.5 transition-all ${
                      registerForm.watch("role") === "driver"
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-surface-2 hover:border-border-strong hover:bg-surface-3"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Radio className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold">Driver</span>
                      </div>
                      <input
                        type="radio"
                        {...registerForm.register("role")}
                        value="driver"
                        className="accent-primary"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Field responder</span>
                  </label>
                </div>
              </div>

              <div className="pt-1">
                <SubmitButton
                  loading={registerForm.formState.isSubmitting}
                  label="Create ResQ Account"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer Security Badge */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-status-available" />
          <span>ResQ Enterprise Emergency Network · 256-bit Encrypted</span>
        </div>
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
      <label className="mb-1 block text-[11px] font-medium text-foreground/90">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11px] text-destructive font-medium">{error}</p>}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}

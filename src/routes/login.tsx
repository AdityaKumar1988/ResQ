import { createFileRoute, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  LifeBuoy,
  Loader2,
  Lock,
  Mail,
  Phone,
  Radio,
  Shield,
  ShieldCheck,
  Siren,
  Truck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/types/auth";
import { ApiError } from "@/types/api";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · ResQ Emergency Platform" },
      {
        name: "description",
        content: "Secure responder authentication for the ResQ emergency operations platform.",
      },
    ],
  }),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
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

function getValidRedirect(redirectParam: unknown, role: UserRole): string {
  const fallback = ROLE_ROUTES[role] ?? "/dispatch";
  if (typeof redirectParam !== "string") return fallback;

  // Prevent protocol-relative redirects, scheme injections, and backslash bypasses
  if (
    !redirectParam.startsWith("/") ||
    redirectParam.startsWith("//") ||
    redirectParam.includes("\\") ||
    redirectParam.includes(":")
  ) {
    return fallback;
  }

  // Isolate path component for RBAC validation
  const path = redirectParam.split("?")[0].split("#")[0];

  // RBAC routing verification
  if (path.startsWith("/admin") && role !== "admin") {
    return fallback;
  }
  if (
    (path.startsWith("/dispatch") ||
      path.startsWith("/analytics") ||
      path.startsWith("/fleet") ||
      path.startsWith("/incidents")) &&
    role !== "dispatcher" &&
    role !== "admin"
  ) {
    return fallback;
  }
  if (path.startsWith("/citizen") && role !== "citizen") {
    return fallback;
  }
  if (path.startsWith("/driver") && role !== "driver") {
    return fallback;
  }

  return redirectParam;
}

function LoginPage() {
  const rawSearch = useRouterState({ select: (s) => s.location.search }) as
    Record<string, unknown> | undefined;
  const redirectTarget = typeof rawSearch?.redirect === "string" ? rawSearch.redirect : undefined;
  const { user, isAuthenticated, isLoading, login, register } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      navigate({ to: getValidRedirect(redirectTarget, user.role) });
    }
  }, [isAuthenticated, isLoading, user, navigate, redirectTarget]);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "citizen",
    },
  });

  async function onLogin(values: LoginValues) {
    try {
      const loggedInUser = await login(values);
      toast.success("Welcome back!");
      navigate({ to: getValidRedirect(redirectTarget, loggedInUser.role) });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Invalid email or password";
      toast.error(msg);
    }
  }

  async function onRegister(values: RegisterValues) {
    try {
      const registeredUser = await register(values);
      toast.success("Account created — welcome to ResQ");
      navigate({ to: getValidRedirect(redirectTarget, registeredUser.role) });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Registration failed";
      toast.error(msg);
    }
  }

  return (
    <div className="min-h-dvh flex bg-background text-foreground">
      {/* Brand Panel (Split Layout on >= lg) */}
      <aside className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-border bg-surface p-10 xl:p-14 select-none">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
            aria-label="Return to ResQ homepage"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary">
              <Siren className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-foreground">ResQ</div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Operations Platform
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-status-available" />
            <span>SYSTEM NOMINAL</span>
          </div>
        </div>

        {/* Vector CAD Topology Illustration (Clean static SVG schematic) */}
        <div className="my-auto py-8">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-2 text-primary font-semibold">
                <Activity className="h-4 w-4" />
                TELEMETRY NETWORK TOPOLOGY
              </span>
              <span className="tnum">POSTGRESQL · SOCKET.IO</span>
            </div>

            <div className="relative aspect-[16/9] w-full my-4 flex items-center justify-center">
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 400 220"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Connection links */}
                <line
                  x1="200"
                  y1="110"
                  x2="80"
                  y2="50"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-border-strong"
                  strokeDasharray="4 4"
                />
                <line
                  x1="200"
                  y1="110"
                  x2="320"
                  y2="50"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-border-strong"
                  strokeDasharray="4 4"
                />
                <line
                  x1="200"
                  y1="110"
                  x2="80"
                  y2="170"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-border-strong"
                  strokeDasharray="4 4"
                />
                <line
                  x1="200"
                  y1="110"
                  x2="320"
                  y2="170"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-border-strong"
                  strokeDasharray="4 4"
                />

                {/* Central Server Hub Node */}
                <circle
                  cx="200"
                  cy="110"
                  r="28"
                  className="fill-surface-2 stroke-primary"
                  strokeWidth="2"
                />

                {/* Peripheral Nodes */}
                <circle
                  cx="80"
                  cy="50"
                  r="18"
                  className="fill-card stroke-border-strong"
                  strokeWidth="1.5"
                />
                <circle
                  cx="320"
                  cy="50"
                  r="18"
                  className="fill-card stroke-border-strong"
                  strokeWidth="1.5"
                />
                <circle
                  cx="80"
                  cy="170"
                  r="18"
                  className="fill-card stroke-border-strong"
                  strokeWidth="1.5"
                />
                <circle
                  cx="320"
                  cy="170"
                  r="18"
                  className="fill-card stroke-border-strong"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Node Overlay Labels */}
              <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none text-xs font-mono">
                <div className="flex justify-between">
                  <div className="flex items-center gap-1.5 pl-6 pt-3 text-muted-foreground">
                    <LifeBuoy className="h-3.5 w-3.5 text-primary" />
                    <span>Citizen Intake</span>
                  </div>
                  <div className="flex items-center gap-1.5 pr-6 pt-3 text-muted-foreground">
                    <Radio className="h-3.5 w-3.5 text-primary" />
                    <span>Dispatch CAD</span>
                  </div>
                </div>

                {/* Center Hub */}
                <div className="flex flex-col items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                  <span className="font-bold text-foreground mt-0.5">Postgres + Socket</span>
                </div>

                <div className="flex justify-between">
                  <div className="flex items-center gap-1.5 pl-6 pb-3 text-muted-foreground">
                    <Truck className="h-3.5 w-3.5 text-primary" />
                    <span>Ambulance Telemetry</span>
                  </div>
                  <div className="flex items-center gap-1.5 pr-6 pb-3 text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span>Admin Audit</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
              <div>
                <div className="text-[11px] font-mono uppercase text-muted-foreground">
                  Database
                </div>
                <div className="text-sm font-bold font-mono text-foreground">PostgreSQL</div>
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase text-muted-foreground">
                  Transport
                </div>
                <div className="text-sm font-bold font-mono text-foreground">Socket.IO</div>
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase text-muted-foreground">Access</div>
                <div className="text-sm font-bold font-mono text-foreground">Role-Based (RBAC)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Security / Trust Assurance */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-status-available" />
            <span>Audited RBAC Clearance · Zero External Telemetry Leak</span>
          </div>
          <span>v2.4.0-prod</span>
        </div>
      </aside>

      {/* Auth Interaction Panel (Right side on desktop, full width on mobile) */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-8 lg:p-12 overflow-y-auto">
        {/* Top Mobile Bar with Theme Toggle */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto">
          <Link
            to="/"
            className="flex items-center gap-2 lg:hidden text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            aria-label="Return to ResQ home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary">
              <Siren className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm tracking-tight">ResQ</span>
          </Link>

          <div className="ml-auto">
            <ThemeToggle size="sm" />
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="mb-6">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-foreground">
              {tab === "login" ? "Sign in to ResQ" : "Create responder account"}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
              {tab === "login"
                ? "Enter your verified credentials to access authorized emergency consoles."
                : "Register a new citizen or driver profile for instant operational clearance."}
            </p>
          </div>

          {/* Accessible Tabs Switcher */}
          <Tabs
            value={tab}
            onValueChange={(val) => setTab(val as "login" | "register")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6 h-11 p-1 bg-surface-2 border border-border rounded-lg">
              <TabsTrigger
                value="login"
                className="h-9 min-h-[36px] text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Lock className="mr-1.5 h-3.5 w-3.5" />
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="h-9 min-h-[36px] text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <User className="mr-1.5 h-3.5 w-3.5" />
                Create Account
              </TabsTrigger>
            </TabsList>

            {/* Sign In Tab Content */}
            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <Field
                  id="login-email"
                  label="Email Address"
                  required
                  error={loginForm.formState.errors.email?.message}
                >
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      {...loginForm.register("email")}
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="dispatcher@resq.io"
                      className="h-11 pl-10 text-sm bg-surface-2 border-border"
                    />
                  </div>
                </Field>

                <Field
                  id="login-password"
                  label="Password"
                  required
                  error={loginForm.formState.errors.password?.message}
                >
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      {...loginForm.register("password")}
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="h-11 pl-10 pr-11 text-sm bg-surface-2 border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-r-md"
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </Field>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={loginForm.formState.isSubmitting}
                    className="w-full h-11 text-sm font-semibold gap-2"
                  >
                    {loginForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying clearance...</span>
                      </>
                    ) : (
                      <span>Sign In to Console</span>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Registration Tab Content */}
            <TabsContent value="register">
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <Field
                  id="reg-name"
                  label="Full Name"
                  required
                  error={registerForm.formState.errors.name?.message}
                >
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      {...registerForm.register("name")}
                      id="reg-name"
                      placeholder="Paramedic Jane Smith"
                      className="h-11 pl-10 text-sm bg-surface-2 border-border"
                    />
                  </div>
                </Field>

                <Field
                  id="reg-email"
                  label="Email Address"
                  required
                  error={registerForm.formState.errors.email?.message}
                >
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      {...registerForm.register("email")}
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      placeholder="responder@resq.io"
                      className="h-11 pl-10 text-sm bg-surface-2 border-border"
                    />
                  </div>
                </Field>

                <Field
                  id="reg-phone"
                  label="Phone Number"
                  required
                  hint="Used for real-time dispatch SMS & audio alerts"
                  error={registerForm.formState.errors.phone?.message}
                >
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      {...registerForm.register("phone")}
                      id="reg-phone"
                      type="tel"
                      placeholder="+1 (555) 019-2834"
                      className="h-11 pl-10 text-sm bg-surface-2 border-border"
                    />
                  </div>
                </Field>

                <Field
                  id="reg-password"
                  label="Password"
                  required
                  hint="Minimum 8 characters"
                  error={registerForm.formState.errors.password?.message}
                >
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      {...registerForm.register("password")}
                      id="reg-password"
                      type={showRegisterPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Min 8 characters"
                      className="h-11 pl-10 pr-11 text-sm bg-surface-2 border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword((v) => !v)}
                      className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-r-md"
                      aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                    >
                      {showRegisterPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </Field>

                {/* Role Selection Group with 44px+ Accessible Touch Targets */}
                <div>
                  <label className="block text-xs font-medium text-foreground/90 mb-1.5">
                    Account Type <span className="text-p1 font-bold">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <label
                      className={`flex min-h-[48px] cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                        registerForm.watch("role") === "citizen"
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-surface-2 hover:bg-surface-3"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <LifeBuoy className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-foreground">Citizen</div>
                          <div className="text-xs text-muted-foreground">Emergency Intake</div>
                        </div>
                      </div>
                      <input
                        type="radio"
                        {...registerForm.register("role")}
                        value="citizen"
                        className="h-4 w-4 accent-primary"
                      />
                    </label>

                    <label
                      className={`flex min-h-[48px] cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                        registerForm.watch("role") === "driver"
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-surface-2 hover:bg-surface-3"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-foreground">Driver</div>
                          <div className="text-xs text-muted-foreground">Paramedic Unit</div>
                        </div>
                      </div>
                      <input
                        type="radio"
                        {...registerForm.register("role")}
                        value="driver"
                        className="h-4 w-4 accent-primary"
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={registerForm.formState.isSubmitting}
                    className="w-full h-11 text-sm font-semibold gap-2"
                  >
                    {registerForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Provisioning profile...</span>
                      </>
                    ) : (
                      <span>Complete Registration</span>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          {/* Security Notice */}
          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-status-available" />
            <span>JWT Authenticated · Role-Based Access Control</span>
          </div>
        </div>

        {/* Bottom Attribution */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/40">
          <span>ResQ Emergency Medical Operations · Authorized Personnel Only</span>
        </div>
      </div>
    </div>
  );
}

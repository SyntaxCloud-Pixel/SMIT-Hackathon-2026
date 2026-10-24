import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginRequestSchema, LoginRequest } from "@hcm-lite/shared";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Layers, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles, Building2 } from "lucide-react";

export function LoginPage() {
  const { login, setupStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<{ code?: string; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginRequest) => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.code === "ACCOUNT_DEACTIVATED" || err.status === 403) {
        setAuthError({
          code: "ACCOUNT_DEACTIVATED",
          message: "Your account has been deactivated. Please contact your company administrator.",
        });
      } else if (err.code === "INVALID_CREDENTIALS" || err.status === 401) {
        setAuthError({
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password. Please verify your credentials.",
        });
      } else {
        setAuthError({
          code: "NETWORK_ERROR",
          message: err.message || "Unable to reach HCM Lite server. Please check your network connection.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-500/30">
          <Layers className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Sign in to HCM Lite
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          AI-Assisted Human Capital Management Platform
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {/* If setup is not completed, show prominent First-Run Setup alert */}
        {setupStatus && !setupStatus.setupCompleted && (
          <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50/70 p-4 shadow-sm">
            <div className="flex items-start space-x-3">
              <Sparkles className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-brand-900">
                  First-Run Setup Required
                </h4>
                <p className="text-xs text-brand-700 mt-1">
                  No company has been initialized on this deployment yet. Launch the wizard to configure your company profile and create the initial administrator.
                </p>
                <Link
                  to="/setup"
                  className="mt-3 inline-flex items-center text-xs font-semibold text-brand-600 hover:text-brand-800"
                >
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  Launch Setup Wizard &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Account Login</CardTitle>
            <CardDescription>
              Enter your work credentials to access the workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authError && (
              <div
                className={`mb-4 flex items-start space-x-2.5 rounded-lg border p-3 text-xs ${
                  authError.code === "ACCOUNT_DEACTIVATED"
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                <AlertCircle
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    authError.code === "ACCOUNT_DEACTIVATED" ? "text-amber-600" : "text-rose-600"
                  }`}
                />
                <div className="flex-1">
                  <p className="font-semibold">
                    {authError.code === "ACCOUNT_DEACTIVATED"
                      ? "Account Access Restricted"
                      : authError.code === "INVALID_CREDENTIALS"
                      ? "Authentication Failed"
                      : "Connection Error"}
                  </p>
                  <p className="mt-0.5">{authError.message}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Work Email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                {...register("email")}
                error={errors.email?.message}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    {...register("password")}
                    error={errors.password?.message}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-2"
                isLoading={isSubmitting}
              >
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-6">
          Saylani Hackathon 2026 • Phase 2 Security Architecture
        </p>
      </div>
    </div>
  );
}

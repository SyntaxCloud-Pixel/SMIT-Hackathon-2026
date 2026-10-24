import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CompanySetupRequestSchema,
  CompanySetupRequest,
} from "@hcm-lite/shared";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  UserCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

const TIMEZONES = [
  "UTC",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
];

const WEEKEND_OPTIONS = [
  "Friday",
  "Saturday",
  "Sunday",
];

export function SetupPage() {
  const { initializeSetup, setupStatus } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<CompanySetupRequest>({
    resolver: zodResolver(CompanySetupRequestSchema),
    defaultValues: {
      companyName: "",
      timezone: "Asia/Karachi",
      officeStartTime: "09:00",
      gracePeriodMinutes: 15,
      weekendDays: ["Saturday", "Sunday"],
      officeAddress: "",
      allowedAttendanceRadius: 200,
      adminFullName: "",
      adminEmail: "",
      adminPassword: "",
      confirmPassword: "",
    },
  });

  const formValues = watch();

  const handleNextStep = async () => {
    setSubmitError(null);
    if (currentStep === 1) {
      const isValid = await trigger([
        "companyName",
        "timezone",
        "officeStartTime",
        "gracePeriodMinutes",
        "weekendDays",
        "allowedAttendanceRadius",
      ]);
      if (isValid) setCurrentStep(2);
    } else if (currentStep === 2) {
      const isValid = await trigger([
        "adminFullName",
        "adminEmail",
        "adminPassword",
        "confirmPassword",
      ]);
      if (isValid) setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setSubmitError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const toggleWeekendDay = (day: string) => {
    const current = formValues.weekendDays || [];
    if (current.includes(day)) {
      if (current.length > 1) {
        setValue("weekendDays", current.filter((d) => d !== day));
      }
    } else {
      setValue("weekendDays", [...current, day]);
    }
  };

  const onSubmit = async (data: CompanySetupRequest) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await initializeSetup(data);
      navigate("/", { replace: true });
    } catch (err: any) {
      setSubmitError(err.message || "Failed to initialize company. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (setupStatus?.setupCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full text-center p-6 shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-4">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle>System Already Initialized</CardTitle>
          <CardDescription className="mt-2">
            Company setup has already been completed for{" "}
            <strong>{setupStatus.company?.name || "this organization"}</strong>.
          </CardDescription>
          <Button onClick={() => navigate("/login")} className="w-full mt-6">
            Proceed to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>HCM Lite Initial Deployment</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Organization Setup Wizard
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 max-w-xl mx-auto">
            Configure your enterprise workspace and initialize the primary administrator account.
            No dummy data is pre-populated.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-lg mx-auto relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 -z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-brand-600 -translate-y-1/2 transition-all duration-300 -z-0"
              style={{ width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%" }}
            />

            {/* Step 1 Pill */}
            <div className="flex flex-col items-center relative z-10 bg-slate-50 px-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  currentStep >= 1
                    ? "bg-brand-600 text-white shadow-md shadow-brand-500/30"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                1
              </div>
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5">Company Info</span>
            </div>

            {/* Step 2 Pill */}
            <div className="flex flex-col items-center relative z-10 bg-slate-50 px-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  currentStep >= 2
                    ? "bg-brand-600 text-white shadow-md shadow-brand-500/30"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                2
              </div>
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5">Initial Admin</span>
            </div>

            {/* Step 3 Pill */}
            <div className="flex flex-col items-center relative z-10 bg-slate-50 px-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  currentStep === 3
                    ? "bg-brand-600 text-white shadow-md shadow-brand-500/30"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                3
              </div>
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5">Review & Finish</span>
            </div>
          </div>
        </div>

        {/* Wizard Card */}
        <Card className="shadow-xl border-slate-200">
          <form onSubmit={handleSubmit(onSubmit)}>
            {submitError && (
              <div className="p-4 mx-6 mt-6 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-sm">
                <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Setup could not be initialized</p>
                  <p className="text-xs text-rose-700 mt-0.5">{submitError}</p>
                </div>
              </div>
            )}

            {/* STEP 1: Company Information */}
            {currentStep === 1 && (
              <>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-brand-600" />
                    <CardTitle>Company & Office Settings</CardTitle>
                  </div>
                  <CardDescription>
                    Define your company's core profile, timezone, and work-shift parameters.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Company Name *"
                    placeholder="e.g. Acme Corporation"
                    {...register("companyName")}
                    error={errors.companyName?.message}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Timezone *
                      </label>
                      <select
                        className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        {...register("timezone")}
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                      {errors.timezone && (
                        <p className="text-xs text-rose-600 font-medium">{errors.timezone.message}</p>
                      )}
                    </div>

                    <Input
                      label="Office Start Time (HH:MM) *"
                      type="text"
                      placeholder="09:00"
                      {...register("officeStartTime")}
                      error={errors.officeStartTime?.message}
                      helperText="Default check-in threshold (24-hour clock)"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Grace Period (Minutes) *"
                      type="number"
                      {...register("gracePeriodMinutes", { valueAsNumber: true })}
                      error={errors.gracePeriodMinutes?.message}
                      helperText="Minutes before check-in is logged as Late"
                    />

                    <Input
                      label="Allowed Attendance Radius (Meters) *"
                      type="number"
                      {...register("allowedAttendanceRadius", { valueAsNumber: true })}
                      error={errors.allowedAttendanceRadius?.message}
                      helperText="Geofencing threshold around office coordinates"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                      Weekend Days *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKEND_OPTIONS.map((day) => {
                        const isSelected = formValues.weekendDays?.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleWeekendDay(day)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              isSelected
                                ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    {errors.weekendDays && (
                      <p className="text-xs text-rose-600 font-medium mt-1">
                        {errors.weekendDays.message}
                      </p>
                    )}
                  </div>

                  <Input
                    label="Office Physical Address"
                    placeholder="e.g. 100 Main Boulevard, Silicon Square"
                    {...register("officeAddress")}
                    error={errors.officeAddress?.message}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Office Latitude (Optional)"
                      type="number"
                      step="any"
                      placeholder="e.g. 24.8607"
                      {...register("officeLatitude", {
                        setValueAs: (v) => (v === "" ? null : parseFloat(v)),
                      })}
                      error={errors.officeLatitude?.message}
                    />

                    <Input
                      label="Office Longitude (Optional)"
                      type="number"
                      step="any"
                      placeholder="e.g. 67.0011"
                      {...register("officeLongitude", {
                        setValueAs: (v) => (v === "" ? null : parseFloat(v)),
                      })}
                      error={errors.officeLongitude?.message}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-slate-100 pt-4">
                  <Button type="button" onClick={handleNextStep}>
                    Next: Administrator Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </>
            )}

            {/* STEP 2: Initial Administrator Account */}
            {currentStep === 2 && (
              <>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-5 w-5 text-brand-600" />
                    <CardTitle>Initial Administrator Account</CardTitle>
                  </div>
                  <CardDescription>
                    This account will have full administrative privileges and company-wide access.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Administrator Full Name *"
                    placeholder="e.g. Sarah Connor"
                    {...register("adminFullName")}
                    error={errors.adminFullName?.message}
                  />

                  <Input
                    label="Work Email Address *"
                    type="email"
                    placeholder="admin@company.com"
                    {...register("adminEmail")}
                    error={errors.adminEmail?.message}
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Password (Min 8 Characters) *
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        {...register("adminPassword")}
                        error={errors.adminPassword?.message}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        {...register("confirmPassword")}
                        error={errors.confirmPassword?.message}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t border-slate-100 pt-4">
                  <Button type="button" variant="outline" onClick={handlePrevStep}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="button" onClick={handleNextStep}>
                    Next: Review & Initialize
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </>
            )}

            {/* STEP 3: Review and Finish */}
            {currentStep === 3 && (
              <>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <CardTitle>Review & Finalize Setup</CardTitle>
                  </div>
                  <CardDescription>
                    Please review your settings before initializing the organization.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary Box */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Organization Profile
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500 block text-xs">Company Name:</span>
                          <span className="font-semibold text-slate-900">{formValues.companyName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs">Timezone:</span>
                          <span className="font-semibold text-slate-900">{formValues.timezone}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs">Start Time & Grace:</span>
                          <span className="font-semibold text-slate-900">
                            {formValues.officeStartTime} ({formValues.gracePeriodMinutes} min grace)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs">Weekend Days:</span>
                          <span className="font-semibold text-slate-900">
                            {formValues.weekendDays?.join(", ")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Initial Administrator
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500 block text-xs">Full Name:</span>
                          <span className="font-semibold text-slate-900">{formValues.adminFullName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs">Email:</span>
                          <span className="font-semibold text-slate-900">{formValues.adminEmail}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs">System Role:</span>
                          <Badge variant="roleAdmin">ADMIN</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Leave Types Policy Setup */}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-800 mb-2">
                      Default Leave Policy Quotas (Auto-Created)
                    </h4>
                    <p className="text-xs text-slate-600 mb-3">
                      The following standard statutory leave quotas will be created according to project specifications:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-sm">
                        <span className="block text-xs font-medium text-slate-500">Annual</span>
                        <span className="text-base font-bold text-slate-900">14 Days</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-sm">
                        <span className="block text-xs font-medium text-slate-500">Sick</span>
                        <span className="text-base font-bold text-slate-900">8 Days</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-sm">
                        <span className="block text-xs font-medium text-slate-500">Casual</span>
                        <span className="text-base font-bold text-slate-900">10 Days</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-sm">
                        <span className="block text-xs font-medium text-slate-500">Unpaid</span>
                        <span className="text-base font-bold text-slate-900">Unlimited</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t border-slate-100 pt-4">
                  <Button type="button" variant="outline" onClick={handlePrevStep} disabled={isSubmitting}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" isLoading={isSubmitting}>
                    Initialize Company & Admin
                    <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}

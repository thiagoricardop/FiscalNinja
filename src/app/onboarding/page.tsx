'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useForm, useFieldArray } from 'react-hook-form';
import Logo from '@/components/brand/Logo';
import {
  Building2,
  Truck,
  Users,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Loader2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

/* ========================================
   Types
======================================== */
type CompanyForm = { company_name: string };

type TruckEntry = {
  truck_number: string;
  license_plate: string;
  vin: string;
};

type DriverEntry = {
  name: string;
  email: string;
  phone: string;
};

type SubscriptionForm = { tier: 'solo' | 'fleet' | 'enterprise' };

const STEPS = [
  { icon: Building2, label: 'Company' },
  { icon: Truck, label: 'Trucks' },
  { icon: Users, label: 'Drivers' },
  { icon: CreditCard, label: 'Plan' },
];

const PLANS = [
  {
    tier: 'solo' as const,
    name: 'Solo',
    price: 29,
    description: 'Perfect for owner-operators',
    features: ['1 truck', '1 driver', 'Receipt scanning', 'Basic reports'],
  },
  {
    tier: 'fleet' as const,
    name: 'Fleet',
    price: 79,
    description: 'For growing businesses',
    features: [
      'Up to 10 trucks',
      'Unlimited drivers',
      'Receipt scanning',
      'Advanced reports',
      'Priority support',
    ],
    popular: true,
  },
  {
    tier: 'enterprise' as const,
    name: 'Enterprise',
    price: 149,
    description: 'For large operations',
    features: [
      'Unlimited trucks',
      'Unlimited drivers',
      'Receipt scanning',
      'Custom reports',
      'Dedicated support',
      'API access',
    ],
  },
];

/* ========================================
   Main Component
======================================== */
export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedTier, setSelectedTier] = useState<'solo' | 'fleet' | 'enterprise'>('solo');

  // Check if onboarding already complete
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed, company_name')
        .eq('id', user.id)
        .single();
      if (data?.onboarding_completed) {
        router.replace('/dashboard');
      }
      if (data?.company_name) {
        setCompanyName(data.company_name);
      }
    })();
  }, [user, router]);

  // Trucks form
  const trucksForm = useForm<{ trucks: TruckEntry[] }>({
    defaultValues: { trucks: [{ truck_number: '', license_plate: '', vin: '' }] },
  });
  const {
    fields: truckFields,
    append: addTruck,
    remove: removeTruck,
  } = useFieldArray({ control: trucksForm.control, name: 'trucks' });

  // Drivers form
  const driversForm = useForm<{ drivers: DriverEntry[] }>({
    defaultValues: { drivers: [{ name: '', email: '', phone: '' }] },
  });
  const {
    fields: driverFields,
    append: addDriver,
    remove: removeDriver,
  } = useFieldArray({ control: driversForm.control, name: 'drivers' });

  /* ————— Step handlers ————— */

  const saveCompany = async () => {
    if (!user) return;
    if (!companyName.trim()) {
      setError('Please enter your company name.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: e } = await supabase
      .from('profiles')
      .update({ company_name: companyName.trim() })
      .eq('id', user.id);
    if (e) { setError(e.message); setSaving(false); return; }
    setSaving(false);
    setStep(1);
  };

  const saveTrucks = async () => {
    if (!user) return;
    const values = trucksForm.getValues().trucks.filter((t) => t.truck_number.trim());
    if (values.length === 0) {
      // skip
      setStep(2);
      return;
    }
    setSaving(true);
    setError('');
    const { error: e } = await supabase.from('trucks').insert(
      values.map((t) => ({
        user_id: user.id,
        truck_number: t.truck_number.trim(),
        license_plate: t.license_plate.trim(),
        vin: t.vin.trim() || null,
      }))
    );
    if (e) { setError(e.message); setSaving(false); return; }
    setSaving(false);
    setStep(2);
  };

  const saveDrivers = async () => {
    if (!user) return;
    const values = driversForm.getValues().drivers.filter((d) => d.name.trim());
    if (values.length === 0) {
      setStep(3);
      return;
    }
    setSaving(true);
    setError('');
    const { error: e } = await supabase.from('drivers').insert(
      values.map((d) => ({
        user_id: user.id,
        name: d.name.trim(),
        email: d.email.trim() || null,
        phone: d.phone.trim() || null,
      }))
    );
    if (e) { setError(e.message); setSaving(false); return; }
    setSaving(false);
    setStep(3);
  };

  const finishOnboarding = async (skipPlan = false) => {
    if (!user) return;
    setSaving(true);
    setError('');

    // Mark onboarding as complete (and optionally record selected tier)
    const { error: e } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        ...(skipPlan ? {} : { subscription_tier: selectedTier }),
      })
      .eq('id', user.id);
    if (e) { setError(e.message); setSaving(false); return; }

    if (skipPlan) {
      // User skipped plan selection — go straight to dashboard
      router.push('/dashboard');
      return;
    }

    // Redirect to Stripe checkout to start the free trial
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return; // page navigates away
      }
      if (data.alreadySubscribed) {
        router.push('/dashboard');
        return;
      }
      throw new Error(data.error || 'Failed to create checkout session');
    } catch (err) {
      // If checkout fails, still let user into the dashboard
      console.error('Stripe checkout error:', err);
      router.push('/dashboard');
    }
  };

  const handleNext = () => {
    setError('');
    switch (step) {
      case 0: saveCompany(); break;
      case 1: saveTrucks(); break;
      case 2: saveDrivers(); break;
      case 3: finishOnboarding(false); break;
    }
  };

  const handleSkipStep = () => {
    setError('');
    if (step < 3) {
      setStep((s) => s + 1);
    } else {
      // Skip plan selection — go to dashboard without Stripe
      finishOnboarding(true);
    }
  };

  const handleBack = () => {
    setError('');
    setStep((s) => Math.max(0, s - 1));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="md" showText />
          </div>
          <span className="text-sm text-gray-500">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl space-y-8">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <div key={s.label} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                      done
                        ? 'bg-green-100 text-green-700'
                        : active
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step content */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              {step === 0 && (
                <StepCompany
                  companyName={companyName}
                  setCompanyName={setCompanyName}
                />
              )}
              {step === 1 && (
                <StepTrucks
                  fields={truckFields}
                  register={trucksForm.register}
                  addTruck={() =>
                    addTruck({ truck_number: '', license_plate: '', vin: '' })
                  }
                  removeTruck={removeTruck}
                />
              )}
              {step === 2 && (
                <StepDrivers
                  fields={driverFields}
                  register={driversForm.register}
                  addDriver={() =>
                    addDriver({ name: '', email: '', phone: '' })
                  }
                  removeDriver={removeDriver}
                />
              )}
              {step === 3 && (
                <StepPlan
                  selected={selectedTier}
                  onSelect={setSelectedTier}
                />
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0 || saving}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              {/* Skip button for optional steps (trucks, drivers, plan) */}
              {step > 0 && (
                <Button
                  variant="ghost"
                  onClick={handleSkipStep}
                  disabled={saving}
                  className="text-gray-500"
                >
                  {step === 3 ? 'Skip for now' : 'Skip'}
                </Button>
              )}

              <Button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 gap-1"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : step === 3 ? (
                  <>
                    Start Free Trial
                    <Sparkles className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {step === 3 && (
            <p className="text-center text-xs text-gray-400">
              14-day free trial on all plans · No credit card required · Cancel anytime
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================
   Step Components
======================================== */

function StepCompany({
  companyName,
  setCompanyName,
}: {
  companyName: string;
  setCompanyName: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
          <Building2 className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          Welcome! Let&apos;s set up your company.
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          This will be used across your dashboard and reports.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Company Name *</Label>
        <Input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Trucking LLC"
          autoFocus
          className="text-center sm:text-left"
        />
      </div>
    </div>
  );
}

function StepTrucks({
  fields,
  register,
  addTruck,
  removeTruck,
}: {
  fields: any[];
  register: any;
  addTruck: () => void;
  removeTruck: (i: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
          <Truck className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Add Your Trucks</h2>
        <p className="text-sm text-gray-500 mt-1">
          Add at least one truck to track expenses by vehicle.
        </p>
      </div>
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="border border-gray-200 rounded-lg p-4 space-y-3 relative"
          >
            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => removeTruck(index)}
                className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Truck Number *</Label>
                <Input
                  {...register(`trucks.${index}.truck_number`)}
                  placeholder="T-001"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">License Plate</Label>
                <Input
                  {...register(`trucks.${index}.license_plate`)}
                  placeholder="ABC-1234"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">VIN (optional)</Label>
              <Input
                {...register(`trucks.${index}.vin`)}
                placeholder="1HGBH41JXMN109186"
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={addTruck}
        >
          <Plus className="h-4 w-4" />
          Add Another Truck
        </Button>
      </div>
    </div>
  );
}

function StepDrivers({
  fields,
  register,
  addDriver,
  removeDriver,
}: {
  fields: any[];
  register: any;
  addDriver: () => void;
  removeDriver: (i: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
          <Users className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Add Your Drivers</h2>
        <p className="text-sm text-gray-500 mt-1">
          Assign drivers to receipts for better tracking.
        </p>
      </div>
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="border border-gray-200 rounded-lg p-4 space-y-3 relative"
          >
            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => removeDriver(index)}
                className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input
                {...register(`drivers.${index}.name`)}
                placeholder="John Doe"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email (optional)</Label>
                <Input
                  {...register(`drivers.${index}.email`)}
                  placeholder="john@example.com"
                  type="email"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone (optional)</Label>
                <Input
                  {...register(`drivers.${index}.phone`)}
                  placeholder="(555) 123-4567"
                  type="tel"
                />
              </div>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={addDriver}
        >
          <Plus className="h-4 w-4" />
          Add Another Driver
        </Button>
      </div>
    </div>
  );
}

function StepPlan({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (tier: 'solo' | 'fleet' | 'enterprise') => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
          <CreditCard className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          Choose Your Plan
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Select the plan that best fits your operation. You can change anytime.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isSelected = plan.tier === selected;
          return (
            <button
              key={plan.tier}
              type="button"
              onClick={() => onSelect(plan.tier)}
              className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  POPULAR
                </span>
              )}
              <h4 className="font-semibold text-gray-900">{plan.name}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ${plan.price}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <ul className="mt-3 space-y-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="text-xs text-gray-600 flex items-center gap-1.5"
                  >
                    <Check className="h-3 w-3 text-blue-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {isSelected && (
                <div className="absolute top-3 right-3 h-5 w-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionBanner } from '@/components/dashboard/SubscriptionGate';
import { TIER_DRIVER_LIMIT } from '@/lib/payments/limits';
import {
  Plus,
  Users,
  Loader2,
  Trash2,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

type DriverRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
};

export default function DriversPage() {
  const { user } = useUser();
  const { tier, hasSubscription, loading: subLoading } = useSubscription();
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<DriverRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    active: true,
  });

  const fetchDrivers = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    setDrivers((data as DriverRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', active: true });
    setEditing(null);
    setError('');
  };

  const openEdit = (driver: DriverRow) => {
    setEditing(driver);
    setForm({
      name: driver.name,
      email: driver.email ?? '',
      phone: driver.phone ?? '',
      active: driver.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSaving(true);

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      active: form.active,
    };

    let err;
    if (editing) {
      const { error: e } = await supabase
        .from('drivers')
        .update(payload)
        .eq('id', editing.id);
      err = e;
    } else {
      // Enforce driver limit per plan
      const driverLimit = tier ? TIER_DRIVER_LIMIT[tier] : 0;
      if (driverLimit > 0 && drivers.length >= driverLimit) {
        setError(`Your ${tier} plan allows up to ${driverLimit} drivers. Upgrade to add more.`);
        setSaving(false);
        return;
      }
      const { error: e } = await supabase.from('drivers').insert(payload);
      err = e;
    }

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    resetForm();
    setSaving(false);
    setDialogOpen(false);
    fetchDrivers();
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const executeDelete = async () => {
    if (!confirmDeleteId) return;
    await supabase.from('drivers').delete().eq('id', confirmDeleteId);
    setConfirmDeleteId(null);
    fetchDrivers();
  };

  const toggleActive = async (driver: DriverRow) => {
    await supabase
      .from('drivers')
      .update({ active: !driver.active })
      .eq('id', driver.id);
    fetchDrivers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const activeDrivers = drivers.filter((d) => d.active).length;
  const driverLimit = tier ? TIER_DRIVER_LIMIT[tier] : 0;
  const isAtDriverLimit = driverLimit > 0 && drivers.length >= driverLimit;

  return (
    <div className="space-y-6">
      {/* Subscription banner when no plan */}
      {!subLoading && !hasSubscription && <SubscriptionBanner />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeDrivers} active · {drivers.length - activeDrivers} inactive
            {driverLimit > 0 && (
              <span className={drivers.length >= driverLimit ? ' text-red-500 font-medium' : ''}>
                {' '}· {drivers.length}/{driverLimit} used
              </span>
            )}
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2" disabled={!hasSubscription || (isAtDriverLimit && !editing)}>
              <Plus className="h-4 w-4" />
              {!hasSubscription ? 'Subscribe to Add' : isAtDriverLimit ? 'Driver Limit Reached' : 'Add Driver'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Edit Driver' : 'Add New Driver'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email (optional)</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone (optional)</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="active"
                  checked={form.active}
                  onCheckedChange={(v) =>
                    setForm({ ...form, active: v === true })
                  }
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Active
                </Label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editing ? (
                    'Update Driver'
                  ) : (
                    'Add Driver'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {drivers.length === 0 ? (
        <Card className="border-gray-100">
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">
              No drivers yet
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Add your first driver to assign them to receipts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="border-gray-100 overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold text-center">
                      Status
                    </TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-700">
                              {driver.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          {driver.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {driver.email || '—'}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {driver.phone || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => toggleActive(driver)}>
                          {driver.active ? (
                            <Badge
                              variant="outline"
                              className="border-green-300 text-green-700 bg-green-50 cursor-pointer"
                            >
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-gray-300 text-gray-500 bg-gray-50 cursor-pointer"
                            >
                              Inactive
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-blue-600"
                            onClick={() => openEdit(driver)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600"
                            onClick={() => handleDelete(driver.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {drivers.map((driver) => (
              <Card key={driver.id} className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-blue-700">
                          {driver.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {driver.name}
                        </p>
                        {driver.email && (
                          <p className="text-sm text-gray-500 truncate">
                            {driver.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => toggleActive(driver)}>
                      {driver.active ? (
                        <Badge
                          variant="outline"
                          className="border-green-300 text-green-700 bg-green-50 cursor-pointer shrink-0"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-gray-300 text-gray-500 bg-gray-50 cursor-pointer shrink-0"
                        >
                          Inactive
                        </Badge>
                      )}
                    </button>
                  </div>
                  {driver.phone && (
                    <p className="text-sm text-gray-500 mt-2">
                      {driver.phone}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => openEdit(driver)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleDelete(driver.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Driver</DialogTitle>
          </DialogHeader>
          {(() => {
            const driver = drivers.find((d) => d.id === confirmDeleteId);
            return driver ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete this driver? This action cannot be undone.
                </p>
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-blue-700">
                      {driver.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{driver.name}</p>
                    {driver.email && (
                      <p className="text-sm text-gray-500">{driver.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={executeDelete}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : null;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

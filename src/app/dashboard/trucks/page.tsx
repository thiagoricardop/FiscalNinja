'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionBanner } from '@/components/dashboard/SubscriptionGate';
import { TIER_TRUCK_LIMIT } from '@/lib/payments/limits';
import {
  Plus,
  Truck as TruckIcon,
  Loader2,
  Trash2,
  Pencil,
  X,
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

type TruckRow = {
  id: string;
  truck_number: string;
  license_plate: string;
  vin: string | null;
  active: boolean;
  created_at: string;
};

export default function TrucksPage() {
  const { user } = useUser();
  const { tier, hasSubscription, loading: subLoading } = useSubscription();
  const [trucks, setTrucks] = useState<TruckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<TruckRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    truck_number: '',
    license_plate: '',
    vin: '',
    active: true,
  });

  const fetchTrucks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('trucks')
      .select('*')
      .eq('user_id', user.id)
      .order('truck_number');
    setTrucks((data as TruckRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTrucks();
  }, [fetchTrucks]);

  const resetForm = () => {
    setForm({ truck_number: '', license_plate: '', vin: '', active: true });
    setEditing(null);
    setError('');
  };

  const openEdit = (truck: TruckRow) => {
    setEditing(truck);
    setForm({
      truck_number: truck.truck_number,
      license_plate: truck.license_plate,
      vin: truck.vin ?? '',
      active: truck.active,
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
      truck_number: form.truck_number.trim(),
      license_plate: form.license_plate.trim(),
      vin: form.vin.trim() || null,
      active: form.active,
    };

    let err;
    if (editing) {
      const { error: e } = await supabase
        .from('trucks')
        .update(payload)
        .eq('id', editing.id);
      err = e;
    } else {
      // Enforce truck limit per plan
      const truckLimit = tier ? TIER_TRUCK_LIMIT[tier] : 0;
      if (truckLimit > 0 && trucks.length >= truckLimit) {
        setError(`Your ${tier} plan allows up to ${truckLimit} trucks. Upgrade to add more.`);
        setSaving(false);
        return;
      }
      const { error: e } = await supabase.from('trucks').insert(payload);
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
    fetchTrucks();
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const executeDelete = async () => {
    if (!confirmDeleteId) return;
    await supabase.from('trucks').delete().eq('id', confirmDeleteId);
    setConfirmDeleteId(null);
    fetchTrucks();
  };

  const toggleActive = async (truck: TruckRow) => {
    await supabase
      .from('trucks')
      .update({ active: !truck.active })
      .eq('id', truck.id);
    fetchTrucks();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const activeTrucks = trucks.filter((t) => t.active).length;
  const truckLimit = tier ? TIER_TRUCK_LIMIT[tier] : 0;
  const isAtTruckLimit = truckLimit > 0 && trucks.length >= truckLimit;

  return (
    <div className="space-y-6">
      {/* Subscription banner when no plan */}
      {!subLoading && !hasSubscription && <SubscriptionBanner />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trucks</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeTrucks} active · {trucks.length - activeTrucks} inactive
            {truckLimit > 0 && (
              <span className={trucks.length >= truckLimit ? ' text-red-500 font-medium' : ''}>
                {' '}· {trucks.length}/{truckLimit} used
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
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2" disabled={!hasSubscription || (isAtTruckLimit && !editing)}>
              <Plus className="h-4 w-4" />
              {!hasSubscription ? 'Subscribe to Add' : isAtTruckLimit ? 'Truck Limit Reached' : 'Add Truck'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Edit Truck' : 'Add New Truck'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label>Truck Number *</Label>
                <Input
                  value={form.truck_number}
                  onChange={(e) =>
                    setForm({ ...form, truck_number: e.target.value })
                  }
                  placeholder="T-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>License Plate *</Label>
                <Input
                  value={form.license_plate}
                  onChange={(e) =>
                    setForm({ ...form, license_plate: e.target.value })
                  }
                  placeholder="ABC-1234"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>VIN (optional)</Label>
                <Input
                  value={form.vin}
                  onChange={(e) => setForm({ ...form, vin: e.target.value })}
                  placeholder="1HGBH41JXMN109186"
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
                    'Update Truck'
                  ) : (
                    'Add Truck'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {trucks.length === 0 ? (
        <Card className="border-gray-100">
          <CardContent className="py-16 text-center">
            <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">
              No trucks yet
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Add your first truck to start tracking expenses.
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
                    <TableHead className="font-semibold">Truck #</TableHead>
                    <TableHead className="font-semibold">License Plate</TableHead>
                    <TableHead className="font-semibold">VIN</TableHead>
                    <TableHead className="font-semibold text-center">
                      Status
                    </TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trucks.map((truck) => (
                    <TableRow key={truck.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-900">
                        {truck.truck_number}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {truck.license_plate}
                      </TableCell>
                      <TableCell className="text-gray-500 text-xs font-mono">
                        {truck.vin || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => toggleActive(truck)}>
                          {truck.active ? (
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
                            onClick={() => openEdit(truck)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600"
                            onClick={() => handleDelete(truck.id)}
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
            {trucks.map((truck) => (
              <Card key={truck.id} className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <TruckIcon className="h-5 w-5 text-blue-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {truck.truck_number}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {truck.license_plate}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => toggleActive(truck)}>
                      {truck.active ? (
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
                  {truck.vin && (
                    <p className="text-xs text-gray-400 font-mono mt-2 truncate">
                      VIN: {truck.vin}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => openEdit(truck)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleDelete(truck.id)}
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
            <DialogTitle>Delete Truck</DialogTitle>
          </DialogHeader>
          {(() => {
            const truck = trucks.find((t) => t.id === confirmDeleteId);
            return truck ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete this truck? This action cannot be undone.
                </p>
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <TruckIcon className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{truck.truck_number}</p>
                    <p className="text-sm text-gray-500">{truck.license_plate}</p>
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

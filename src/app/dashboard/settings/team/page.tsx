'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { usePermissions } from '@/hooks/usePermissions';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionBanner } from '@/components/dashboard/SubscriptionGate';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Mail,
  Shield,
  Truck,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  MoreHorizontal,
  Trash2,
  Pencil,
  Clock,
  UserCheck,
  Send,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Upload,
  FileSpreadsheet,
  BarChart3,
  Receipt,
  Settings,
  CreditCard,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

interface TeamMember {
  id: string;
  owner_id: string;
  user_id: string | null;
  role: 'owner' | 'manager' | 'driver';
  invited_email: string;
  invite_token: string | null;
  invited_at: string;
  accepted_at: string | null;
  active: boolean;
  permissions: Record<string, boolean>;
  user_name: string | null;
  user_email: string | null;
}

// ═══════════════════════════════════════════════════════
// PERMISSION TABLE DATA
// ═══════════════════════════════════════════════════════

const PERM_TABLE = [
  { label: 'Upload receipts', icon: Upload, owner: true, manager: true, driver: true },
  { label: 'View all receipts', icon: Eye, owner: true, manager: true, driver: false },
  { label: 'View own receipts', icon: Receipt, owner: true, manager: true, driver: true },
  { label: 'Edit receipts', icon: Pencil, owner: true, manager: true, driver: false },
  { label: 'Delete receipts', icon: Trash2, owner: true, manager: false, driver: false },
  { label: 'View reports', icon: BarChart3, owner: true, manager: true, driver: true },
  { label: 'Export reports', icon: FileSpreadsheet, owner: true, manager: true, driver: false },
  { label: 'Manage team', icon: Users, owner: true, manager: false, driver: false },
  { label: 'Manage drivers', icon: Truck, owner: true, manager: true, driver: false },
  { label: 'Edit settings', icon: Settings, owner: true, manager: false, driver: false },
  { label: 'Manage billing', icon: CreditCard, owner: true, manager: false, driver: false },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function TeamPage() {
  const { user } = useUser();
  const { isOwner, loading: permLoading } = usePermissions();
  const { hasSubscription, loading: subLoading } = useSubscription();
  const router = useRouter();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Invite form state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'driver'>('driver');
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Edit form
  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState<'manager' | 'driver'>('driver');
  const [saving, setSaving] = useState(false);

  // ─── Fetch members ──────────────────────────────────

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team');
      if (!res.ok) throw new Error('Failed to fetch team');
      const data = await res.json();
      setMembers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && !permLoading) {
      if (!isOwner) {
        router.push('/dashboard');
        return;
      }
      fetchMembers();
    }
  }, [user, permLoading, isOwner, router, fetchMembers]);

  // ─── Invite ─────────────────────────────────────────

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError('');
    setInviteUrl('');

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInviteUrl(data.invite_url);
      if (data.email_sent) {
        setError('');
      } else {
        // Email not sent — show link for manual sharing
        setError('Email could not be sent. Share the link below manually.');
      }
      fetchMembers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetInvite = () => {
    setInviteOpen(false);
    setInviteEmail('');
    setInviteRole('driver');
    setInviteUrl('');
    setError('');
  };

  // ─── Edit member ────────────────────────────────────

  const openEdit = (member: TeamMember) => {
    setEditMember(member);
    setEditRole(member.role === 'owner' ? 'manager' : member.role);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editMember) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/team/${editMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setEditOpen(false);
      fetchMembers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Remove member ─────────────────────────────────

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this team member? They will lose access.')) return;
    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchMembers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ─── Resend invite ─────────────────────────────────

  const handleResend = async (member: TeamMember) => {
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: member.invited_email, role: member.role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteUrl(data.invite_url);
      setInviteOpen(true);
      fetchMembers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ─── Derived state ─────────────────────────────────

  const activeMembers = members.filter((m) => m.active && m.accepted_at);
  const pendingInvites = members.filter((m) => m.active && !m.accepted_at);

  // ─── Loading / Guard ────────────────────────────────

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isOwner) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Subscription banner when no plan */}
      {!subLoading && !hasSubscription && <SubscriptionBanner />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Invite managers and drivers to your account
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={(o) => (o ? setInviteOpen(true) : resetInvite())}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={!hasSubscription}>
              <Plus className="h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invite link. They&apos;ll create an account and join your team.
              </DialogDescription>
            </DialogHeader>

            {inviteUrl ? (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <p className="text-sm text-green-800">Invite created! Share this link:</p>
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteUrl}
                    className="text-xs font-mono"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetInvite}>
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="driver@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as 'manager' | 'driver')}
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-blue-600" />
                          <div>
                            <span className="font-medium">Manager</span>
                            <span className="text-xs text-gray-500 ml-2">
                              View all, edit, export
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="driver">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-600" />
                          <div>
                            <span className="font-medium">Driver</span>
                            <span className="text-xs text-gray-500 ml-2">
                              Upload &amp; view own only
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {error && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {error}
                  </p>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetInvite}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviting} className="gap-2">
                    {inviting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send Invite
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Error banner */}
      {error && !inviteOpen && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button
            onClick={() => setError('')}
            className="ml-auto p-0.5 hover:bg-red-100 rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── Active Members ────────────────────────── */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50/50 flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">
            Active Members
          </h2>
          <span className="text-xs text-gray-500 ml-1">
            ({activeMembers.length})
          </span>
        </div>
        {activeMembers.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">
            No team members yet. Invite someone to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeMembers.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.user_name || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {m.user_email || m.invited_email}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={m.role} />
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {new Date(m.accepted_at!).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(m)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleRemove(m.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ─── Pending Invites ───────────────────────── */}
      {pendingInvites.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b bg-amber-50/50 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              Pending Invites
            </h2>
            <span className="text-xs text-gray-500 ml-1">
              ({pendingInvites.length})
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvites.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      {m.invited_email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={m.role} />
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {new Date(m.invited_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleResend(m)}>
                          <Send className="h-3.5 w-3.5 mr-2" />
                          Resend Invite
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleRemove(m.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Cancel Invite
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ─── Role Permissions Guide ────────────────── */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50/50 flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">
            Role Permissions Guide
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Permission</TableHead>
                <TableHead className="text-center w-24">
                  <div className="flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    Owner
                  </div>
                </TableHead>
                <TableHead className="text-center w-24">
                  <div className="flex items-center justify-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-indigo-500" />
                    Manager
                  </div>
                </TableHead>
                <TableHead className="text-center w-24">
                  <div className="flex items-center justify-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-gray-500" />
                    Driver
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERM_TABLE.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <row.icon className="h-3.5 w-3.5 text-gray-400" />
                      {row.label}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <PermCheck ok={row.owner} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PermCheck ok={row.manager} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PermCheck ok={row.driver} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── Edit Role Dialog ──────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update role for {editMember?.user_name || editMember?.invited_email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select
              value={editRole}
              onValueChange={(v) => setEditRole(v as 'manager' | 'driver')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    owner: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Owner' },
    manager: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Manager' },
    driver: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Driver' },
  };
  const style = map[role] ?? map.driver;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}

function PermCheck({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-100 text-green-700">
      <Check className="h-3 w-3" />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-100 text-gray-400">
      <X className="h-3 w-3" />
    </span>
  );
}

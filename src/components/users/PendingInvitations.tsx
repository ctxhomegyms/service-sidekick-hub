import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Mail, Clock, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'technician';
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

interface PendingInvitationsProps {
  refreshTrigger?: number;
}

export function PendingInvitations({ refreshTrigger }: PendingInvitationsProps) {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, [refreshTrigger]);

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitation: Invitation) => {
    if (!user) return;
    setResendingId(invitation.id);

    try {
      // Delete old invitation and create new one
      await supabase.from('invitations').delete().eq('id', invitation.id);

      const { error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: invitation.email,
          role: invitation.role,
          invitedBy: user.id,
          appUrl: window.location.origin,
        },
      });

      if (error) throw error;
      toast.success(`Invitation resent to ${invitation.email}`);
      fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('invitations').delete().eq('id', id);
      if (error) throw error;
      toast.success('Invitation cancelled');
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel invitation');
    } finally {
      setDeletingId(null);
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  if (loading) {
    return <div className="py-4 text-center text-muted-foreground">Loading invitations...</div>;
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Mail className="w-4 h-4" />
        Pending Invitations ({invitations.length})
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Sent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => {
            const expired = isExpired(invitation.expires_at);
            return (
              <TableRow key={invitation.id} className={expired ? 'opacity-60' : ''}>
                <TableCell className="font-medium">{invitation.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {invitation.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {expired ? (
                    <Badge variant="outline" className="text-destructive border-destructive">
                      Expired
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Expires {format(new Date(invitation.expires_at), 'MMM d')}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResend(invitation)}
                      disabled={resendingId === invitation.id}
                    >
                      {resendingId === invitation.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(invitation.id)}
                      disabled={deletingId === invitation.id}
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingId === invitation.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Shield, UserCog, Wrench } from 'lucide-react';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';
import { PendingInvitations } from '@/components/users/PendingInvitations';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'manager' | 'technician';
}

const roleConfig = {
  admin: { label: 'Super Admin', icon: Shield, color: 'bg-red-100 text-red-800' },
  manager: { label: 'Manager', icon: UserCog, color: 'bg-blue-100 text-blue-800' },
  technician: { label: 'Technician', icon: Wrench, color: 'bg-green-100 text-green-800' },
};

export default function Users() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchUsers();
  }, [isAdmin, navigate]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: (userRole?.role as 'admin' | 'manager' | 'technician') || 'technician',
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'manager' | 'technician') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      toast.success('Role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">Invite and manage user accounts</p>
          </div>
          <InviteUserDialog onInviteSent={() => setRefreshTrigger(r => r + 1)} />
        </div>

        {/* Pending Invitations */}
        <Card>
          <CardContent className="pt-6">
            <PendingInvitations refreshTrigger={refreshTrigger} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              View and manage user roles. Super Admins can change any user's role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Change Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const config = roleConfig[user.role];
                      const RoleIcon = config.icon;
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{user.full_name || 'Unnamed User'}</p>
                                <p className="text-xs text-muted-foreground sm:hidden truncate">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={config.color}>
                              <RoleIcon className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">{config.label}</span>
                              <span className="sm:hidden capitalize">{user.role}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(value: 'admin' | 'manager' | 'technician') => 
                                handleRoleChange(user.id, value)
                              }
                            >
                              <SelectTrigger className="w-32 sm:w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Super Admin
                                  </div>
                                </SelectItem>
                                <SelectItem value="manager">
                                  <div className="flex items-center gap-2">
                                    <UserCog className="w-4 h-4" />
                                    Manager
                                  </div>
                                </SelectItem>
                                <SelectItem value="technician">
                                  <div className="flex items-center gap-2">
                                    <Wrench className="w-4 h-4" />
                                    Technician
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
            <CardDescription>Overview of what each role can do</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold">Super Admin</h3>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Invite and manage users</li>
                  <li>• Full access to all features</li>
                  <li>• Create, edit, delete jobs</li>
                  <li>• Schedule and dispatch</li>
                  <li>• Access all settings</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <UserCog className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">Manager</h3>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Create, edit, delete jobs</li>
                  <li>• Schedule and dispatch</li>
                  <li>• View all jobs and customers</li>
                  <li>• Access dashboard and reports</li>
                  <li>• Cannot manage users</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold">Technician</h3>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• View assigned jobs</li>
                  <li>• Complete jobs</li>
                  <li>• Add notes and photos</li>
                  <li>• View own schedule</li>
                  <li>• Update job status</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

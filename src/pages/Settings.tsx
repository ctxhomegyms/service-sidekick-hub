import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { JobTypesManager } from '@/components/settings/JobTypesManager';
import { CustomFieldsManager } from '@/components/settings/CustomFieldsManager';

export default function Settings() {
  const { profile, roles } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-lg">{profile?.full_name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-lg">{profile?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-lg">{profile?.phone || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Roles</p>
                <div className="flex gap-2 mt-1">
                  {roles.map(role => (
                    <Badge key={role} variant="secondary" className="capitalize">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <JobTypesManager />

        <CustomFieldsManager />

        <Card>
          <CardHeader>
            <CardTitle>About FieldFlow</CardTitle>
            <CardDescription>Field Service Management System</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              FieldFlow helps you manage your field service operations efficiently. 
              Track jobs, schedule technicians, and keep your customers happy.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Version 1.0.0
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
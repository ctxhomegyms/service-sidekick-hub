import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { JobTypesManager } from '@/components/settings/JobTypesManager';
import { CustomFieldsManager } from '@/components/settings/CustomFieldsManager';
import { CompanySettingsManager } from '@/components/settings/CompanySettingsManager';
import { BusinessHoursManager } from '@/components/settings/BusinessHoursManager';
import { VoicemailSettingsManager } from '@/components/settings/VoicemailSettingsManager';
import { AutoReplyManager } from '@/components/settings/AutoReplyManager';
import { PhoneMenuManager } from '@/components/settings/PhoneMenuManager';
import { NotificationTemplatesManager } from '@/components/settings/NotificationTemplatesManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Briefcase, Phone, User, Bell } from 'lucide-react';

export default function Settings() {
  const { profile, roles } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and business preferences</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="general" className="gap-2">
              <Building2 className="h-4 w-4 hidden sm:inline" />
              General
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4 hidden sm:inline" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="phone" className="gap-2">
              <Phone className="h-4 w-4 hidden sm:inline" />
              Phone
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4 hidden sm:inline" />
              Notify
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4 hidden sm:inline" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 max-w-3xl">
            <CompanySettingsManager />
            <BusinessHoursManager />
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6 max-w-3xl">
            <JobTypesManager />
            <CustomFieldsManager />
          </TabsContent>

          <TabsContent value="phone" className="space-y-6 max-w-3xl">
            <PhoneMenuManager />
            <VoicemailSettingsManager />
            <AutoReplyManager />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 max-w-3xl">
            <NotificationTemplatesManager />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6 max-w-3xl">
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

            <Card>
              <CardHeader>
                <CardTitle>About FixAGym Field</CardTitle>
                <CardDescription>Field Service Management System</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  FixAGym Field helps you manage your field service operations efficiently. 
                  Track jobs, schedule technicians, and keep your customers happy.
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Version 1.0.0
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

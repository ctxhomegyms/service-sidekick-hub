import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  UserCircle, 
  Calendar, 
  Settings,
  LogOut,
  Wrench,
  LayoutGrid
} from 'lucide-react';
import { NavLink as RouterNavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const adminItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Dispatch', url: '/dispatch', icon: LayoutGrid },
  { title: 'Jobs', url: '/jobs', icon: Briefcase },
  { title: 'Schedule', url: '/schedule', icon: Calendar },
  { title: 'Customers', url: '/customers', icon: Users },
  { title: 'Technicians', url: '/technicians', icon: Wrench },
];

const technicianItems = [
  { title: 'My Jobs', url: '/my-jobs', icon: Briefcase },
  { title: 'Schedule', url: '/schedule', icon: Calendar },
];

export function AppSidebar() {
  const { profile, isAdmin, isDispatcher, signOut } = useAuth();
  
  const items = isAdmin || isDispatcher ? adminItems : technicianItems;

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Wrench className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">FieldFlow</h1>
            <p className="text-xs text-sidebar-foreground/60">Service Management</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <RouterNavLink 
                      to={item.url}
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive && "bg-sidebar-accent text-sidebar-primary font-medium"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </RouterNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || isDispatcher) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              Settings
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <RouterNavLink 
                      to="/settings"
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive && "bg-sidebar-accent text-sidebar-primary font-medium"
                      )}
                    >
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
                    </RouterNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {profile?.email}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={signOut}
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

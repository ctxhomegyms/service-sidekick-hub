import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Map, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inbox', icon: MessageSquare, label: 'Inbox' },
  { to: '/map', icon: Map, label: 'Live Map' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/customers', icon: Users, label: 'Customers' },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
          
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-colors",
                "active:bg-accent/50",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-1", isActive && "stroke-[2.5px]")} />
              <span className={cn(
                "text-[10px] font-medium leading-tight text-center",
                isActive && "font-semibold"
              )}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

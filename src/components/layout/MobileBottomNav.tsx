import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Map, Calendar, Briefcase, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';

const baseNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inbox', icon: MessageSquare, label: 'Inbox' },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { openMobile, setOpenMobile } = useSidebar();
  const { isManager, isAdmin } = useAuth();

  // Show "More" button to access sidebar for additional items
  const showMore = isManager || isAdmin;

  const handleNavClick = (to: string) => {
    const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
    // If clicking the active tab and sidebar is open, close it
    if (isActive && openMobile) {
      setOpenMobile(false);
    }
  };

  const handleMoreClick = () => {
    setOpenMobile(true);
  };

  // Take first 4 items + More button, or all 5 if no More needed
  const visibleNavItems = showMore ? baseNavItems.slice(0, 4) : baseNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {visibleNavItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
          
          return (
            <NavLink
              key={to}
              to={to}
              onClick={() => handleNavClick(to)}
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
        
        {showMore && (
          <button
            onClick={handleMoreClick}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-colors",
              "active:bg-accent/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <MoreHorizontal className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium leading-tight text-center">
              More
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}

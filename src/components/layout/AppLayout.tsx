import { ReactNode, useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { GlobalSearch } from '@/components/GlobalSearch';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <AppSidebar />
        <main className="flex-1 min-w-0 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-4 gap-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </header>
          <div className={cn(
            "flex-1 min-w-0 p-4 md:p-6 bg-background overflow-auto",
            isMobile && "pb-20"
          )}>
            {children}
          </div>
        </main>
      </div>
      {isMobile && <MobileBottomNav />}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  StickyNote, 
  Users, 
  Package, 
  MessageSquare,
  FileText,
  Loader2,
  Search,
  AlertCircle
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const resultTypeConfig: Record<string, { 
  label: string; 
  icon: typeof Briefcase; 
  route: (id: string) => string;
}> = {
  job: { 
    label: 'Jobs', 
    icon: Briefcase, 
    route: (id) => `/jobs/${id}` 
  },
  job_note: { 
    label: 'Job Notes', 
    icon: StickyNote, 
    route: (id) => `/jobs/${id}` 
  },
  customer: { 
    label: 'Customers', 
    icon: Users, 
    route: (id) => `/customers/${id}` 
  },
  pickup: { 
    label: 'Pickup Details', 
    icon: Package, 
    route: (id) => `/jobs/${id}` 
  },
  message: { 
    label: 'Messages', 
    icon: MessageSquare, 
    route: (id) => `/inbox?conversation=${id}` 
  },
  conversation_note: { 
    label: 'Conversation Notes', 
    icon: FileText, 
    route: (id) => `/inbox?conversation=${id}` 
  },
};

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { 
    query, 
    setQuery, 
    groupedResults, 
    isLoading, 
    error,
    clearSearch 
  } = useGlobalSearch();

  // Clear search when dialog closes
  useEffect(() => {
    if (!open) {
      clearSearch();
    }
  }, [open, clearSearch]);

  const handleSelect = useCallback((result: SearchResult) => {
    const config = resultTypeConfig[result.result_type];
    if (config) {
      navigate(config.route(result.result_id));
      onOpenChange(false);
    }
  }, [navigate, onOpenChange]);

  const resultTypes = Object.keys(groupedResults);
  const hasResults = resultTypes.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search jobs, notes, customers, messages..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Searching...</span>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center py-6 text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {!isLoading && !error && query.length >= 2 && !hasResults && (
          <CommandEmpty>
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <Search className="h-10 w-10 mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
              <p className="text-xs mt-1">Try different keywords</p>
            </div>
          </CommandEmpty>
        )}
        
        {!isLoading && !error && query.length < 2 && (
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <Search className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">Type at least 2 characters to search</p>
            <p className="text-xs mt-1 opacity-75">
              Search job notes, descriptions, customer info, and more
            </p>
          </div>
        )}
        
        {!isLoading && !error && hasResults && (
          <>
            {resultTypes.map((type, index) => {
              const config = resultTypeConfig[type];
              if (!config) return null;
              
              const Icon = config.icon;
              const items = groupedResults[type];
              
              return (
                <div key={type}>
                  {index > 0 && <CommandSeparator />}
                  <CommandGroup heading={config.label}>
                    {items.map((result, i) => (
                      <CommandItem
                        key={`${result.result_id}-${i}`}
                        value={`${result.title} ${result.match_context}`}
                        onSelect={() => handleSelect(result)}
                        className="flex items-start gap-3 py-3 cursor-pointer"
                      >
                        <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium truncate">
                              {result.title}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </span>
                          </div>
                          {result.match_context && (
                            <p 
                              className="text-xs text-muted-foreground mt-0.5 line-clamp-2"
                              dangerouslySetInnerHTML={{ 
                                __html: result.match_context 
                              }}
                            />
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              );
            })}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export interface SearchResult {
  result_type: 'job' | 'job_note' | 'customer' | 'pickup' | 'message';
  result_id: string;
  title: string;
  subtitle: string;
  match_context: string;
  relevance: number;
}

interface UseGlobalSearchOptions {
  debounceMs?: number;
  limit?: number;
}

export function useGlobalSearch(options: UseGlobalSearchOptions = {}) {
  const { debounceMs = 300, limit = 20 } = options;
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debouncedQuery = useDebounce(query, debounceMs);
  
  const search = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: searchError } = await supabase
        .rpc('global_search', { 
          search_term: searchTerm.trim(),
          result_limit: limit 
        });
      
      if (searchError) {
        throw searchError;
      }
      
      setResults((data as SearchResult[]) || []);
    } catch (err) {
      console.error('Global search error:', err);
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);
  
  // Trigger search when debounced query changes
  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);
  
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);
  
  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    const type = result.result_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);
  
  return {
    query,
    setQuery,
    results,
    groupedResults,
    isLoading,
    error,
    clearSearch,
  };
}

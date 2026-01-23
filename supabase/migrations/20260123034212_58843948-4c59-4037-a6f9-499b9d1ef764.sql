-- Drop and recreate global search function without messages table
CREATE OR REPLACE FUNCTION public.global_search(search_term text, result_limit int DEFAULT 20)
RETURNS TABLE (
  result_type text,
  result_id uuid,
  title text,
  subtitle text,
  match_context text,
  relevance float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return empty if search term is too short
  IF length(trim(search_term)) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  -- Search Jobs (title, description, instructions, completion_notes, job_number)
  SELECT 
    'job'::text,
    j.id,
    j.title,
    COALESCE(c.name, 'No customer'),
    ts_headline('english', COALESCE(j.description, '') || ' ' || COALESCE(j.instructions, ''), 
                plainto_tsquery('english', search_term), 'MaxWords=15, MinWords=5')::text,
    ts_rank(to_tsvector('english', 
      COALESCE(j.title, '') || ' ' || COALESCE(j.description, '') || ' ' || 
      COALESCE(j.instructions, '') || ' ' || COALESCE(j.completion_notes, '') || ' ' ||
      COALESCE(j.job_number, '')), 
      plainto_tsquery('english', search_term))::float
  FROM jobs j
  LEFT JOIN customers c ON j.customer_id = c.id
  WHERE to_tsvector('english', 
    COALESCE(j.title, '') || ' ' || COALESCE(j.description, '') || ' ' || 
    COALESCE(j.instructions, '') || ' ' || COALESCE(j.completion_notes, '') || ' ' ||
    COALESCE(j.job_number, '')) @@ plainto_tsquery('english', search_term)
  
  UNION ALL
  
  -- Search Job Notes (note_text)
  SELECT 
    'job_note'::text,
    jn.job_id,
    j.title,
    'Note by ' || COALESCE(p.full_name, 'Unknown'),
    ts_headline('english', jn.note_text, plainto_tsquery('english', search_term), 'MaxWords=20, MinWords=5')::text,
    ts_rank(to_tsvector('english', jn.note_text), plainto_tsquery('english', search_term))::float
  FROM job_notes jn
  JOIN jobs j ON jn.job_id = j.id
  LEFT JOIN profiles p ON jn.author_id = p.id
  WHERE to_tsvector('english', jn.note_text) @@ plainto_tsquery('english', search_term)
  
  UNION ALL
  
  -- Search Customers (name, email, phone, address, notes)
  SELECT 
    'customer'::text,
    c.id,
    c.name,
    COALESCE(c.city, '') || COALESCE(', ' || c.state, ''),
    ts_headline('english', COALESCE(c.notes, '') || ' ' || COALESCE(c.address, ''), 
                plainto_tsquery('english', search_term), 'MaxWords=15, MinWords=5')::text,
    ts_rank(to_tsvector('english', 
      COALESCE(c.name, '') || ' ' || COALESCE(c.email, '') || ' ' || 
      COALESCE(c.phone, '') || ' ' || COALESCE(c.address, '') || ' ' || COALESCE(c.notes, '')), 
      plainto_tsquery('english', search_term))::float
  FROM customers c
  WHERE to_tsvector('english', 
    COALESCE(c.name, '') || ' ' || COALESCE(c.email, '') || ' ' || 
    COALESCE(c.phone, '') || ' ' || COALESCE(c.address, '') || ' ' || COALESCE(c.notes, '')) 
    @@ plainto_tsquery('english', search_term)
  
  UNION ALL
  
  -- Search Pickup Requests (items_description, item_location, stairs_description)
  SELECT 
    'pickup'::text,
    pr.job_id,
    j.title,
    'Pickup Details',
    ts_headline('english', COALESCE(pr.items_description, '') || ' ' || COALESCE(pr.item_location, ''), 
                plainto_tsquery('english', search_term), 'MaxWords=15, MinWords=5')::text,
    ts_rank(to_tsvector('english', 
      COALESCE(pr.items_description, '') || ' ' || COALESCE(pr.item_location, '') || ' ' || 
      COALESCE(pr.stairs_description, '')), 
      plainto_tsquery('english', search_term))::float
  FROM pickup_requests pr
  JOIN jobs j ON pr.job_id = j.id
  WHERE to_tsvector('english', 
    COALESCE(pr.items_description, '') || ' ' || COALESCE(pr.item_location, '') || ' ' || 
    COALESCE(pr.stairs_description, '')) @@ plainto_tsquery('english', search_term)
  
  ORDER BY relevance DESC
  LIMIT result_limit;
END;
$$;
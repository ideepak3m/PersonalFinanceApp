| function_definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CREATE OR REPLACE FUNCTION personal_finance.purge_old_import_raw_data(days_old integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
  deleted_count integer;
begin
  delete from personal_finance.import_raw_data
  where staging_id in (
    select id from personal_finance.import_staging
    where status = 'imported' 
    and imported_at < now() - (days_old || ' days')::interval
  );
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$function$
                                                                                                                                                                                                                                                                                                                                                                                   |
| CREATE OR REPLACE FUNCTION personal_finance.purge_imported_staging(days_old integer DEFAULT 90)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
  deleted_count integer;
begin
  delete from personal_finance.import_staging
  where status = 'imported' 
  and imported_at < now() - (days_old || ' days')::interval;
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| CREATE OR REPLACE FUNCTION personal_finance.search_merchant_by_name_or_alias(search_term text)
 RETURNS TABLE(id uuid, normalized_name text, category_id uuid, default_split_json jsonb, aliases text[], inserted_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.normalized_name,
        m.category_id,
        m.default_split_json,
        m.aliases,
        m.inserted_at
    FROM personal_finance.merchant m
    WHERE 
        -- Case-insensitive exact match on normalized_name
        LOWER(m.normalized_name) = LOWER(search_term)
        OR
        -- Case-insensitive match in aliases array
        EXISTS (
            SELECT 1 
            FROM unnest(m.aliases) AS alias
            WHERE LOWER(alias) = LOWER(search_term)
        )
    LIMIT 1;
END;
$function$
 |
| CREATE OR REPLACE FUNCTION personal_finance.update_user_profile_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| CREATE OR REPLACE FUNCTION personal_finance.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
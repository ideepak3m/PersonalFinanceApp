-- Quick Script to View and Export AI Extractions from Supabase
-- Run this in Supabase SQL Editor

-- 1. View all your AI extractions
SELECT 
    id,
    filename,
    extraction_timestamp,
    model_used,
    total_tokens,
    created_at
FROM personal_finance.ai_extraction_logs
WHERE user_id = auth.uid()
ORDER BY extraction_timestamp DESC;

-- 2. View full extraction data for specific record
SELECT 
    filename,
    extraction_timestamp,
    extraction_data
FROM personal_finance.ai_extraction_logs
WHERE id = 'REPLACE_WITH_EXTRACTION_ID';

-- 3. Export all extractions as JSON (copy result)
SELECT 
    jsonb_agg(
        jsonb_build_object(
            'timestamp', extraction_timestamp,
            'filename', filename,
            'model', model_used,
            'tokensUsed', jsonb_build_object(
                'prompt', prompt_tokens,
                'completion', completion_tokens,
                'total', total_tokens
            ),
            'response', extraction_data->'response',
            'accountInfo', extraction_data->'accountInfo',
            'tables', extraction_data->'tables'
        )
    ) as all_extractions
FROM personal_finance.ai_extraction_logs
WHERE user_id = auth.uid()
ORDER BY extraction_timestamp DESC;

-- 4. Delete old extractions (older than 30 days)
DELETE FROM personal_finance.ai_extraction_logs
WHERE user_id = auth.uid()
AND extraction_timestamp < NOW() - INTERVAL '30 days';

-- 5. Count extractions by model
SELECT 
    model_used,
    COUNT(*) as extraction_count,
    SUM(total_tokens) as total_tokens_used
FROM personal_finance.ai_extraction_logs
WHERE user_id = auth.uid()
GROUP BY model_used;

-- 6. Get token usage statistics
SELECT 
    DATE(extraction_timestamp) as date,
    COUNT(*) as extractions,
    SUM(total_tokens) as tokens_used,
    AVG(total_tokens) as avg_tokens_per_extraction
FROM personal_finance.ai_extraction_logs
WHERE user_id = auth.uid()
GROUP BY DATE(extraction_timestamp)
ORDER BY date DESC;

-- 7. Most recent extraction with full data
SELECT *
FROM personal_finance.ai_extraction_logs
WHERE user_id = auth.uid()
ORDER BY extraction_timestamp DESC
LIMIT 1;

-- Table: description_rules
CREATE TABLE description_rules (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    description_pattern TEXT NOT NULL,
    chart_of_account TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX idx_description_rules_user_id ON description_rules(user_id);
CREATE INDEX idx_description_rules_pattern ON description_rules(description_pattern);

-- Enable RLS
ALTER TABLE description_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own description rules" ON description_rules
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own description rules" ON description_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own description rules" ON description_rules
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own description rules" ON description_rules
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_description_rules_updated_at BEFORE UPDATE ON description_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

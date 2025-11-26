# Personal Finance App - Process Flow Documentation

## 1. CSV Import Flow

### Overview
The import process takes CSV files and transforms them into uncategorized transactions ready for user review.

### Architecture
```
CSV Upload → import_staging (file metadata)
           ↓
     import_raw_data (raw CSV data)
           ↓
  Column Mapping Applied
           ↓
transactions table (status='uncategorized') ← This is the staging area
           ↓
     Categorization Process
           ↓
transactions table (status='categorized' or 'split')
           ↓
transaction_splits table (for split transactions)
```

### Detailed Steps

#### Step 1: File Upload (`TransactionUpload.jsx`)
**User Action**: Upload CSV file
**Process**:
1. File is validated (CSV format, size limits)
2. CSV is parsed using Papa Parse library
3. Column headers are extracted

**Database Operations**:
- INSERT into `import_staging` table:
  ```
  - id (uuid, auto-generated)
  - user_id (from auth context)
  - account_id (selected account)
  - file_name
  - file_type ('csv')
  - column_names (array of CSV headers)
  - row_count
  - status ('pending_mapping')
  - uploaded_at (timestamp)
  ```

- INSERT into `import_raw_data` table:
  ```
  - staging_id (references import_staging.id)
  - raw_data (JSONB array of CSV rows)
  ```

**Navigation**: User is redirected to ImportMapper page

---

#### Step 2: Column Mapping (`ImportMapper.jsx`)

**User Action**: Map CSV columns to transaction fields

**UI Components**:
- **Left Sidebar**: List of pending imports for the account
- **Main Panel**: 
  - Dropdown to load saved mappings
  - Column mapping grid (CSV column → Transaction field)
  - Preview table showing first 5 rows
  - Apply Mapping button

**Required Fields**:
- Date * (required)
- Description * (required)
- Amount * (required)
- Transaction Type (optional)
- Memo (optional)
- Currency (optional)

**Process**:
1. User selects a pending import from sidebar
2. Raw CSV data is loaded from `import_raw_data` table
3. User can optionally load a saved mapping from `column_mappings` table
4. User maps each CSV column to corresponding transaction field
5. Preview updates to show mapped data
6. User clicks "Apply Mapping"

**Database Operations on Apply**:

1. **Validate**: Check all required fields are mapped
2. **Transform Data**:
   - Parse amounts (remove $, commas)
   - Parse dates (handle multiple formats, convert to YYYY-MM-DD)
   - Set defaults for optional fields
   - Assign Suspense account as default COA

3. **Bulk INSERT** into `transactions` table:
   ```sql
   {
     account_id,
     date,
     raw_merchant_name (from description),
     description,
     amount,
     currency (default: 'CAD'),
     type ('credit' or 'debit'),
     memo,
     chart_of_account_id (Suspense account ID),
     status: 'uncategorized',
     is_split: false
   }
   ```

4. **UPDATE** `import_staging`:
   ```sql
   SET status = 'imported',
       imported_at = NOW()
   WHERE id = staging_id
   ```

5. **Optional - Save Mapping**: If user confirms
   - Prompt for mapping name
   - INSERT into `column_mappings`:
     ```sql
     {
       account_id,
       file_type: 'csv',
       name (user-provided),
       mapping_config (JSONB with column mappings)
     }
     ```

**Navigation**: User is redirected to Accounts Dashboard

---

## 2. Transaction Categorization Flow

### Overview
Users review uncategorized transactions, assign chart of accounts, or create splits. Bulk update moves transactions from uncategorized to categorized status.

### Entry Point
From Accounts Dashboard, user clicks on "Uncategorized Receipts" count for an account.

---

#### Step 1: Load Uncategorized Transactions (`UncategorizedReceipts.jsx`)

**Data Loading** (Parallel Queries):
1. Account details
2. Chart of Accounts (sorted alphabetically)
3. Categories
4. Merchants (normalized, sorted alphabetically)
5. Merchant Split Rules

**Main Query** - Load Transactions:
```sql
SELECT t.*, 
       m.id, m.normalized_name, m.aliases
FROM transactions t
LEFT JOIN merchant m ON t.normalized_merchant_id = m.id
WHERE t.account_id = :accountId
  AND t.status = 'uncategorized'
ORDER BY t.date DESC
```

**Enrichment Process** (for each transaction):
1. **Find Suggested Merchant**:
   - Match transaction.description against merchant.normalized_name
   - Match transaction.description against merchant.aliases
   - Store as `suggestedMerchantId` and `suggestedMerchantName`

2. **Find COA Suggestion**:
   - Use `transactionBusinessLogic.getSuggestion()`
   - Match based on merchant's category
   - Store as `suggestion.chartOfAccountId`

3. **Find Default Split Rule**:
   - Check if merchant has split rule in `merchant_split_rules`
   - Match by: transaction.merchant.normalized_name OR suggestedMerchant.normalized_name
   - Store as `defaultSplitRule`

4. **Determine Split State**:
   - Check if category `is_split_enabled = true`
   - Store as `splitReady` (boolean)

**UI Display**:
- Table with columns:
  - Checkbox (for bulk selection)
  - Date
  - Description
  - Suggested Merchant (editable dropdown)
  - Account (Chart of Account) - shows suggested or selected COA
  - Default Split - displays split rule percentages if available
  - Amount (color-coded: green for credits, red for debits)
  - Actions (Split/Select/Delete buttons)

---

#### Step 2: User Actions

**Action A: Select Chart of Account**

**Trigger**: User clicks "Select" button OR edits Account column

**Process**:
1. EditCoAModal opens with dropdown of all Chart of Accounts
2. User selects a COA
3. Modal saves selection

**Database Operation**:
```sql
UPDATE transactions
SET chart_of_account_id = :selectedCoaId
WHERE id = :transactionId
```

**UI Update**: 
- Local state updates to reflect new COA
- Transaction becomes eligible for bulk update

---

**Action B: Create Split**

**Trigger**: User clicks "Split" button (only visible if category.is_split_enabled = true)

**Process**:
1. ImprovedSplitModal opens
2. User adds split lines:
   - Select Chart of Account for each split
   - Enter percentage (must total 100%)
   - Optional description
   - Amount auto-calculated from percentage
3. User saves split

**Local State Update**:
```javascript
transaction.splitReady = true
transaction.splits = [
  {
    chartOfAccountId: uuid,
    percent: number,
    amount: number,
    description: string
  }
]
```

**Note**: Splits are NOT saved to database yet, only stored in local state until bulk update.

---

**Action C: Select Merchant**

**Trigger**: User types in Suggested Merchant dropdown

**Process**:
1. Filter merchants list by search term
2. User selects from filtered dropdown
3. OR user clicks "+" to create new merchant

**Database Operation** (if creating new):
```sql
INSERT INTO merchant (normalized_name, aliases)
VALUES (:merchantName, ARRAY[:description])
```

**UI Update**:
- Transaction.suggestedMerchantId updated
- Default split rule re-evaluated for new merchant

---

**Action D: Delete Transaction**

**Trigger**: User clicks Delete button

**Process**:
1. If transaction has splits: Ask if delete entire transaction or just remove splits
2. Confirm deletion

**Database Operation**:
```sql
DELETE FROM transactions
WHERE id = :transactionId
```

**UI Update**: Transaction removed from list

---

#### Step 3: Bulk Update Selected

**Trigger**: User selects transactions (checkboxes) and clicks "Bulk Update Selected"

**Validation** - Filter transactions that are ready:
- Has `splitReady = true` (split configured), OR
- Has valid COA suggestion (not Suspense), OR
- Has user-selected COA (not Suspense)

**Exclude**: Transactions still assigned to Suspense account

**Confirmation**: Show count of valid transactions

**Process** (for each valid transaction):

**Case 1: Regular Transaction (not split)**
```sql
UPDATE transactions
SET chart_of_account_id = :coaId,
    status = 'categorized',
    is_split = false,
    normalized_merchant_id = :suggestedMerchantId
WHERE id = :transactionId
```

**Case 2: Split Transaction**
```sql
-- 1. Update transaction
UPDATE transactions
SET chart_of_account_id = NULL,
    status = 'split',
    is_split = true,
    normalized_merchant_id = :suggestedMerchantId
WHERE id = :transactionId
```

```sql
-- 2. Delete existing splits (if re-splitting)
DELETE FROM transaction_splits
WHERE transaction_id = :transactionId
```

```sql
-- 3. Insert new splits
INSERT INTO transaction_splits 
  (transaction_id, chart_of_account_id, percentage, amount, description)
VALUES
  (:transactionId, :coaId1, :percent1, :amount1, :desc1),
  (:transactionId, :coaId2, :percent2, :amount2, :desc2),
  ...
```

**4. Auto-Create Merchant Split Rule** (if split transaction):
```javascript
// Check if rule already exists
existingRule = SELECT * FROM merchant_split_rules
               WHERE merchant_friendly_name = :suggestedMerchantName

if (!existingRule && suggestedMerchantName) {
  // Create new rule
  INSERT INTO merchant_split_rules
    (merchant_friendly_name, splits)
  VALUES
    (:suggestedMerchantName, :splitsConfigJSON)
}
```

**Splits Config JSON Structure**:
```json
[
  {
    "chartOfAccountId": "uuid",
    "percent": 60,
    "description": "Business portion"
  },
  {
    "chartOfAccountId": "uuid",
    "percent": 40,
    "description": "Personal portion"
  }
]
```

**Result**:
- Success/failure count displayed
- Page refreshes to show remaining uncategorized transactions
- Categorized transactions no longer appear (status changed)

---

## 3. Merchant Split Rules Flow

### Overview
Manage default split configurations for merchants. When a transaction matches a merchant with a split rule, the rule is automatically suggested.

### Entry Point
Navigate to "Merchant Split Rules" page

---

#### View Existing Rules (`MerchantSplitRules.jsx`)

**Data Loading**:
```sql
SELECT * FROM merchant_split_rules
ORDER BY merchant_friendly_name
```

**Display**: Table showing:
- Merchant Name
- Split Configuration (COA names and percentages)
- Actions (Edit/Delete)

---

#### Create New Rule

**Process**:
1. User clicks "Add Split Rule"
2. Select merchant from dropdown (filters out merchants with existing rules)
3. Add split lines:
   - Select Chart of Account
   - Enter percentage
   - Optional description
4. Validation: Total must equal 100%
5. Save

**Database Operation**:
```sql
INSERT INTO merchant_split_rules
  (merchant_friendly_name, splits)
VALUES
  (:merchantName, :splitsJSON)
```

**Unique Constraint**: merchant_friendly_name (prevents duplicates)

---

#### Edit Existing Rule

**Process**: Same as Create, but:
- Merchant dropdown is disabled (can't change merchant)
- Load existing splits into form
- Update instead of Insert

**Database Operation**:
```sql
UPDATE merchant_split_rules
SET splits = :newSplitsJSON,
    updated_at = NOW()
WHERE merchant_friendly_name = :merchantName
```

---

#### Delete Rule

**Database Operation**:
```sql
DELETE FROM merchant_split_rules
WHERE id = :ruleId
```

**Note**: Does not affect existing transaction splits, only prevents auto-suggestion for future transactions.

---

## 4. Key Database Tables

### import_staging
**Purpose**: Track file upload metadata
**Key Columns**:
- id (uuid, PK)
- account_id (FK → accounts)
- file_name, file_type
- column_names (text[])
- status ('pending_mapping', 'imported', 'failed')
- mapping_id (FK → column_mappings, nullable)

### import_raw_data
**Purpose**: Store raw CSV data
**Key Columns**:
- staging_id (FK → import_staging)
- raw_data (JSONB)

### column_mappings
**Purpose**: Store reusable column mapping configurations
**Key Columns**:
- id (uuid, PK)
- account_id (FK → accounts)
- file_type
- name (user-friendly name)
- mapping_config (JSONB)

### transactions
**Purpose**: Core transaction records
**Key Columns**:
- id (uuid, PK)
- account_id (FK → accounts)
- date, description, amount, currency, type
- raw_merchant_name
- normalized_merchant_id (FK → merchant, nullable)
- chart_of_account_id (FK → chart_of_accounts)
- status ('uncategorized', 'categorized', 'split')
- is_split (boolean)

### transaction_splits
**Purpose**: Store split transaction details
**Key Columns**:
- id (uuid, PK)
- transaction_id (FK → transactions)
- chart_of_account_id (FK → chart_of_accounts)
- percentage, amount
- description (optional)

### merchant_split_rules
**Purpose**: Store default split configurations for merchants
**Key Columns**:
- id (uuid, PK)
- merchant_friendly_name (text, UNIQUE)
- splits (JSONB array)

**Unique Constraint**: One rule per merchant name

---

## 5. Business Rules

### Column Mapping Rules
1. Required fields: Date, Description, Amount
2. Date formats supported: ISO (YYYY-MM-DD), YYYYMMDD, locale formats
3. Amount parsing: Remove $, commas automatically
4. Default currency: CAD
5. Transaction type: Auto-detect from amount sign if not provided

### Categorization Rules
1. All imports start with Suspense account
2. Transactions with Suspense COA cannot be bulk updated
3. Split percentages must total exactly 100%
4. Merchant matching: Case-insensitive, checks normalized_name and aliases

### Split Rule Rules
1. Auto-created during bulk update if:
   - Transaction is split
   - Has suggested merchant name
   - No existing rule for that merchant
2. Rules are suggestions only, users can modify per-transaction
3. Deleting a rule doesn't affect existing splits

### Bulk Update Rules
1. Only processes transactions with valid COA (not Suspense)
2. Updates status: 'uncategorized' → 'categorized' or 'split'
3. Links suggested merchants automatically
4. For splits: Creates merchant rule if new
5. Select All: Only selects transactions eligible for bulk update

---

## 6. State Management

### UncategorizedReceipts Component State

**Data State**:
- transactions (enriched with suggestions, split rules)
- chartOfAccounts (sorted alphabetically)
- merchants (deduplicated, sorted)
- merchantSplitRules
- suspenseAccount

**UI State**:
- selectedTxns (Set of transaction IDs)
- selectedAll (boolean)
- merchantSearch (object: txnId → search term)
- showMerchantDropdown (object: txnId → boolean)
- editModalTxn (transaction being edited)
- splitModalTxn (transaction being split)

**Local-Only State** (not persisted until bulk update):
- transaction.splitReady (boolean)
- transaction.splits (array)
- transaction.suggestedMerchantId
- transaction.suggestion.chartOfAccountId

---

## 7. Error Handling

### Import Errors
- CSV parsing failure → alert user, don't create staging record
- Missing required mappings → alert before applying
- Database insert failure → update staging status to 'failed', store error message

### Categorization Errors
- Split percentages ≠ 100% → validation error, prevent save
- Duplicate merchant in dropdown → deduplicate in code
- Bulk update partial failure → show success/failure count, reload remaining

### Data Integrity
- Foreign key constraints enforce referential integrity
- Cascade deletes: deleting account → deletes transactions
- Suspense account: Cannot be deleted (required for imports)
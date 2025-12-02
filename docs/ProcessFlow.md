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

---

## 8. PDF Import Flow

### Overview
The PDF import process extracts investment holdings tables from PDF statements and saves them to the database after human review and classification. The system supports two extraction methods: Claude Vision AI (primary) and Python backend (fallback).

### Architecture
```
PDF Upload → Extraction Method Selection
           ↓
    [Claude Vision API] OR [Python Backend Service]
           ↓
   Raw Table Data Extraction
           ↓
   localStorage Cache (extracted_tables)
           ↓
   Human Review Modal (Holdings Verification)
           ↓
   User Classifies: Asset Type, Category, Sub-Category
           ↓
   Data Validation (Symbol + Security Name required)
           ↓
   Bulk INSERT into holdings table
```

### Detailed Steps

#### Step 1: PDF Upload (`TableReader.jsx`)

**User Action**: Upload PDF file and select extraction method

**UI Components**:
- Investment Account dropdown (required)
- Date of Holdings picker (required)
- Extraction Method toggle:
  - **Claude Vision AI** (default, always available)
  - **Python Backend** (optional, requires service running)
- PDF file input
- Extract Tables button

**Validation**:
- Investment account must be selected
- Date must be provided
- File must be PDF format
- For Python method: Backend service must be available (health check)

**File Input Behavior**:
```javascript
disabled={extractionMethod === 'python' && !pythonServiceAvailable}
```
- Claude Vision method: Always enabled
- Python method: Disabled if service unavailable

---

#### Step 2A: Extraction via Claude Vision AI

**Trigger**: User clicks "Extract Tables" with Vision method selected

**Process**:
1. Convert PDF to base64 encoding
2. Detect PDF media type (application/pdf)
3. Call OpenRouter API:
   - Model: `anthropic/claude-3.5-sonnet`
   - Vision enabled with PDF document
   - System prompt: Extract investment holdings tables

**API Request Structure**:
```javascript
{
  model: "anthropic/claude-3.5-sonnet",
  messages: [{
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64Data
        }
      },
      {
        type: "text",
        text: "Extract all investment holdings tables..."
      }
    ]
  }]
}
```

**Response Parsing**:
- Extract JSON from response content
- Handle both raw JSON and markdown code blocks
- Validate table structure

**Expected Table Format**:
```json
{
  "tables": [
    {
      "headers": ["Symbol", "Security Name", "Quantity", "Price", "Value"],
      "rows": [
        {
          "symbol": "AAPL",
          "security": "Apple Inc.",
          "quantity": "100",
          "price": "150.00",
          "value": "15000.00"
        }
      ]
    }
  ]
}
```

**localStorage Cache**:
```javascript
// Cache extracted data for efficiency
localStorage.setItem('extracted_tables', JSON.stringify(tables))
localStorage.setItem('raw_extracted_data', JSON.stringify(rawResponse))
```

**Field Mapping** (Claude Vision → Database):
- `symbol` → holdings.symbol
- `security` or `securityName` → holdings.security_name
- `quantity` or `units` → holdings.quantity
- `price` or `marketPrice` → holdings.market_price
- `value` or `marketValue` → holdings.market_value
- `bookCost` or `cost` → holdings.book_value

---

#### Step 2B: Extraction via Python Backend (Fallback)

**Trigger**: User clicks "Extract Tables" with Python method selected

**Prerequisites**:
- Python service running on `http://localhost:5001` (or configured URL)
- Health check passed: `GET /health`

**Process**:
1. Create FormData with PDF file
2. POST to `/extract-tables` endpoint
3. Python service uses Camelot + Tabula libraries
4. Returns structured table data

**API Endpoint**:
```
POST http://localhost:5001/extract-tables
Content-Type: multipart/form-data
Body: { file: PDFFile }
```

**Response Format**:
```json
{
  "tables": [
    {
      "headers": ["Symbol", "Security Name", "Quantity", "Price", "Value"],
      "rows": [
        ["AAPL", "Apple Inc.", "100", "150.00", "15000.00"]
      ]
    }
  ]
}
```

**Field Mapping** (Python Backend → Database):
- Row arrays mapped by header position
- headers[0] → symbol
- headers[1] → security_name
- headers[2] → quantity
- headers[3] → market_price
- headers[4] → market_value

**Note**: Python backend returns array-based rows, Vision returns object-based rows. Table display component handles both formats.

---

#### Step 3: Holdings Review Modal

**Trigger**: Extraction completes successfully → Auto-open holdings review modal

**Purpose**: Human verification and classification before database save

**Modal Initialization** (only runs once):
```javascript
if (reviewedHoldings.length === 0) {
  // First time opening - initialize from extracted data
  setReviewedHoldings(extractedHoldings.map(h => ({...h})))
} else {
  // Preserve user edits on re-open
  // Do NOT reinitialize
}
```

**Modal Layout**:

**Left Column - Extracted Data** (Read-only):
- Symbol
- Security Name
- Quantity
- Market Price
- Market Value
- Book Value

**Right Column - Required Classification** (Yellow background, editable):
- **Asset Type*** (required dropdown):
  - GIC
  - Mutual Fund
  - Stock
  - ETF
  - Bond
  - Cash
  - REIT

- **Category*** (required dropdown):
  - Canadian Equity
  - US Equity
  - International Equity
  - Fixed Income
  - Money Market
  - Balanced
  - Real Estate

- **Sub-Category** (optional text input):
  - Examples: Index Fund, Growth Fund, Value Fund, etc.
  - Free-form text for flexibility

**User Actions**:
1. Review extracted data for accuracy
2. Edit any field if extraction was incorrect
3. Select Asset Type and Category for each holding
4. Optionally add Sub-Category
5. Click "Save to Database" to persist all holdings

**Field Editing**:
```javascript
handleUpdateReviewedHolding(index, field, value) {
  const updated = [...reviewedHoldings]
  updated[index][field] = value
  setReviewedHoldings(updated)
}
```

---

#### Step 4: Data Validation and Save

**Trigger**: User clicks "Save to Database" in Holdings Review Modal

**Validation Rules**:
1. **Required Fields Check**:
   ```javascript
   const validHoldings = reviewedHoldings.filter(h => 
     h.symbol && h.symbol.trim() !== '' && 
     h.securityName && h.securityName.trim() !== ''
   )
   ```
   - Only rows with both Symbol AND Security Name are saved
   - Empty rows are automatically filtered out
   - Prevents garbage data from being saved

2. **Error if No Valid Holdings**:
   ```javascript
   if (validHoldings.length === 0) {
     throw new Error('No valid holdings to save. Each holding must have at least a Symbol and Security Name.')
   }
   ```

**Database Operation** - Bulk INSERT:

```sql
INSERT INTO personal_finance.holdings (
  account_id,
  date,
  symbol,
  security_name,
  quantity,
  market_price,
  market_value,
  book_value,
  asset_type,
  category,
  sub_category,
  created_at,
  updated_at
)
VALUES
  (:accountId, :date, :symbol, :securityName, :quantity, :marketPrice, :marketValue, :bookValue, :assetType, :category, :subCategory, NOW(), NOW()),
  ...
```

**Field Mapping** (UI → Database):
```javascript
{
  account_id: selectedAccount.id,
  date: dateOfHoldings,
  symbol: row.symbol,
  security_name: row.securityName || row.security_name,
  quantity: parseFloat(row.quantity) || 0,
  market_price: parseFloat(row.price || row.marketPrice || row.market_price) || 0,
  market_value: parseFloat(row.value || row.marketValue || row.market_value) || 0,
  book_value: parseFloat(row.bookCost || row.bookValue || row.book_value) || 0,
  asset_type: row.assetType || row.asset_type || null,
  category: row.category || null,
  sub_category: row.subCategory || row.sub_category || null
}
```

**Success Flow**:
1. Show success toast: "X holdings saved successfully"
2. Clear localStorage cache
3. Reset form state
4. Close modal
5. User can continue importing more PDFs

**Error Handling**:
- Extraction failure → Show error message, allow retry
- API timeout → Show timeout message with retry option
- Validation failure → Show specific validation errors
- Database save failure → Show error, preserve data in modal for retry

---

### Database Schema

#### holdings Table

**Purpose**: Store investment holdings snapshots from PDF statements

**Key Columns**:
- `id` (uuid, PK) - Auto-generated
- `account_id` (uuid, FK → investment_accounts) - Required
- `date` (date) - Date of holdings snapshot
- `symbol` (text) - Stock/fund ticker symbol
- `security_name` (text) - Full name of security
- `quantity` (numeric) - Number of shares/units
- `market_price` (numeric) - Price per share
- `market_value` (numeric) - Total market value
- `book_value` (numeric) - Original purchase cost
- `asset_type` (text) - Classification: GIC, Mutual Fund, Stock, ETF, Bond, Cash, REIT
- `category` (text) - Classification: Canadian Equity, US Equity, International Equity, Fixed Income, Money Market, Balanced, Real Estate
- `sub_category` (text) - Optional: Index Fund, Growth Fund, Value Fund, etc.
- `created_at`, `updated_at` (timestamp)

**Indexes**:
- PRIMARY KEY (id)
- INDEX on account_id (for filtering by account)
- INDEX on date (for time-series queries)
- INDEX on symbol (for security lookup)
- INDEX on asset_type (for classification reports)
- INDEX on category (for classification reports)
- INDEX on sub_category (for detailed classification)

**Schema Migration**:
```sql
-- Add classification columns
ALTER TABLE personal_finance.holdings
ADD COLUMN asset_type TEXT,
ADD COLUMN category TEXT,
ADD COLUMN sub_category TEXT;

-- Create indexes for query performance
CREATE INDEX idx_holdings_asset_type ON personal_finance.holdings(asset_type);
CREATE INDEX idx_holdings_category ON personal_finance.holdings(category);
CREATE INDEX idx_holdings_sub_category ON personal_finance.holdings(sub_category);

-- Document allowed values
COMMENT ON COLUMN personal_finance.holdings.asset_type IS 
  'Asset classification: GIC, Mutual Fund, Stock, ETF, Bond, Cash, REIT';
COMMENT ON COLUMN personal_finance.holdings.category IS 
  'Investment category: Canadian Equity, US Equity, International Equity, Fixed Income, Money Market, Balanced, Real Estate';
COMMENT ON COLUMN personal_finance.holdings.sub_category IS 
  'Optional detailed classification: Index Fund, Growth Fund, Value Fund, etc.';
```

---

### External Services

#### Claude Vision AI (Primary Method)

**Service**: OpenRouter API
**Model**: `anthropic/claude-3.5-sonnet`
**Endpoint**: `https://openrouter.ai/api/v1/chat/completions`

**Authentication**:
```javascript
headers: {
  'Authorization': `Bearer ${VITE_OPENROUTER_API_KEY}`,
  'HTTP-Referer': window.location.origin
}
```

**Advantages**:
- No server infrastructure required
- Vision-capable, can read complex PDF layouts
- Handles multi-column tables and formatted documents
- Always available (cloud service)

**Limitations**:
- Requires API key (paid service)
- Costs per API call
- Dependent on external service availability

---

#### Python Backend Service (Fallback Method)

**Repository**: `pdf-extraction-service`
**GitHub**: https://github.com/ideepak3m/pdf-extraction-service
**Stack**: Flask + Camelot + Tabula + OpenCV

**Endpoints**:
```
GET  /health                      - Service health check
POST /extract-tables              - Basic PDF table extraction
POST /extract-with-classification - Advanced extraction with AI classification
```

**Deployment Options**:
1. **Local Development**: `python pdf_service.py` (port 5001)
2. **Railway.app**: One-click deploy with railway.json
3. **Render.com**: Auto-deploy from GitHub with render.yaml
4. **Docker**: Multi-stage build with Dockerfile

**Dependencies**:
- Flask 3.0.0 (web framework)
- Flask-CORS 4.0.0 (cross-origin requests)
- Camelot 0.11.0 (PDF table extraction)
- Tabula 2.9.0 (alternative extraction method)
- Pandas 2.1.4 (data manipulation)
- NumPy 1.26.2 (numerical operations)
- OpenCV 4.8.1.78 (image processing)
- PyPDF2 3.0.1 (PDF parsing)

**Advantages**:
- Free (self-hosted)
- Fast extraction for simple tables
- Multiple extraction strategies (Camelot + Tabula fallback)
- Can be deployed independently

**Limitations**:
- Requires Python environment and dependencies
- Less accurate for complex layouts than Claude Vision
- Needs server infrastructure for production use

**Frontend Configuration**:
```javascript
// .env
VITE_PYTHON_BACKEND_URL=http://localhost:5001

// or for production
VITE_PYTHON_BACKEND_URL=https://pdf-extraction-service.railway.app
```

---

### Business Rules

#### PDF Import Rules
1. **Extraction Method Priority**:
   - Claude Vision AI is the default and recommended method
   - Python backend is optional fallback if service is deployed

2. **Required Fields for Upload**:
   - Investment Account must be selected
   - Date of Holdings must be provided
   - PDF file must be uploaded

3. **Holdings Validation**:
   - Minimum required fields: Symbol AND Security Name
   - Empty rows are automatically filtered out
   - At least one valid holding must exist to save

4. **Classification Requirements**:
   - Asset Type and Category should be filled during review
   - Sub-Category is optional
   - Classification fields can be edited later in holdings table

5. **Data Caching**:
   - Extracted tables cached in localStorage for efficiency
   - Cache cleared after successful save
   - Allows user to review without re-extracting

#### Extraction Accuracy
1. **Vision Method**:
   - Better for complex, multi-column layouts
   - Handles formatted text and merged cells
   - Returns object-based rows with named fields

2. **Python Method**:
   - Better for simple, grid-based tables
   - Faster for high-volume processing
   - Returns array-based rows by column position

3. **Human Review**:
   - Always required before database save
   - User verifies and corrects extraction errors
   - Prevents garbage data from entering system

---

### State Management

#### TableReader Component State

**Form State**:
- `selectedAccount` (investment account object)
- `dateOfHoldings` (date string, YYYY-MM-DD)
- `extractionMethod` ('vision' or 'python')
- `file` (PDF File object)

**Extraction State**:
- `isExtracting` (boolean, shows loading spinner)
- `error` (string, extraction error message)
- `tables` (array of extracted table objects)

**Review State**:
- `showHoldingsReview` (boolean, modal visibility)
- `reviewedHoldings` (array of holdings with user edits)
  - Initialized once on first open
  - Preserves user edits on re-open
  - Only reset after successful save

**Service State**:
- `pythonServiceAvailable` (boolean, health check result)
- Checked on component mount
- Re-checked when switching to Python method

---

### Error Handling

#### Extraction Errors
- **PDF Read Failure**: "Failed to read PDF file. Please ensure it's a valid PDF."
- **API Timeout**: "Extraction timed out. Please try a smaller file or different method."
- **No Tables Found**: "No investment holdings tables found in the PDF. Please verify the file."
- **Service Unavailable**: "Python backend service is not available. Please use Claude Vision method."

#### Validation Errors
- **Missing Account**: "Please select an investment account"
- **Missing Date**: "Please select the date of holdings"
- **Missing File**: "Please select a PDF file to upload"
- **No Valid Holdings**: "No valid holdings to save. Each holding must have at least a Symbol and Security Name."

#### Database Errors
- **Save Failure**: "Failed to save holdings to database: [error message]"
- **Duplicate Holdings**: Check for existing holdings on same date (future enhancement)

#### Recovery Actions
- **Retry Extraction**: User can retry with same or different method
- **Edit Before Save**: User can correct extraction errors in review modal
- **Preserve Data**: Review modal preserves edits across open/close cycles
- **Cache Cleanup**: localStorage cleared only after successful save

---

### Future Enhancements

1. **Duplicate Detection**: Check for existing holdings on same date before save
2. **Bulk Classification**: Apply classification rules across multiple holdings
3. **Historical Tracking**: Compare holdings across dates to detect changes
4. **Auto-Classification**: ML model to suggest asset type/category based on security name
5. **Multi-Page Support**: Extract from multi-page PDF statements
6. **Transaction Extraction**: Extract buy/sell transactions from PDF in addition to holdings
7. **OCR Fallback**: Use OCR for PDFs with image-based text
8. **Export Functionality**: Export holdings to CSV or Excel for analysis
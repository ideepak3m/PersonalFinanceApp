# AI Extraction Backup Instructions

Your AI PDF extractions are automatically cached in browser localStorage and backed up to Supabase. Here are multiple ways to backup and restore your data:

## 🔄 Automatic Backup (Recommended)

Every AI extraction is automatically:
1. ✅ Saved to localStorage (last 10 extractions)
2. ✅ Backed up to Supabase database (`personal_finance.ai_extraction_logs`)

## 📥 Manual Backup Methods

### Method 1: Backup to Supabase (One-Click)
1. Open the PDF Table Extractor
2. Scroll to the "Recent AI Extractions (Cached)" section
3. Click **"Backup to Supabase"** button
4. All localStorage extractions will be saved to database

### Method 2: Export as JSON File
1. Open the PDF Table Extractor
2. Scroll to the "Recent AI Extractions (Cached)" section
3. Click **"Export JSON"** button
4. A JSON file will download to your computer
5. Save this file safely (e.g., cloud storage, external drive)

### Method 3: Manual Copy from Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Run this command:
```javascript
copy(localStorage.getItem('ai_pdf_extractions'))
```
4. Paste into a text file and save as `backup-YYYY-MM-DD.json`

### Method 4: Browser DevTools Export
1. Open Developer Tools (F12)
2. Go to Application tab → Local Storage → your domain
3. Find key `ai_pdf_extractions`
4. Right-click → Copy value
5. Paste into text file and save

## 📤 Restore from Backup

### Restore from Supabase
Extractions are permanently stored in Supabase and can be queried anytime:
```sql
SELECT * FROM personal_finance.ai_extraction_logs 
WHERE user_id = auth.uid() 
ORDER BY extraction_timestamp DESC;
```

### Restore from JSON File
1. Open Developer Tools (F12)
2. Go to Console tab
3. Run this command with your JSON data:
```javascript
localStorage.setItem('ai_pdf_extractions', 'PASTE_YOUR_JSON_HERE')
```
4. Refresh the page

## 📊 Data Structure

Each backup contains:
- **timestamp**: When extraction was performed
- **model**: AI model used (e.g., Claude Sonnet 3.5)
- **filename**: PDF filename
- **tokensUsed**: API usage statistics
  - `prompt_tokens`: Input tokens
  - `completion_tokens`: Output tokens
  - `total_tokens`: Total cost
- **extraction_data**: Full extracted data
  - `accountInfo`: Account metadata
  - `tables`: Array of extracted tables with headers and rows

## 🗄️ Database Schema

**Table**: `personal_finance.ai_extraction_logs`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who performed extraction |
| filename | TEXT | Original PDF filename |
| extraction_timestamp | TIMESTAMP | When extraction occurred |
| model_used | TEXT | AI model (e.g., claude-3.5-sonnet) |
| prompt_tokens | INTEGER | Input tokens used |
| completion_tokens | INTEGER | Output tokens generated |
| total_tokens | INTEGER | Total tokens consumed |
| extraction_data | JSONB | Full extraction result |
| created_at | TIMESTAMP | Record creation time |

## 💡 Best Practices

1. **Regular Backups**: Click "Backup to Supabase" weekly
2. **Export Before Major Updates**: Export JSON before browser updates
3. **Keep Multiple Copies**: Store JSON files in 2-3 locations
4. **Monitor Token Usage**: Check extraction logs for API costs
5. **Clean Old Data**: Delete extractions older than 30 days

## 🔧 Troubleshooting

### "Backup Failed" Error
- Check Supabase connection in console
- Verify user is authenticated
- Check browser console for detailed error

### "No Extractions Found" 
- No PDFs have been processed yet
- localStorage was cleared
- Check browser privacy settings (incognito mode clears on close)

### "Export Download Failed"
- Check browser download permissions
- Disable popup blockers temporarily
- Try different browser

## 📞 Support

If you lose data and need recovery:
1. Check Supabase database first (most reliable)
2. Look for exported JSON files on your computer
3. Check browser cache/history backups
4. Contact support with approximate date of extraction

---

**Storage Locations**:
- 🌐 Browser: `localStorage['ai_pdf_extractions']`
- 💾 Database: `personal_finance.ai_extraction_logs` table
- 📄 Files: `ai-extractions-backup-YYYY-MM-DD.json`

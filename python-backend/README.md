# PDF Table Extraction Backend

Python service using **Camelot** and **Tabula-py** for reliable PDF table extraction.

## Setup

### 1. Install Python Dependencies

```powershell
cd python-backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Install Ghostscript (Required for Camelot)

Download and install from: https://ghostscript.com/releases/gsdnload.html

Add to PATH: `C:\Program Files\gs\gs10.02.1\bin`

### 3. Start the Service

```powershell
python pdf_service.py
```

Server runs on: `http://localhost:5001`

## API Endpoints

### `/extract-tables` (POST)
Extract all tables from PDF

**Request:**
```
POST http://localhost:5001/extract-tables
Content-Type: multipart/form-data

file: <PDF file>
method: "auto" | "camelot" | "tabula"  (optional, default: "auto")
```

**Response:**
```json
{
  "success": true,
  "total_tables": 3,
  "tables": [
    {
      "id": "camelot-table-0",
      "page": 1,
      "method": "camelot-lattice",
      "accuracy": 95.5,
      "headers": ["Date", "Description", "Amount"],
      "rows": [
        ["2018-03-16", "Admin Fee", "150.00"],
        ...
      ],
      "row_count": 25,
      "column_count": 3
    }
  ],
  "extraction_info": {
    "filename": "statement.pdf",
    "timestamp": "2025-11-28T12:00:00",
    "method": "auto",
    "camelot_tables": 2,
    "tabula_tables": 1
  }
}
```

### `/extract-with-classification` (POST)
Extract and automatically classify tables

**Response:** Same as above but with added `dataType` field:
- `holdings`
- `investmentTransactions`
- `cashTransactions`
- `unknown`

### `/health` (GET)
Health check

## Integration with React

Update your React app to call this service instead of Claude Vision:

```javascript
const extractTablesWithPython = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('method', 'auto');
    
    const response = await fetch('http://localhost:5001/extract-with-classification', {
        method: 'POST',
        body: formData
    });
    
    return await response.json();
};
```

## Benefits

✅ **Complete extraction** - Gets ALL rows, no sampling  
✅ **Deterministic** - Same PDF = same output every time  
✅ **No AI costs** - Free, runs locally  
✅ **Fast** - Processes in seconds  
✅ **Battle-tested** - Used by financial institutions  
✅ **Handles complex tables** - Merged cells, nested tables, etc.

## Troubleshooting

**"Ghostscript not found"**
- Install Ghostscript
- Add to PATH: `C:\Program Files\gs\gs10.02.1\bin`
- Restart terminal

**"OpenCV error"**
- Install Visual C++ Redistributable: https://aka.ms/vs/17/release/vc_redist.x64.exe

**Port 5001 in use**
- Change port in `pdf_service.py`: `app.run(port=5002)`

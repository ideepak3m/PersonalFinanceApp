"""
PDF Table Extraction Service using Camelot and Tabula
Provides reliable, deterministic table extraction from investment PDFs
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import camelot
import tabula
import pandas as pd
import numpy as np
import os
import tempfile
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

def clean_value(val):
    """Convert NaN, inf, and other non-JSON-serializable values to None"""
    if pd.isna(val) or (isinstance(val, float) and (np.isnan(val) or np.isinf(val))):
        return None
    return val

def clean_list(lst):
    """Recursively clean a list of values"""
    return [clean_value(item) if not isinstance(item, list) else clean_list(item) for item in lst]

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'PDF Table Extraction',
        'version': '1.0.0'
    })

@app.route('/extract-tables', methods=['POST'])
def extract_tables():
    """
    Extract tables from PDF using Camelot (best for bordered tables) 
    and Tabula (best for stream tables without borders)
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
    
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Only PDF files are supported'}), 400
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        file.save(tmp_file.name)
        pdf_path = tmp_file.name
    
    try:
        extraction_method = request.form.get('method', 'auto')  # auto, camelot, tabula
        
        tables_data = []
        extraction_info = {
            'filename': file.filename,
            'timestamp': datetime.now().isoformat(),
            'method': extraction_method
        }
        
        # Try Camelot first (better for bordered tables)
        if extraction_method in ['auto', 'camelot']:
            try:
                print(f"Trying Camelot extraction on {file.filename}...")
                camelot_tables = camelot.read_pdf(pdf_path, pages='all', flavor='lattice')
                
                for idx, table in enumerate(camelot_tables):
                    df = table.df
                    
                    # Clean up the dataframe
                    df = df.replace('', pd.NA).dropna(how='all')  # Remove empty rows
                    
                    if len(df) > 0:
                        # Convert to JSON-friendly format
                        headers = clean_list(df.iloc[0].tolist()) if len(df) > 0 else []
                        rows = [clean_list(row) for row in df.iloc[1:].values.tolist()] if len(df) > 1 else []
                        
                        # Merge continuation rows
                        rows = merge_continuation_rows(rows, len(headers))
                        
                        tables_data.append({
                            'id': f'camelot-table-{idx}',
                            'page': table.page,
                            'method': 'camelot-lattice',
                            'accuracy': float(table.accuracy),
                            'headers': headers,
                            'rows': rows,
                            'row_count': len(rows),
                            'column_count': len(headers)
                        })
                
                print(f"Camelot extracted {len(camelot_tables)} tables")
                extraction_info['camelot_tables'] = len(camelot_tables)
                
            except Exception as e:
                print(f"Camelot extraction failed: {str(e)}")
                extraction_info['camelot_error'] = str(e)
        
        # Try Tabula if Camelot found nothing or method is tabula/auto
        if (extraction_method in ['auto', 'tabula']) and len(tables_data) == 0:
            try:
                print(f"Trying Tabula extraction on {file.filename}...")
                tabula_tables = tabula.read_pdf(
                    pdf_path, 
                    pages='all', 
                    multiple_tables=True,
                    lattice=False,  # Use stream method for tables without borders
                    stream=True
                )
                
                for idx, df in enumerate(tabula_tables):
                    # Clean up the dataframe
                    df = df.replace('', pd.NA).dropna(how='all')
                    
                    if len(df) > 0:
                        headers = clean_list(df.columns.tolist())
                        rows = [clean_list(row) for row in df.values.tolist()]
                        
                        # Merge continuation rows
                        rows = merge_continuation_rows(rows, len(headers))
                        
                        tables_data.append({
                            'id': f'tabula-table-{idx}',
                            'page': idx + 1,  # Tabula doesn't provide page info easily
                            'method': 'tabula-stream',
                            'accuracy': None,
                            'headers': headers,
                            'rows': rows,
                            'row_count': len(rows),
                            'column_count': len(headers)
                        })
                
                print(f"Tabula extracted {len(tabula_tables)} tables")
                extraction_info['tabula_tables'] = len(tabula_tables)
                
            except Exception as e:
                print(f"Tabula extraction failed: {str(e)}")
                extraction_info['tabula_error'] = str(e)
        
        # Clean up temporary file
        os.unlink(pdf_path)
        
        if len(tables_data) == 0:
            return jsonify({
                'success': False,
                'error': 'No tables found in PDF',
                'extraction_info': extraction_info
            }), 404
        
        return jsonify({
            'success': True,
            'tables': tables_data,
            'extraction_info': extraction_info,
            'total_tables': len(tables_data)
        })
    
    except Exception as e:
        # Clean up temporary file on error
        if os.path.exists(pdf_path):
            os.unlink(pdf_path)
        
        return jsonify({
            'success': False,
            'error': str(e),
            'extraction_info': extraction_info
        }), 500

@app.route('/extract-with-classification', methods=['POST'])
def extract_with_classification():
    """
    Extract tables and use simple heuristics to classify them
    (investment transactions, cash transactions, holdings)
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
    
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Only PDF files are supported'}), 400
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        file.save(tmp_file.name)
        pdf_path = tmp_file.name
    
    try:
        extraction_method = request.form.get('method', 'auto')
        
        tables_data = []
        extraction_info = {
            'filename': file.filename,
            'timestamp': datetime.now().isoformat(),
            'method': extraction_method
        }
        
        # Try Camelot first (better for bordered tables)
        if extraction_method in ['auto', 'camelot']:
            try:
                print(f"Trying Camelot extraction on {file.filename}...")
                camelot_tables = camelot.read_pdf(pdf_path, pages='all', flavor='lattice')
                
                for idx, table in enumerate(camelot_tables):
                    df = table.df
                    
                    # Clean up the dataframe
                    df = df.replace('', pd.NA).dropna(how='all')
                    
                    if len(df) > 0:
                        headers = clean_list(df.iloc[0].tolist()) if len(df) > 0 else []
                        rows = [clean_list(row) for row in df.iloc[1:].values.tolist()] if len(df) > 1 else []
                        
                        # Merge continuation rows
                        rows = merge_continuation_rows(rows, len(headers))
                        
                        tables_data.append({
                            'id': f'camelot-table-{idx}',
                            'page': table.page,
                            'method': 'camelot-lattice',
                            'accuracy': float(table.accuracy),
                            'headers': headers,
                            'rows': rows,
                            'row_count': len(rows),
                            'column_count': len(headers)
                        })
                
                print(f"Camelot extracted {len(camelot_tables)} tables")
                extraction_info['camelot_tables'] = len(camelot_tables)
                
            except Exception as e:
                print(f"Camelot extraction failed: {str(e)}")
                extraction_info['camelot_error'] = str(e)
        
        # Try Tabula if Camelot found nothing or method is tabula/auto
        if (extraction_method in ['auto', 'tabula']) and len(tables_data) == 0:
            try:
                print(f"Trying Tabula extraction on {file.filename}...")
                tabula_tables = tabula.read_pdf(
                    pdf_path, 
                    pages='all', 
                    multiple_tables=True,
                    lattice=False,
                    stream=True
                )
                
                for idx, df in enumerate(tabula_tables):
                    df = df.replace('', pd.NA).dropna(how='all')
                    
                    if len(df) > 0:
                        headers = clean_list(df.columns.tolist())
                        rows = [clean_list(row) for row in df.values.tolist()]
                        
                        # Merge continuation rows
                        rows = merge_continuation_rows(rows, len(headers))
                        
                        tables_data.append({
                            'id': f'tabula-table-{idx}',
                            'page': idx + 1,
                            'method': 'tabula-stream',
                            'accuracy': None,
                            'headers': headers,
                            'rows': rows,
                            'row_count': len(rows),
                            'column_count': len(headers)
                        })
                
                print(f"Tabula extracted {len(tabula_tables)} tables")
                extraction_info['tabula_tables'] = len(tabula_tables)
                
            except Exception as e:
                print(f"Tabula extraction failed: {str(e)}")
                extraction_info['tabula_error'] = str(e)
        
        # Clean up temporary file
        os.unlink(pdf_path)
        
        if len(tables_data) == 0:
            return jsonify({
                'success': False,
                'error': 'No tables found in PDF',
                'extraction_info': extraction_info
            }), 404
        
        # Classify each table based on headers and content
        for table in tables_data:
            table['dataType'] = classify_table(table)
            table['suggestedImport'] = table['dataType']
        
        return jsonify({
            'success': True,
            'tables': tables_data,
            'extraction_info': extraction_info,
            'total_tables': len(tables_data)
        })
    
    except Exception as e:
        # Clean up temporary file on error
        if os.path.exists(pdf_path):
            os.unlink(pdf_path)
        
        return jsonify({
            'success': False,
            'error': str(e),
            'extraction_info': extraction_info
        }), 500

def merge_continuation_rows(rows, num_columns):
    """
    Merge rows where description wraps to next line.
    If a row has only text in the description column and everything else is empty/None,
    it's likely a continuation of the previous row's description.
    """
    if not rows or len(rows) == 0:
        return rows
    
    merged_rows = []
    
    for i, current_row in enumerate(rows):
        # Convert to list if needed
        current_row = list(current_row)
        
        # Count non-empty cells (excluding common empty values)
        non_empty_cells = []
        for col_idx, cell in enumerate(current_row):
            if cell not in (None, '', '—', 'nan') and str(cell).strip():
                non_empty_cells.append((col_idx, cell))
        
        # Check if this looks like a continuation row:
        # - Has 1-2 non-empty cells
        # - First cell (date column) is empty
        # - Has text in description column (usually index 1)
        is_continuation = False
        
        if len(non_empty_cells) <= 2 and len(merged_rows) > 0:
            # First column should be empty (no date)
            first_cell_empty = current_row[0] in (None, '', '—', 'nan') or not str(current_row[0]).strip()
            
            if first_cell_empty:
                # Check if there's text in one of the early columns (description)
                has_description = any(
                    col_idx <= 2 and cell and str(cell).strip()
                    for col_idx, cell in non_empty_cells
                )
                
                if has_description:
                    is_continuation = True
        
        if is_continuation:
            # Merge with previous row
            prev_row = merged_rows[-1]
            for col_idx, cell in non_empty_cells:
                if col_idx < len(prev_row):
                    # Append to existing content in that column
                    if prev_row[col_idx] and str(prev_row[col_idx]).strip():
                        prev_row[col_idx] = str(prev_row[col_idx]) + ' ' + str(cell)
                    else:
                        prev_row[col_idx] = cell
        else:
            # Normal row - add it
            merged_rows.append(current_row)
    
    return merged_rows

def classify_table(table):
    """
    Classify table based on headers and content
    """
    headers = [str(h).lower() for h in table.get('headers', [])]
    
    # Holdings: units, positions, securities, market value
    holdings_keywords = ['units', 'shares', 'position', 'security', 'market value', 'book value', 'price']
    if any(kw in ' '.join(headers) for kw in holdings_keywords):
        if len(table['rows']) < 20:  # Holdings usually have fewer rows
            return 'holdings'
    
    # Investment transactions: shares, price, buy, sell, dividend
    investment_keywords = ['shares', 'units/shares', 'price', 'gross amt', 'dividend', 'interest', 'security purchase']
    if any(kw in ' '.join(headers) for kw in investment_keywords):
        return 'investmentTransactions'
    
    # Cash transactions: debit, credit, balance, fees
    cash_keywords = ['debit', 'credit', 'balance', 'fee', 'transfer']
    if any(kw in ' '.join(headers) for kw in cash_keywords):
        return 'cashTransactions'
    
    # Default
    return 'unknown'

if __name__ == '__main__':
    print("🚀 Starting PDF Table Extraction Service...")
    print("📚 Using Camelot + Tabula for reliable table extraction")
    print("🌐 Server running on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)

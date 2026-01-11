# Hitachi daily sales report email parser

import re
from bs4 import BeautifulSoup

CURRENCY_RE = re.compile(r"Rp[\. ]+([\d\.]+)", re.IGNORECASE)

def clean_currency(value):
    if not value:
        return 0
    try:
        # Remove dots (thousand separators) and commas
        # Also strip 'Rp' just in case
        cleaned = str(value).replace(".", "").replace(",", "").replace("Rp", "").strip()
        return int(cleaned)
    except (ValueError, TypeError):
        return 0

def extract_currency(text):
    match = CURRENCY_RE.search(text)
    return clean_currency(match.group(1)) if match else 0

def parse_hitachi_email(email_body):
    """
    Parse Hitachi daily sales summary email
    Format: Daily Sales Summary for YYYY-MM-DD
    """
    metadata = {}
    summary = {}
    top_items = []

    # 1. Parse HTML First (If available and structured)
    soup = BeautifulSoup(email_body, 'html.parser')
    text_content = soup.get_text("\n") # Convert to text with newlines

    # 2. Extract Metadata (Date & Location)
    
    # Date Pattern: "Daily Sales Summary for 2025-11-05"
    date_match = re.search(r'Daily Sales Summary for\s+(\d{4}-\d{2}-\d{2})', text_content)
    if date_match:
        metadata['date'] = date_match.group(1)

    # Location Pattern: Look for the line immediately following the Date line
    # We split by newlines and iterate to find the date line
    lines = [line.strip() for line in text_content.split('\n') if line.strip()]
    
    found_date = False
    for i, line in enumerate(lines):
        if 'Daily Sales Summary for' in line:
            found_date = True
            # The next non-empty line is usually the business name
            # But sometimes the business name is repeated or there's noise.
            # We look ahead up to 3 lines.
            for j in range(1, 4):
                if i + j < len(lines):
                    candidate = lines[i + j]
                    # Filter out common noise
                    if candidate and "Sales Summary" not in candidate and "Daily Sales" not in candidate:
                        metadata['location'] = candidate
                        break
            break
    
    if 'location' not in metadata:
        metadata['location'] = "Unknown Branch"

    # 3. Extract Summary Data
    # We look for lines like "*Gross Sales* Rp 180.000" or just "Gross Sales Rp 180.000"
    # Mapping readable labels to keys
    key_map = {
        "Gross Sales": "gross_sales",
        "Net Sales": "net_sales",
        "Total Collected": "total_collected",
        "Discount": "total_discount",
        "Tax": "total_tax"
    }

    for line in lines:
        for label, key in key_map.items():
            if label in line and "Rp" in line:
                # Extract the number at the end
                amount = extract_currency(line)
                summary[key] = amount

    # 4. Extract Top Items
    # Look for the "Top Items" section
    try:
        start_index = -1
        for i, line in enumerate(lines):
            if "Top Items" in line or "Item Name Sales Item Sold" in line:
                start_index = i
                break
        
        if start_index != -1:
            for line in lines[start_index+1:]:
                if "View All Reports" in line or "Best Regards" in line:
                    break
                
                # Regex for "ItemName Rp 123.456 5"
                # This matches: Any text (lazy), space, Rp, space/dot, number, space, number
                item_match = re.search(r'^(.*?)\s+Rp[\. ]+([\d\.]+)\s+(\d+)$', line)
                if item_match:
                    name = item_match.group(1).strip()
                    amount = clean_currency(item_match.group(2))
                    count = int(item_match.group(3))
                    
                    if amount > 0:
                        top_items.append({
                            "name": name,
                            "amount": amount,
                            "count": count
                        })
    except Exception:
        pass # item parsing failure shouldn't kill the whole process

    return {
        'metadata': metadata,
        'summary': summary,
        'top_items': top_items
    }
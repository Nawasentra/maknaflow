import re
from collections import defaultdict
from bs4 import BeautifulSoup

CURRENCY_RE = re.compile(r"Rp\.\s+([\d\.,]+)")

def clean_currency(text_value):
    if not text_value:
        return 0
    try:
        # Remove "Rp. ", dots (thousand separators), keep only digits
        clean_str = text_value.replace("Rp.", "").replace(".", "").replace(",00", "").strip()
        return int(clean_str)
    except (ValueError, TypeError):
        return 0

def parse_luna_email_refined(full_content, is_html=True):
    """
    Refined parser optimized for SendGrid Luna POS emails
    """
    if is_html:
        soup = BeautifulSoup(full_content, 'html.parser')
    else:
        soup = BeautifulSoup(full_content, 'html.parser')

    data = {
        "metadata": {},
        "summary": {},
        "payments": {},
        "sales_types": {},
        "top_categories": [],
        "top_products": []
    }
    
    # Extract metadata from specific elements
    all_text = soup.get_text()
    lines = [l.strip() for l in all_text.splitlines() if l.strip()]
    
    # Find location (e.g., "Laundry Bosku | Laundry Bosku Babelan")
    for line in lines:
        if "|" in line and ("laundry" in line.lower() or "bosku" in line.lower()):
            data["metadata"]["location"] = line.split("|")[-1].strip()
            break
    
    # Find date (e.g., "Monday, January 12, 2026")
    for line in lines:
        if re.search(r"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),.*\d{4}", line):
            data["metadata"]["date"] = line
            break
    
    # Parse all tables
    tables = soup.find_all('table')
    
    for table in tables:
        rows = table.find_all('tr')
        
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 2:
                continue
            
            label = cells[0].get_text(strip=True).lower()
            value_text = cells[-1].get_text(strip=True)
            
            # Summary section
            if "total sales" in label:
                data["summary"]["total_sales"] = clean_currency(value_text)
            elif "total discount" in label:
                data["summary"]["total_discount"] = clean_currency(value_text)
            elif "total service charge" in label:
                data["summary"]["total_service_charge"] = clean_currency(value_text)
            elif "total tax" in label:
                data["summary"]["total_tax"] = clean_currency(value_text)
            elif "total adjustment" in label:
                data["summary"]["total_adjustment"] = clean_currency(value_text)
            elif label == "total":
                data["summary"]["grand_total"] = clean_currency(value_text)
            elif "number of invoices" in label:
                try:
                    data["summary"]["number_of_invoices"] = int(value_text)
                except:
                    pass
            elif "average bill per invoice" in label:
                data["summary"]["average_bill_per_invoice"] = clean_currency(value_text)
            elif "month to date sales" in label:
                data["summary"]["mtd_sales"] = clean_currency(value_text)
            elif "average sales per day" in label:
                data["summary"]["avg_sales_per_day"] = clean_currency(value_text)
            elif label == "pax":
                try:
                    data["summary"]["pax_count"] = int(value_text)
                except:
                    pass
            elif "average bill per pax" in label:
                data["summary"]["average_bill_per_pax"] = clean_currency(value_text)
            
            # Payments section
            elif label == "cash":
                data["payments"]["cash"] = clean_currency(value_text)
            elif label == "qris":
                data["payments"]["qris"] = clean_currency(value_text)
            elif label == "transfer":
                data["payments"]["transfer"] = clean_currency(value_text)
            
            # Sales types
            elif label == "normal":
                data["sales_types"]["normal"] = clean_currency(value_text)
            
            # Top Categories/Products (3 columns: name, count, amount)
            elif len(cells) == 3:
                try:
                    item_name = cells[0].get_text(strip=True)
                    count = int(cells[1].get_text(strip=True))
                    amount = clean_currency(cells[2].get_text(strip=True))
                    
                    # Determine if category or product based on context
                    # Categories are usually ALL CAPS (CUCI, SABUN)
                    if item_name.isupper() and len(item_name) < 20:
                        data["top_categories"].append({
                            "name": item_name,
                            "count": count,
                            "amount": amount
                        })
                    else:
                        data["top_products"].append({
                            "name": item_name,
                            "count": count,
                            "amount": amount
                        })
                except:
                    continue
    
    return data
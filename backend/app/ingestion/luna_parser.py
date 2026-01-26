# Luna POS daily sales report email parser

import re
from collections import defaultdict

CURRENCY_RE = re.compile(r"Rp\. ([\d\.,]+)")
COUNT_VALUE_RE = re.compile(r"(.+?)\s+(\d+)\s+Rp\. ([\d\.,]+)")

def clean_currency(text_value):
    if not text_value:
        return 0
    try:
        return int(text_value.replace("Rp. ", "").replace(".", "").split(",")[0])
    except (ValueError, TypeError):
        return 0

def extract_currency(line):
    m = CURRENCY_RE.search(line)
    return clean_currency(m.group(1)) if m else 0

def parse_labeled_currency(line, label_map):
    for label, key in label_map.items():
        if line.lower().startswith(label):
            return key, extract_currency(line)
    return None, None

def parse_top_list(lines):
    items = []
    for line in lines:
        match = COUNT_VALUE_RE.match(line)
        if match:
            name, count, value = match.groups()
            items.append({
                "name": name.strip(),
                "count": int(count),
                "amount": clean_currency(f"Rp. {value}")
            })
    return items

def parse_luna_email(plain_text):
    lines = [ln.strip() for ln in plain_text.strip().splitlines() if ln.strip()]
    data = defaultdict(dict)
    
    # Default to CASH, will be updated if we find payment details
    payment_method = "CASH"

    label_maps = {
        "daily": {
            "total sales": "total_sales",
            "total discount": "total_discount",
            "total service charge": "total_service_charge",
            "total tax": "total_tax",
            "total adjustment": "total_adjustment",
            "total": "grand_total",
            "average bill per invoice": "average_bill_per_invoice",
            "average bill per pax": "average_bill_per_pax",
            "number of invoices": "number_of_invoices",
            "pax ": "pax_count",
        },
        "month_to_date": {
            "month to date sales": "sales",
            "average sales per day": "average_per_day",
        },
        "payments": {
            "cash": "cash",
            "luna one qris": "qris",
            "qris": "qris",
            "total": "total",
        },
        "sales_types": {
            "normal": "normal",
            "total": "total",
        },
    }

    current_section = "daily"
    top_categories_lines = []
    top_products_lines = []

    for line in lines:
        lower = line.lower()

        if lower.startswith("month to date"):
            current_section = "month_to_date"
            continue
        if lower == "pax":
            current_section = "pax"
            continue
        if lower == "payments":
            current_section = "payments"
            continue
        if lower == "sales types":
            current_section = "sales_types"
            continue
        if lower == "top 20 categories":
            current_section = "top_categories"
            continue
        if lower == "top 20 products":
            current_section = "top_products"
            continue

        if current_section in ("daily", "month_to_date", "payments", "sales_types"):
            key, value = parse_labeled_currency(line, label_maps[current_section])
            if key:
                if current_section in ("payments", "sales_types"):
                    data[current_section][key] = value
                else:
                    data["summary"][key] = value
                continue
            if lower.startswith("number of invoices"):
                data["summary"]["number_of_invoices"] = int(re.findall(r"\d+", line)[0])
                continue
            if lower.startswith("average bill per invoice"):
                key = label_maps["daily"]["average bill per invoice"]
                data["summary"][key] = extract_currency(line)
                continue
            if lower.startswith("average bill per pax"):
                key = label_maps["daily"]["average bill per pax"]
                data["summary"][key] = extract_currency(line)
                continue
            if lower.startswith("pax "):
                key = label_maps["daily"]["pax "]
                data["summary"][key] = int(re.findall(r"\d+", line)[0])
                continue

        if current_section == "pax":
            if lower.startswith("pax "):
                data["summary"]["pax_count"] = int(re.findall(r"\d+", line)[0])
                continue
            key, value = parse_labeled_currency(line, label_maps["daily"])
            if key:
                data["summary"][key] = value
                continue

        if current_section == "top_categories":
            top_categories_lines.append(line)
            continue
        if current_section == "top_products":
            top_products_lines.append(line)
            continue

        if lower.startswith("daily report"):
            data["metadata"]["report_title"] = line
        elif lower.startswith("laundry"):
            data["metadata"]["location"] = line
        elif re.match(r"[a-z]+day,", lower):
            data["metadata"]["date"] = line

    data["payments"] = dict(data["payments"])
    data["sales_types"] = dict(data["sales_types"])
    data["summary"] = dict(data["summary"])
    data["top_categories"] = parse_top_list(top_categories_lines)
    data["top_products"] = parse_top_list(top_products_lines)

    return data
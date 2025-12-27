# Hitachi daily sales report email parser

import re

CURRENCY_RE = re.compile(r"Rp[\. ]+([\d\.]+)", re.IGNORECASE)

def clean_currency(value):
    if not value:
        return 0
    try:
        return int(value.replace(".", ""))
    except (ValueError, TypeError):
        return 0

def extract_currency(text):
    match = CURRENCY_RE.search(text)
    return clean_currency(match.group(1)) if match else 0

def parse_top_items(lines):
    items = []
    for line in lines:
        # Skip header line
        if line.lower().startswith("item name"):
            continue
            
        parts = line.rsplit(" Rp", 1)
        if len(parts) != 2:
            continue

        name_part, trailing = parts
        name = name_part.strip()

        trailing = trailing.strip()
        if " " not in trailing:
            continue

        amount_text, count_text = trailing.split(" ", 1)
        amount = clean_currency(amount_text)
        try:
            count = int(count_text.strip())
        except ValueError:
            continue

        items.append({
            "name": name,
            "amount": amount,
            "count": count
        })
    return items

def parse_hitachi_email(plain_text):
    lines = [line.strip() for line in plain_text.strip().splitlines() if line.strip()]

    metadata = {}
    summary = {}
    top_items_lines = []

    section = "meta"

    for line in lines:
        lower = line.lower()

        if lower == "sales summary":
            section = "summary"
            continue
        if lower == "*top items*":
            section = "top_items_header"
            continue
        if section == "top_items_header" and lower.startswith("item name"):
            section = "top_items"
            continue

        if section == "meta":
            if lower.startswith("daily sales summary"):
                metadata["report_title"] = line
                date_match = re.search(r"(\d{4}-\d{2}-\d{2})", line)
                if date_match:
                    metadata["date"] = date_match.group(1)
            elif "laundry" in lower:
                if "location" in metadata:
                    metadata["location_alias"] = line
                else:
                    metadata["location"] = line

        elif section == "summary":
            if "*" in line:
                asterisk_parts = line.split("*")
                if len(asterisk_parts) >= 3:
                    label = asterisk_parts[1].strip()
                    value_part = asterisk_parts[-1].strip()
                    value = extract_currency(value_part)
                    
                    key = label.replace(" / ", "_").replace(" ", "_").lower()
                    summary[key] = value
                    continue
            
            parts = line.split(" Rp", 1)
            if len(parts) == 2:
                label = parts[0].strip().lower()
                value = clean_currency(parts[1])
                key = label.replace(" / ", "_").replace(" ", "_")
                summary[key] = value

        elif section == "top_items":
            if lower == "view all reports":
                continue
            top_items_lines.append(line)

    data = {
        "metadata": metadata,
        "summary": summary,
        "top_items": parse_top_items(top_items_lines)
    }
    return data
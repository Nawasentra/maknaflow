from app.ingestion.luna_parser import parse_luna_email, clean_currency, parse_top_list
from app.ingestion.hitachi_parser import parse_hitachi_email, clean_currency as hitachi_clean, parse_top_items

def test_luna_clean_currency():
    assert clean_currency("Rp. 1.000") == 1000
    assert clean_currency(None) == 0

def test_luna_clean_currency_edge_cases():
    assert clean_currency("") == 0
    assert clean_currency("notanumber") == 0

def test_luna_parse_top_list():
    lines = ["Soap 2 Rp. 1.000", "Shampoo 1 Rp. 2.000"]
    items = parse_top_list(lines)
    assert items[0]["name"] == "Soap"
    assert items[1]["amount"] == 2000

def test_luna_parse_top_list_empty_and_malformed():
    assert parse_top_list([]) == []
    assert parse_top_list(["bad line"]) == []

def test_luna_parse_labeled_currency_no_match():
    from app.ingestion.luna_parser import parse_labeled_currency
    key, value = parse_labeled_currency("unknown label", {"total": "total_sales"})
    assert key is None and value is None

def test_luna_parse_email():
    text = """
    Daily Report Luna POS
    Laundry Cabang Dago
    Monday, October 30, 2025
    Top 20 Products
    Soap 2 Rp. 1.000
    """
    data = parse_luna_email(text)
    assert "top_products" in data
    assert data["top_products"][0]["name"] == "Soap"

def test_luna_parse_email_sections():
    text = """
    Daily Report Luna POS
    Laundry Cabang Dago
    Monday, October 30, 2025
    Month to Date
    Month to Date Sales Rp. 1.000
    Payments
    Cash Rp. 500
    Sales Types
    Normal Rp. 200
    Top 20 Categories
    CatA 2 Rp. 100
    Top 20 Products
    ProdA 1 Rp. 50
    """
    data = parse_luna_email(text)
    assert "top_products" in data
    assert "top_categories" in data
    assert "payments" in data
    assert "sales_types" in data
    assert "summary" in data
    assert "metadata" in data

def test_luna_parse_email_handles_pax():
    text = """
    Pax
    Pax 5
    """
    data = parse_luna_email(text)
    assert data["summary"]["pax_count"] == 5

def test_hitachi_clean_currency():
    assert hitachi_clean("1.000") == 1000
    assert hitachi_clean(None) == 0

def test_hitachi_parse_top_items():
    lines = ["Item Name", "Soap Rp1000 2"]
    items = parse_top_items(lines)
    assert items[0]["name"] == "Soap"

def test_hitachi_parse_email():
    text = """
    Daily Sales Summary 2025-10-30
    Laundry Cabang Dago
    Sales Summary
    *Total Sales* *Rp. 1.000*
    *top items*
    Item Name
    Soap Rp1000 2
    """
    data = parse_hitachi_email(text)
    assert "top_items" in data
    assert data["top_items"][0]["name"] == "Soap"
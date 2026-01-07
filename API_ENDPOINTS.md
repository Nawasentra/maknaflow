# MaknaFlow API Endpoints Documentation

## Base URL
```
http://localhost:8000/api/
```

## Authentication
- **Header**: `Authorization: Token {token}`
- **Methods**: Google OAuth2 via `/auth/google/`

---

## 1. Branch Management

### List all branches
```
GET /api/branches/
```
**Filters**: `branch_type`  
**Search**: `name`, `address`  
**Permissions**: Authenticated users

### Create branch
```
POST /api/branches/
Body: {
  "name": "Laundry Dago",
  "branch_type": "LAUNDRY",
  "address": "Jl. Dago No. 10"
}
```
**Permissions**: Owner only

### Get branch detail
```
GET /api/branches/{id}/
```

### Update branch
```
PUT /api/branches/{id}/
```
**Permissions**: Owner only

### Delete branch
```
DELETE /api/branches/{id}/
```
**Permissions**: Owner only

---

## 2. Category Management

### List categories
```
GET /api/categories/
```
**Filters**: `transaction_type` (INCOME, EXPENSE)  
**Search**: `name`  
**Permissions**: Authenticated users

### Create category
```
POST /api/categories/
Body: {
  "name": "Detergent",
  "transaction_type": "EXPENSE",
  "branches": [1, 2]
}
```
**Permissions**: Owner only

### Update category
```
PUT /api/categories/{id}/
```
**Permissions**: Owner only

### Delete category
```
DELETE /api/categories/{id}/
```
**Permissions**: Owner only

---

## 3. Transaction Management

### List transactions
```
GET /api/transactions/
```
**Filters**:
- `branch`: Branch ID
- `transaction_type`: INCOME or EXPENSE
- `is_verified`: true/false
- `date`: Date filter (YYYY-MM-DD)
- `source`: WHATSAPP, EMAIL, MANUAL

**Search**: `description`, `category__name`, `source_identifier`  
**Ordering**: `-date`, `-created_at`, `amount`  
**Permissions**: Authenticated (staff sees own branch only, owner sees all)

### Create transaction
```
POST /api/transactions/
Body: {
  "branch": 1,
  "category": 1,
  "amount": "50000",
  "transaction_type": "INCOME",
  "date": "2026-01-07",
  "description": "Laundry service",
  "source": "MANUAL",
  "source_identifier": ""
}
```
**Permissions**: Staff & Owner  
**Auto-verify**: If staff is verified, transaction auto-verified

### Get transaction detail
```
GET /api/transactions/{id}/
```

### Update transaction
```
PUT /api/transactions/{id}/
```
**Permissions**: Owner only

### Get pending transactions
```
GET /api/transactions/pending/
```
Returns all unverified transactions

### Verify transaction
```
POST /api/transactions/{id}/verify/
```
**Permissions**: Owner only

### Void transaction
```
POST /api/transactions/{id}/void/
Body: {}
```
**Permissions**: Owner only  
**Effect**: Marks transaction as invalid, logs who voided it

---

## 4. User/Staff Management

### Get current user profile
```
GET /api/users/profile/
```
**Permissions**: Authenticated

### List all staff (Owner only)
```
GET /api/users/
```
**Filters**: `assigned_branch`, `is_verified`  
**Search**: `username`, `email`, `phone_number`

### Create new staff
```
POST /api/users/
Body: {
  "username": "john_staff",
  "email": "john@example.com",
  "phone_number": "08123456789",
  "assigned_branch": 1,
  "is_verified": false
}
```
**Permissions**: Owner only

### Verify staff member
```
POST /api/users/{id}/verify/
```
**Permissions**: Owner only  
**Effect**: Staff's transactions will auto-verify

### Unverify staff member
```
POST /api/users/{id}/unverify/
```
**Permissions**: Owner only

---

## 5. Ingestion Logs

### List ingestion logs
```
GET /api/ingestion-logs/
```
**Filters**: `source` (WHATSAPP, EMAIL, MANUAL), `status` (PENDING, SUCCESS, FAILED)  
**Ordering**: `-created_at`  
**Permissions**: Owner only

---

## 6. Webhook Endpoints (API Key Protected)

### Email Webhook
```
POST /webhooks/email/
Header: X-API-Key: {INGESTION_API_KEY}
Body: {
  "branch_id": 1,
  "category_id": 1,
  "amount": "50000",
  "transaction_type": "INCOME",
  "description": "Laundry service from email",
  "date": "2026-01-07",
  "source_identifier": "sender@gmail.com"
}
```
**Response**: 201 Created with transaction_id

### WhatsApp Webhook
```
POST /webhooks/whatsapp/
Header: X-API-Key: {INGESTION_API_KEY}
Body: {
  "branch_id": 1,
  "phone_number": "08123456789",
  "message": "pendapatan 50000 cuci baju"
}
```
**Response**: 202 Accepted (queued for processing)

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or missing API key"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error message"
}
```

---

## Pagination
Default page size: 50 items  
Request next page: `?page=2`

---

## Development Setup

### Run migrations
```bash
python backend/manage.py migrate
```

### Create superuser (owner)
```bash
python backend/manage.py createsuperuser
```

### Run development server
```bash
python backend/manage.py runserver
```

Server runs at: `http://localhost:8000/`

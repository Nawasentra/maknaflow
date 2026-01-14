# ⚡ WhatsApp Integration - Quick Action Items

**Status:** 2 bugs fixed, ready for configuration  
**Time to completion:** ~60 minutes

---

## 🚨 What Was Wrong

❌ **Django user lookup was broken:** Looking for `profile__phone_number` (field doesn't exist)  
❌ **Bot sending wrong data format:** Sending branch names & category names instead of IDs

---

## ✅ What Was Fixed

✅ **Django code fixed** - Now uses correct `phone_number` field  
✅ **Bot code updated** - Now maps names to IDs before sending

---

## 🎬 ACTION ITEMS (Do This Now)

### ACTION 1️⃣: Set Up Database [30 minutes]

```
Goal: Create branches, categories, staff user in Django
Priority: CRITICAL - Cannot test without this
```

**Steps:**

1. Start Django server:

   ```bash
   cd /Users/abellams/Desktop/01\ Projects/MaknaFlow/backend
   python manage.py runserver
   ```

2. Open browser: `http://127.0.0.1:8000/admin/`
3. Login with: `admin` / (your password)

4. **Create Branches** (Admin → Branches → Add):

   - [ ] Name: "Laundry Bosku Babelan" | Type: LAUNDRY | ID: \_\_\_\_
   - [ ] Name: "Laundry Bosku Kedaung" | Type: LAUNDRY | ID: \_\_\_\_
   - [ ] Name: "CARWASH" | Type: CARWASH | ID: \_\_\_\_
   - [ ] Name: "KOS" | Type: KOS | ID: \_\_\_\_

5. **Create Categories** (Admin → Categories → Add):

   - [ ] Name: "Detergent" | Type: EXPENSE | ID: \_\_\_\_
   - [ ] Name: "Listrik" | Type: EXPENSE | ID: \_\_\_\_
   - [ ] Name: "Cuci Kiloan" | Type: INCOME | ID: \_\_\_\_
   - [ ] Name: "Bensin" | Type: EXPENSE | ID: \_\_\_\_
   - [ ] Name: "Servis" | Type: EXPENSE | ID: \_\_\_\_
   - [ ] Name: "Makanan" | Type: EXPENSE | ID: \_\_\_\_
   - Add more as needed...

6. **Create Staff User** (Admin → Users → Add):
   - [ ] Username: `staff_john` (or your staff name)
   - [ ] Email: staff@maknaflow.test
   - [ ] Password: (secure password)
   - [ ] ✅ Staff Status: CHECKED
   - [ ] ✅ Active: CHECKED
   - [ ] Phone Number: `628123456789` (match WhatsApp number, use format: 628xxx)
   - [ ] Assigned Branch: (select one)
   - [ ] Is Verified: (check if auto-approve desired)

---

### ACTION 2️⃣: Configure Bot [10 minutes]

```
Goal: Update index.js with correct database IDs
Priority: CRITICAL - Bot cannot send without this
```

**File:** `/Users/abellams/Desktop/01 Projects/MaknaFlow/whatsapp-service/index.js`

**Find these lines (around line 15):**

```javascript
const BRANCH_MAPPING = {
  "Laundry Bosku Babelan": 1, // ← Update
  "Laundry Bosku Kedaung": 2, // ← Update
  CARWASH: 3, // ← Update
  KOS: 4, // ← Update
};

const CATEGORY_MAPPING = {
  Detergent: 1, // ← Update
  Listrik: 2, // ← Update
  "Cuci Kiloan": 3, // ← Update
  Bensin: 4, // ← Update
  Servis: 5, // ← Update
  Makanan: 6, // ← Update
};
```

**Replace the numbers with IDs from ACTION 1:**

- Use the IDs you noted in your checkboxes above
- Make sure they match exactly

**Example:**
If you see in Django Admin:

```
1 | Laundry Bosku Babelan
2 | Laundry Bosku Kedaung
1 | Detergent
2 | Listrik
```

Then update to:

```javascript
const BRANCH_MAPPING = {
    'Laundry Bosku Babelan': 1,
    'Laundry Bosku Kedaung': 2,
    ...
};

const CATEGORY_MAPPING = {
    'Detergent': 1,
    'Listrik': 2,
    ...
};
```

---

### ACTION 3️⃣: Quick Verification Test [10 minutes]

```
Goal: Verify API works before testing full bot
Priority: HIGH - Catch issues early
```

**In a terminal, run:**

```bash
curl -X POST http://127.0.0.1:8000/api/ingestion/internal-wa/ \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "628123456789",
    "branch_id": 1,
    "category_id": 1,
    "type": "INCOME",
    "amount": 50000,
    "notes": "Test from curl"
  }'
```

**Expected response (Success):**

```json
{
  "message": "Transaksi berhasil disimpan",
  "id": 1
}
```

**If you get error, check:**

- ✗ "Nomor tidak terdaftar": Staff user phone doesn't match
- ✗ "Category matching query": ID in curl doesn't exist
- ✗ "Branch matching query": ID in curl doesn't exist

---

### ACTION 4️⃣: Test WhatsApp Bot [20 minutes]

```
Goal: Test full conversation flow
Priority: HIGH - Final validation
```

**Terminal 1: Django still running (from ACTION 1)**

**Terminal 2: Start WhatsApp Bot**

```bash
cd /Users/abellams/Desktop/01\ Projects/MaknaFlow/whatsapp-service
npm start
```

You should see:

```
MaknaFlow Bot Siap (Mode Tanpa Gambar & Multi-Cabang)!
```

**Send Message:** Open WhatsApp, send `/lapor` to bot

**Follow the conversation:**

```
Bot: Halo Staff! Pilih Unit Bisnis:
     1. Laundry
     2. Carwash
     3. Kos
You: 1

Bot: Pilih Cabang Laundry:
     1. Laundry Bosku Babelan
     2. Laundry Bosku Kedaung
You: 1

Bot: Masukan Tipe:
     1. INCOME (Pemasukan)
     2. EXPENSE (Pengeluaran)
You: 1

Bot: Masukkan Kategori:
You: Cuci Kiloan

Bot: Masukkan Nominal:
You: 50000

Bot: Ada catatan tambahan?
You: Test transaction

Bot: ⏳ Sedang menyimpan data ke MaknaFlow...
Bot: ✅ Sukses! Transaksi ID: X berhasil disimpan.
```

---

### ACTION 5️⃣: Verify Data Reached Database [10 minutes]

```
Goal: Confirm transaction saved successfully
Priority: CRITICAL - Final check
```

**In terminal, run:**

```bash
cd /Users/abellams/Desktop/01\ Projects/MaknaFlow/backend
sqlite3 db.sqlite3 "SELECT id, amount, category_id, branch_id, source, created_at FROM app_transaction ORDER BY created_at DESC LIMIT 3;"
```

**You should see:**

```
1|50000|1|1|WHATSAPP_INTERNAL|2026-01-13 ...
```

---

## 🎯 Success Criteria

After all 5 actions, check:

- [ ] Django Admin shows 4 branches
- [ ] Django Admin shows 6+ categories
- [ ] Django Admin shows staff user with phone number
- [ ] index.js updated with correct IDs
- [ ] curl test returned success (ID: 1)
- [ ] WhatsApp bot starts without errors
- [ ] Bot conversation completes with "Sukses!"
- [ ] New transaction visible in database
- [ ] IngestionLog shows SUCCESS

---

## 🆘 Quick Troubleshooting

| Problem                   | Solution                                                     |
| ------------------------- | ------------------------------------------------------------ |
| "Nomor tidak terdaftar"   | Staff user with that phone number doesn't exist in Django    |
| "Category matching query" | Category ID in index.js doesn't exist, check Django Admin    |
| "Branch matching query"   | Branch ID in index.js doesn't exist, check Django Admin      |
| Bot doesn't respond       | Django not running, check http://127.0.0.1:8000 returns page |
| Phone number mismatch     | Make sure format is exactly `628xxx` with no + or spaces     |
| curl returns error 500    | Check Django console for stack trace                         |

---

## 📱 Reference Info

**Database file:** `/Users/abellams/Desktop/01 Projects/MaknaFlow/backend/db.sqlite3`

**Admin URL:** `http://127.0.0.1:8000/admin/`

**API URL:** `http://127.0.0.1:8000/api/ingestion/internal-wa/`

**Files to edit:**

1. [whatsapp-service/index.js](whatsapp-service/index.js) - Update IDs
2. ✅ [backend/app/views.py](backend/app/views.py#L775) - Already fixed

**Logs to check:**

- Django console output (errors)
- WhatsApp bot console output (debug messages starting with 📤)
- Database IngestionLog table

---

## ⏱️ Time Estimate

| Action                      | Time        | Status         |
| --------------------------- | ----------- | -------------- |
| ACTION 1: Database setup    | 30 min      | ⏳ START HERE  |
| ACTION 2: Configure bot     | 10 min      | After ACTION 1 |
| ACTION 3: API test          | 10 min      | After ACTION 2 |
| ACTION 4: Full bot test     | 20 min      | After ACTION 3 |
| ACTION 5: Data verification | 10 min      | After ACTION 4 |
| **TOTAL**                   | **~80 min** |                |

---

## ✅ Done!

After completing all 5 actions, WhatsApp Bot data **WILL** successfully reach Django database.

Next: You can proceed with owner verification, reporting, and analytics.

---

**Start with ACTION 1️⃣ now!**

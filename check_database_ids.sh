#!/bin/bash
# Script untuk membantu Anda menemukan ID yang benar di database
# Usage: bash check_database_ids.sh

echo "=========================================="
echo "MaknaFlow Database ID Checker"
echo "=========================================="
echo ""

# Make sure we're in the right directory
cd "$(dirname "$0")/backend" || { echo "Error: backend/ not found"; exit 1; }

# Run the Django shell script
python manage.py shell << EOF

print("\n" + "="*50)
print("📊 BRANCH IDs")
print("="*50)

from app.models import Branch
for branch in Branch.objects.all():
    print(f"  ID: {branch.id:2d}  |  Name: '{branch.name}'  |  Type: {branch.branch_type}")

print("\n" + "="*50)
print("📂 CATEGORY IDs")
print("="*50)

from app.models import Category
for category in Category.objects.all().order_by('transaction_type', 'name'):
    print(f"  ID: {category.id:2d}  |  Name: '{category.name}'  |  Type: {category.transaction_type}")

print("\n" + "="*50)
print("👥 STAFF USERS")
print("="*50)

from app.models import User
staff_users = User.objects.filter(is_staff=True)
if not staff_users.exists():
    print("  ⚠️  No staff users found!")
else:
    for user in staff_users:
        branch = user.assigned_branch.name if user.assigned_branch else "NOT SET"
        verified = "✅" if user.is_verified else "❌"
        print(f"  {verified} {user.username:15s} | Phone: {user.phone_number or 'NOT SET':15s} | Branch: {branch}")

print("\n" + "="*50)
print("📝 RECENT INGESTION LOGS")
print("="*50)

from app.models import IngestionLog
logs = IngestionLog.objects.order_by('-created_at')[:5]
if not logs.exists():
    print("  No logs yet")
else:
    for log in logs:
        status_emoji = "✅" if log.status == "SUCCESS" else "❌" if log.status == "FAILED" else "⏳"
        print(f"  {status_emoji} [{log.id}] {log.source:15s} | {log.status:10s} | {log.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        if log.error_message:
            print(f"     Error: {log.error_message}")

print("\n" + "="*50)
print("✨ Ready to configure whatsapp-service/index.js")
print("="*50 + "\n")

EOF

echo ""
echo "Next step: Update the following in whatsapp-service/index.js:"
echo ""
echo "const BRANCH_MAPPING = {"
echo "    'Laundry Bosku Babelan': ID_FROM_ABOVE,"
echo "    'Laundry Bosku Kedaung': ID_FROM_ABOVE,"
echo "    'CARWASH': ID_FROM_ABOVE,"
echo "    'KOS': ID_FROM_ABOVE"
echo "};"
echo ""
echo "const CATEGORY_MAPPING = {"
echo "    'Detergent': ID_FROM_ABOVE,"
echo "    'Listrik': ID_FROM_ABOVE,"
echo "    // ... etc"
echo "};"
echo ""

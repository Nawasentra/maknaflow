from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, Branch, Category, Transaction, IngestionLog, DailySummary, UserPhoneNumber, UserBranchAssignment, UserLineID
)

class UserPhoneNumberInline(admin.TabularInline):
    model = UserPhoneNumber
    extra = 1

class UserBranchAssignmentInline(admin.TabularInline):
    model = UserBranchAssignment
    extra = 1

class UserLineIDInline(admin.TabularInline):
    model = UserLineID
    extra = 1



@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'branch_type', 'address', 'created_at']
    list_filter = ['branch_type', 'created_at']
    search_fields = ['name', 'address']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'branch_type', 'address')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'transaction_type', 'get_branches', 'created_at']
    list_filter = ['transaction_type', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']

    def get_branches(self, obj):
        return ", ".join([b.name for b in obj.branches.all()])
    get_branches.short_description = 'Branches'


def link_categories_to_branches(modeladmin, request, queryset):
    for t in queryset:
        t.category.branches.add(t.branch)
link_categories_to_branches.short_description = "Link selected categories to branches"


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'date', 'branch_name', 'amount', 'transaction_type', 
        'category_name', 'payment_method', 'reported_by', 'is_verified', 'source', 'created_at'
    ]
    list_filter = [
        'transaction_type', 'payment_method', 'source', 'is_verified', 'is_valid',
        'date', 'created_at', 'branch'
    ]
    search_fields = [
        'description', 'branch__name', 'category__name',
        'reported_by__email', 'reported_by__username'
    ]
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Transaction Details', {
            'fields': (
                'branch', 'date', 'amount', 'transaction_type', 
                'category', 'payment_method', 'description'
            )
        }),
        ('Tracking', {
            'fields': (
                'reported_by', 'is_verified', 'source', 'source_identifier'
            )
        }),
        ('Status', {
            'fields': ('is_valid', 'voided_by', 'voided_at')
        }),
        ('Evidence', {
            'fields': ('evidence_image',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('branch', 'category', 'reported_by', 'voided_by')

    def branch_name(self, obj):
        return obj.branch.name
    branch_name.short_description = 'Branch'

    def category_name(self, obj):
        return obj.category.name
    category_name.short_description = 'Category'

    actions = [link_categories_to_branches]


@admin.register(IngestionLog)
class IngestionLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'source', 'status', 'created_transaction', 'created_at']
    list_filter = ['source', 'status', 'created_at']
    search_fields = [
        'raw_payload', 'error_message', 
        'created_transaction__description'
    ]
    readonly_fields = ['created_at', 'updated_at', 'raw_payload_display']
    date_hierarchy = 'created_at'
    actions = ['delete_failed_logs', 'delete_with_transactions']
    
    fieldsets = (
        ('Log Information', {
            'fields': ('source', 'status', 'created_transaction')
        }),
        ('Raw Payload', {
            'fields': ('raw_payload_display',),
            'classes': ('collapse',)
        }),
        ('Error Information', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_error(self, obj):
        return bool(obj.error_message)
    has_error.boolean = True
    has_error.short_description = 'Has Error'
    
    def raw_payload_display(self, obj):
        """Display raw payload as formatted JSON."""
        import json
        if obj.raw_payload:
            return json.dumps(obj.raw_payload, indent=2, ensure_ascii=False)
        return "No payload"
    raw_payload_display.short_description = 'Raw Payload (JSON)'
    
    def delete_failed_logs(self, request, queryset):
        """Delete only failed logs."""
        failed = queryset.filter(status='FAILED')
        count = failed.count()
        failed.delete()
        self.message_user(request, f'Deleted {count} failed log(s).')
    delete_failed_logs.short_description = 'Delete selected failed logs'
    
    def delete_with_transactions(self, request, queryset):
        """Delete logs and their related transactions."""
        from django.db import transaction as db_transaction
        
        with db_transaction.atomic():
            transactions_to_delete = []
            for log in queryset:
                if log.created_transaction:
                    transactions_to_delete.append(log.created_transaction.id)
            
            # Delete transactions first
            Transaction.objects.filter(id__in=transactions_to_delete).delete()
            # Then delete logs
            count = queryset.delete()[0]
            
        self.message_user(
            request, 
            f'Deleted {count} log(s) and {len(transactions_to_delete)} transaction(s).'
        )
    delete_with_transactions.short_description = 'Delete logs and related transactions'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('created_transaction')

@admin.register(DailySummary)
class DailySummaryAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'date', 'branch', 'source', 'total_collected',
        'cash_amount', 'qris_amount', 'transfer_amount', 'created_at'
    ]
    list_filter = ['source', 'date', 'branch', 'created_at']
    search_fields = ['branch__name']
    readonly_fields = ['created_at', 'updated_at', 'raw_data_display']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Summary Information', {
            'fields': ('branch', 'date', 'source')
        }),
        ('Sales Totals', {
            'fields': (
                'gross_sales', 'total_discount', 'net_sales',
                'total_tax', 'total_collected'
            )
        }),
        ('Payment Breakdown', {
            'fields': ('cash_amount', 'qris_amount', 'transfer_amount')
        }),
        ('Raw Data', {
            'fields': ('raw_data_display',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('ingestion_log', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def raw_data_display(self, obj):
        """Display raw data as formatted JSON."""
        import json
        if obj.raw_data:
            return json.dumps(obj.raw_data, indent=2, ensure_ascii=False)
        return "No data"
    raw_data_display.short_description = 'Raw Data (JSON)'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('branch', 'ingestion_log')

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # 1. Menampilkan kolom tambahan di tabel daftar user (List View)
    list_display = UserAdmin.list_display + ('phone_number', 'assigned_branch', 'is_verified', 'is_staff')
    
    # 2. Menambahkan fitur filter di sidebar kanan
    list_filter = UserAdmin.list_filter + ('assigned_branch', 'is_verified')
    
    # 3. Menambahkan kolom pencarian berdasarkan nomor HP
    search_fields = UserAdmin.search_fields + ('phone_number',)
    
    # 4. Memunculkan form input di halaman Edit User
    fieldsets = UserAdmin.fieldsets + (
        ('Staff Information', {
            'fields': ('phone_number', 'assigned_branch', 'is_verified'),
            'description': 'Informasi khusus untuk Staff MaknaFlow (WhatsApp Bot & Cabang)'
        }),
    )
    
    # 5. Memunculkan form input saat membuat user baru (Add User Page)
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Staff Information', {
            'fields': ('phone_number', 'assigned_branch', 'is_verified'),
        }),
    )

    inlines = [UserPhoneNumberInline, UserBranchAssignmentInline, UserLineIDInline]

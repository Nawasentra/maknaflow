from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, Branch, Category, Transaction, IngestionLog, DailySummary, StaffIdentity
)

# --- INLINE UNTUK STAFF IDENTITY ---
class StaffIdentityInline(admin.TabularInline):
    model = StaffIdentity
    extra = 1  # Tampilkan 1 baris kosong siap isi
    verbose_name = "Nomor WhatsApp / LID"
    verbose_name_plural = "Daftar Nomor WhatsApp & LID"

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Setup Tampilan List
    # HAPUS 'phone_number' dan 'assigned_branch', GANTI dengan helper function
    list_display = ('username', 'first_name', 'jabatan', 'is_verified', 'get_branches_count', 'get_identities_count')
    
    # GANTI 'assigned_branch' (singular) menjadi 'assigned_branches' (plural/M2M)
    list_filter = ('is_verified', 'assigned_branches', 'groups')
    
    # Search logic diupdate agar mencari ke dalam tabel identities
    search_fields = ('username', 'first_name', 'identities__identifier')
    
    # Setup Halaman Edit
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email', 'jabatan')}),
        ('Akses Cabang & Verifikasi', {
            # Gunakan assigned_branches (plural)
            'fields': ('assigned_branches', 'is_verified'),
            'description': 'Pilih cabang mana saja yang bisa diakses user ini. Geser ke kanan untuk memilih.'
        }),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    # Agar memilih cabang tampilannya geser kanan-kiri (User Friendly)
    filter_horizontal = ('assigned_branches', 'groups', 'user_permissions')
    
    # Masukkan Inline Identity (Nomor HP) ke dalam halaman User
    inlines = [StaffIdentityInline]

    # Helper functions untuk list_display
    def get_branches_count(self, obj):
        return obj.assigned_branches.count()
    get_branches_count.short_description = 'Jumlah Cabang'

    def get_identities_count(self, obj):
        return obj.identities.count()
    get_identities_count.short_description = 'Jumlah Nomor'


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'branch_type', 'address', 'created_at']
    list_filter = ['branch_type']
    search_fields = ['name']

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'transaction_type', 'get_branches']
    list_filter = ['transaction_type']
    filter_horizontal = ('branches',) # Agar mudah pilih branch

    def get_branches(self, obj):
        return ", ".join([b.name for b in obj.branches.all()])

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        'date', 'branch', 'amount', 'transaction_type', 
        'category', 'payment_method', 'reported_by', 'is_verified'
    ]
    list_filter = ['transaction_type', 'branch', 'is_verified', 'date']
    search_fields = ['description', 'branch__name', 'reported_by__username']
    date_hierarchy = 'date'

@admin.register(IngestionLog)
class IngestionLogAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'source', 'status', 'created_transaction']
    list_filter = ['status', 'source']

@admin.register(DailySummary)
class DailySummaryAdmin(admin.ModelAdmin):
    list_display = ['date', 'branch', 'source', 'total_collected']
    list_filter = ['date', 'branch', 'source']
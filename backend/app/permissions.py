from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Permission to check if user is the owner (superuser)
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class IsStaffOrOwner(permissions.BasePermission):
    """
    Permission to check if user is staff or owner
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Owner can access everything
        if request.user.is_superuser:
            return True
        
        # For staff accessing transactions/reports from their branch
        if hasattr(obj, 'branch') and obj.branch == request.user.assigned_branch:
            return True
        
        return False


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission to allow only owners to edit, others can view
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_superuser

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_superuser


class CanVerifyTransaction(permissions.BasePermission):
    """
    Only owner can verify transactions, unless the transaction is from verified staff
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Only owner can verify
        if 'verify' in request.path and not request.user.is_superuser:
            return False
        
        # Staff can only modify their own branch transactions
        if hasattr(obj, 'branch') and obj.branch != request.user.assigned_branch:
            if not request.user.is_superuser:
                return False
        
        return True

import logging
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from rest_framework.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)

class OwnerOnlyAdapter(DefaultSocialAccountAdapter):
    """
    Overrides the default adapter to enforce an 'Owner Only' policy
    If the email trying to log in via Google doesn't match the
    settings.ALLOWED_EMAILS (or isn't already a staff/superuser), login will be rejected
    """

    def pre_social_login(self, request, sociallogin):
        # Get the email from the Google provider data
        email = sociallogin.account.extra_data.get('email')

        # Check if the email exists
        if not email:
            raise ValidationError("No email found in social account data")

        # Check against Whitelist
        # A. Is the email explicitly in ALLOWED_EMAILS in settings?
        # B. Does a user with this email already exist and satisfy is_staff/is_superuser?
        allowed_emails = getattr(settings, 'ALLOWED_EMAILS', [])

        # Check explicit whitelist
        if email in allowed_emails:
            return  # Access Granted

        # Check if user exists in DB and has privileges (e.g. added via Admin manually)
        try:
            user = User.objects.get(email=email)
            if user.is_staff or user.is_superuser:
                return  # Access Granted
        except User.DoesNotExist:
            pass

        # If neither condition met, Reject
        logger.warning(f"Blocking login attempt from unauthorized email: {email}")
        raise ValidationError("Access Denied: You are not authorized to access MaknaFlow")
import logging
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.exceptions import ImmediateHttpResponse
from django.shortcuts import redirect
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)

class OwnerOnlyAdapter(DefaultSocialAccountAdapter):
    """
    Custom adapter to restrict Google OAuth sign-ups to owner emails only
    Only allowed users can sign up via Google OAuth
    """

    def pre_social_login(self, request, sociallogin):
        """
        Invoked just after a user successfully authenticates via a social provider,
        but before the login is fully processed
        """
        # Get the email from the social account
        email = sociallogin.account.extra_data.get('email', '').lower()

        # Check if email is in the owner whitelist
        owner_emails = [e.lower() for e in settings.OWNER_EMAILS if e]

        if not owner_emails:
            logger.error("OWNER_EMAILS not configured in settings")
            messages.error(request, "Google authentication is not properly configured")
            raise ImmediateHttpResponse(redirect('/'))

        if email not in owner_emails:
            logger.warning(f"Unauthorized Google login attempt from: {email}")
            messages.error(
                request,
                "Access denied. Only authorized administrators can log in with Google"
            )
            raise ImmediateHttpResponse(redirect('/'))

        # Allow the login to proceed for authorized owners
        logger.info(f"Authorized owner logged in via Google: {email}")

    def is_auto_signup_allowed(self, request, sociallogin):
        """
        Return True if automatic signup is allowed for this social account
        Only owners can auto-signup
        """
        email = sociallogin.account.extra_data.get('email', '').lower()
        owner_emails = [e.lower() for e in settings.OWNER_EMAILS if e]
        return email in owner_emails

    def populate_user(self, request, sociallogin, data):
        """
        Populate user information from social account data
        """
        user = super().populate_user(request, sociallogin, data)

        # Set user as staff and superuser if they're an owner
        email = data.get('email', '').lower()
        owner_emails = [e.lower() for e in settings.OWNER_EMAILS if e]

        if email in owner_emails:
            user.is_staff = True
            user.is_superuser = True
            logger.info(f"Owner account created/updated: {email}")

        return user

    def save_user(self, request, sociallogin, form=None):
        """
        Save the user after Google authentication
        """
        user = super().save_user(request, sociallogin, form)

        # Ensure owner status is set
        email = user.email.lower()
        owner_emails = [e.lower() for e in settings.OWNER_EMAILS if e]

        if email in owner_emails:
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.save()
            logger.info(f"Owner permissions set for: {email}")

        return user
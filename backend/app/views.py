from django.http import HttpResponse
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from decouple import config

def home(request):
    return HttpResponse("Hello, world!")

class GoogleLogin(SocialLoginView):
    """
    Google OAuth2 login view for dj-rest-auth
    Ensure callback_url matches the frontend and Google Console settings
    """
    adapter_class = GoogleOAuth2Adapter
    callback_url = config('GOOGLE_OAUTH_CALLBACK_URL', default='http://localhost:5173')
    client_class = OAuth2Client
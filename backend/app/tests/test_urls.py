from django.urls import resolve, reverse
from app.views import EmailIngestionWebhook, home, GoogleLogin, HealthCheckView
from app import urls as app_urls
from django.test import TestCase

class UrlsTestCase(TestCase):
    def test_home_url(self):
        resolver = resolve('/')
        self.assertEqual(resolver.func.__name__, app_urls.home.__name__)

    def test_webhook_url(self):
        resolver = resolve('/webhooks/make/')
        self.assertEqual(resolver.func.view_class, EmailIngestionWebhook)

    def test_home_reverse(self):
        url = reverse('home')
        self.assertEqual(url, '/')

    def test_webhook_reverse(self):
        url = reverse('webhook-make')
        self.assertEqual(url, '/webhooks/make/')

    def test_health_check_url(self):
        resolver = resolve('/health/')
        self.assertEqual(resolver.func.view_class, HealthCheckView)

    def test_health_check_reverse(self):
        url = reverse('health-check')
        self.assertEqual(url, '/health/')

def test_home_url_resolves():
    resolver = resolve('/')
    assert resolver.func == home

def test_google_login_url_resolves():
    resolver = resolve('/auth/google/')
    assert resolver.func.view_class == GoogleLogin

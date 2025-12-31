from django.urls import resolve, reverse
from app.views import EmailIngestionWebhook
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
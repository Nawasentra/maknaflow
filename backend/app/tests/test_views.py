from django.test import TestCase, Client, override_settings
from django.urls import reverse
from unittest.mock import patch
import pytest

class EmailIngestionWebhookTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = reverse('webhook-make')
        self.api_key = 'testkey'
        self.valid_payload = {
            "sender": "test@gmail.com",
            "subject": "LUNA POS Daily Report",
            "text_body": "LUNA POS ..."
        }

    @override_settings(INGESTION_API_KEY='testkey')
    def test_unauthorized(self):
        response = self.client.post(self.url, self.valid_payload, content_type='application/json')
        self.assertEqual(response.status_code, 401)
        self.assertIn("Unauthorized", response.json().get("error", ""))

    @override_settings(INGESTION_API_KEY='testkey')
    def test_invalid_payload(self):
        headers = {'HTTP_X_API_KEY': self.api_key}
        response = self.client.post(self.url, {}, content_type='application/json', **headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())

    @override_settings(INGESTION_API_KEY='testkey')
    @patch('app.views.EmailWebhookService.process_payload')
    def test_successful_post(self, mock_process):
        mock_process.return_value = "Created 1 transaction."
        headers = {'HTTP_X_API_KEY': self.api_key}
        response = self.client.post(self.url, self.valid_payload, content_type='application/json', **headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")
        self.assertIn("Created 1 transaction", response.json()["message"])

    @override_settings(INGESTION_API_KEY='testkey')
    @patch('app.views.EmailWebhookService.process_payload')
    def test_processing_error(self, mock_process):
        mock_process.side_effect = Exception("Processing failed")
        headers = {'HTTP_X_API_KEY': self.api_key}
        response = self.client.post(self.url, self.valid_payload, content_type='application/json', **headers)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["status"], "error")
        self.assertIn("Processing failed", response.json()["message"])

    def test_home_view(self):
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertIn("MaknaFlow API is running", response.content.decode())

@pytest.mark.django_db
def test_home_view(client):
    url = reverse('home')
    response = client.get(url)
    assert response.status_code == 200
    assert b"Hello, world!" in response.content

def test_google_login_view_exists(client):
    url = reverse('google_login')
    response = client.options(url)
    # OPTIONS should be allowed, actual POST requires OAuth flow
    assert response.status_code in [200, 405]

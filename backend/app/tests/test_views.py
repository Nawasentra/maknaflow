from django.test import TestCase, Client, override_settings
from django.urls import reverse
from django.utils import timezone
from unittest.mock import patch
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from app.models import (
    Branch, Category, Transaction, User, IngestionLog,
    TransactionSource, IngestionStatus, TransactionType, BranchType
)


# ==========================================
# EMAIL INGESTION WEBHOOK TESTS
# ==========================================

class EmailIngestionWebhookTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = reverse('email-webhook')  # Use reverse with correct name
        self.api_key = 'testkey'
        self.valid_payload = {
            "sender": "test@gmail.com",
            "subject": "LUNA POS Daily Report",
            "text_body": "LUNA POS ..."
        }

    @override_settings(INGESTION_API_KEY='')
    def test_missing_api_key_configuration(self):
        """Test that empty INGESTION_API_KEY returns server misconfiguration"""
        headers = {'HTTP_X_API_KEY': 'somekey'}
        response = self.client.post(self.url, self.valid_payload, content_type='application/json', **headers)
        self.assertEqual(response.status_code, 500)
        self.assertIn("Server misconfiguration", response.json().get("error", ""))

    @override_settings(INGESTION_API_KEY='testkey')
    def test_unauthorized(self):
        """Test that missing or wrong API key returns 401"""
        response = self.client.post(self.url, self.valid_payload, content_type='application/json')
        self.assertEqual(response.status_code, 401)
        self.assertIn("Unauthorized", response.json().get("error", ""))

    @override_settings(INGESTION_API_KEY='testkey')
    def test_invalid_payload(self):
        """Test that invalid payload returns 400"""
        headers = {'HTTP_X_API_KEY': self.api_key}
        response = self.client.post(self.url, {}, content_type='application/json', **headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())

    @override_settings(INGESTION_API_KEY='testkey')
    @patch('app.views.EmailWebhookService.process_payload')
    def test_successful_post(self, mock_process):
        """Test successful webhook processing"""
        mock_process.return_value = "Created 1 transaction."
        headers = {'HTTP_X_API_KEY': self.api_key}
        response = self.client.post(self.url, self.valid_payload, content_type='application/json', **headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")
        self.assertIn("Created 1 transaction", response.json()["message"])

    @override_settings(INGESTION_API_KEY='testkey')
    @patch('app.views.EmailWebhookService.process_payload')
    def test_processing_error(self, mock_process):
        """Test that processing errors are handled gracefully"""
        mock_process.side_effect = Exception("Processing failed")
        headers = {'HTTP_X_API_KEY': self.api_key}
        response = self.client.post(self.url, self.valid_payload, content_type='application/json', **headers)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["status"], "error")
        self.assertEqual(response.json()["message"], "Failed to process webhook")

    @override_settings(INGESTION_API_KEY='testkey')
    @patch('app.views.EmailWebhookService.process_payload')
    def test_ingestion_log_created(self, mock_process):
        """Test that ingestion log is created"""
        mock_process.return_value = "Success"
        headers = {'HTTP_X_API_KEY': self.api_key}
        
        initial_count = IngestionLog.objects.count()
        response = self.client.post(self.url, self.valid_payload, content_type='application/json', **headers)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(IngestionLog.objects.count(), initial_count + 1)
        
        log = IngestionLog.objects.latest('created_at')
        self.assertEqual(log.source, TransactionSource.EMAIL)
        self.assertEqual(log.status, IngestionStatus.SUCCESS)


# ==========================================
# WHATSAPP WEBHOOK TESTS
# ==========================================

class WhatsAppWebhookTestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('whatsapp-webhook')
        self.api_key = 'testkey'
        
        self.branch = Branch.objects.create(
            name='Test Branch',
            branch_type=BranchType.LAUNDRY,
            address='Test Address'
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass',
            phone_number='+1234567890',
            assigned_branch=self.branch
        )
        
        # Updated payload to match WhatsAppWebhookPayloadSerializer
        self.valid_payload = {
            'phone_number': '+1234567890',
            'message': 'Transaction: 100000',
            'branch_id': self.branch.id  # Add branch_id as required by serializer
        }

    @override_settings(INGESTION_API_KEY='')
    def test_missing_api_key_configuration(self):
        """Test that empty INGESTION_API_KEY returns server misconfiguration"""
        self.client.credentials(HTTP_X_API_KEY='somekey')
        response = self.client.post(self.url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, 500)
        self.assertIn("Server misconfiguration", response.data.get("error", ""))

    @override_settings(INGESTION_API_KEY='testkey')
    def test_unauthorized(self):
        """Test that missing or wrong API key returns 401"""
        response = self.client.post(self.url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, 401)

    @override_settings(INGESTION_API_KEY='testkey')
    def test_invalid_payload(self):
        """Test that invalid payload returns 400"""
        self.client.credentials(HTTP_X_API_KEY=self.api_key)
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'Invalid payload format')

    @override_settings(INGESTION_API_KEY='testkey')
    def test_user_not_found(self):
        """Test that non-existent user returns error"""
        self.client.credentials(HTTP_X_API_KEY=self.api_key)
        payload = {
            'phone_number': '+9999999999',
            'message': 'Test',
            'branch_id': self.branch.id
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data['error'], 'Invalid request')

    @override_settings(INGESTION_API_KEY='testkey')
    def test_user_without_branch(self):
        """Test that user without assigned branch returns error"""
        User.objects.create_user(
            username='nobranch',
            email='nobranch@example.com',
            password='testpass',
            phone_number='+1111111111'
        )
        
        self.client.credentials(HTTP_X_API_KEY=self.api_key)
        payload = {
            'phone_number': '+1111111111',
            'message': 'Test',
            'branch_id': self.branch.id
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'Invalid request')

    @override_settings(INGESTION_API_KEY='testkey')
    def test_successful_post(self):
        """Test successful webhook processing"""
        self.client.credentials(HTTP_X_API_KEY=self.api_key)
        response = self.client.post(self.url, self.valid_payload, format='json')
        
        self.assertEqual(response.status_code, 202)
        self.assertIn('WhatsApp message received', response.data['detail'])
        self.assertEqual(response.data['user'], 'testuser')
        self.assertEqual(response.data['branch'], 'Test Branch')

    @override_settings(INGESTION_API_KEY='testkey')
    def test_ingestion_log_created(self):
        """Test that ingestion log is created"""
        self.client.credentials(HTTP_X_API_KEY=self.api_key)
        
        initial_count = IngestionLog.objects.count()
        response = self.client.post(self.url, self.valid_payload, format='json')
        
        self.assertEqual(response.status_code, 202)
        self.assertEqual(IngestionLog.objects.count(), initial_count + 1)
        
        log = IngestionLog.objects.latest('created_at')
        self.assertEqual(log.source, TransactionSource.WHATSAPP)
        self.assertEqual(log.status, IngestionStatus.SUCCESS)


# ==========================================
# BRANCH VIEWSET TESTS
# ==========================================

class BranchViewSetTestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_superuser(
            username='owner',
            email='owner@example.com',
            password='ownerpass'
        )
        self.staff = User.objects.create_user(
            username='staff',
            email='staff@example.com',
            password='staffpass'
        )
        
        self.branch = Branch.objects.create(
            name='Test Branch',
            branch_type=BranchType.LAUNDRY,
            address='Test Address'
        )
        
        self.url = reverse('branch-list')
        self.detail_url = reverse('branch-detail', kwargs={'pk': self.branch.pk})

    def test_list_unauthenticated(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)

    def test_list_as_staff(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_list_as_owner(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_create_as_staff(self):
        self.client.force_authenticate(user=self.staff)
        data = {'name': 'New Branch', 'branch_type': BranchType.LAUNDRY, 'address': 'New Address'}
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, 403)

    def test_create_as_owner(self):
        self.client.force_authenticate(user=self.owner)
        data = {'name': 'New Branch', 'branch_type': BranchType.LAUNDRY, 'address': 'New Address'}
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, 201)

    def test_update_as_staff(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.patch(self.detail_url, {'name': 'Updated'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_update_as_owner(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(self.detail_url, {'name': 'Updated'}, format='json')
        self.assertEqual(response.status_code, 200)

    def test_delete_as_staff(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, 403)

    def test_delete_as_owner(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, 204)

    def test_filter_by_branch_type(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(f'{self.url}?branch_type={BranchType.LAUNDRY}')
        self.assertEqual(response.status_code, 200)

    def test_search_branches(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(f'{self.url}?search=Test')
        self.assertEqual(response.status_code, 200)


# ==========================================
# CATEGORY, TRANSACTION, USER, INGESTION LOG TESTS
# Simplified versions - add full tests as needed
# ==========================================

class CategoryViewSetTestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_superuser(username='owner', email='owner@example.com', password='pass')
        self.staff = User.objects.create_user(username='staff', email='staff@example.com', password='pass')
        self.category = Category.objects.create(name='Test Category', transaction_type=TransactionType.INCOME)
        self.url = '/api/categories/'

    def test_list_unauthenticated(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_list_as_staff(self):
        self.client.force_authenticate(user=self.staff)
        self.assertEqual(self.client.get(self.url).status_code, 200)

    def test_create_as_staff(self):
        self.client.force_authenticate(user=self.staff)
        data = {'name': 'New', 'transaction_type': TransactionType.EXPENSE}
        self.assertEqual(self.client.post(self.url, data, format='json').status_code, 403)

    def test_create_as_owner(self):
        self.client.force_authenticate(user=self.owner)
        data = {'name': 'New', 'transaction_type': TransactionType.EXPENSE}
        self.assertEqual(self.client.post(self.url, data, format='json').status_code, 201)

    def test_filter_by_transaction_type(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(f'{self.url}?transaction_type={TransactionType.INCOME}')
        self.assertEqual(response.status_code, 200)


class TransactionViewSetTestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_superuser(username='owner', email='owner@example.com', password='pass')
        self.branch = Branch.objects.create(name='Branch 1', branch_type=BranchType.LAUNDRY, address='Addr')
        self.staff = User.objects.create_user(username='staff', email='staff@example.com', password='pass', assigned_branch=self.branch)
        self.category = Category.objects.create(name='Cat', transaction_type=TransactionType.INCOME)
        self.transaction = Transaction.objects.create(
            branch=self.branch, reported_by=self.staff, amount=100000,
            transaction_type=TransactionType.INCOME, category=self.category,
            date=timezone.now().date(), description='Test'
        )
        self.url = '/api/transactions/'

    def test_list_unauthenticated(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_get_queryset_as_owner(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_get_queryset_as_staff(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_verify_transaction_as_owner(self):
        self.client.force_authenticate(user=self.owner)
        url = f'/api/transactions/{self.transaction.pk}/verify/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)

    def test_void_transaction_as_owner(self):
        self.client.force_authenticate(user=self.owner)
        url = f'/api/transactions/{self.transaction.pk}/void/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)

    def test_pending_transactions(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get('/api/transactions/pending/')
        self.assertEqual(response.status_code, 200)


class UserViewSetTestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_superuser(username='owner', email='owner@example.com', password='pass')
        self.branch = Branch.objects.create(name='Branch', branch_type=BranchType.LAUNDRY, address='Addr')
        self.staff = User.objects.create_user(username='staff', email='staff@example.com', password='pass', assigned_branch=self.branch)
        self.url = '/api/users/'

    def test_list_unauthenticated(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_profile_endpoint(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get('/api/users/profile/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['username'], 'staff')

    def test_verify_user_as_owner(self):
        self.client.force_authenticate(user=self.owner)
        url = f'/api/users/{self.staff.pk}/verify/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)

    def test_unverify_user_as_owner(self):
        self.staff.is_verified = True
        self.staff.save()
        self.client.force_authenticate(user=self.owner)
        url = f'/api/users/{self.staff.pk}/unverify/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)


class IngestionLogViewSetTestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_superuser(username='owner', email='owner@example.com', password='pass')
        self.staff = User.objects.create_user(username='staff', email='staff@example.com', password='pass')
        self.log = IngestionLog.objects.create(source=TransactionSource.EMAIL, raw_payload={'test': 'data'}, status=IngestionStatus.SUCCESS)
        self.url = '/api/ingestion-logs/'

    def test_list_unauthenticated(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_list_as_staff(self):
        self.client.force_authenticate(user=self.staff)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_list_as_owner(self):
        self.client.force_authenticate(user=self.owner)
        self.assertEqual(self.client.get(self.url).status_code, 200)

    def test_read_only(self):
        self.client.force_authenticate(user=self.owner)
        data = {'source': TransactionSource.EMAIL, 'raw_payload': {}, 'status': IngestionStatus.PENDING}
        self.assertEqual(self.client.post(self.url, data, format='json').status_code, 405)

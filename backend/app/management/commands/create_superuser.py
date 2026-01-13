from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decouple import config

User = get_user_model()

class Command(BaseCommand):
    help = 'Create a superuser for admin panel'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Superuser email')
        parser.add_argument('--username', type=str, help='Superuser username')
        parser.add_argument('--password', type=str, help='Superuser password')

    def handle(self, *args, **options):
        email = options.get('email') or config('SUPERUSER_EMAIL', default='admin@maknaflow.com')
        username = options.get('username') or config('SUPERUSER_USERNAME', default='admin')
        password = options.get('password') or config('SUPERUSER_PASSWORD', default='admin123')

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User with email {email} already exists'))
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'User with username {username} already exists'))
            return

        user = User.objects.create_superuser(
            email=email,
            username=username,
            password=password
        )

        self.stdout.write(self.style.SUCCESS(f'Superuser created successfully!'))
        self.stdout.write(self.style.SUCCESS(f'Email: {email}'))
        self.stdout.write(self.style.SUCCESS(f'Username: {username}'))
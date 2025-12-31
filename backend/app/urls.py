from django.http import HttpResponse
from django.urls import path
from .views import EmailIngestionWebhook

def home(request):
    return HttpResponse("MaknaFlow API is running.")

urlpatterns = [
    path('', home, name='home'),
    path('webhooks/make/', EmailIngestionWebhook.as_view(), name='webhook-make'),
]
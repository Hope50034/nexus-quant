from django.urls import path
from .views import (
    ViralNichesView,
    ViralVoicesView,
    ViralScriptGenerateView,
    ViralVoiceSynthesizeView
)

urlpatterns = [
    path('niches/', ViralNichesView.as_view(), name='viral-niches'),
    path('voices/', ViralVoicesView.as_view(), name='viral-voices'),
    path('generate-script/', ViralScriptGenerateView.as_view(), name='viral-generate-script'),
    path('synthesize-voice/', ViralVoiceSynthesizeView.as_view(), name='viral-synthesize-voice'),
]

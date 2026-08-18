from django.urls import path
from .views import BullishSignalList, BearishSignalList, AnalyzeSignals, AddAsset

urlpatterns = [
    path('signals/buy/', BullishSignalList.as_view(), name='buy-signals'),
    path('signals/sell/', BearishSignalList.as_view(), name='sell-signals'),
    path('signals/analyze/', AnalyzeSignals.as_view(), name='analyze-signals'),
    path('signals/add/', AddAsset.as_view(), name='add-asset'),
]
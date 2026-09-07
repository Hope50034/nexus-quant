from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BullishSignalList,
    BearishSignalList,
    AnalyzeSignals,
    AddAsset,
    VolatilityDataViewSet,
    CandleDataView,
    TriggerIngest,
    SentimentDataView,
    OrderbookDataView,
    PortfolioOptimizerView,
    PaperTradingView
)

router = DefaultRouter()
router.register(r'volatility', VolatilityDataViewSet, basename='volatility')

urlpatterns = [
    path('', include(router.urls)),
    path('signals/buy/', BullishSignalList.as_view(), name='buy-signals'),
    path('signals/sell/', BearishSignalList.as_view(), name='sell-signals'),
    path('signals/analyze/', AnalyzeSignals.as_view(), name='analyze-signals'),
    path('signals/add/', AddAsset.as_view(), name='add-asset'),
    path('tickers/add/', AddAsset.as_view(), name='add-ticker'),
    path('trigger-ingest/', TriggerIngest.as_view(), name='trigger-ingest'),
    path('candles/', CandleDataView.as_view(), name='candles-list'),
    path('candles/<str:symbol>/', CandleDataView.as_view(), name='candles-detail'),
    path('sentiment/', SentimentDataView.as_view(), name='sentiment-data'),
    path('orderbook/', OrderbookDataView.as_view(), name='orderbook-data'),
    path('portfolio-optimizer/', PortfolioOptimizerView.as_view(), name='portfolio-optimizer'),
    path('paper-trading/', PaperTradingView.as_view(), name='paper-trading'),
]
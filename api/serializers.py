from rest_framework import serializers
from .models import BullishSignal, BearishSignal


class BullishSignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = BullishSignal
        fields = '__all__'


class BearishSignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = BearishSignal
        fields = '__all__'


class VolatilityDataSerializer(serializers.Serializer):
    symbol = serializers.CharField(max_length=20)
    trade_date = serializers.CharField(max_length=20)
    close_price = serializers.FloatField()
    iv_rank = serializers.IntegerField()
    pc_ratio = serializers.CharField(max_length=20)
    implied_move = serializers.CharField(max_length=20)
    gamma_exposure = serializers.CharField(max_length=20)
    historical_volatility = serializers.CharField(max_length=20)
    implied_volatility = serializers.CharField(max_length=20)
    volume = serializers.IntegerField()
    is_high_iv = serializers.BooleanField()
    is_low_iv = serializers.BooleanField()
    is_neg_gamma = serializers.BooleanField()
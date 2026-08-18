from rest_framework import serializers
from .models import BullishSignal, BearishSignal  # Updated import

class BullishSignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = BullishSignal
        fields = '__all__'

# Add this new class
class BearishSignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = BearishSignal
        fields = '__all__'
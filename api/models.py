from django.db import models

class BullishSignal(models.Model):
    symbol = models.CharField(max_length=20, db_column='Symbol', primary_key=True)
    asset_type = models.CharField(max_length=20, db_column='AssetType')
    signal_date = models.DateField(db_column='SignalDate')
    close_price = models.DecimalField(max_digits=18, decimal_places=4, db_column='ClosePrice')
    macd = models.DecimalField(max_digits=18, decimal_places=4, db_column='MACD')
    macd_signal = models.DecimalField(max_digits=18, decimal_places=4, db_column='MACD_Signal')

    class Meta:
        managed = False
        db_table = 'vw_Bullish_MACD_Signals'

class BearishSignal(models.Model):
    symbol = models.CharField(max_length=20, db_column='Symbol', primary_key=True)
    asset_type = models.CharField(max_length=20, db_column='AssetType')
    signal_date = models.DateField(db_column='SignalDate')
    close_price = models.DecimalField(max_digits=18, decimal_places=4, db_column='ClosePrice')
    macd = models.DecimalField(max_digits=18, decimal_places=4, db_column='MACD')
    macd_signal = models.DecimalField(max_digits=18, decimal_places=4, db_column='MACD_Signal')

    class Meta:
        managed = False
        db_table = 'vw_Bearish_MACD_Signals'
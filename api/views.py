import datetime
import os
import yfinance as yf
from django.db import connection
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import BullishSignal, BearishSignal
from .serializers import BullishSignalSerializer, BearishSignalSerializer

try:
    import pandas_ta as ta
    HAS_PANDAS_TA = True
except ImportError:
    HAS_PANDAS_TA = False


def get_latest_signals(model_class):
    """
    Retrieves and deduplicates market signals from MS SQL views.
    Since MS SQL does not support .distinct('symbol'), we order by -signal_date
    and retain only the most recent signal per unique asset symbol.
    """
    raw_queryset = model_class.objects.all().order_by('-signal_date')
    seen_symbols = set()
    latest_signals = []

    for signal in raw_queryset:
        if signal.symbol not in seen_symbols:
            seen_symbols.add(signal.symbol)
            latest_signals.append(signal)

    return latest_signals


class BullishSignalList(generics.ListAPIView):
    serializer_class = BullishSignalSerializer

    def get_queryset(self):
        return get_latest_signals(BullishSignal)


class BearishSignalList(generics.ListAPIView):
    serializer_class = BearishSignalSerializer

    def get_queryset(self):
        return get_latest_signals(BearishSignal)


class AnalyzeSignals(APIView):
    """
    REST API View that receives active MACD signals in a POST body,
    formats them into a quantitative prompt, and calls Google Gemini API (SDK)
    to generate an AI market summary.
    """
    def post(self, request, *args, **kwargs):
        if isinstance(request.data, list):
            signals = request.data
            user_prompt = ''
            signal_type = 'buy'
        elif isinstance(request.data, dict):
            if 'signals' in request.data:
                signals = request.data.get('signals', [])
            else:
                signals = [request.data]
            user_prompt = request.data.get('prompt', '')
            signal_type = request.data.get('signalType', 'buy')
        else:
            signals = []
            user_prompt = ''
            signal_type = 'buy'

        # 1. Format signals into a clean text prompt
        signal_summary_lines = []
        for s in signals[:15]:  # Analyze top 15 active signals
            symbol = s.get('symbol', 'N/A')
            asset_type = s.get('asset_type', 'N/A')
            price = s.get('close_price', '0')
            macd = s.get('macd', '0')
            macd_sig = s.get('macd_signal', '0')
            date = s.get('signal_date', 'N/A')
            signal_summary_lines.append(
                f"- Symbol: {symbol} ({asset_type}) | Close: ${price} | MACD: {macd} | Signal: {macd_sig} | Date: {date}"
            )

        formatted_signals_text = "\n".join(signal_summary_lines)

        system_prompt = (
            f"You are a Principal Quantitative Risk Strategist for NEXUS QUANT.\n"
            f"Analyze the following {len(signals)} algorithmic MACD market signals ({signal_type.upper()} Mode):\n\n"
            f"{formatted_signals_text}\n\n"
            f"User Prompt / Query: {user_prompt or 'Provide a quantitative summary, risk assessment, and momentum forecast.'}\n\n"
            f"Format your response as a professional terminal report with clear sections."
        )

        # 2. Call Google Generative AI SDK (with placeholder for API Key)
        api_key = os.environ.get('GEMINI_API_KEY', 'YOUR_GEMINI_API_KEY_HERE')

        if GENAI_AVAILABLE and api_key and api_key != 'YOUR_GEMINI_API_KEY_HERE':
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-flash')
                response = model.generate_content(system_prompt)
                analysis_result = response.text
            except Exception as e:
                analysis_result = f"Error calling Gemini API: {str(e)}\n\n" + self._generate_fallback(signals, signal_type, user_prompt)
        else:
            analysis_result = self._generate_fallback(signals, signal_type, user_prompt)

        return Response({'analysis': analysis_result}, status=status.HTTP_200_OK)

    def _generate_fallback(self, signals, signal_type, user_prompt):
        mode_str = signal_type.upper()
        count = len(signals)
        top_symbol = signals[0].get('symbol', 'N/A') if signals else 'N/A'

        return (
            f"[NEXUS QUANT // GEMINI ENGINE ONLINE]\n"
            f"--------------------------------------------------\n"
            f"MODE: {mode_str} SIGNAL MATRIX\n"
            f"ACTIVE SIGNALS ANALYZED: {count} Assets\n"
            f"PRIMARY MOMENTUM VECTOR: {top_symbol}\n\n"
            f"QUANTITATIVE SYNTHESIS:\n"
            f"1. {mode_str} crossovers demonstrate active momentum across {count} assets in the market universe.\n"
            f"2. Risk Management: Maintain strict trailing stops relative to key exponential moving averages.\n"
            f"3. Note: To enable live LLM generation, configure your GEMINI_API_KEY environment variable.\n\n"
            f"User Query Context: {user_prompt or 'Automated Signal Scan'}"
        )


class AddAsset(APIView):
    """
    REST API View that receives a ticker symbol in a POST body {"symbol": "TICKER"},
    fetches live price action via yfinance, calculates technical MACD indicators,
    upserts into the MarketPrices table, and returns the newly created signal JSON object.
    """
    def post(self, request, *args, **kwargs):
        ticker_symbol = request.data.get('symbol', '').strip().upper()
        if not ticker_symbol:
            return Response({'error': 'Ticker symbol is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            today_date = datetime.date.today()

            # Determine asset type heuristic
            if 'USD' in ticker_symbol or ticker_symbol in ['BTC', 'ETH', 'SOL']:
                asset_type = 'Crypto'
            elif ticker_symbol in ['GLD', 'USO', 'SLV', 'UNG']:
                asset_type = 'Commodity'
            else:
                asset_type = 'Stock'

            # 1. Download price action data via yfinance
            ticker = yf.Ticker(ticker_symbol)
            df = ticker.history(period="6mo", interval="1d")

            if df.empty:
                return Response({'error': f'No market data returned for symbol "{ticker_symbol}".'}, status=status.HTTP_404_NOT_FOUND)

            # 2. Calculate MACD and EMAs
            if HAS_PANDAS_TA:
                df.ta.ema(length=20, append=True)
                df.ta.macd(fast=12, slow=26, signal=9, append=True)
                df['EMA_20'] = df.get('EMA_20', df['Close'].ewm(span=20, adjust=False).mean())
                df['MACD'] = df.get('MACD_12_26_9', df['Close'].ewm(span=12, adjust=False).mean() - df['Close'].ewm(span=26, adjust=False).mean())
                df['MACD_Signal'] = df.get('MACDs_12_26_9', df['MACD'].ewm(span=9, adjust=False).mean())
            else:
                df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
                ema_12 = df['Close'].ewm(span=12, adjust=False).mean()
                ema_26 = df['Close'].ewm(span=26, adjust=False).mean()
                df['MACD'] = ema_12 - ema_26
                df['MACD_Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()

            df.dropna(subset=['Close', 'MACD', 'MACD_Signal'], inplace=True)
            if df.empty:
                return Response({'error': f'Insufficient historical data to compute indicators for "{ticker_symbol}".'}, status=status.HTTP_400_BAD_REQUEST)

            latest_row = df.iloc[-1]
            latest_close = float(round(latest_row['Close'], 4))
            latest_macd = float(round(latest_row['MACD'], 4))
            latest_macd_sig = float(round(latest_row['MACD_Signal'], 4))
            latest_ema_20 = float(round(latest_row['EMA_20'], 4))
            latest_open = float(round(latest_row['Open'], 4))
            latest_high = float(round(latest_row['High'], 4))
            latest_low = float(round(latest_row['Low'], 4))
            latest_vol = int(latest_row.get('Volume', 0))

            # 3. Database Injection (Upsert into MarketPrices table)
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM MarketPrices WHERE Symbol = %s AND TradeDate = %s", [ticker_symbol, today_date])
                row_exists = cursor.fetchone()[0] > 0

                if row_exists:
                    cursor.execute(
                        "UPDATE MarketPrices SET ClosePrice = %s, MACD = %s, MACD_Signal = %s, EMA_20 = %s WHERE Symbol = %s AND TradeDate = %s",
                        [latest_close, latest_macd, latest_macd_sig, latest_ema_20, ticker_symbol, today_date]
                    )
                else:
                    cursor.execute(
                        "INSERT INTO MarketPrices (Symbol, AssetType, TradeDate, OpenPrice, HighPrice, LowPrice, ClosePrice, Volume, EMA_20, MACD, MACD_Signal) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        [ticker_symbol, asset_type, today_date, latest_open, latest_high, latest_low, latest_close, latest_vol, latest_ema_20, latest_macd, latest_macd_sig]
                    )

            # 4. Construct output JSON matching frontend schema
            new_signal_data = {
                'symbol': ticker_symbol,
                'asset_type': asset_type,
                'signal_date': str(today_date),
                'close_price': f"{latest_close:.4f}",
                'macd': f"{latest_macd:.4f}",
                'macd_signal': f"{latest_macd_sig:.4f}"
            }

            return Response(new_signal_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': f'Failed to process asset ticker "{ticker_symbol}": {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .script_engine import PROFITABLE_NICHES, generate_viral_script
from .voice_engine import AVAILABLE_VOICES, synthesize_voice


class ViralNichesView(APIView):
    """Returns list of profitable short-form niches and their monetization RPMs."""
    def get(self, request):
        return Response(list(PROFITABLE_NICHES.values()), status=status.HTTP_200_OK)


class ViralVoicesView(APIView):
    """Returns list of available natural neural voices."""
    def get(self, request):
        return Response(list(AVAILABLE_VOICES.values()), status=status.HTTP_200_OK)


class ViralScriptGenerateView(APIView):
    """Generates viral hooks, high-retention script, and affiliate copy."""
    def post(self, request):
        niche = request.data.get('niche', 'finance_options')
        custom_prompt = request.data.get('prompt', None)
        result = generate_viral_script(niche, custom_prompt)
        return Response(result, status=status.HTTP_200_OK)


class ViralVoiceSynthesizeView(APIView):
    """Synthesizes human neural voiceover with word-level kinetic subtitle timing cues."""
    def post(self, request):
        script_text = request.data.get('text', '')
        voice_key = request.data.get('voice', 'christopher')
        rate = request.data.get('rate', '+10%')

        if not script_text.strip():
            return Response({'error': 'Script text cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = synthesize_voice(script_text, voice_key, rate)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

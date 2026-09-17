import asyncio
import base64
import re
import edge_tts

AVAILABLE_VOICES = {
    'christopher': {
        'id': 'en-US-ChristopherNeural',
        'name': 'Christopher (Deep Documentary)',
        'gender': 'Male',
        'vibe': 'Finance & Authority'
    },
    'guy': {
        'id': 'en-US-GuyNeural',
        'name': 'Guy (Viral Storyteller)',
        'gender': 'Male',
        'vibe': 'High Energy & Tech'
    },
    'jenny': {
        'id': 'en-US-JennyNeural',
        'name': 'Jenny (Engaging Podcaster)',
        'gender': 'Female',
        'vibe': 'Modern & Relatable'
    },
    'ryan': {
        'id': 'en-GB-RyanNeural',
        'name': 'Ryan (British Prestige)',
        'gender': 'Male',
        'vibe': 'Luxury & Mystery'
    },
    'eric': {
        'id': 'en-US-EricNeural',
        'name': 'Eric (Gamer & Youth)',
        'gender': 'Male',
        'vibe': 'Fast Paced & Dynamic'
    }
}


def clean_script_for_tts(text: str) -> str:
    """Removes stage directions, markdown, brackets, and emojis for clean speech."""
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'\(.*?\)', '', text)
    text = re.sub(r'#+', '', text)
    text = re.sub(r'[*_`]', '', text)
    return text.strip()


async def synthesize_voice_async(text: str, voice_key: str = 'christopher', rate: str = '+10%'):
    """
    Synthesizes speech using Microsoft Edge Neural TTS with sentence and word-level
    kinetic timing for the 9:16 video player.
    """
    clean_text = clean_script_for_tts(text)
    voice_info = AVAILABLE_VOICES.get(voice_key, AVAILABLE_VOICES['christopher'])
    voice_id = voice_info['id']

    communicate = edge_tts.Communicate(clean_text, voice_id, rate=rate)

    audio_bytes = bytearray()
    raw_sentences = []

    async for chunk in communicate.stream():
        if chunk['type'] == 'audio':
            audio_bytes.extend(chunk['data'])
        elif chunk['type'] == 'SentenceBoundary':
            start_sec = chunk['offset'] / 10_000_000.0
            dur_sec = chunk['duration'] / 10_000_000.0
            raw_sentences.append({
                'text': chunk['text'].strip(),
                'start': round(start_sec, 3),
                'end': round(start_sec + dur_sec, 3),
                'duration': round(dur_sec, 3)
            })

    # If no sentence boundaries were emitted, calculate synthetic timing
    total_duration = raw_sentences[-1]['end'] if raw_sentences else len(clean_text.split()) * 0.35

    # Break sentences into punchy kinetic bursts (2 to 4 words per frame, Hormozi style)
    kinetic_cues = []
    cue_id = 0

    for sent in raw_sentences:
        words = sent['text'].split()
        if not words:
            continue
        sent_dur = sent['duration']
        time_per_word = sent_dur / max(1, len(words))

        # Group words into 2-3 word chunks
        chunk_size = 2 if len(words) <= 6 else 3
        for i in range(0, len(words), chunk_size):
            chunk_words = words[i:i + chunk_size]
            chunk_start = sent['start'] + (i * time_per_word)
            chunk_end = min(sent['end'], chunk_start + (len(chunk_words) * time_per_word))
            cue_id += 1
            kinetic_cues.append({
                'id': cue_id,
                'words': chunk_words,
                'text': ' '.join(chunk_words).upper(),
                'start': round(chunk_start, 2),
                'end': round(chunk_end, 2),
                'duration': round(chunk_end - chunk_start, 2)
            })

    audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
    data_uri = f"data:audio/mp3;base64,{audio_b64}"

    return {
        'audio_uri': data_uri,
        'duration_seconds': round(total_duration, 2),
        'cues': kinetic_cues,
        'voice_used': voice_info,
        'clean_text': clean_text
    }


def synthesize_voice(text: str, voice_key: str = 'christopher', rate: str = '+10%'):
    """Synchronous wrapper for Django / WSGI requests."""
    return asyncio.run(synthesize_voice_async(text, voice_key, rate))

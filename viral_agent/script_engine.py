import os
import random

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


PROFITABLE_NICHES = {
    'psychology_secrets': {
        'id': 'psychology_secrets',
        'name': '🧠 Dark Psychology & Body Language',
        'rpm': '1M - 5M Organic Views (Fastest Viral Growth)',
        'target_audience': 'Curiosity seekers, broad viral audience, students, thinkers',
        'affiliate_type': '100% Zero Promotion • Pure Algorithm Views',
        'affiliate_copy': '👁️ Comment your thoughts below & save this video before you forget.'
    },
    'stoic_mindset': {
        'id': 'stoic_mindset',
        'name': '🏛️ Stoic Wisdom & Unbreakable Mindset',
        'rpm': 'High Retention & Lifelong Re-Watchability',
        'target_audience': 'Entrepreneurs, high-performers, self-improvement seekers',
        'affiliate_type': '100% Zero Promotion • Pure AdSense Cash',
        'affiliate_copy': '🛡️ Save this for when your discipline is tested. Drop a 100 below.'
    },
    'ai_future_tech': {
        'id': 'ai_future_tech',
        'name': '🤖 Mind-Blowing AI & Future Tech Facts',
        'rpm': 'Highest Advertiser Tech CPM on YouTube',
        'target_audience': 'Tech enthusiasts, curious minds, innovators',
        'affiliate_type': '100% Zero Promotion • Pure Discovery',
        'affiliate_copy': '⚡ Will AI replace this next? Drop your prediction in the comments.'
    },
    'subconscious_mind': {
        'id': 'subconscious_mind',
        'name': '🔮 Subconscious Mind Tricks & Secrets',
        'rpm': 'Ultra-High Loop Completion Rate (>90% Retention)',
        'target_audience': 'Psychology fans, mystery lovers, daily scrollers',
        'affiliate_type': '100% Zero Promotion • Viral Re-Watch Loop',
        'affiliate_copy': '🔄 Most people miss the first clue. Watch this one more time to catch it.'
    }
}


CURATED_VIRAL_STORIES = {
    'psychology_secrets': [
        {
            'title': "3 Body Language Signs Someone Is Subconsciously Attracted to You",
            'hook': "Here are three subconscious body language signs that someone is secretly attracted to you.",
            'body': "First, the pupil dilation test. When someone looks at a person they deeply desire, their pupils involuntarily dilate up to forty-five percent to take in more visual detail. Second, foot direction. Even if they are talking to someone else, their feet will subconsciously point directly toward the person they actually care about. Third, the mirroring reflex. Notice if they take a sip of water or cross their legs right after you do.",
            'cta': "Save this video before you forget it, and check their feet next time you talk to them.",
            'tags': ['#Psychology', '#BodyLanguage', '#HumanBehavior', '#PsychologyTricks', '#Shorts']
        },
        {
            'title': "The 3-Second FBI Lie Detection Rule",
            'hook': "FBI interrogators use this exact three-second test, and it works every single time.",
            'body': "When someone is asked an unexpected question and fabricates a lie, their brain experiences an instant cognitive overload. Notice their blink rate. Normal speech has twenty blinks per minute, but during a deceptive statement, their blinking freezes for three seconds, followed by a rapid burst of eight to ten blinks to relieve brain stress. Also, honest people use asymmetrical hand gestures, while liars freeze their hands or touch their collarbone.",
            'cta': "Test this on someone today, and comment if you've ever caught someone freezing up like this.",
            'tags': ['#FBIFacts', '#LieDetection', '#PsychologySecrets', '#MentalTricks', '#Shorts']
        }
    ],
    'stoic_mindset': [
        {
            'title': "Marcus Aurelius' Rule for Dealing with Toxic People",
            'hook': "Two thousand years ago, the most powerful man in the world wrote this in his private journal.",
            'body': "Every morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, and jealous. They are like this because they cannot distinguish good from evil. But you can. You have seen the beauty of good, and the ugliness of evil. None of them can hurt you, because no one can force you into their negativity. Do not waste a single second arguing with someone committed to misunderstanding you.",
            'cta': "Save this quote for when life tests your patience today. Drop a hundred below if you needed to hear this.",
            'tags': ['#MarcusAurelius', '#Stoicism', '#Mindset', '#SelfDiscipline', '#Wisdom', '#Shorts']
        },
        {
            'title': "Why Silence Is the Most Lethal Power in Any Room",
            'hook': "The loudest person in the room is always the weakest. Here is why high-value people stay silent.",
            'body': "When someone insults you or tries to provoke a reaction, immediate anger hands them full psychological control. But when you remain completely still, look directly into their left eye, and say nothing for four seconds, their adrenaline crashes and anxiety takes over. Silence forces other people to reveal their hand while keeping your motives invisible.",
            'cta': "Never explain yourself to people who don't deserve your words. Save this and practice it.",
            'tags': ['#PowerMoves', '#DarkPsychology', '#MindsetShift', '#SelfControl', '#Shorts']
        }
    ],
    'ai_future_tech': [
        {
            'title': "What AI Will Look Like by 2028 Will Shock You",
            'hook': "What tech giants are testing behind closed doors right now will completely blow your mind.",
            'body': "Within twenty-four months, humanoid robotics powered by neural vision models will handle physical household chores autonomously. Autonomous AI agents are already writing, debugging, and deploying enterprise software with zero human intervention. The people who understand how to orchestrate these models will build billion-dollar one-person companies.",
            'cta': "Do you think artificial general intelligence arrives sooner than 2028? Drop your prediction below.",
            'tags': ['#AI', '#ArtificialIntelligence', '#FutureTech', '#TechNews', '#Shorts']
        }
    ],
    'subconscious_mind': [
        {
            'title': "The 'Spotlight Effect' Mind Trick That Will Cure Your Social Anxiety",
            'hook': "Here is a psychological fact that will instantly cure your social anxiety in thirty seconds.",
            'body': "You believe that whenever you walk into a crowded room, everyone is judging your clothes, your posture, and your mistakes. But psychological studies prove that over ninety percent of people are completely absorbed in their own insecurities. Nobody is thinking about you because they are too busy worrying about what you think of them. You are totally free.",
            'cta': "Re-watch this whenever you feel self-conscious. Follow for daily psychological breakthroughs.",
            'tags': ['#SocialAnxiety', '#MentalHealth', '#PsychologyFacts', '#Mindset', '#Shorts']
        }
    ]
}


def generate_viral_script(niche_key: str = 'psychology_secrets', custom_prompt: str = None) -> dict:
    """
    Generates a viral short-form video package with hook, body, CTA, and affiliate copy.
    Falls back to high-converting curated viral scripts if Gemini API is unreachable.
    """
    niche_info = PROFITABLE_NICHES.get(niche_key, PROFITABLE_NICHES['psychology_secrets'])
    api_key = os.environ.get('GEMINI_API_KEY')

    if GENAI_AVAILABLE and api_key and custom_prompt:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = f"""
You are a viral YouTube Shorts and TikTok retention expert. Write a 45-second high-retention vertical video script in the niche: {niche_info['name']}.
Topic/Idea: {custom_prompt}

Strict format:
[HOOK] (0-3s provocative scroll-stopping first sentence)
[BODY] (30-40s fast-paced punchy sentences, average 7-9 words per sentence)
[CTA] (5-10s call to action pointing to link in bio: {niche_info['affiliate_type']})
[TAGS] (5 trending hashtags)
"""
            response = model.generate_content(prompt)
            raw = response.text
            # Parse sections
            hook = "Stop scrolling! Here is what nobody tells you."
            body = raw
            cta = niche_info['affiliate_copy']
            tags = ['#Shorts', '#Viral', '#Trending']

            if '[HOOK]' in raw and '[BODY]' in raw:
                parts = raw.split('[BODY]')
                hook = parts[0].replace('[HOOK]', '').strip()
                remainder = parts[1]
                if '[CTA]' in remainder:
                    b_parts = remainder.split('[CTA]')
                    body = b_parts[0].strip()
                    cta = b_parts[1].split('[TAGS]')[0].strip()
                else:
                    body = remainder.strip()

            full_script = f"{hook} {body} {cta}".strip()
            return {
                'niche': niche_info,
                'title': custom_prompt[:60],
                'hook': hook,
                'body': body,
                'cta': cta,
                'full_script': full_script,
                'word_count': len(full_script.split()),
                'estimated_seconds': round(len(full_script.split()) * 0.38, 1),
                'tags': tags,
                'affiliate_bio': niche_info['affiliate_copy']
            }
        except Exception as e:
            pass

    # Curated high-converting blueprint fallback
    pool = CURATED_VIRAL_STORIES.get(niche_key, CURATED_VIRAL_STORIES['psychology_secrets'])
    chosen = random.choice(pool)
    full_script = f"{chosen['hook']} {chosen['body']} {chosen['cta']}".strip()

    return {
        'niche': niche_info,
        'title': chosen['title'],
        'hook': chosen['hook'],
        'body': chosen['body'],
        'cta': chosen['cta'],
        'full_script': full_script,
        'word_count': len(full_script.split()),
        'estimated_seconds': round(len(full_script.split()) * 0.38, 1),
        'tags': chosen['tags'],
        'affiliate_bio': niche_info['affiliate_copy']
    }

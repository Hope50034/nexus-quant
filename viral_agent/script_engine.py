import os
import random

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


PROFITABLE_NICHES = {
    'finance_options': {
        'id': 'finance_options',
        'name': '💰 Wall Street Lore & 0DTE Options',
        'rpm': '$12 - $25 RPM (Highest AdSense & $30-$100 Broker Affiliates)',
        'target_audience': 'Retail traders, side-hustlers, crypto/stocks beginners',
        'affiliate_type': 'Broker Signup (Webull / Robinhood Free Stocks)',
        'affiliate_copy': '🎁 Grab up to 12 FREE Stocks (worth up to $3,000) on Webull: Link in bio/pinned comment!'
    },
    'ai_future_tech': {
        'id': 'ai_future_tech',
        'name': '🤖 AI & Future Tech Breakthroughs',
        'rpm': '$8 - $16 RPM',
        'target_audience': 'Tech enthusiasts, developers, productivity junkies',
        'affiliate_type': 'AI Tools & SaaS Subscriptions',
        'affiliate_copy': '⚡ The exact AI tools I use to automate this: Check the link in bio!'
    },
    'psychology_secrets': {
        'id': 'psychology_secrets',
        'name': '🧠 Dark Psychology & Human Secrets',
        'rpm': '$5 - $12 RPM (Fastest Organic Views: 1M+ views)',
        'target_audience': 'Broad viral audience, students, gamers',
        'affiliate_type': 'Self-improvement & Books/Audible',
        'affiliate_copy': '📚 Read the top 5 psychology books for 100% free with Audible: Link in bio!'
    },
    'billionaire_hustle': {
        'id': 'billionaire_hustle',
        'name': '💎 Billionaire Mindset & Money Secrets',
        'rpm': '$9 - $18 RPM',
        'target_audience': 'Entrepreneurs, investors, young hustlers',
        'affiliate_type': 'Trading & High-Ticket Courses/Tools',
        'affiliate_copy': '🚀 Start your first automated cash flow asset today: Free guide in bio!'
    }
}


CURATED_VIRAL_STORIES = {
    'finance_options': [
        {
            'title': "How a 20-Year-Old Made $400 in 15 Minutes on QQQ",
            'hook': "Most people think you need $10,000 to trade options. But here's what Wall Street hides.",
            'body': "Every morning at 9:30 AM Eastern, the NASDAQ ETF QQQ prints massive opening volatility. While amateur traders gamble on cheap penny stocks, institutional algos buy 0DTE contracts for under thirty dollars. When the 9 EMA crosses above the 21 EMA with institutional volume, momentum rips. One single twenty-seven dollar contract can jump to forty-five dollars in five minutes flat. That's a sixty percent return before you even finish your morning coffee.",
            'cta': "Never risk money without an exact stop loss. Claim up to twelve free stocks on Webull with the link in bio and practice paper trading first.",
            'tags': ['#Shorts', '#Trading', '#QQQ', '#OptionsTrading', '#StockMarket', '#Webull']
        },
        {
            'title': "The $30 Scalper Strategy Wall Street Doesn't Want You to Know",
            'hook': "Stop losing money on zero-day options! You're making this one fatal mistake.",
            'body': "Ninety percent of retail option buyers hold their contracts until afternoon theta burns them to absolute zero. The winning secret? You never hold longer than fifteen minutes. Set your Take Profit at plus twenty-five percent, take your hard stop at minus twenty-two percent, and bank your cash immediately. Three disciplined scalps a week beats everyday gambling every single time.",
            'cta': "Comment 'SCALP' below and grab your free stocks with the pinned link before market opens tomorrow.",
            'tags': ['#Shorts', '#OptionScalping', '#DayTrading', '#FinancialFreedom', '#Stocks']
        }
    ],
    'ai_future_tech': [
        {
            'title': "This New AI Agent Just Replaced a 5-Person Marketing Agency",
            'hook': "If you're still paying five thousand dollars for video editing, you're lighting cash on fire.",
            'body': "A new autonomous AI pipeline just dropped that scrapes viral trends, writes high-retention psychological scripts, synthesizes human voice narration, and renders vertical short-form video in under twenty seconds. What used to take a creative team forty hours now runs on a laptop while you sleep.",
            'cta': "Follow for daily AI automation blueprints, and grab the free source code link in the description.",
            'tags': ['#AI', '#ArtificialIntelligence', '#TechNews', '#Automation', '#Shorts']
        }
    ],
    'psychology_secrets': [
        {
            'title': "3 Psychological Tricks to Tell If Someone Is Lying to You",
            'hook': "FBI interrogators use this exact three-second test, and it works every single time.",
            'body': "First, watch their blink rate. When someone tells a fabricated story, their cognitive load spikes and blinking drops to almost zero, followed by a rapid burst of eight to ten blinks. Second, notice their hand placement. Truthful people open their palms, while liars subconsciously conceal their hands or touch their necks to self-soothe.",
            'cta': "Save this video before you need it, and comment if you've seen someone do this.",
            'tags': ['#Psychology', '#HumanBehavior', '#BodyLanguage', '#PsychologyTricks', '#Shorts']
        }
    ],
    'billionaire_hustle': [
        {
            'title': "The 'Rule of 72' That Made Warren Buffett a Billionaire",
            'hook': "Warren Buffett made ninety-nine percent of his wealth after his fiftieth birthday. Here's the math.",
            'body': "Take the number seventy-two and divide it by your annual rate of return. That tells you the exact number of years it takes to double your entire net worth. At twelve percent annual return, your money doubles every six years. One thousand dollars becomes eight thousand in eighteen years, and sixty-four thousand in thirty-six years with zero extra deposits.",
            'cta': "Start compounding your wealth right now. Claim your free starter stocks using the link in bio.",
            'tags': ['#WarrenBuffett', '#MoneyMindset', '#Investing', '#CompoundInterest', '#Shorts']
        }
    ]
}


def generate_viral_script(niche_key: str = 'finance_options', custom_prompt: str = None) -> dict:
    """
    Generates a viral short-form video package with hook, body, CTA, and affiliate copy.
    Falls back to high-converting curated viral scripts if Gemini API is unreachable.
    """
    niche_info = PROFITABLE_NICHES.get(niche_key, PROFITABLE_NICHES['finance_options'])
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
    pool = CURATED_VIRAL_STORIES.get(niche_key, CURATED_VIRAL_STORIES['finance_options'])
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

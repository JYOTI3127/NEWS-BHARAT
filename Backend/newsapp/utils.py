def has_permission(user, perm_code):
    if not getattr(user, "is_authenticated", False):
        return False

    if getattr(user, "is_superuser", False):
        return True

    profile = getattr(user, "profile", None)
    if profile is None:
        return False

    if profile.extra_permissions.filter(code=perm_code).exists():
        return True

    return profile.roles.filter(permissions__code=perm_code).exists()

import bleach
import requests
import html
import re
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from .models import MetalRate

ARTICLE_CLEAN_VERSION = 1
ARTICLE_ALLOWED_TAGS = [
    'p', 'h2', 'h3', 'h4',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'a', 'strong', 'em', 'br', 'img', 'blockquote',
]
ARTICLE_ALLOWED_ATTRIBUTES = {
    'a': ['href', 'target', 'rel'],
    'img': ['src', 'alt'],
}
ARTICLE_ALLOWED_PROTOCOLS = ['http', 'https', 'mailto']

_TWITTER_EMBED_RE = re.compile(
    r'<(?P<tag>div|blockquote)\b(?=[^>]*\barticle-twitter-embed\b)(?=[^>]*\bdata-tweet-url="(?P<url>[^"]+)")[^>]*>[\s\S]*?</(?P=tag)>',
    re.IGNORECASE,
)
_TWITTER_IFRAME_RE = re.compile(
    r'<iframe\b(?=[^>]*(?:platform\.twitter\.com|twitter-widget))(?P<attrs>[^>]*)></iframe>',
    re.IGNORECASE,
)
_ANCHOR_TAG_RE = re.compile(r'<a\b(?P<attrs>[^>]*)>', re.IGNORECASE)
_TARGET_BLANK_RE = re.compile(r'target\s*=\s*([\'"])_blank\1', re.IGNORECASE)
_REL_ATTR_RE = re.compile(r'\srel\s*=\s*([\'"])(?P<value>.*?)\1', re.IGNORECASE)


def normalize_twitter_embeds(content):
    def tweet_block(tweet_url):
        safe_url = html.escape(tweet_url, quote=True)
        return (
            '<blockquote>'
            f'<a href="{safe_url}" target="_blank" rel="noopener noreferrer">{safe_url}</a>'
            '</blockquote>'
        )

    def replace_embed(match):
        return tweet_block(match.group('url'))

    def replace_iframe(match):
        attrs = html.unescape(match.group('attrs') or '')
        id_match = re.search(r'data-tweet-id=["\']?(\d+)', attrs, re.IGNORECASE)
        if not id_match:
            id_match = re.search(r'(?:[?&]|;)id=(\d+)', attrs, re.IGNORECASE)
        if not id_match:
            id_match = re.search(r'/status/(\d+)', attrs, re.IGNORECASE)
        if not id_match:
            return ''
        return tweet_block(f"https://twitter.com/i/status/{id_match.group(1)}")

    normalized = _TWITTER_EMBED_RE.sub(replace_embed, content or '')
    normalized = _TWITTER_IFRAME_RE.sub(replace_iframe, normalized)
    return normalized


def _ensure_safe_anchor_attrs(match):
    tag = match.group(0)
    if not _TARGET_BLANK_RE.search(tag):
        return tag

    rel_match = _REL_ATTR_RE.search(tag)
    required_tokens = ['noopener', 'noreferrer']
    if rel_match:
        existing = rel_match.group('value').split()
        merged = []
        for token in existing + required_tokens:
            token = token.strip()
            if token and token not in merged:
                merged.append(token)
        return _REL_ATTR_RE.sub(f' rel="{" ".join(merged)}"', tag, count=1)
    return tag[:-1] + ' rel="noopener noreferrer">'


def sanitize_article_html(content):
    normalized = normalize_twitter_embeds(str(content or ''))
    cleaned = bleach.clean(
        normalized,
        tags=ARTICLE_ALLOWED_TAGS,
        attributes=ARTICLE_ALLOWED_ATTRIBUTES,
        protocols=ARTICLE_ALLOWED_PROTOCOLS,
        strip=True,
        strip_comments=True,
    )
    cleaned = _ANCHOR_TAG_RE.sub(_ensure_safe_anchor_attrs, cleaned)
    cleaned = re.sub(r'<p>\s*</p>', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'(?:<br\s*/?>\s*){3,}', '<br><br>', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def get_article_render_content(article):
    stored_clean = getattr(article, 'content_clean', '') or ''
    if stored_clean.strip():
        return stored_clean
    return sanitize_article_html(getattr(article, 'content', '') or '')

OZ_TO_GRAM = 31.1035
ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"
TWELVE_DATA_URL = "https://api.twelvedata.com/time_series"
TWELVE_DATA_TIMEOUT_SECONDS = 4
METAL_PRICE_LIMITS = {
    # INR per 10 grams.
    "gold": (10000, 300000),
    # INR per kilogram.
    "silver": (10000, 500000),
}
MARKET_ERROR_CACHE_SECONDS = 60 * 60
MARKET_STALE_CACHE_SECONDS = 60 * 60 * 24


def external_get(url, **kwargs):
    session = requests.Session()
    session.trust_env = False
    return session.get(url, **kwargs)


def _today_cache_key(prefix):
    return f"{prefix}:{timezone.localdate().isoformat()}"


def _minute_cache_key(prefix):
    now = timezone.localtime(timezone.now())
    return f"{prefix}:{now.strftime('%Y%m%d%H%M')}"


def _coerce_float(value, default=None):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalize_trend(change):
    return "up" if change > 0 else "down" if change < 0 else "neutral"


def _market_error_payload(error):
    return {
        "error": str(error),
        "price": 0,
        "change": 0,
        "percent_change": 0,
        "trend": "neutral",
    }


def _is_quota_error(error):
    message = str(error).lower()
    return "api credit" in message or "run out" in message or "daily limit" in message


def is_valid_metal_price(metal_type, price):
    price = _coerce_float(price)
    if price is None:
        return False
    low, high = METAL_PRICE_LIMITS.get(metal_type, (0, float("inf")))
    return low <= price <= high


def latest_valid_metal_rate(metal_type):
    for rate in MetalRate.objects.filter(metal_type=metal_type).order_by("-created_at")[:50]:
        if is_valid_metal_price(metal_type, rate.price):
            return rate
    return None


def fetch_and_store_metal_rates(force_refresh=False):
    today = timezone.localdate()
    latest_gold = latest_valid_metal_rate("gold")
    latest_silver = latest_valid_metal_rate("silver")

    if (
        not force_refresh
        and latest_gold and latest_silver
        and latest_gold.created_at.date() == today
        and latest_silver.created_at.date() == today
    ):
        return {
            "gold": latest_gold.price,
            "silver": latest_silver.price,
        }

    api_key = getattr(settings, "TWELVE_DATA_API_KEY", "")
    if not api_key:
        raise ValueError("TWELVE_DATA_API_KEY is not configured")

    gold_usd = _fetch_twelve_data_close(
        getattr(settings, "TWELVE_DATA_GOLD_SYMBOLS", ["XAU/USD"]),
        api_key,
    )
    silver_usd = _fetch_twelve_data_close(
        getattr(settings, "TWELVE_DATA_SILVER_SYMBOLS", ["XAG/USD"]),
        api_key,
    )
    usd_inr = _fetch_twelve_data_close(
        getattr(settings, "TWELVE_DATA_USDINR_SYMBOLS", ["USD/INR"]),
        api_key,
    )

    gold_price = ((gold_usd * usd_inr) / OZ_TO_GRAM) * 10
    silver_price = ((silver_usd * usd_inr) / OZ_TO_GRAM) * 1000

    if not is_valid_metal_price("gold", gold_price):
        raise ValueError(f"Fetched gold price is outside the expected INR/10g range: {gold_price:.2f}")
    if not is_valid_metal_price("silver", silver_price):
        raise ValueError(f"Fetched silver price is outside the expected INR/kg range: {silver_price:.2f}")

    save_metal("gold", gold_price)
    save_metal("silver", silver_price)

    return {
        "gold": round(gold_price, 2),
        "silver": round(silver_price, 2),
    }

def _fetch_twelve_data_close(symbols, api_key):
    last_error = None
    for symbol in symbols:
        try:
            response = external_get(
                TWELVE_DATA_URL,
                params={
                    "symbol": symbol,
                    "interval": "1day",
                    "outputsize": 1,
                    "apikey": api_key,
                },
                timeout=TWELVE_DATA_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            data = response.json()

            if data.get("status") == "error" or data.get("message") or data.get("code"):
                raise ValueError(data.get("message") or data.get("code") or f"Twelve Data error for {symbol}")

            values = data.get("values") or []
            if not values:
                raise ValueError(f"No time series returned for {symbol}")

            close = _coerce_float(values[0].get("close"))
            if close is None:
                raise ValueError(f"Could not parse Twelve Data close for {symbol}")
            return close
        except Exception as exc:
            last_error = exc
            if _is_quota_error(exc):
                break
            continue

    if last_error:
        raise last_error
    raise ValueError("No valid Twelve Data symbol configured")


def save_metal(metal_type, new_price):

    if not is_valid_metal_price(metal_type, new_price):
        raise ValueError(f"{metal_type} price is outside the expected range: {new_price}")

    last_record = latest_valid_metal_rate(metal_type)

    if last_record:
        change = new_price - last_record.price
        percent = (change / last_record.price) * 100
    else:
        change = 0
        percent = 0

    trend = "up" if change > 0 else "down" if change < 0 else "neutral"

    MetalRate.objects.create(
        metal_type=metal_type,
        price=round(new_price, 2),
        change=round(change, 2),
        percent_change=round(percent, 2),
        trend=trend
    )

def fetch_index_data(symbols, cache_prefix=None, force_refresh=False):
    cache_key = _today_cache_key(cache_prefix or f"market_index:{symbols[0]}")
    if not force_refresh:
        cached = cache.get(cache_key)
        if cached:
            return cached

    api_key = getattr(settings, "ALPHA_VANTAGE_API_KEY", "")
    if not api_key:
        raise ValueError("ALPHA_VANTAGE_API_KEY is not configured")

    last_error = None
    for symbol in symbols:
        try:
            payload = _fetch_alpha_vantage_daily(symbol, api_key)
            cache.set(cache_key, payload, 60 * 60 * 24)
            return payload
        except Exception as exc:
            last_error = exc
            if _is_quota_error(exc):
                break
            continue

    if last_error:
        raise last_error
    raise ValueError("No valid market index symbol configured")


def _fetch_alpha_vantage_daily(symbol, api_key):
    response = external_get(
        ALPHA_VANTAGE_URL,
        params={
            "function": "TIME_SERIES_DAILY",
            "symbol": symbol,
            "outputsize": "compact",
            "apikey": api_key,
        },
        timeout=TWELVE_DATA_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    data = response.json()

    if data.get("Information") or data.get("Note") or data.get("Error Message"):
        raise ValueError(data.get("Information") or data.get("Note") or data.get("Error Message"))

    series = data.get("Time Series (Daily)") or {}
    dates = sorted(series.keys(), reverse=True)
    if len(dates) < 2:
        raise ValueError(f"No daily time series returned for {symbol}")

    latest = series[dates[0]]
    previous_day = series[dates[1]]
    current = _coerce_float(latest.get("4. close"))
    previous = _coerce_float(previous_day.get("4. close"))

    if current is None or previous in (None, 0):
        raise ValueError(f"Could not parse Alpha Vantage values for {symbol}")

    change = current - previous
    percent = (change / previous) * 100

    return {
        "price": round(current, 2),
        "change": round(change, 2),
        "percent_change": round(percent, 2),
        "trend": _normalize_trend(change),
        "symbol": symbol,
    }


def fetch_live_index_data(symbols, cache_prefix=None, force_refresh=False):
    base_cache_key = cache_prefix or "market_index:live"
    cache_key = _minute_cache_key(base_cache_key)
    stale_cache_key = f"{base_cache_key}:last_good"
    error_cache_key = f"{base_cache_key}:last_error"
    if not force_refresh:
        cached = cache.get(cache_key)
        if cached:
            return cached
        stale = cache.get(stale_cache_key)
        if stale:
            return {**stale, "stale": True}
        cached_error = cache.get(error_cache_key)
        if cached_error:
            return cached_error
        return _market_error_payload("Live market refresh is paused. Use refresh=1 to fetch a new quote.")

    api_key = getattr(settings, "TWELVE_DATA_API_KEY", "")
    if not api_key:
        raise ValueError("TWELVE_DATA_API_KEY is not configured")

    last_error = None
    for symbol_config in symbols:
        try:
            payload = _fetch_twelve_data_index_quote(symbol_config, api_key)
            cache.set(cache_key, payload, 60)
            cache.set(stale_cache_key, payload, MARKET_STALE_CACHE_SECONDS)
            cache.delete(error_cache_key)
            return payload
        except Exception as exc:
            last_error = exc
            continue

    if last_error:
        error_payload = _market_error_payload(last_error)
        cache.set(error_cache_key, error_payload, MARKET_ERROR_CACHE_SECONDS)
        stale = cache.get(stale_cache_key)
        if stale:
            return {**stale, "stale": True, "error": error_payload["error"]}
        return error_payload
    error_payload = _market_error_payload("No valid live market index symbol configured")
    cache.set(error_cache_key, error_payload, MARKET_ERROR_CACHE_SECONDS)
    return error_payload


def _build_twelve_data_params(symbol_config, *, interval, outputsize, previous_close=False):
    if isinstance(symbol_config, str):
        params = {"symbol": symbol_config}
    else:
        params = {k: v for k, v in (symbol_config or {}).items() if v}

    params.update({
        "interval": interval,
        "outputsize": outputsize,
        "timezone": "Asia/Kolkata",
    })
    if previous_close:
        params["previous_close"] = "true"
    return params


def _fetch_twelve_data_index_quote(symbol_config, api_key):
    intraday_response = external_get(
        TWELVE_DATA_URL,
        params={
            **_build_twelve_data_params(
                symbol_config,
                interval="1min",
                outputsize=1,
                previous_close=True,
            ),
            "apikey": api_key,
        },
        timeout=TWELVE_DATA_TIMEOUT_SECONDS,
    )
    intraday_response.raise_for_status()
    intraday_data = intraday_response.json()

    if intraday_data.get("status") == "error" or intraday_data.get("message") or intraday_data.get("code"):
        raise ValueError(
            intraday_data.get("message")
            or intraday_data.get("code")
            or f"Twelve Data error for {symbol_config}"
        )

    intraday_values = intraday_data.get("values") or []
    if not intraday_values:
        raise ValueError(f"No intraday series returned for {symbol_config}")

    latest = intraday_values[0]
    current = _coerce_float(latest.get("close"))
    previous = _coerce_float(latest.get("previous_close"))

    if current is None:
        raise ValueError(f"Could not parse Twelve Data close for {symbol_config}")

    if previous in (None, 0):
        daily_response = external_get(
            TWELVE_DATA_URL,
            params={
                **_build_twelve_data_params(
                    symbol_config,
                    interval="1day",
                    outputsize=2,
                ),
                "apikey": api_key,
            },
            timeout=TWELVE_DATA_TIMEOUT_SECONDS,
        )
        daily_response.raise_for_status()
        daily_data = daily_response.json()

        if daily_data.get("status") == "error" or daily_data.get("message") or daily_data.get("code"):
            raise ValueError(
                daily_data.get("message")
                or daily_data.get("code")
                or f"Twelve Data daily error for {symbol_config}"
            )

        daily_values = daily_data.get("values") or []
        if len(daily_values) < 2:
            raise ValueError(f"No daily series returned for {symbol_config}")

        previous = _coerce_float(daily_values[1].get("close"))

    if previous in (None, 0):
        raise ValueError(f"Could not parse Twelve Data previous close for {symbol_config}")

    change = current - previous
    percent = (change / previous) * 100
    symbol = symbol_config if isinstance(symbol_config, str) else (symbol_config.get("symbol") or "")

    return {
        "price": round(current, 2),
        "change": round(change, 2),
        "percent_change": round(percent, 2),
        "trend": _normalize_trend(change),
        "symbol": symbol,
        "previous_close": round(previous, 2),
        "as_of": latest.get("datetime"),
    }

import random
import string

def generate_password(length=12):

    chars = [
        random.choice(string.ascii_uppercase),
        random.choice(string.ascii_lowercase),
        random.choice(string.digits),
        random.choice("!@#$%^&*"),
    ]

    chars += random.choices(
        string.ascii_letters + string.digits + "!@#$%^&*",
        k=length - 4
    )

    random.shuffle(chars)
    return ''.join(chars)

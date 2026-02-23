def has_permission(user, perm_code):
    if not hasattr(user, 'userprofile'):
        return False

    roles = user.userprofile.roles.all()

    for role in roles:
        if role.permissions.filter(code=perm_code).exists():
            return True

    return False

import requests
from django.conf import settings
from .models import MetalRate

OZ_TO_GRAM = 31.1035


def fetch_and_store_metal_rates():

    url = "https://api.metalpriceapi.com/v1/latest"

    params = {
        "api_key": settings.METAL_API_KEY,
        "base": "INR",
        "currencies": "XAU,XAG"
    }

    response = requests.get(url, params=params)
    data = response.json()

    # Convert correctly
    gold_per_ounce = 1 / data["rates"]["XAU"]
    silver_per_ounce = 1 / data["rates"]["XAG"]

    gold_price = (gold_per_ounce / OZ_TO_GRAM) * 10   # per 10g
    silver_price = (silver_per_ounce / OZ_TO_GRAM) * 1000  # per kg

    save_metal("gold", gold_price)
    save_metal("silver", silver_price)


def save_metal(metal_type, new_price):

    last_record = MetalRate.objects.filter(
        metal_type=metal_type
    ).order_by('-created_at').first()

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

def fetch_index_data(symbol):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"

    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print("FAILED:", response.status_code)
        return None

    data = response.json()

    result = data["chart"]["result"][0]
    meta = result["meta"]

    current = meta.get("regularMarketPrice")
    previous = meta.get("previousClose")

    if current is None or previous is None:
        return None

    change = current - previous
    percent = (change / previous) * 100

    trend = "up" if change > 0 else "down" if change < 0 else "neutral"

    return {
        "price": round(current, 2),
        "change": round(change, 2),
        "percent_change": round(percent, 2),
        "trend": trend
    }
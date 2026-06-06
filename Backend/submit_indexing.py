#!/usr/bin/env python3
"""
news4bharat.com - Google Indexing API Submitter
------------------------------------------------
Submits URLs directly to Google's Indexing API using a
service account JSON file for faster crawling.

Usage:
    python3 submit_indexing.py
    python3 submit_indexing.py --dry-run
    python3 submit_indexing.py --day 2
    python3 submit_indexing.py --url https://news4bharat.com/some-page

Requirements:
    pip3 install google-auth requests --break-system-packages
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime

try:
    import requests
    from google.auth.transport.requests import Request as GoogleRequest
    from google.oauth2 import service_account
except ImportError:
    print("Missing packages. Run:")
    print("  pip3 install google-auth requests --break-system-packages")
    sys.exit(1)


CREDENTIALS_PATH = os.environ.get(
    "SEO_GOOGLE_SA_JSON",
    "/usr/local/lsws/Example/html/NEWS-BHARAT/Backend/indexing-credentials.json",
)
SCOPES = ["https://www.googleapis.com/auth/indexing"]
API_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish"
DAILY_CAP = 200
DELAY_SEC = 0.35


URLS_DAY1 = [
    "https://news4bharat.com/category/business",
    "https://news4bharat.com/category/macro-economy",
    "https://news4bharat.com/category/government-policy",
    "https://news4bharat.com/category/industry-sectors",
    "https://news4bharat.com/category/corporate-companies",
    "https://news4bharat.com/category/msme-entrepreneurship",
    "https://news4bharat.com/category/bfsi",
    "https://news4bharat.com/category/banking",
    "https://news4bharat.com/category/nbfcs",
    "https://news4bharat.com/category/fintech",
    "https://news4bharat.com/category/stock-market",
    "https://news4bharat.com/category/insurance",
    "https://news4bharat.com/category/bharat-opinions",
    "https://news4bharat.com/category/editorials",
    "https://news4bharat.com/category/expert-opinions",
    "https://news4bharat.com/category/industry-voices",
    "https://news4bharat.com/category/interviews",
    "https://news4bharat.com/category/debates-counterpoints",
    "https://news4bharat.com/category/policy-perspective",
    "https://news4bharat.com/category/bharat-by-2047",
    "https://news4bharat.com/category/technology",
    "https://news4bharat.com/category/artificial-intelligence",
    "https://news4bharat.com/category/breaking-news",
    "https://news4bharat.com/category/health",
    "https://news4bharat.com/category/ai",
    "https://news4bharat.com/about-us",
    "https://news4bharat.com/contact-us",
    "https://news4bharat.com/careers",
    "https://news4bharat.com/privacy-policy",
    "https://news4bharat.com/editorial-policy",
    "https://news4bharat.com/founders-note",
    "https://news4bharat.com/",
]

URLS_DAY2 = []
URLS_DAY3 = []

BATCHES = {
    1: URLS_DAY1,
    2: URLS_DAY2,
    3: URLS_DAY3,
}


def get_credentials():
    if not os.path.exists(CREDENTIALS_PATH):
        print(f"Credentials file not found: {CREDENTIALS_PATH}")
        print("Set SEO_GOOGLE_SA_JSON env variable or fix the file path.")
        sys.exit(1)

    creds = service_account.Credentials.from_service_account_file(
        CREDENTIALS_PATH,
        scopes=SCOPES,
    )
    creds.refresh(GoogleRequest())
    return creds


def submit_url(url, creds):
    headers = {
        "Authorization": f"Bearer {creds.token}",
        "Content-Type": "application/json",
    }
    payload = {"url": url, "type": "URL_UPDATED"}
    response = requests.post(API_URL, headers=headers, json=payload, timeout=15)
    return {
        "status": response.status_code,
        "body": response.json() if response.content else {},
    }


def fetch_sitemap_urls(sitemap_url):
    import xml.etree.ElementTree as ET

    print(f"Fetching sitemap: {sitemap_url}")
    response = requests.get(sitemap_url, timeout=20)
    response.raise_for_status()
    root = ET.fromstring(response.content)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = [loc.text.strip() for loc in root.findall(".//sm:loc", ns)]

    return [
        url
        for url in urls
        if "/category/" not in url
        and url
        not in {
            "https://news4bharat.com/",
            "https://news4bharat.com/about-us",
            "https://news4bharat.com/contact-us",
            "https://news4bharat.com/careers",
            "https://news4bharat.com/privacy-policy",
            "https://news4bharat.com/editorial-policy",
            "https://news4bharat.com/founders-note",
        }
    ]


def main():
    parser = argparse.ArgumentParser(description="Submit URLs to Google Indexing API")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    parser.add_argument("--day", type=int, default=1, help="Batch number: 1, 2, or 3")
    parser.add_argument("--url", type=str, help="Submit a single URL")
    parser.add_argument(
        "--from-sitemap",
        action="store_true",
        help="Load Day 2+ URLs from sitemap-articles.xml",
    )
    args = parser.parse_args()

    print("\nNews4Bharat - Google Indexing API Submitter")
    print("-" * 50)

    if args.url:
        urls = [args.url]
        print(f"Single URL mode: {args.url}")
    else:
        day = args.day
        if day >= 2 and args.from_sitemap:
            print(f"Loading article URLs from sitemap for Day {day}...")
            all_articles = fetch_sitemap_urls("https://news4bharat.com/sitemap-articles.xml")
            start = (day - 2) * DAILY_CAP
            end = start + DAILY_CAP
            urls = all_articles[start:end]
            print(
                f"Found {len(all_articles)} articles total, submitting "
                f"{len(urls)} URLs (items {start + 1} to {end})"
            )
        else:
            urls = BATCHES.get(day, URLS_DAY1)

        print(f"Day {day} batch: {len(urls)} URLs")

    urls = urls[:DAILY_CAP]

    if args.dry_run:
        print("\nDry run - URLs that would be submitted:")
        for index, url in enumerate(urls, 1):
            print(f"  {index:3}. {url}")
        print(f"\nDry run complete. {len(urls)} URLs ready.")
        return

    print("\nLoading service account credentials...")
    try:
        creds = get_credentials()
        print(f"Authenticated as: {creds.service_account_email}")
    except Exception as exc:
        print(f"Auth failed: {exc}")
        print("\nCheck:")
        print("1. Web Search Indexing API is enabled in Google Cloud Console")
        print("2. Service account is added as OWNER in Search Console")
        sys.exit(1)

    print(f"\nSubmitting {len(urls)} URLs...\n")
    submitted = []
    failed = []

    for index, url in enumerate(urls, 1):
        print(f"[{index:3}/{len(urls)}] {url[:70]:<70} ", end="", flush=True)

        if index % 50 == 0:
            creds.refresh(GoogleRequest())

        try:
            result = submit_url(url, creds)
            status = result["status"]

            if status == 200:
                print("OK")
                submitted.append(url)
            elif status == 429:
                print("Quota exceeded")
                failed.append({"url": url, "error": "quota_exceeded"})
                print("\nDaily quota hit. Run again tomorrow for remaining URLs.")
                break
            elif status == 403:
                error_message = result["body"].get("error", {}).get("message", "Permission denied")
                print(f"403: {error_message}")
                failed.append({"url": url, "error": error_message})
                print("\nPermission error. Add the service account as OWNER in GSC.")
                print(f"Service account: {creds.service_account_email}")
                break
            else:
                error_message = result["body"].get("error", {}).get("message", str(result["body"]))
                print(f"{status}: {error_message}")
                failed.append({"url": url, "error": error_message})
        except Exception as exc:
            print(str(exc))
            failed.append({"url": url, "error": str(exc)})

        if index < len(urls):
            time.sleep(DELAY_SEC)

    print("\n" + "-" * 50)
    print(f"Submitted successfully : {len(submitted)}")
    print(f"Failed                 : {len(failed)}")

    if failed:
        print("\nFailed URLs:")
        for item in failed:
            print(f"  {item['url']} -> {item['error']}")

    log = {
        "timestamp": datetime.utcnow().isoformat(),
        "submitted": submitted,
        "failed": [item["url"] for item in failed],
        "errors": failed,
    }
    log_file = f"indexing-log-day{args.day}-{datetime.utcnow().strftime('%Y%m%d-%H%M')}.json"
    with open(log_file, "w", encoding="utf-8") as handle:
        json.dump(log, handle, indent=2)
    print(f"\nLog saved to {log_file}")


if __name__ == "__main__":
    main()

import datetime
import re
import secrets
from typing import Any, Awaitable, Callable

# Nigeria (West Africa Time) is UTC+1 all year round — no daylight saving.
# Using a fixed offset avoids depending on the host's timezone database and
# stops sales made just after midnight being dated "yesterday" on UTC servers.
LAGOS_TZ = datetime.timezone(datetime.timedelta(hours=1), name="WAT")


def lagos_today() -> datetime.date:
    return datetime.datetime.now(tz=LAGOS_TZ).date()


def today_str() -> str:
    """Return today's date (Lagos time) as DD/MM/YYYY."""
    return lagos_today().strftime("%d/%m/%Y")


def _random_digits(k: int) -> str:
    return "".join(secrets.choice("0123456789") for _ in range(k))


def generate_invoice_number() -> str:
    """Generate an invoice number in the format NTW-XXXX (not checked for uniqueness)."""
    return f"NTW-{_random_digits(4)}"


async def generate_unique_number(
    prefix: str,
    exists: Callable[[str], Awaitable[bool]],
    digits: int = 4,
) -> str:
    """Generate ``PREFIX-<digits>`` that does not exist yet.

    Tries the short format first and widens it if the short space is crowded,
    so numbers never collide even after thousands of records.
    """
    for width in (digits, digits + 2, digits + 4):
        for _ in range(8):
            candidate = f"{prefix}-{_random_digits(width)}"
            if not await exists(candidate):
                return candidate
    # Practically unreachable; fall back to a long random suffix.
    return f"{prefix}-{_random_digits(digits + 8)}"


def serial_key(serial: str) -> str:
    """Normalise a serial / IMEI for matching: no spaces or dashes, upper-case."""
    return re.sub(r"[\s\-]+", "", serial or "").upper()


def serial_regex(serial: str) -> re.Pattern[str]:
    """Regex that matches a stored serial ignoring case, spaces and dashes."""
    key = serial_key(serial)
    body = r"[\s\-]*".join(re.escape(ch) for ch in key)
    return re.compile(rf"^[\s\-]*{body}[\s\-]*$", re.IGNORECASE)


def search_regex(q: str) -> re.Pattern[str]:
    """Case-insensitive 'contains' regex built from user text, safely escaped.

    Digit-only queries (phone numbers, IMEIs) also match when the stored value
    has spaces or dashes between the digits.
    """
    q = q.strip()
    compact = re.sub(r"[\s\-]+", "", q)
    if compact.lstrip("+").isdigit() and len(compact) >= 3:
        body = r"[\s\-]*".join(re.escape(ch) for ch in compact)
    else:
        body = re.escape(q)
    return re.compile(body, re.IGNORECASE)


def parse_date(value: str | None) -> datetime.date | None:
    if not value:
        return None
    try:
        return datetime.date.fromisoformat(value)
    except ValueError:
        return None


def day_start_utc(day: datetime.date) -> datetime.datetime:
    """Midnight Lagos time for ``day``, expressed in UTC."""
    return datetime.datetime.combine(day, datetime.time.min, tzinfo=LAGOS_TZ).astimezone(
        datetime.timezone.utc
    )


def date_range_filter(
    field: str, date_from: str | None, date_to: str | None
) -> dict[str, Any]:
    """Mongo filter for ``field`` between two YYYY-MM-DD dates (Lagos, inclusive)."""
    start = parse_date(date_from)
    end = parse_date(date_to)
    rng: dict[str, Any] = {}
    if start:
        rng["$gte"] = day_start_utc(start)
    if end:
        rng["$lt"] = day_start_utc(end + datetime.timedelta(days=1))
    return {field: rng} if rng else {}

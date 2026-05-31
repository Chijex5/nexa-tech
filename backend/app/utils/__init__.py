import datetime
import random
import string


def generate_invoice_number() -> str:
    """Generate a unique-ish invoice number in the format NTW-XXXX."""
    suffix = "".join(random.choices(string.digits, k=4))
    return f"NTW-{suffix}"


def today_str() -> str:
    """Return today's date as DD/MM/YYYY."""
    return datetime.date.today().strftime("%d/%m/%Y")

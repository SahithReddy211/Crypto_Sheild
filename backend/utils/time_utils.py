from datetime import datetime, timezone, timedelta
import re

# Authoritative internal timezone is UTC.
# User display and input timezone is Asia/Kolkata (IST = UTC+05:30).
IST = timezone(timedelta(hours=5, minutes=30))

def parse_to_utc(dt_or_str, default_tz=IST):
    """
    Parses any datetime object or ISO string to an offset-aware UTC datetime.
    - If input is already offset-aware, converts directly to UTC.
    - If input is naive (no timezone offset or 'Z'), treats it as default_tz (IST)
      and converts to the corresponding UTC instant.
    """
    if dt_or_str is None:
        return None
    if isinstance(dt_or_str, datetime):
        if dt_or_str.tzinfo is None:
            return dt_or_str.replace(tzinfo=default_tz).astimezone(timezone.utc)
        return dt_or_str.astimezone(timezone.utc)
    
    val = str(dt_or_str).strip()
    if not val:
        return None
        
    val_clean = val.replace(' ', 'T')
    
    # Check if timezone is explicit (Z or +HH:MM / -HH:MM)
    if val_clean.endswith('Z'):
        dt = datetime.fromisoformat(val_clean[:-1] + '+00:00')
        return dt.astimezone(timezone.utc)
    
    # Check for offset like +05:30 or -04:00 after the time portion (index > 10)
    time_part = val_clean[10:] if len(val_clean) > 10 else ''
    if '+' in time_part or '-' in time_part:
        dt = datetime.fromisoformat(val_clean)
        return dt.astimezone(timezone.utc)
    
    # Naive ISO string (e.g. "2026-09-03T09:50:00" or "2026-09-03T09:50")
    # Interpret as default_tz (IST), then convert to UTC!
    dt = datetime.fromisoformat(val_clean)
    return dt.replace(tzinfo=default_tz).astimezone(timezone.utc)

def parse_date_and_time_to_utc(date_str, time_str, default_tz=IST):
    """
    Combines date ("YYYY-MM-DD") and time ("HH:MM" or "HH:MM:SS") in IST
    and converts to UTC datetime.
    Example:
    date_str="2026-09-03", time_str="09:50" -> 2026-09-03 04:20:00 UTC
    """
    if not date_str or not time_str:
        return None
    time_clean = time_str.strip()
    if len(time_clean) == 5:
        time_clean += ':00'
    combined = f"{date_str.strip()}T{time_clean}"
    return parse_to_utc(combined, default_tz=default_tz)

def format_iso_utc(dt):
    """Formats datetime as ISO 8601 string ending in 'Z' (e.g. '2026-09-03T04:20:00Z')"""
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime('%Y-%m-%dT%H:%M:%SZ')

def format_ist(dt, fmt='%I:%M %p IST'):
    """Formats a UTC or naive datetime in Asia/Kolkata (IST)"""
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt_ist = dt.astimezone(IST)
    return dt_ist.strftime(fmt)

def get_current_server_time_utc():
    """Returns the authoritative current server time in offset-aware UTC"""
    return datetime.now(timezone.utc)

def ensure_utc(dt):
    """
    Ensures a datetime is offset-aware UTC. 
    SQLite returns naive datetimes; this treats them as UTC (which is correct,
    since we always store UTC in the DB). Offset-aware datetimes are converted.
    Returns None if dt is None.
    """
    if dt is None:
        return None
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    # Handle string case
    return parse_to_utc(dt)

import re
import json
import datetime
from google.genai import Client
from google.genai import types

def parse_time(time_str: str) -> str:
    """Normalizes time strings like '9 AM', '8:30 AM', '5 PM', '08:30' to 'HH:MM'."""
    time_str = time_str.strip().lower()
    match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", time_str)
    if not match:
        return "12:00"
    hour = int(match.group(1))
    minute = int(match.group(2)) if match.group(2) else 0
    am_pm = match.group(3)

    if am_pm == "pm" and hour < 12:
        hour += 12
    elif am_pm == "am" and hour == 12:
        hour = 0
        
    return f"{hour:02d}:{minute:02d}"

def clean_title(title: str) -> str:
    """Cleans trailing temporal prepositions from the title."""
    title = re.sub(r"\s+(every|at|on|tomorrow|daily|weekly|schedule)\b.*$", "", title, flags=re.IGNORECASE)
    title = title.strip()
    if title.lower().startswith("to "):
        title = title[3:]
    elif title.lower().startswith("for "):
        title = title[4:]
    return title.strip()

def deterministic_parse(prompt: str) -> dict | None:
    text_lower = prompt.lower()
    
    # 1. First, strip leading reminder prefixes like "remind me to", etc.
    prefix_match = re.match(
        r"^(remind me to|remind me|add reminder to|add reminder for|schedule reminder for|schedule|please remind me to)\s+",
        prompt,
        re.IGNORECASE
    )
    core_text = prompt[prefix_match.end():] if prefix_match else prompt
    
    # 2. Find and extract the time expression.
    time_val = "12:00"
    time_expr_match = re.search(r"\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b", core_text, re.IGNORECASE)
    time_substr = ""
    if time_expr_match:
        time_substr = time_expr_match.group(0)
        time_val = parse_time(time_expr_match.group(1))
    else:
        time_match = re.search(r"\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b|\b(\d{1,2}\s*(?:am|pm))\b", core_text, re.IGNORECASE)
        if time_match:
            time_substr = time_match.group(0)
            time_val = parse_time(time_substr)
            
    # 3. Determine type and day, and identify day expression substring.
    rtype = "one-time"
    day_val = None
    day_substr = ""
    
    weekly_match = re.search(r"\bevery\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b", core_text, re.IGNORECASE)
    if weekly_match:
        rtype = "weekly"
        day_val = weekly_match.group(1).capitalize()
        day_substr = weekly_match.group(0)
    elif re.search(r"\bdaily\b|\bevery\s+day\b", core_text, re.IGNORECASE):
        rtype = "daily"
        day_val = None
        m = re.search(r"\bdaily\b|\bevery\s+day\b", core_text, re.IGNORECASE)
        day_substr = m.group(0)
    elif re.search(r"\btomorrow\b", core_text, re.IGNORECASE):
        rtype = "one-time"
        day_val = "tomorrow"
        m = re.search(r"\btomorrow\b", core_text, re.IGNORECASE)
        day_substr = m.group(0)
    else:
        # Check specific date like "on July 6" or "july 6"
        date_match = re.search(r"\b(?:on\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b", core_text, re.IGNORECASE)
        if date_match:
            rtype = "one-time"
            day_val = f"{date_match.group(1).capitalize()} {date_match.group(2)}"
            day_substr = date_match.group(0)
            
    # 4. Remove time_substr and day_substr from core_text
    title_text = core_text
    if time_substr:
        title_text = re.sub(re.escape(time_substr), "", title_text, flags=re.IGNORECASE)
    if day_substr:
        title_text = re.sub(re.escape(day_substr), "", title_text, flags=re.IGNORECASE)
        
    title_text = re.sub(r"\s+", " ", title_text).strip()
    
    # Strip leading/trailing prepositions repeatedly
    while True:
        prev_len = len(title_text)
        title_text = re.sub(r"^(to|for|at|on|every)\s+", "", title_text, flags=re.IGNORECASE)
        title_text = re.sub(r"\s+(to|for|at|on|every)$", "", title_text, flags=re.IGNORECASE)
        title_text = title_text.strip()
        if len(title_text) == prev_len:
            break
            
    if not title_text:
        title_text = "take action"
        
    return {
        "title": title_text,
        "type": rtype,
        "time": time_val,
        "day": day_val
    }

def parse_reminder(prompt: str) -> dict:
    """Parses natural language reminders into structured reminder data.
    Uses local deterministic parser first, then falls back to Gemini if needed.
    """
    res = deterministic_parse(prompt)
    if res and res.get("title") and res.get("type"):
        if len(res["title"]) < len(prompt) * 0.8 or "remind" not in res["title"].lower():
            return res
            
    try:
        client = Client()
        system_instruction = (
            "You are a reminder parser. Parse the user's reminder request into a JSON object with: "
            "'title' (the task to do), 'type' (daily, weekly, or one-time), 'time' (HH:MM format), and "
            "'day' (for weekly, e.g., 'Sunday', or specific date like 'July 6', or None). Return ONLY raw JSON."
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json"
               )
        )
        if response.text:
            parsed = json.loads(response.text)
            return {
                "title": parsed.get("title", "take action"),
                "type": parsed.get("type", "one-time"),
                "time": parsed.get("time", "12:00"),
                "day": parsed.get("day")
            }
    except Exception:
        pass
        
    return res if res else {
        "title": "take action",
        "type": "one-time",
        "time": "12:00",
        "day": None
    }

import os
import json
import logging
import asyncio
from datetime import datetime, timedelta
from google.genai import types

from app.memory_store import load_memory, load_missions
from app.reminder_store import load_reminders

logger = logging.getLogger(__name__)

def count_to_text(n: int) -> str:
    words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]
    if 0 <= n <= 10:
        return words[n]
    return str(n)

def build_reminder_context(reminders: list, now: datetime):
    overdue_count = 0
    today_count = 0
    next_rem_dt = None
    next_rem_title = None

    for r in reminders:
        if r.get("status") in ("completed", "triggered"):
            continue
            
        r_time_str = r.get("time", "00:00")
        r_type = r.get("type", "one-time")
        r_day = r.get("day")
        
        # Parse hour and minute
        try:
            parts = r_time_str.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
        except Exception:
            hour, minute = 0, 0
            
        # Determine scheduled datetime
        scheduled_dt = None
        
        if r_type == "daily":
            # Scheduled for today
            scheduled_dt = datetime(now.year, now.month, now.day, hour, minute)
            if scheduled_dt < now:
                # Daily reminder for today has already passed, next occurrence is tomorrow
                scheduled_dt = scheduled_dt + timedelta(days=1)
        elif r_type == "weekly" and r_day:
            days_of_week = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            try:
                target_day_idx = days_of_week.index(r_day.lower())
                current_day_idx = now.weekday()
                days_ahead = target_day_idx - current_day_idx
                if days_ahead < 0 or (days_ahead == 0 and datetime(now.year, now.month, now.day, hour, minute) < now):
                    days_ahead += 7
                target_date = now.date() + timedelta(days=days_ahead)
                scheduled_dt = datetime(target_date.year, target_date.month, target_date.day, hour, minute)
            except Exception:
                pass
        elif r_type == "one-time":
            if not r_day:
                try:
                    created_dt = datetime.fromisoformat(r.get("created_at"))
                    scheduled_dt = datetime(created_dt.year, created_dt.month, created_dt.day, hour, minute)
                except Exception:
                    scheduled_dt = datetime(now.year, now.month, now.day, hour, minute)
            elif r_day.lower() == "tomorrow":
                tomorrow_date = now.date() + timedelta(days=1)
                scheduled_dt = datetime(tomorrow_date.year, tomorrow_date.month, tomorrow_date.day, hour, minute)
            else:
                try:
                    parsed_date = datetime.strptime(r_day, "%Y-%m-%d").date()
                    scheduled_dt = datetime(parsed_date.year, parsed_date.month, parsed_date.day, hour, minute)
                except Exception:
                    try:
                        parsed_date = datetime.strptime(f"{r_day} {now.year}", "%B %d %Y").date()
                        scheduled_dt = datetime(parsed_date.year, parsed_date.month, parsed_date.day, hour, minute)
                    except Exception:
                        pass
                        
        if scheduled_dt:
            if scheduled_dt < now:
                overdue_count += 1
            else:
                if scheduled_dt.date() == now.date():
                    today_count += 1
                if next_rem_dt is None or scheduled_dt < next_rem_dt:
                    next_rem_dt = scheduled_dt
                    next_rem_title = r.get("title", "Reminder")
                    
    next_reminder_str = "None"
    if next_rem_dt:
        time_part = next_rem_dt.strftime("%I:%M %p").lstrip("0")
        if next_rem_dt.date() == now.date():
            next_reminder_str = f"today at {time_part} ({next_rem_title})"
        elif next_rem_dt.date() == (now.date() + timedelta(days=1)):
            next_reminder_str = f"tomorrow at {time_part} ({next_rem_title})"
        else:
            next_reminder_str = f"{next_rem_dt.strftime('%A')} at {time_part} ({next_rem_title})"
            
    return overdue_count, today_count, next_reminder_str


class ContextBuilder:
    @staticmethod
    def extract_user_name(facts: list) -> str:
        for f in facts:
            text = f.get("fact", "").lower()
            if "my name is" in text:
                parts = f["fact"].split("is")
                if len(parts) > 1:
                    name = parts[1].strip().strip(".").strip()
                    if name.lower().startswith("mithun"):
                        return "Mithun"
                    return name
        return "Mithun"

    @classmethod
    def build_context(cls) -> dict:
        now = datetime.now()
        
        try:
            memories = load_memory().get("facts", [])
        except Exception as e:
            logger.error(f"Error loading memories in ContextBuilder: {e}")
            memories = []
            
        try:
            missions = load_missions()
        except Exception as e:
            logger.error(f"Error loading missions in ContextBuilder: {e}")
            missions = []
            
        try:
            reminders = load_reminders()
        except Exception as e:
            logger.error(f"Error loading reminders in ContextBuilder: {e}")
            reminders = []

        user_name = cls.extract_user_name(memories)
        
        active_missions = [m for m in missions if m.get("status", "").lower() == "active"]
        active_mission_count = len(active_missions)
        
        highest_priority_mission = None
        remaining_mission_tasks = 0
        max_unfinished = -1
        
        for m in active_missions:
            unfinished_count = 0
            for t in m.get("tasks", []):
                if not t.get("completed", False):
                    unfinished_count += 1
            
            remaining_mission_tasks += unfinished_count
            
            if unfinished_count > max_unfinished:
                max_unfinished = unfinished_count
                highest_priority_mission = m.get("title")
                
        overdue_reminder_count, today_reminder_count, next_reminder = build_reminder_context(reminders, now)
        
        return {
            "userName": user_name,
            "activeMissionCount": active_mission_count,
            "highestPriorityMission": highest_priority_mission,
            "remainingMissionTasks": remaining_mission_tasks,
            "overdueReminderCount": overdue_reminder_count,
            "todayReminderCount": today_reminder_count,
            "nextReminder": next_reminder,
            "knowledgeCount": len(memories)
        }


class GreetingGenerator:
    @staticmethod
    def generate_greeting(context: dict) -> str:
        user_name = context.get("userName", "Mithun")
        active_missions = context.get("activeMissionCount", 0)
        priority_mission = context.get("highestPriorityMission")
        remaining_tasks = context.get("remainingMissionTasks", 0)
        overdue_count = context.get("overdueReminderCount", 0)
        today_count = context.get("todayReminderCount", 0)
        next_rem = context.get("nextReminder", "None")
        knowledge_count = context.get("knowledgeCount", 0)
        
        # Determine time of day
        hours = datetime.now().hour
        if hours < 12:
            time_of_day = "morning"
        elif hours < 17:
            time_of_day = "afternoon"
        else:
            time_of_day = "evening"

        # 1. Check for complete absence of user data (facts, missions, reminders)
        if active_missions == 0 and remaining_tasks == 0 and overdue_count == 0 and today_count == 0 and knowledge_count <= 1:
            return f"Hi, {user_name}.\n\nWhat can I do for you today?"
            
        # 2. Priority Rule 1: Overdue Reminders
        if overdue_count > 0:
            lines = [f"Welcome back, {user_name}."]
            
            rem_word = "reminder" if overdue_count == 1 else "reminders"
            miss_word = "active mission" if active_missions == 1 else "active missions"
            overdue_text = count_to_text(overdue_count)
            
            if active_missions > 0:
                lines.append(f"You have {overdue_text} overdue {rem_word} and {count_to_text(active_missions)} {miss_word}.")
            else:
                lines.append(f"You have {overdue_text} overdue {rem_word}.")
                
            if priority_mission:
                lines.append(f"Your highest priority appears to be completing the {priority_mission}.")
                
            lines.append("What should we tackle first?")
            return "\n\n".join(lines)
            
        # 3. Priority Rule 2: Today's Reminders
        if today_count > 0:
            lines = [f"Good {time_of_day}, {user_name}."]
            
            rem_word = "reminder" if today_count == 1 else "reminders"
            lines.append(f"You have {count_to_text(today_count)} {rem_word} scheduled for today.")
            
            if next_rem and next_rem != "None":
                lines.append(f"Your next agenda item is {next_rem}.")
                
            if active_missions > 0 and remaining_tasks > 0:
                miss_word = "mission" if active_missions == 1 else "missions"
                task_word = "task" if remaining_tasks == 1 else "tasks"
                lines.append(f"I am also tracking {count_to_text(active_missions)} active {miss_word} with {count_to_text(remaining_tasks)} remaining {task_word}.")
                
            lines.append("What can I help you with today?")
            return "\n\n".join(lines)
            
        # 4. Priority Rule 3: Active mission with unfinished tasks
        if active_missions > 0 and remaining_tasks > 0:
            lines = [f"Good {time_of_day}, {user_name}."]
            
            miss_word = "active mission" if active_missions == 1 else "active missions"
            task_word = "remaining task" if remaining_tasks == 1 else "remaining tasks"
            lines.append(f"You currently have {count_to_text(active_missions)} {miss_word} with {count_to_text(remaining_tasks)} {task_word}.")
            
            if next_rem and next_rem != "None":
                lines.append(f"Your next reminder is {next_rem}.")
                
            lines.append("What would you like to work on today?")
            return "\n\n".join(lines)
            
        # 5. Priority Rule 4: Upcoming reminders
        if next_rem and next_rem != "None":
            lines = [
                f"Good {time_of_day}, {user_name}.",
                f"Your next scheduled reminder is {next_rem}.",
                "What would you like to focus on today?"
            ]
            return "\n\n".join(lines)
            
        # 6. Priority Rule 5: General greeting fallback
        return f"Hi, {user_name}.\n\nWhat can I do for you today?"


async def get_optional_suggestion(context: dict) -> str | None:
    try:
        from google.genai import Client
        import os
        if not os.environ.get("GEMINI_API_KEY") and not os.environ.get("GOOGLE_API_KEY"):
            return None
            
        user_name = context.get("userName", "Mithun")
        active_missions = context.get("activeMissionCount", 0)
        remaining_tasks = context.get("remainingMissionTasks", 0)
        priority_mission = context.get("highestPriorityMission")
        
        prompt = (
            f"As J.A.R.V.I.S., Mithun's intelligent AI assistant, analyze this short context and give exactly one "
            f"highly relevant, smart suggestions for their next logical step (max 1 sentence).\n"
            f"Context:\n"
            f"- User: {user_name}\n"
            f"- Active missions: {active_missions}\n"
            f"- Remaining tasks: {remaining_tasks}\n"
            f"- Main objective: {priority_mission}\n\n"
            f"Return ONLY the suggestion starting with 'Suggested next step: ' or similar."
        )
        
        def run_call():
            client = Client()
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=80
                )
            )
            return response.text.strip()
            
        suggestion = await asyncio.wait_for(asyncio.to_thread(run_call), timeout=1.8)
        return suggestion if suggestion else None
    except Exception as e:
        logger.warning(f"Optional suggestion generation omitted: {e}")
        return None

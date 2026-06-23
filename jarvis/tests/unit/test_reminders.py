import unittest
import os
import json
import shutil
from datetime import datetime, timedelta

from app.reminder_parser import parse_reminder, deterministic_parse
from app.reminder_store import (
    load_reminders,
    save_reminders,
    add_reminder,
    update_reminder,
    delete_reminder,
    get_due_reminders,
    REMINDERS_FILE,
    DATA_DIR
)

class TestReminderSystem(unittest.TestCase):
    def setUp(self):
        # Setup temporary store
        self.backup_exists = os.path.exists(REMINDERS_FILE)
        if self.backup_exists:
            self.backup_path = REMINDERS_FILE + ".bak"
            shutil.copy2(REMINDERS_FILE, self.backup_path)
        
        # Start with empty database
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(REMINDERS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)

    def tearDown(self):
        # Restore backup database
        if self.backup_exists:
            if os.path.exists(self.backup_path):
                shutil.copy2(self.backup_path, REMINDERS_FILE)
                os.remove(self.backup_path)
        else:
            if os.path.exists(REMINDERS_FILE):
                os.remove(REMINDERS_FILE)

    def test_deterministic_parser(self):
        """Verifies that reminder_parser processes weekly, daily, and one-time tasks deterministically offline."""
        # 1. Weekly sunday reminder
        p1 = deterministic_parse("Remind me to take Vitamin D every Sunday at 9 AM")
        self.assertEqual(p1["title"], "take Vitamin D")
        self.assertEqual(p1["type"], "weekly")
        self.assertEqual(p1["time"], "09:00")
        self.assertEqual(p1["day"], "Sunday")

        # 2. Daily reminder
        p2 = deterministic_parse("Remind me daily at 8:30 AM to take medicine")
        self.assertEqual(p2["title"], "take medicine")
        self.assertEqual(p2["type"], "daily")
        self.assertEqual(p2["time"], "08:30")
        self.assertIsNone(p2["day"])

        # 3. Tomorrow relative one-time reminder
        p3 = deterministic_parse("Remind me tomorrow at 5 PM to do coding")
        self.assertEqual(p3["title"], "do coding")
        self.assertEqual(p3["type"], "one-time")
        self.assertEqual(p3["time"], "17:00")
        self.assertEqual(p3["day"], "tomorrow")

        # 4. Specific date one-time reminder
        p4 = deterministic_parse("Remind me to submit the capstone on July 6")
        self.assertEqual(p4["title"], "submit the capstone")
        self.assertEqual(p4["type"], "one-time")
        self.assertEqual(p4["time"], "12:00")  # Default
        self.assertEqual(p4["day"], "July 6")

    def test_reminder_store_crud(self):
        """Verifies CRUD operations on data/reminders.json database."""
        rem = add_reminder("Take Vitamin D", "weekly", "09:00", "Sunday")
        self.assertIsNotNone(rem["id"])
        self.assertEqual(rem["title"], "Take Vitamin D")
        
        # Load and verify
        rems = load_reminders()
        self.assertEqual(len(rems), 1)
        self.assertEqual(rems[0]["id"], rem["id"])
        
        # Update
        updated = update_reminder(rem["id"], {"status": "completed"})
        self.assertEqual(updated["status"], "completed")
        
        # Delete
        success = delete_reminder(rem["id"])
        self.assertTrue(success)
        self.assertEqual(len(load_reminders()), 0)

    def test_get_due_reminders_detection(self):
        """Verifies that get_due_reminders matches active tasks at system time and ignores completed ones."""
        # 1. Add daily reminder
        rem_daily = add_reminder("Daily check", "daily", "08:00")
        # 2. Add weekly Sunday reminder
        rem_weekly = add_reminder("Weekly call", "weekly", "09:00", "Sunday")
        # 3. Add one-time completed reminder
        rem_completed = add_reminder("Done task", "one-time", "08:00")
        update_reminder(rem_completed["id"], {"status": "completed"})

        # Check daily at 08:00 AM on Sunday
        dt_sunday_8am = datetime(2026, 6, 21, 8, 0) # June 21, 2026 is Sunday
        due_list = get_due_reminders(dt_sunday_8am)
        # Should match daily, ignore weekly (wrong time), ignore completed (done)
        self.assertEqual(len(due_list), 1)
        self.assertEqual(due_list[0]["id"], rem_daily["id"])

        # Check weekly at 09:00 AM on Sunday
        dt_sunday_9am = datetime(2026, 6, 21, 9, 0)
        due_list = get_due_reminders(dt_sunday_9am)
        self.assertEqual(len(due_list), 1)
        self.assertEqual(due_list[0]["id"], rem_weekly["id"])

        # Check weekly at 09:00 AM on Monday (wrong day of week)
        dt_monday_9am = datetime(2026, 6, 22, 9, 0)
        due_list = get_due_reminders(dt_monday_9am)
        self.assertEqual(len(due_list), 0)

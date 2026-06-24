import unittest
import os
import json
import shutil

from app.memory_store import (
    load_memory,
    save_memory,
    add_fact,
    recall_facts,
    delete_fact,
    MEMORY_FILE,
    DATA_DIR
)

class TestMemorySystem(unittest.TestCase):
    def setUp(self):
        self.backup_exists = os.path.exists(MEMORY_FILE)
        if self.backup_exists:
            self.backup_path = MEMORY_FILE + ".bak"
            shutil.copy2(MEMORY_FILE, self.backup_path)
            
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump({"facts": []}, f)

    def tearDown(self):
        if self.backup_exists:
            if os.path.exists(self.backup_path):
                shutil.copy2(self.backup_path, MEMORY_FILE)
                os.remove(self.backup_path)
        else:
            if os.path.exists(MEMORY_FILE):
                os.remove(MEMORY_FILE)

    def test_memory_store_fact_and_recall_confidence(self):
        """Verifies storing a fact and matching it with confidence calculations."""
        add_fact("capstone deadline is July 6")
        add_fact("my sister's birthday is October 12")

        # 1. High confidence match (score >= 0.80)
        r1 = recall_facts("When is my capstone deadline?")
        self.assertEqual(r1["fact"], "capstone deadline is July 6")
        self.assertGreaterEqual(r1["confidence"], 0.80)

        # 2. Medium confidence match (0.50 <= score < 0.80)
        r2 = recall_facts("what is the deadline of the capstone project check details?")
        self.assertEqual(r2["fact"], "capstone deadline is July 6")
        self.assertEqual(r2["confidence"], 0.78)
        self.assertTrue(0.50 <= r2["confidence"] < 0.80)

        # 3. Low confidence match (score < 0.50)
        r3 = recall_facts("When is my space mission launch?")
        self.assertIsNone(r3["fact"])
        self.assertEqual(r3["confidence"], 0.0)

    def test_delete_fact(self):
        """Verifies deleting a fact from the database."""
        f1 = add_fact("capstone deadline is July 6")
        f2 = add_fact("my sister's birthday is October 12")
        
        # Verify both facts are stored
        data = load_memory()
        self.assertEqual(len(data["facts"]), 2)
        
        # Delete first fact
        success = delete_fact(f1["id"])
        self.assertTrue(success)
        
        # Verify only second fact remains
        data2 = load_memory()
        self.assertEqual(len(data2["facts"]), 1)
        self.assertEqual(data2["facts"][0]["id"], f2["id"])
        
        # Deleting non-existent fact returns False
        success2 = delete_fact("non-existent-id")
        self.assertFalse(success2)


from google.adk.workflow import node
from google.genai import Client
from google.genai import types
import re

from app.memory_store import add_fact, recall_facts

def clean_fact_offline(prompt: str) -> str:
    """Extracts the core fact from declarations like 'Remember that my capstone deadline is July 6' offline."""
    cleaned = prompt
    prefixes = [
        r"^remember\s+that\s+my\s+",
        r"^remember\s+that\s+",
        r"^remember\s+my\s+",
        r"^remember\s+",
        r"^store\s+that\s+",
        r"^store\s+my\s+",
        r"^store\s+",
        r"^save\s+the\s+fact\s+that\s+",
        r"^save\s+that\s+",
        r"^save\s+"
    ]
    for p in prefixes:
        matched = re.match(p, cleaned, re.IGNORECASE)
        if matched:
            cleaned = cleaned[matched.end():]
            if "my" in p:
                cleaned = "my " + cleaned
            break
            
    return cleaned.strip()

@node(name="memory_store_node")
def memory_store_node(ctx, node_input) -> str:
    """Extracts and stores a fact from user prompt."""
    prompt = str(node_input)
    fact_text = ""
    
    try:
        client = Client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="You are a fact extractor. Extract the main fact declared by the user as a clean single declarative sentence. Keep it concise."
            )
        )
        if response.text:
            fact_text = response.text.strip()
    except Exception:
        pass
        
    if not fact_text:
        fact_text = clean_fact_offline(prompt)
        
    add_fact(fact_text)
    ctx.state["stored_fact"] = fact_text
    ctx.state["memoryStored"] = True
    return f"Stored memory: {fact_text}"

@node(name="memory_recall_node")
def memory_recall_node(ctx, node_input) -> str:
    """Recalls facts based on user query."""
    prompt = str(node_input)
    
    result = recall_facts(prompt)
    ctx.state["recalled_fact"] = result
    ctx.state["memoryRecalled"] = True
    
    return result.get("fact") or "No memory found."

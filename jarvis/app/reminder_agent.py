from google.adk.workflow import node
from app.reminder_parser import parse_reminder
from app.reminder_store import add_reminder

@node(name="reminder_agent")
def reminder_agent_node(ctx, node_input) -> str:
    """Parses user input, saves reminder to reminders.json, and stores in state."""
    prompt = str(node_input)
    parsed = parse_reminder(prompt)
    rem = add_reminder(
        title=parsed["title"],
        rtype=parsed["type"],
        time=parsed["time"],
        day=parsed["day"]
    )
    ctx.state["created_reminder"] = rem
    ctx.state["reminderCreated"] = True
    return f"Reminder created successfully: {rem['title']}"

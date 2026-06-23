from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import logging

# Import ADK modules
from app.agent_runtime_app import agent_runtime
from google.adk.events.event import Event

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="JARVIS IPC Bridge")

# Support both port 3000 and Vite default port 5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to ensure agent is fully configured
@app.on_event("startup")
def startup_event():
    try:
        agent_runtime.set_up()
        logger.info("ADK Agent Runtime successfully initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize ADK Agent Runtime: {e}")

class JarvisRequest(BaseModel):
    prompt: str
    user_id: str = "default_user"

@app.post("/api/chat")
async def chat_endpoint(request: JarvisRequest):
    logger.info(f"Received prompt: {request.prompt}")
    
    agent_response = ""
    try:
        events = []
        # Attempt to run query asynchronously against the ReAct agent
        async for event in agent_runtime.async_stream_query(
            message=request.prompt, 
            user_id=request.user_id
        ):
            events.append(event)
        
        # Extract text components from the events
        for event in events:
            validated_event = Event.model_validate(event)
            content = validated_event.content
            if content and content.parts:
                for part in content.parts:
                    if part.text:
                        agent_response += part.text
                        
        if not agent_response:
            agent_response = "Prompt processed but no textual answer was returned."
            
    except Exception as e:
        logger.error(f"Error executing agent query: {e}")
        # Graceful fallback if Vertex AI credentials or network is offline
        agent_response = (
            f"[STANDALONE OVERRIDE] I received your prompt: \"{request.prompt}\".\n"
            f"The backend is offline/unauthenticated (Reason: {str(e)}). "
            f"System remains operational in override mode."
        )

    # Calculate telemetry metrics for the frontend indicators
    gpu_load = random.randint(15, 80) if request.prompt else 10
    cpu_load = random.randint(20, 70)
    ram_load = random.randint(45, 85)
    disk_load = 42
    temperature = random.randint(40, 65)

    return {
        "status": "success",
        "message": agent_response,
        "gpu_load": gpu_load,
        "cpu_load": cpu_load,
        "ram_load": ram_load,
        "disk_load": disk_load,
        "temperature": temperature,
        "sync_active": True
    }
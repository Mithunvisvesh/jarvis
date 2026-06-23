/**
 * API Service Layer for JARVIS
 */

const API_BASE_URL = 'http://localhost:8000';

export async function sendChatMessage(prompt, userId = 'user_01') {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        message: data.message || 'JARVIS online.',
        gpu_load: typeof data.gpu_load === 'number' ? data.gpu_load : 10,
        // Accept additional optional telemetry stats from backend
        cpu_load: data.cpu_load || null,
        ram_load: data.ram_load || null,
        disk_load: data.disk_load || null,
        temperature: data.temperature || null,
        sync_active: data.sync_active !== undefined ? data.sync_active : true,
      }
    };
  } catch (error) {
    console.error('Failed to communicate with JARVIS backend:', error);
    return {
      success: false,
      error: error.message,
      data: {
        message: `[IPC CONNECTION OFFLINE] Direct override mode enabled. ReAct agent unavailable. Details: ${error.message}`,
        gpu_load: 5,
        cpu_load: 0,
        ram_load: 0,
        disk_load: 0,
        temperature: 0,
        sync_active: false,
      }
    };
  }
}

/**
 * API Service Layer for JARVIS
 */

const API_BASE_URL = 'http://localhost:8001';

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
        gpu_load: data.gpuLoad !== undefined ? data.gpuLoad : (typeof data.gpu_load === 'number' ? data.gpu_load : 10),
        // Accept additional optional telemetry stats from backend
        cpu_load: data.cpuLoad !== undefined ? data.cpuLoad : (data.cpu_load || null),
        ram_load: data.ramLoad !== undefined ? data.ramLoad : (data.ram_load || null),
        disk_load: data.diskLoad !== undefined ? data.diskLoad : (data.disk_load || null),
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

export async function getReminders() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reminders`);
    if (!response.ok) throw new Error("Failed to fetch reminders");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createReminder(title, time, type = "one-time", day = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, time, type, day }),
    });
    if (!response.ok) throw new Error("Failed to create reminder");
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function updateReminderStatus(id, status) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error("Failed to update reminder status");
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function deleteReminder(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reminders/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete reminder");
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getMemories() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/memory`);
    if (!response.ok) throw new Error("Failed to fetch memories");
    return await response.json();
  } catch (error) {
    console.error(error);
    return { facts: [] };
  }
}

export async function deleteMemory(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/memory/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete memory");
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getDueReminders(currentDt = null) {
  try {
    const url = currentDt 
      ? `${API_BASE_URL}/api/reminders/due?current_dt=${encodeURIComponent(currentDt)}`
      : `${API_BASE_URL}/api/reminders/due`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch due reminders");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}


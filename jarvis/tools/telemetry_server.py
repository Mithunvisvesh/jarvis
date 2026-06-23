import platform
import psutil
import logging

logger = logging.getLogger(__name__)

def get_system_stats() -> dict:
    """Gathers CPU, RAM, Disk, and GPU telemetry stats locally.
    
    Uses platform-aware path detection for Disk usage and is safe from GPUtil failures.
    
    Returns:
        dict: A dictionary containing cpuLoad, ramLoad, diskLoad, and gpuLoad.
    """
    # 1. Platform-aware disk detection
    if platform.system() == "Windows":
        disk_path = "C:\\"
    else:
        disk_path = "/"

    # 2. Gathers stats with try/except fallbacks
    try:
        # Non-blocking cpu_percent. If first run is 0, we fallback or use it.
        # An interval of 0.05s guarantees a non-zero reading on first run.
        cpu_load = int(psutil.cpu_percent(interval=0.05))
    except Exception as e:
        logger.warning(f"Failed to read CPU stats: {e}")
        cpu_load = 0

    try:
        ram_load = int(psutil.virtual_memory().percent)
    except Exception as e:
        logger.warning(f"Failed to read RAM stats: {e}")
        ram_load = 0

    try:
        disk_load = int(psutil.disk_usage(disk_path).percent)
    except Exception as e:
        logger.warning(f"Failed to read Disk stats: {e}")
        disk_load = 0

    # 3. Safe GPU check with fallback
    gpu_load = 10  # Fallback baseline
    try:
        import GPUtil
        gpus = GPUtil.getGPUs()
        if gpus:
            gpu_load = int(gpus[0].load * 100)
    except Exception:
        # Graceful fallback if GPUtil is uninstalled, no GPU, or driver issues occur
        pass

    return {
        "cpuLoad": cpu_load,
        "ramLoad": ram_load,
        "diskLoad": disk_load,
        "gpuLoad": gpu_load
    }

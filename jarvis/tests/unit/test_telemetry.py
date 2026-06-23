from tools.telemetry_server import get_system_stats

def test_get_system_stats():
    """Verifies that get_system_stats returns the expected structure and valid values."""
    stats = get_system_stats()
    
    # 1. Structure assertions
    assert isinstance(stats, dict)
    assert "cpuLoad" in stats
    assert "ramLoad" in stats
    assert "diskLoad" in stats
    assert "gpuLoad" in stats
    
    # 2. Type assertions
    assert isinstance(stats["cpuLoad"], int)
    assert isinstance(stats["ramLoad"], int)
    assert isinstance(stats["diskLoad"], int)
    assert isinstance(stats["gpuLoad"], int)
    
    # 3. Value constraint assertions
    assert 0 <= stats["cpuLoad"] <= 100
    assert 0 <= stats["ramLoad"] <= 100
    assert 0 <= stats["diskLoad"] <= 100
    assert 0 <= stats["gpuLoad"] <= 100

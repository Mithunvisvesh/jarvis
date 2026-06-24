from tools.mcp_server import handle_mcp_request

def call_mcp_tool(tool_name: str, arguments: dict = None) -> dict:
    """Calls a tool strictly routed through the local Model Context Protocol server."""
    payload = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments or {}
        },
        "id": 1
    }
    response = handle_mcp_request(payload)
    if "error" in response:
        raise RuntimeError(f"MCP Tool Error [{tool_name}]: {response['error']['message']}")
    return response["result"]

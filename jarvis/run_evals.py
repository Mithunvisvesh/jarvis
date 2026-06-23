import os
import json
import time
import sys
from fastapi.testclient import TestClient
from server import app, JarvisResponse

# Reconfigure stdout to use UTF-8 on Windows terminals
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_JSON_PATH = os.path.join(BASE_DIR, "evaluations", "schema_validation.test.json")
REPORT_MD_PATH = os.path.join(BASE_DIR, "evaluations", "report.md")

def run_evaluations():
    print("Initializing Phase 2.5 evaluation framework...")
    
    # Load the test dataset
    if not os.path.exists(TEST_JSON_PATH):
        raise FileNotFoundError(f"Test suite not found at {TEST_JSON_PATH}")
        
    with open(TEST_JSON_PATH, "r", encoding="utf-8") as f:
        prompts = json.load(f)
        
    client = TestClient(app)
    results = []
    passed_count = 0
    
    for idx, item in enumerate(prompts):
        prompt_id = item.get("id")
        prompt = item.get("prompt")
        expected_route = item.get("expected_route")
        description = item.get("description")
        
        print(f"[{idx+1}/{len(prompts)}] Running prompt '{prompt}' (Expected route: {expected_route})...")
        
        start_time = time.time()
        
        # Send post request to FastAPI
        response = client.post("/api/chat", json={
            "prompt": prompt,
            "user_id": f"eval_user_{idx}",
            "session_id": f"eval_session_{idx}"
        })
        
        duration = (time.time() - start_time) * 1000  # ms
        
        status_code = response.status_code
        payload = {}
        error_message = ""
        schema_valid = False
        route_correct = False
        
        if status_code == 200:
            payload = response.json()
            # 1. Validate response schema against JarvisResponse Pydantic model
            try:
                JarvisResponse(**payload)
                schema_valid = True
            except Exception as e:
                error_message = f"Schema validation error: {str(e)}"
                
            # 2. Validate route correctness
            actual_route = payload.get("route")
            if actual_route == expected_route:
                route_correct = True
            else:
                error_message = (error_message + " | " if error_message else "") + f"Route mismatch: expected {expected_route}, got {actual_route}"
        else:
            error_message = f"HTTP Error status code: {status_code}"
            
        case_passed = schema_valid and route_correct
        if case_passed:
            passed_count += 1
            
        results.append({
            "id": prompt_id,
            "prompt": prompt,
            "expected_route": expected_route,
            "actual_route": payload.get("route") if status_code == 200 else "N/A",
            "description": description,
            "status_code": status_code,
            "duration_ms": round(duration, 2),
            "schema_valid": schema_valid,
            "route_correct": route_correct,
            "passed": case_passed,
            "error_message": error_message,
            "response_message": payload.get("message") if status_code == 200 else "N/A"
        })
        
    pass_rate = (passed_count / len(prompts)) * 100 if prompts else 0
    print(f"Evaluation complete. Pass rate: {pass_rate:.2f}% ({passed_count}/{len(prompts)} passed)")
    
    # Generate evaluations/report.md
    markdown_lines = [
        "# JARVIS Programmatic Evaluation & Schema Validation Report",
        "",
        f"**Date/Time (Local)**: {time.strftime('%Y-%m-%d %H:%M:%S')}",
        f"**Overall Pass Rate**: {pass_rate:.2f}% ({passed_count}/{len(prompts)} passed)",
        "",
        "## Summary Statistics",
        "| Total Prompts | Passed | Failed | Pass Rate |",
        "| ------------- | ------ | ------ | --------- |",
        f"| {len(prompts)} | {passed_count} | {len(prompts) - passed_count} | {pass_rate:.2f}% |",
        "",
        "## Prompt Breakdown",
        "| ID | Prompt | Expected Route | Actual Route | Schema Valid | Route Match | Status Code | Time (ms) | Pass/Fail |",
        "| -- | ------ | -------------- | ------------ | ------------ | ----------- | ----------- | --------- | --------- |"
    ]
    
    for r in results:
        pass_fail_label = "✅ PASS" if r["passed"] else f"❌ FAIL ({r['error_message']})"
        escaped_prompt = r["prompt"].replace("\n", "\\n")
        markdown_lines.append(
            f"| {r['id']} | `{escaped_prompt}` | `{r['expected_route']}` | `{r['actual_route']}` | "
            f"{r['schema_valid']} | {r['route_correct']} | {r['status_code']} | {r['duration_ms']} | {pass_fail_label} |"
        )
        
    markdown_lines.extend([
        "",
        "## Detailed Analysis & Failing Prompts",
        ""
    ])
    
    failures = [r for r in results if not r["passed"]]
    if failures:
        markdown_lines.append("The following prompts failed verification:")
        for f in failures:
            markdown_lines.extend([
                f"### {f['id']}",
                f"- **Prompt**: `{f['prompt']}`",
                f"- **Description**: {f['description']}",
                f"- **Failure Reason**: {f['error_message']}",
                f"- **Actual Response Payload**: `{f['response_message']}`",
                ""
            ])
    else:
        markdown_lines.append("All evaluation prompts passed schema validation and routing assertions successfully! No regression failures detected.")
        
    markdown_lines.extend([
        "",
        "## Recommendations",
        "1. **Intent Keyword Tuning**: If any intent classification fails (e.g. mixed intent prompts), refine the keyword checklist or regex rules in `app/agent.py` to ensure robust routing.",
        "2. **Pydantic Hardening**: Maintain `JarvisResponse` model as the source-of-truth for all integrations to prevent future React UI crashes from malformed responses.",
        "3. **CI/CD Integration**: Run this evaluation pipeline (`python run_evals.py`) in pre-push or pre-merge Git hooks to automatically verify contracts before deploying updates.",
        ""
    ])
    
    # Ensure directory exists and write report
    os.makedirs(os.path.dirname(REPORT_MD_PATH), exist_ok=True)
    with open(REPORT_MD_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(markdown_lines))
        
    print(f"Evaluation report written successfully to {REPORT_MD_PATH}")

if __name__ == "__main__":
    run_evaluations()

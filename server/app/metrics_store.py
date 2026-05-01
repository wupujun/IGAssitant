from collections import deque
from datetime import datetime
from threading import Lock
from typing import Any


LLM_METRICS_LIMIT = 1000
LLM_METRICS: deque[dict[str, Any]] = deque(maxlen=LLM_METRICS_LIMIT)
_METRICS_LOCK = Lock()


def record_llm_metric(metric: dict[str, Any]) -> None:
    entry = {
        "time": datetime.now().isoformat(timespec="seconds"),
        **metric,
    }
    with _METRICS_LOCK:
        LLM_METRICS.append(entry)


def get_llm_metrics(limit: int = 200) -> list[dict[str, Any]]:
    safe_limit = max(1, min(limit, LLM_METRICS_LIMIT))
    with _METRICS_LOCK:
        return list(LLM_METRICS)[-safe_limit:]


def summarize_llm_metrics() -> dict[str, Any]:
    with _METRICS_LOCK:
        metrics = list(LLM_METRICS)

    total = len(metrics)
    success = sum(1 for item in metrics if item.get("ok"))
    failures = total - success
    latencies = [float(item.get("latency_ms", 0)) for item in metrics if item.get("latency_ms") is not None]
    sorted_latencies = sorted(latencies)

    def percentile(value: float) -> float:
        if not sorted_latencies:
            return 0
        index = min(len(sorted_latencies) - 1, max(0, round((len(sorted_latencies) - 1) * value)))
        return round(sorted_latencies[index], 2)

    return {
        "total": total,
        "success": success,
        "failures": failures,
        "avg_ms": round(sum(latencies) / len(latencies), 2) if latencies else 0,
        "min_ms": round(min(latencies), 2) if latencies else 0,
        "max_ms": round(max(latencies), 2) if latencies else 0,
        "p50_ms": percentile(0.50),
        "p95_ms": percentile(0.95),
    }

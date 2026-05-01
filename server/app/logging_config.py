import logging
import os
from collections import deque
from datetime import datetime

LOG_BUFFER: deque[dict[str, str]] = deque(maxlen=500)


class InMemoryLogHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        LOG_BUFFER.append(
            {
                "time": datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S"),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
            }
        )


def setup_logging() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    root_logger = logging.getLogger()
    if any(isinstance(handler, InMemoryLogHandler) for handler in root_logger.handlers):
        return
    memory_handler = InMemoryLogHandler()
    memory_handler.setFormatter(logging.Formatter("%(message)s"))
    root_logger.addHandler(memory_handler)

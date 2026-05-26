PYTHON ?= python
NODE ?= node

.PHONY: install-dev check-python test lint audit check-extension test-extension smoke-extension ci

install-dev:
	$(PYTHON) -m pip install -r server/requirements-dev.txt
	npm install --prefix extension

check-python:
	$(PYTHON) -m compileall -q server tests

test:
	$(PYTHON) -m pytest

lint:
	$(PYTHON) -m ruff check server tests

audit:
	$(PYTHON) -m pip_audit -r server/requirements.txt

check-extension:
	$(NODE) --check extension/apiClient.js
	$(NODE) --check extension/debugLog.js
	$(NODE) --check extension/domSelectors.js
	$(NODE) --check extension/history.js
	$(NODE) --check extension/sessionStore.js
	$(NODE) --check extension/content.js
	$(NODE) --check extension/background.js

test-extension:
	$(NODE) --test extension/tests/*.test.js

smoke-extension:
	npm run test:smoke --prefix extension

ci: check-python lint test audit check-extension test-extension smoke-extension

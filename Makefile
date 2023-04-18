.PHONY: test test-unit coverage coverage-report

MOCHA=./node_modules/lever-test/bin/tools/mocha
NYC=./node_modules/lever-test/bin/tools/nyc
NYC_CONFIG_PATH=./node_modules/lever-test/nyc.config.js

test:
	$(MOCHA) ./test/unit/

test-unit:
	$(MOCHA) ./test/unit/

coverage:
	$(NYC) --nycrc-path "${NYC_CONFIG_PATH}" --require coffeescript/register \
		$(MOCHA) ./test/unit/

coverage-report: coverage
	open coverage/lcov-report/index.html

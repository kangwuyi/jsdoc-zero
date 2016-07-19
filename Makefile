TESTS = test/*.js
REPORTER = spec
TIMEOUT = 5000
MOCHA = ./node_modules/mocha/bin/mocha
MOCHA2 = ./node_modules/mocha/bin/_mocha
ISTANBUL = ./node_modules/.bin/istanbul

test:
	@npm install
	@$(MOCHA) --reporter $(REPORTER) --timeout $(TIMEOUT) $(MOCHA_OPTS) $(TESTS)

istanbul:
	@$(ISTANBUL) cover $(MOCHA2) test/jdz.js

.PHONY: test
.PHONY: istanbul

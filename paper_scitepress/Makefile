SHELL := /bin/bash
PYTHON ?= python3
TEX_FLAGS := -interaction=nonstopmode -halt-on-error -file-line-error -output-directory=build
TEX_ENV := TEXINPUTS=vendor:
BIB_ENV := BSTINPUTS=vendor:

export SOURCE_DATE_EPOCH ?= 1786455918
export FORCE_SOURCE_DATE := 1
export TZ := UTC

.PHONY: all assets check check-generated clean main metadata submission-check test

all: main

assets:
	cd ../paper && $(PYTHON) scripts/generate_assets.py
	mkdir -p generated
	cp ../paper/generated/*.tex generated/
	cp ../paper/references.bib references.bib

check-generated: assets
	@for source in ../paper/generated/*.tex; do \
		target=generated/$$(basename "$$source"); \
		cmp -s "$$source" "$$target" || { echo "generated copy differs: $$target" >&2; exit 1; }; \
	done
	@cmp -s ../paper/references.bib references.bib || { echo "bibliography copy differs" >&2; exit 1; }
	@if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then \
		git diff --exit-code -- ../paper/generated generated references.bib; \
	else \
		echo "No Git tree: package manifest is the immutable-source check"; \
	fi

test:
	cd .. && $(PYTHON) -m unittest paper_scitepress.tests.test_fallback_manuscript -v

metadata: assets build
	$(PYTHON) scripts/export_submission_metadata.py --output build/submission_metadata.json

build:
	mkdir -p build

main: assets build
	$(TEX_ENV) pdflatex $(TEX_FLAGS) main.tex
	$(BIB_ENV) bibtex build/main
	$(TEX_ENV) pdflatex $(TEX_FLAGS) main.tex
	$(TEX_ENV) pdflatex $(TEX_FLAGS) main.tex
	$(TEX_ENV) pdflatex $(TEX_FLAGS) main.tex

check: test check-generated main metadata
	$(PYTHON) scripts/check_build.py build/main.log build/main.blg build/main.pdf

submission-check: check
	$(PYTHON) scripts/check_submission.py \
		--expected-pages 11 \
		--expected-characters 37970 \
		build/main.pdf build/submission_metadata.json

clean:
	rm -rf build generated references.bib

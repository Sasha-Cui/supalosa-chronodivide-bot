SHELL := /bin/bash
PYTHON ?= python3
TEX_FLAGS := -interaction=nonstopmode -halt-on-error -file-line-error -output-directory=build
TEX_ENV := TEXINPUTS=vendor:
BIB_ENV := BSTINPUTS=vendor:
PAPER_ASSETS := metrics.tex mechanism_table.tex peak_strata_table.tex \
	primary_bounds_plot.tex primary_results_table.tex transfer_table.tex

export SOURCE_DATE_EPOCH ?= 1786455918
export FORCE_SOURCE_DATE := 1
export TZ := UTC

.PHONY: all assets check check-generated clean main metadata submission-check test

all: main

assets:
	cd ../paper && $(PYTHON) scripts/generate_final_assets.py
	mkdir -p generated
	rm -f generated/*.tex
	@for name in $(PAPER_ASSETS); do \
		cp "../paper/generated/$$name" "generated/$$name"; \
	done
	cp ../paper/references.bib references.bib

check-generated: assets
	@for name in $(PAPER_ASSETS); do \
		cmp -s "../paper/generated/$$name" "generated/$$name" || { \
			echo "generated copy differs: generated/$$name" >&2; exit 1; \
		}; \
	done
	@cmp -s ../paper/references.bib references.bib || { echo "bibliography copy differs" >&2; exit 1; }
	@if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then \
		git diff --exit-code -- ../paper/generated ../paper/references.bib; \
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
		--expected-pages 12 \
		--expected-characters 35465 \
		build/main.pdf build/submission_metadata.json

clean:
	rm -rf build generated references.bib

SHELL := /bin/bash
PYTHON ?= python3
TEX_FLAGS := -interaction=nonstopmode -halt-on-error -file-line-error -output-directory=build
ARTIFACT_HASH_MANIFEST ?=
ASSET_ARGS := $(if $(ARTIFACT_HASH_MANIFEST),--artifact-hash-manifest $(ARTIFACT_HASH_MANIFEST),)
TEST_ENV := $(if $(ARTIFACT_HASH_MANIFEST),CHRONO_PAPER_ARTIFACT_HASH_MANIFEST=$(abspath $(ARTIFACT_HASH_MANIFEST)),)
RESEARCH_EXPORT_TEST := ../research/tests/test_export_confirmatory_family_diagnostics.py

export SOURCE_DATE_EPOCH ?= 1786455918
export FORCE_SOURCE_DATE := 1
export TZ := UTC

.PHONY: all assets check check-generated clean main supplement

all: main supplement

assets:
	$(PYTHON) scripts/generate_assets.py $(ASSET_ARGS)

check: assets
	cd .. && $(TEST_ENV) $(PYTHON) -m unittest paper.tests.test_generate_assets -v
	@if [[ -f $(RESEARCH_EXPORT_TEST) ]]; then \
		cd .. && $(PYTHON) -m unittest research.tests.test_export_confirmatory_family_diagnostics -v; \
	fi

check-generated: assets
	git diff --exit-code -- generated

build:
	mkdir -p build

main: assets build
	pdflatex $(TEX_FLAGS) main.tex
	bibtex build/main
	pdflatex $(TEX_FLAGS) main.tex
	pdflatex $(TEX_FLAGS) main.tex

supplement: assets build
	pdflatex $(TEX_FLAGS) supplement.tex
	bibtex build/supplement
	pdflatex $(TEX_FLAGS) supplement.tex
	pdflatex $(TEX_FLAGS) supplement.tex

clean:
	rm -rf build

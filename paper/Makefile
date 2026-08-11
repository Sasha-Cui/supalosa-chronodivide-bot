SHELL := /bin/bash
PYTHON ?= python3
TEX_FLAGS := -interaction=nonstopmode -halt-on-error -file-line-error -output-directory=build

.PHONY: all assets check check-generated clean main supplement

all: main supplement

assets:
	$(PYTHON) scripts/generate_assets.py

check: assets
	cd .. && $(PYTHON) -m unittest paper.tests.test_generate_assets -v
	cd .. && $(PYTHON) -m unittest research.tests.test_export_confirmatory_family_diagnostics -v

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

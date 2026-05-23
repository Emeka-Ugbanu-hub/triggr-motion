#!/usr/bin/env bash
set -e

SITE_DIR=$(mktemp -d)
cp -r playground/dist/* "$SITE_DIR"/
cd "$SITE_DIR"
git init
git checkout -b gh-pages
git add -A
git commit -m "deploy $(date +%Y-%m-%d)"
git push --force "$(cd /Users/emekaugbanu/Desktop/motif && git remote get-url origin)" gh-pages
rm -rf "$SITE_DIR"

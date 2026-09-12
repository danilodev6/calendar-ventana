#!/bin/bash
# Reservas Casa launcher for macOS testing. Keep this window open while using
# the app; Ctrl+C stops it correctly.
cd "$(dirname "$0")"
exec node launch.mjs "$@"

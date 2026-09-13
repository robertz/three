#!/bin/sh
# Loads .env into the environment (boxlang.json's ${env.X} interpolation
# needs DB_PASSWORD etc. to actually exist as env vars, even empty — an
# unset var with a JSON-side default does not reliably resolve to empty)
# then runs the game server. --bx-config is required: a bare
# `boxlang app.bxs` does not pick up boxlang.json on its own.
set -a
[ -f "$(dirname "$0")/.env" ] && . "$(dirname "$0")/.env"
set +a
exec boxlang --bx-config "$(dirname "$0")/boxlang.json" "$(dirname "$0")/app.bxs"

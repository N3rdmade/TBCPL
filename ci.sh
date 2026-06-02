#!/bin/bash

PATH=/snap/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

cd /root/TBCPL || exit 1

LOG=/root/tbcpl-cron.log

exec >> "$LOG" 2>&1

OLD=$(git rev-parse HEAD)

git fetch origin main || { echo "[$(date)] git fetch failed"; exit 1; }
git reset --hard origin/main

NEW=$(git rev-parse HEAD)

if [ "$OLD" != "$NEW" ]; then
    echo "[$(date)] Update detected: $OLD -> $NEW"

    /snap/bin/docker compose up -d --build || { echo "[$(date)] docker build failed"; exit 1; }

    /snap/bin/docker image prune -f

    echo "[$(date)] Deploy completed"
fi

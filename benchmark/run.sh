#!/bin/bash
echo "Starting K6 benchmark against ${BASE_URL:-http://localhost:8090}..."
echo "Make sure backend is running first!"
echo ""
k6 run benchmark/k6-script.js --out json=benchmark/results.jsonl 2>&1
echo ""
echo "Report saved to benchmark/report.json"

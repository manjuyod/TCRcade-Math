#!/bin/bash

# Script to generate the question bank
echo "Starting question bank generation..."

# Run the generator script
tsx server/scripts/generate-question-bank.ts

echo "Question bank generation complete"

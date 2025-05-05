#!/bin/bash

# Master script to generate the entire question bank for all grades

# Default number of questions per category
COUNT=${1:-50}

echo "=================================================="
echo "MATH APP QUESTION BANK GENERATOR"
echo "=================================================="
echo "Generating $COUNT questions per category for all grades"
echo "This may take a while to complete..."
echo ""

# Start with kindergarten
echo "[1/7] Generating questions for Kindergarten (K)"
./generate-all-for-grade.sh "K" "$COUNT"

# Generate for grades 1-6
for grade in {1..6}; do
  echo "\n[$((grade+1))/7] Generating questions for Grade $grade"
  ./generate-all-for-grade.sh "$grade" "$COUNT"
done

echo "\n=================================================="
echo "QUESTION BANK GENERATION COMPLETE!"
echo "=================================================="
echo "Successfully generated questions for all grades K-6"
echo "Each grade has approximately $((COUNT*4)) Math Facts questions"
echo "Plus additional standard questions for all categories"
echo ""
echo "Check the database for the full question bank!"

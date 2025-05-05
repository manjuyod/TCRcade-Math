#!/bin/bash

# Script to generate Math Facts and regular questions for a specific grade level

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <grade> [count]"
  echo "  grade: Grade level (K, 1, 2, 3, 4, 5, 6)"
  echo "  count: Number of questions to generate per category (default: 50)"
  exit 1
fi

GRADE=$1
COUNT=${2:-50}

echo "---------------------------------"
echo "Generating questions for grade $GRADE"
echo "---------------------------------"

# Generate Math Facts questions for each operation
echo "\n[1/5] Generating Math Facts - Addition"
./generate-math-facts.sh "$GRADE" "addition" "$COUNT"

echo "\n[2/5] Generating Math Facts - Subtraction"
./generate-math-facts.sh "$GRADE" "subtraction" "$COUNT"

echo "\n[3/5] Generating Math Facts - Multiplication"
./generate-math-facts.sh "$GRADE" "multiplication" "$COUNT"

echo "\n[4/5] Generating Math Facts - Division"
./generate-math-facts.sh "$GRADE" "division" "$COUNT"

# Generate regular grade-level questions (the general script handles all categories)
echo "\n[5/5] Generating Standard Questions for all categories"
./generate-questions-for-grade.sh "$GRADE" "$COUNT"

echo "\nCompleted generating all questions for grade $GRADE!"
echo "Generated $((COUNT * 4)) Math Facts questions"
echo "Generated additional standard questions across all categories"
echo "---------------------------------"

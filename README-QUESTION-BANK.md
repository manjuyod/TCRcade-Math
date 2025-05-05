# Math App Question Bank Generator

This document explains how to use the question bank generation scripts to populate the database with pre-generated questions. These scripts help reduce dependency on OpenAI API calls during normal application usage.

## Available Scripts

### 1. Generate All Questions for All Grades

To generate questions for all grades and all categories (including Math Facts):

```bash
./generate-question-bank.sh
```

This will generate approximately 200 questions per grade/category combination. The process may take a long time to complete.

### 2. Generate Questions for a Specific Grade

To generate questions for a specific grade level only:

```bash
./generate-questions-for-grade.sh <grade>
```

Example:
```bash
./generate-questions-for-grade.sh 3
```

This will generate questions for all categories and Math Facts operations for grade 3 only.

### 3. Generate Math Facts Questions

To generate Math Facts questions (pure computation) for a specific grade and operation:

```bash
./generate-math-facts.sh <grade> <operation> [count]
```

Example:
```bash
./generate-math-facts.sh 2 multiplication 100
```

This will generate 100 multiplication questions for grade 2.

Valid operations are: `addition`, `subtraction`, `multiplication`, `division`.

## How the Question Bank Works

The question bank system works as follows:

1. Pre-generated questions are stored in the PostgreSQL database
2. When a user requests a question, the system first tries to fetch a question from the database
3. If no suitable question is found, only then will it fall back to generating a question via OpenAI
4. Generated questions are cached to improve performance

## Database Tables

Questions are stored in the `questions` table with the following structure:

- `id`: Auto-incremented primary key
- `category`: The category of the question (e.g., 'addition', 'fractions', etc.)
- `grade`: The grade level (K-6)
- `difficulty`: Difficulty level (1-5)
- `question`: The question text
- `answer`: The correct answer
- `options`: Array of multiple choice options
- `concepts`: Array of mathematical concepts covered by this question

## Math Facts Format

Math Facts questions (pure computation) are stored with a special format:

- The category is prefixed with `math-facts-` (e.g., `math-facts-addition`)
- The question is stored as a JSON object with special styling for flashcard-style display
- The format is always "X [operator] Y = ?" (e.g., "7 + 5 = ?")

## Benefits of the Question Bank

- Reduces dependency on OpenAI API
- Improves question loading speed
- Ensures consistent question quality
- Provides better reliability when OpenAI API is unavailable
- Allows for more customized/targeted question generation
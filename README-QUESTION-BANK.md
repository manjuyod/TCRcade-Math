# Math App Question Bank Generator

This document explains how to use the question bank generation scripts to populate the database with pre-generated questions. These scripts help reduce dependency on OpenAI API calls during normal application usage.

## Available Scripts

### 1. Generate All Questions for All Grades

To generate questions for all grades and all categories (including Math Facts):

```bash
./generate-question-bank.sh [count]
```

This will generate approximately `count` questions per grade/category combination (default is 50). The process may take a long time to complete.

### 2. Generate All Questions for a Specific Grade

To generate all question types (Math Facts and standard questions) for a specific grade:

```bash
./generate-all-for-grade.sh <grade> [count]
```

Example:
```bash
./generate-all-for-grade.sh 3 100
```

This will generate 100 questions per operation for Math Facts (addition, subtraction, multiplication, division) and 100 questions per category for standard questions, all for grade 3 only.

### 3. Generate Standard Questions for a Specific Grade

To generate standard questions (not Math Facts) for a specific grade level:

```bash
./generate-questions-for-grade.sh <grade> [count]
```

Example:
```bash
./generate-questions-for-grade.sh 3 50
```

This will generate 50 standard questions per category for grade 3.

### 4. Generate Math Facts Questions

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
- JSON structure contains:
  ```json
  {
    "text": "1 × 5 = ?",
    "style": {
      "fontSize": "60px",
      "fontWeight": "bold",
      "textAlign": "center",
      "display": "flex",
      "justifyContent": "center",
      "alignItems": "center",
      "padding": "20px",
      "isFlashcard": true
    },
    "isFlashcard": true
  }
  ```

## Benefits of the Question Bank

- Reduces dependency on OpenAI API
- Improves question loading speed
- Ensures consistent question quality
- Provides better reliability when OpenAI API is unavailable
- Allows for more customized/targeted question generation
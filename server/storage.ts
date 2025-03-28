import { users, type User, type InsertUser, userProgress, type UserProgress, type Question, type Leaderboard } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getLeaderboard(): Promise<Array<User & { score: number }>>;
  
  // Question methods
  getQuestionsByGrade(grade: string, category?: string): Promise<Question[]>;
  getAdaptiveQuestion(userId: number, grade: string, forceDynamic?: boolean, category?: string): Promise<Question | undefined>;
  
  // Progress methods
  getUserProgress(userId: number): Promise<UserProgress[]>;
  updateUserProgress(userId: number, category: string, data: Partial<UserProgress>): Promise<UserProgress>;
  
  // Session store
  sessionStore: any; // Using any for sessionStore to avoid type issues
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private questions: Map<number, Question>;
  private progress: Map<number, UserProgress>;
  private leaderboard: Map<number, Leaderboard>;
  sessionStore: any; // Using any type to avoid issues
  currentId: number;
  currentQuestionId: number;
  currentProgressId: number;
  currentLeaderboardId: number;

  constructor() {
    this.users = new Map();
    this.questions = new Map();
    this.progress = new Map();
    this.leaderboard = new Map();
    this.currentId = 1;
    this.currentQuestionId = 1;
    this.currentProgressId = 1;
    this.currentLeaderboardId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 1 day
    });
    
    // Add sample math questions for each grade
    this.seedQuestions();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id,
      tokens: 0,
      streakDays: 0,
      lastActive: new Date(),
      dailyTokensEarned: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      isAdmin: insertUser.isAdmin ?? false,
      grade: insertUser.grade ?? null,
      displayName: insertUser.displayName ?? null,
      initials: insertUser.initials ?? "AAA"
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getLeaderboard(): Promise<Array<User & { score: number }>> {
    // Combine users with their total tokens to create a leaderboard
    const leaderboardEntries = Array.from(this.users.values())
      .filter(user => !user.isAdmin)
      .map(user => ({
        ...user,
        score: user.tokens
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Get top 20 users
    
    return leaderboardEntries;
  }

  async getQuestionsByGrade(grade: string, category?: string): Promise<Question[]> {
    const questions = Array.from(this.questions.values())
      .filter(q => q.grade === grade && (!category || q.category === category));
    
    return questions;
  }

  async getAdaptiveQuestion(userId: number, grade: string, forceDynamic: boolean = false, category?: string): Promise<Question | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // Get user progress to determine difficulty
    const userProgressEntries = await this.getUserProgress(userId);
    
    // Calculate appropriate difficulty (1-5) based on correct answer rate
    const correctRate = user.questionsAnswered > 0 ? 
      user.correctAnswers / user.questionsAnswered : 0;
    
    // Adaptive difficulty: 
    // - If doing well (>80% correct), increase difficulty
    // - If struggling (<50% correct), decrease difficulty
    let targetDifficulty = 1;
    if (correctRate > 0.8) targetDifficulty = Math.min(5, Math.ceil(correctRate * 5));
    else if (correctRate < 0.5) targetDifficulty = Math.max(1, Math.floor(correctRate * 5));
    else targetDifficulty = 3; // Medium difficulty
    
    // Generate a new dynamic question if forced or randomly decided 
    if (forceDynamic || Math.random() < 0.7) { 
      // Generate a new dynamic question with unique visuals and content
      // Pass the category to ensure it's category-specific when selected
      return this.generateDynamicQuestion(grade, targetDifficulty, category);
    }
    
    // Start with questions matching the difficulty and grade
    let filteredQuestions = Array.from(this.questions.values())
      .filter(q => q.grade === grade && Math.abs(q.difficulty - targetDifficulty) <= 1);
    
    // Further filter by category if one is specified
    if (category && category !== 'all') {
      const categoryQuestions = filteredQuestions.filter(q => q.category === category);
      
      // If we have questions in this category, use them
      if (categoryQuestions.length > 0) {
        filteredQuestions = categoryQuestions;
      }
    }
    
    if (filteredQuestions.length === 0) {
      // If no static questions match our criteria, generate a dynamic one
      // with the specified category if possible
      return this.generateDynamicQuestion(grade, targetDifficulty, category);
    }
    
    // Return a random question from the filtered list
    return filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
  }
  
  private generateDynamicQuestion(grade: string, difficulty: number, requestedCategory?: string): Question {
    const id = this.currentQuestionId++;
    const validCategories = ["addition", "subtraction", "multiplication", "division", "fractions", "geometry", "time", "money"];
    
    // Use the requested category if it's provided and valid; otherwise choose randomly
    let category: string;
    if (requestedCategory && validCategories.includes(requestedCategory)) {
      category = requestedCategory;
    } else {
      // For K-1 grades, only use addition and subtraction
      const availableCategories = (grade === "K" || grade === "1") 
        ? ["addition", "subtraction"] 
        : validCategories;
      category = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    }
    
    // Generate question based on grade and difficulty
    let num1, num2, answer, options, question;
    
    switch(category) {
      case "addition":
        // Generate numbers based on grade and difficulty
        if (grade === "K") {
          num1 = Math.floor(Math.random() * 5) + 1;  // 1-5
          num2 = Math.floor(Math.random() * 5) + 1;  // 1-5
        } else if (grade === "1") {
          num1 = Math.floor(Math.random() * 10) + 1; // 1-10
          num2 = Math.floor(Math.random() * 10) + 1; // 1-10
        } else if (grade === "2") {
          num1 = Math.floor(Math.random() * 20) + 1; // 1-20
          num2 = Math.floor(Math.random() * 20) + 1; // 1-20
        } else if (grade === "3") {
          num1 = Math.floor(Math.random() * 50) + 10; // 10-59
          num2 = Math.floor(Math.random() * 50) + 10; // 10-59
        } else if (grade === "4") {
          num1 = Math.floor(Math.random() * 100) + 50; // 50-149
          num2 = Math.floor(Math.random() * 100) + 50; // 50-149
        } else {
          num1 = Math.floor(Math.random() * 500) + 100; // 100-599
          num2 = Math.floor(Math.random() * 500) + 100; // 100-599
        }
        
        answer = (num1 + num2).toString();
        
        // Generate word problem with visual cues
        const objects = ["apples", "bananas", "pencils", "coins", "toys", "books", "markers"];
        const object = objects[Math.floor(Math.random() * objects.length)];
        
        // Add visuals flag to question text for frontend rendering
        question = `[visual:${object}:${num1}] You have ${num1} ${object} and get ${num2} more. How many ${object} do you have in total?`;
        
        // Generate options with answer and close alternatives
        options = [
          answer,
          (num1 + num2 - 1).toString(),
          (num1 + num2 + 1).toString(),
          (num1 + num2 + 2).toString()
        ].sort(() => Math.random() - 0.5);
        break;
        
      case "subtraction":
        // Ensure num1 > num2 for subtraction
        if (grade === "K") {
          num1 = Math.floor(Math.random() * 5) + 3;  // 3-7
          num2 = Math.floor(Math.random() * (num1 - 1)) + 1; // 1 to num1-1
        } else if (grade === "1") {
          num1 = Math.floor(Math.random() * 10) + 5; // 5-14
          num2 = Math.floor(Math.random() * (num1 - 2)) + 1; // 1 to num1-2
        } else if (grade === "2") {
          num1 = Math.floor(Math.random() * 20) + 10; // 10-29
          num2 = Math.floor(Math.random() * 10) + 1; // 1-10
        } else if (grade === "3") {
          num1 = Math.floor(Math.random() * 50) + 20; // 20-69
          num2 = Math.floor(Math.random() * 20) + 1; // 1-20
        } else if (grade === "4") {
          num1 = Math.floor(Math.random() * 100) + 50; // 50-149
          num2 = Math.floor(Math.random() * 50) + 1; // 1-50
        } else {
          num1 = Math.floor(Math.random() * 500) + 100; // 100-599
          num2 = Math.floor(Math.random() * 100) + 1; // 1-100
        }
        
        answer = (num1 - num2).toString();
        
        // Generate word problem with visual cues
        const subObjects = ["apples", "stickers", "marbles", "cards", "blocks", "cookies"];
        const subObject = subObjects[Math.floor(Math.random() * subObjects.length)];
        
        // Add visuals flag to question text for frontend rendering
        question = `[visual:${subObject}:${num1}] You have ${num1} ${subObject} and give away ${num2}. How many ${subObject} do you have left?`;
        
        // Generate options with answer and close alternatives
        options = [
          answer,
          (num1 - num2 - 1).toString(),
          (num1 - num2 + 1).toString(),
          (num1 - num2 + 2).toString()
        ].sort(() => Math.random() - 0.5);
        break;
        
      case "multiplication":
        if (grade === "2") {
          num1 = Math.floor(Math.random() * 5) + 1;  // 1-5
          num2 = Math.floor(Math.random() * 5) + 1;  // 1-5
        } else if (grade === "3") {
          num1 = Math.floor(Math.random() * 10) + 1; // 1-10
          num2 = Math.floor(Math.random() * 5) + 1;  // 1-5
        } else if (grade === "4") {
          num1 = Math.floor(Math.random() * 10) + 1; // 1-10
          num2 = Math.floor(Math.random() * 10) + 1; // 1-10
        } else {
          num1 = Math.floor(Math.random() * 12) + 1; // 1-12
          num2 = Math.floor(Math.random() * 12) + 1; // 1-12
        }
        
        answer = (num1 * num2).toString();
        
        // Generate word problem with visual cues for lower grades
        if (grade === "2" || grade === "3") {
          const multObjects = ["boxes", "groups", "rows", "baskets"];
          const multObject = multObjects[Math.floor(Math.random() * multObjects.length)];
          question = `[visual:grid:${num1}x${num2}] You have ${num1} ${multObject} with ${num2} items in each. How many items do you have in total?`;
        } else {
          question = `${num1} × ${num2} = ?`;
        }
        
        // Generate options with answer and close alternatives
        options = [
          answer,
          (num1 * num2 - num1).toString(),
          (num1 * num2 + num1).toString(),
          (num1 * (num2 + 1)).toString()
        ].sort(() => Math.random() - 0.5);
        break;
        
      case "division":
        if (grade === "3") {
          num2 = Math.floor(Math.random() * 5) + 1;  // 1-5
          num1 = num2 * (Math.floor(Math.random() * 5) + 1); // Multiple of num2 up to 5*num2
        } else if (grade === "4") {
          num2 = Math.floor(Math.random() * 10) + 1; // 1-10
          num1 = num2 * (Math.floor(Math.random() * 10) + 1); // Multiple of num2 up to 10*num2
        } else {
          num2 = Math.floor(Math.random() * 12) + 1; // 1-12
          num1 = num2 * (Math.floor(Math.random() * 12) + 1); // Multiple of num2 up to 12*num2
        }
        
        answer = (num1 / num2).toString();
        
        // Generate word problem with visual cues for lower grades
        if (grade === "3" || grade === "4") {
          const divObjects = ["candies", "stickers", "markers", "toys"];
          const divObject = divObjects[Math.floor(Math.random() * divObjects.length)];
          question = `[visual:division:${num1}:${num2}] You have ${num1} ${divObject} and want to share them equally among ${num2} friends. How many ${divObject} does each friend get?`;
        } else {
          question = `${num1} ÷ ${num2} = ?`;
        }
        
        // Generate options with answer and close alternatives
        options = [
          answer,
          (num1 / num2 - 1).toString(),
          (num1 / num2 + 1).toString(),
          (Math.floor(num1 / (num2 - 1))).toString()
        ].sort(() => Math.random() - 0.5);
        break;
        
      case "geometry":
        // Geometry questions for different grades
        if (grade === "K" || grade === "1") {
          // Simple shape identification
          const shapes = ["circle", "square", "triangle", "rectangle"];
          const shapeIndex = Math.floor(Math.random() * shapes.length);
          const shape = shapes[shapeIndex];
          question = `[visual:shape:${shape}] What shape is this?`;
          answer = shape;
          options = [...shapes].sort(() => Math.random() - 0.5);
        } else if (grade === "2" || grade === "3") {
          // Count sides of shapes
          const shapes: Record<string, number> = {
            "triangle": 3,
            "square": 4,
            "pentagon": 5,
            "hexagon": 6
          };
          const shapeNames = Object.keys(shapes);
          const shapeIndex = Math.floor(Math.random() * shapeNames.length);
          const shape = shapeNames[shapeIndex];
          question = `[visual:shape:${shape}] How many sides does a ${shape} have?`;
          answer = shapes[shape].toString();
          options = [
            answer,
            Math.max(1, shapes[shape] - 1).toString(),
            (shapes[shape] + 1).toString(),
            (shapes[shape] + 2).toString()
          ].sort(() => Math.random() - 0.5);
        } else {
          // Area and perimeter problems
          num1 = Math.floor(Math.random() * 8) + 3; // Side length between 3-10
          num2 = Math.floor(Math.random() * 8) + 3; // Other side length between 3-10
          
          if (Math.random() < 0.5) {
            // Perimeter of rectangle
            question = `[visual:rectangle:${num1}x${num2}] What is the perimeter of a rectangle with length ${num1} units and width ${num2} units?`;
            answer = (2 * (num1 + num2)).toString();
            options = [
              answer,
              (2 * (num1 + num2) - 2).toString(),
              (2 * (num1 + num2) + 2).toString(),
              (num1 * num2).toString() // Area instead of perimeter
            ].sort(() => Math.random() - 0.5);
          } else {
            // Area of rectangle
            question = `[visual:rectangle:${num1}x${num2}] What is the area of a rectangle with length ${num1} units and width ${num2} units?`;
            answer = (num1 * num2).toString();
            options = [
              answer,
              ((num1 - 1) * num2).toString(),
              (num1 * (num2 + 1)).toString(),
              (2 * (num1 + num2)).toString() // Perimeter instead of area
            ].sort(() => Math.random() - 0.5);
          }
        }
        break;
        
      case "time":
        // Time-telling questions for different grades
        if (grade === "K" || grade === "1") {
          // Hour-only times
          const hour = Math.floor(Math.random() * 12) + 1; // 1-12
          question = `[visual:clock:${hour}:00] What time is shown on the clock?`;
          answer = `${hour}:00`;
          
          const hour1 = (hour === 12) ? 1 : hour + 1;
          const hour2 = (hour === 1) ? 12 : hour - 1;
          
          options = [
            answer,
            `${hour1}:00`,
            `${hour2}:00`,
            `${hour}:30`
          ].sort(() => Math.random() - 0.5);
        } else if (grade === "2" || grade === "3") {
          // Hour and half-hour times
          const hour = Math.floor(Math.random() * 12) + 1; // 1-12
          const isHalf = Math.random() < 0.5;
          const minutes = isHalf ? "30" : "00";
          
          question = `[visual:clock:${hour}:${minutes}] What time is shown on the clock?`;
          answer = `${hour}:${minutes}`;
          
          const hour1 = (hour === 12) ? 1 : hour + 1;
          const hour2 = (hour === 1) ? 12 : hour - 1;
          
          options = [
            answer,
            `${hour1}:${minutes}`,
            `${hour2}:${minutes}`,
            `${hour}:${isHalf ? "00" : "30"}`
          ].sort(() => Math.random() - 0.5);
        } else {
          // Time addition/subtraction problems
          const hour1 = Math.floor(Math.random() * 12) + 1; // 1-12
          const minute1 = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
          
          // Hours and minutes to add/subtract
          const addHours = Math.floor(Math.random() * 3) + 1; // 1-3
          const addMinutes = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
          
          const totalMinutes1 = hour1 * 60 + minute1;
          const operation = Math.random() < 0.7 ? "add" : "subtract"; // More addition than subtraction
          
          // Calculate result time
          let resultMinutes;
          if (operation === "add") {
            resultMinutes = totalMinutes1 + (addHours * 60 + addMinutes);
            question = `If the time is ${hour1}:${minute1.toString().padStart(2, '0')}, what time will it be ${addHours} hour${addHours !== 1 ? 's' : ''} and ${addMinutes} minute${addMinutes !== 1 ? 's' : ''} later?`;
          } else {
            resultMinutes = totalMinutes1 - (addHours * 60 + addMinutes);
            if (resultMinutes < 0) resultMinutes += 12 * 60; // Keep time positive, wrap around 12-hour clock
            question = `If the time is ${hour1}:${minute1.toString().padStart(2, '0')}, what time was it ${addHours} hour${addHours !== 1 ? 's' : ''} and ${addMinutes} minute${addMinutes !== 1 ? 's' : ''} ago?`;
          }
          
          // Convert back to hours and minutes
          const resultHour = Math.floor(resultMinutes / 60) % 12 || 12; // Keep in 12-hour format
          const resultMinute = resultMinutes % 60;
          
          answer = `${resultHour}:${resultMinute.toString().padStart(2, '0')}`;
          
          // Generate wrong options with realistic errors
          const wrongHour1 = ((resultHour + 1) % 12) || 12;
          const wrongHour2 = ((resultHour - 1 + 12) % 12) || 12;
          const wrongMinute = (resultMinute + 15) % 60;
          
          options = [
            answer,
            `${wrongHour1}:${resultMinute.toString().padStart(2, '0')}`,
            `${wrongHour2}:${resultMinute.toString().padStart(2, '0')}`,
            `${resultHour}:${wrongMinute.toString().padStart(2, '0')}`
          ].sort(() => Math.random() - 0.5);
        }
        break;
        
      case "money":
        // Money problems for different grades
        if (grade === "K" || grade === "1") {
          // Simple coin identification
          const coins: Record<string, number> = {
            "penny": 1,
            "nickel": 5,
            "dime": 10,
            "quarter": 25
          };
          const coinNames = Object.keys(coins);
          const coinIndex = Math.floor(Math.random() * coinNames.length);
          const coin = coinNames[coinIndex];
          
          question = `[visual:coin:${coin}] How many cents is a ${coin} worth?`;
          answer = coins[coin].toString();
          
          const otherValues = Object.values(coins).filter(val => val !== coins[coin]);
          options = [
            answer,
            otherValues[0].toString(),
            otherValues[1].toString(),
            otherValues[2].toString()
          ].sort(() => Math.random() - 0.5);
          
        } else if (grade === "2" || grade === "3") {
          // Counting coins
          const coinTypes = ["penny", "nickel", "dime", "quarter"];
          const coinValues = [1, 5, 10, 25];
          
          // Randomly select 2-3 types of coins
          const numCoinTypes = Math.floor(Math.random() * 2) + 2; // 2-3
          const selectedIndices: number[] = [];
          let totalCents = 0;
          let questionText = "[visual:money] You have ";
          
          for (let i = 0; i < numCoinTypes; i++) {
            let nextIndex;
            do {
              nextIndex = Math.floor(Math.random() * coinTypes.length);
            } while (selectedIndices.includes(nextIndex));
            
            selectedIndices.push(nextIndex);
            const numCoins = Math.floor(Math.random() * 3) + 1; // 1-3 coins of each type
            totalCents += numCoins * coinValues[nextIndex];
            
            questionText += `${numCoins} ${coinTypes[nextIndex]}${numCoins !== 1 ? 's' : ''}`;
            
            if (i === numCoinTypes - 2) {
              questionText += " and ";
            } else if (i < numCoinTypes - 2) {
              questionText += ", ";
            }
          }
          
          questionText += ". How many cents do you have in total?";
          question = questionText;
          answer = totalCents.toString();
          
          options = [
            answer,
            (totalCents - coinValues[0]).toString(),
            (totalCents + coinValues[0]).toString(),
            (totalCents + 3).toString()
          ].sort(() => Math.random() - 0.5);
          
        } else {
          // Making change problems
          const priceInCents = Math.floor(Math.random() * 90) + 10; // 10-99 cents
          const givenInCents = 100; // $1.00
          const changeInCents = givenInCents - priceInCents;
          
          question = `[visual:money:change] If something costs ${priceInCents} cents and you pay with $1.00, how much change should you receive?`;
          answer = changeInCents.toString();
          
          options = [
            answer,
            (changeInCents - 5).toString(),
            (changeInCents + 5).toString(),
            (givenInCents - (priceInCents + 10)).toString()
          ].sort(() => Math.random() - 0.5);
        }
        break;
        
      case "fractions":
        // Fraction problems
        if (grade === "3") {
          // Basic fraction identification
          const denominators = [2, 3, 4];
          const denominator = denominators[Math.floor(Math.random() * denominators.length)];
          const numerator = Math.floor(Math.random() * denominator) + 1;
          
          question = `[visual:fraction:${numerator}/${denominator}] What fraction of the shape is shaded?`;
          answer = `${numerator}/${denominator}`;
          
          // Generate incorrect options with common errors
          options = [
            answer,
            `${denominator}/${numerator}`, // Reversed fraction
            `${numerator + 1}/${denominator}`, // Numerator +1
            `${numerator}/${denominator + 1}` // Denominator +1
          ].sort(() => Math.random() - 0.5);
          
        } else if (grade === "4" || grade === "5") {
          // Adding/subtracting fractions with the same denominator
          const denominators = [2, 3, 4, 5, 6, 8, 10];
          const denominator = denominators[Math.floor(Math.random() * denominators.length)];
          
          let numerator1 = Math.floor(Math.random() * (denominator - 1)) + 1;
          let numerator2 = Math.floor(Math.random() * (denominator - 1)) + 1;
          
          // Ensure the result is a proper fraction and not too trivial
          if (numerator1 + numerator2 > denominator) {
            numerator2 = denominator - numerator1;
          }
          
          const operation = Math.random() < 0.7 ? "+" : "-";
          
          if (operation === "-" && numerator1 < numerator2) {
            // Swap to ensure we don't get negative fractions
            [numerator1, numerator2] = [numerator2, numerator1];
          }
          
          let resultNumerator;
          if (operation === "+") {
            resultNumerator = numerator1 + numerator2;
            question = `What is ${numerator1}/${denominator} + ${numerator2}/${denominator}?`;
          } else {
            resultNumerator = numerator1 - numerator2;
            question = `What is ${numerator1}/${denominator} - ${numerator2}/${denominator}?`;
          }
          
          // Simplify fraction if possible
          const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
          const divisor = gcd(resultNumerator, denominator);
          
          if (divisor > 1) {
            answer = `${resultNumerator/divisor}/${denominator/divisor}`;
          } else {
            answer = `${resultNumerator}/${denominator}`;
          }
          
          // Common mistakes for fractions
          const wrongAnswer1 = operation === "+" 
            ? `${numerator1 + numerator2}/${denominator + denominator}` // Adding denominators
            : `${numerator1 - numerator2}/${denominator - denominator}`; // Subtracting denominators
            
          const wrongAnswer2 = `${operation === "+" ? numerator1 * numerator2 : numerator1 / numerator2}/${denominator}`; // Multiplying/dividing instead
          
          const wrongAnswer3 = `${resultNumerator + 1}/${denominator}`; // Off by one error
          
          options = [
            answer,
            wrongAnswer1,
            wrongAnswer2,
            wrongAnswer3
          ].sort(() => Math.random() - 0.5);
          
        } else {
          // Comparing fractions
          const denominators = [2, 3, 4, 5, 6, 8, 10, 12];
          const denominator1 = denominators[Math.floor(Math.random() * denominators.length)];
          const denominator2 = denominators[Math.floor(Math.random() * denominators.length)];
          
          const numerator1 = Math.floor(Math.random() * (denominator1 - 1)) + 1;
          const numerator2 = Math.floor(Math.random() * (denominator2 - 1)) + 1;
          
          const fraction1 = `${numerator1}/${denominator1}`;
          const fraction2 = `${numerator2}/${denominator2}`;
          
          // Convert to decimal for comparison
          const decimal1 = numerator1 / denominator1;
          const decimal2 = numerator2 / denominator2;
          
          question = `Which fraction is larger: ${fraction1} or ${fraction2}?`;
          
          if (decimal1 > decimal2) {
            answer = fraction1;
          } else if (decimal2 > decimal1) {
            answer = fraction2;
          } else {
            // They're equal, so choose a different denominator
            answer = fraction1;
            question = `Which fraction is equivalent to ${fraction1}?`;
            
            // Find an equivalent fraction
            const multiplier = Math.floor(Math.random() * 3) + 2; // 2-4
            const equivNumerator = numerator1 * multiplier;
            const equivDenominator = denominator1 * multiplier;
            
            options = [
              `${equivNumerator}/${equivDenominator}`, // Correct equivalent
              `${numerator1 + 1}/${denominator1}`, // Numerator +1
              `${numerator1}/${denominator1 + 1}`, // Denominator +1
              `${denominator1}/${numerator1}` // Reversed fraction
            ].sort(() => Math.random() - 0.5);
            break;
          }
          
          // For comparison questions
          options = [
            fraction1,
            fraction2,
            `They are equal`,
            `Cannot be determined`
          ];
        }
        break;
        
      case "algebra":
        // Simple algebra problems
        if (grade === "4" || grade === "5") {
          // Find the missing number
          num1 = Math.floor(Math.random() * 10) + 1; // 1-10
          num2 = Math.floor(Math.random() * 10) + 1; // 1-10
          
          // For 4-5th grade, keep it simple with one operation
          const operations = ["+", "-", "×"];
          const operation = operations[Math.floor(Math.random() * operations.length)];
          
          let result: number;
          switch (operation) {
            case "+": result = num1 + num2; break;
            case "-": 
              // Ensure positive result by swapping if needed
              if (num1 < num2) [num1, num2] = [num2, num1];
              result = num1 - num2; 
              break;
            case "×": result = num1 * num2; break;
            default: result = num1 + num2;
          }
          
          // Randomly choose which number to make unknown (x)
          const unknownPosition = Math.floor(Math.random() * 3); // 0, 1, 2
          
          if (unknownPosition === 0) {
            question = `What value of x makes this equation true? x ${operation} ${num2} = ${result}`;
            answer = num1.toString();
            
            options = [
              answer,
              (num1 + 1).toString(),
              (num1 - 1).toString(),
              (operation === "+" ? result - num2 : 
                operation === "-" ? result + num2 : 
                operation === "×" ? Math.round(result / num2) : num1).toString()
            ].sort(() => Math.random() - 0.5);
            
          } else if (unknownPosition === 1) {
            question = `What value of x makes this equation true? ${num1} ${operation} x = ${result}`;
            answer = num2.toString();
            
            options = [
              answer,
              (num2 + 1).toString(),
              (num2 - 1).toString(),
              (operation === "+" ? result - num1 : 
                operation === "-" ? num1 - result : 
                operation === "×" ? Math.round(result / num1) : num2).toString()
            ].sort(() => Math.random() - 0.5);
            
          } else {
            question = `What value of x makes this equation true? ${num1} ${operation} ${num2} = x`;
            answer = result.toString();
            
            options = [
              answer,
              (result + 1).toString(),
              (result - 1).toString(),
              (operation === "+" ? num1 - num2 : 
                operation === "-" ? num1 + num2 : 
                operation === "×" ? num1 / num2 : result).toString()
            ].sort(() => Math.random() - 0.5);
          }
          
        } else {
          // More complex equations for grade 6
          // Two-step equations like 2x + 3 = 11
          const coefficient = Math.floor(Math.random() * 5) + 2; // 2-6
          const constant = Math.floor(Math.random() * 10) + 1; // 1-10
          
          // Make the answer a nice whole number
          const answer_val = Math.floor(Math.random() * 5) + 1; // 1-5
          const result = coefficient * answer_val + constant;
          
          question = `What value of x makes this equation true? ${coefficient}x + ${constant} = ${result}`;
          answer = answer_val.toString();
          
          options = [
            answer,
            (answer_val + 1).toString(),
            (answer_val - 1).toString(),
            (result - constant).toString() // Forgot to divide by coefficient
          ].sort(() => Math.random() - 0.5);
        }
        break;
        
      case "mixed":
        // Random mixture of all categories based on grade level
        const mixedCategories = ["addition", "subtraction"];
        
        // Add more categories based on grade level
        if (grade !== "K" && grade !== "1") {
          mixedCategories.push("multiplication", "division");
        }
        
        if (grade !== "K" && grade !== "1" && grade !== "2") {
          mixedCategories.push("geometry", "time", "money");
        }
        
        if (grade !== "K" && grade !== "1" && grade !== "2" && grade !== "3") {
          mixedCategories.push("fractions");
        }
        
        if (grade === "5" || grade === "6") {
          mixedCategories.push("algebra");
        }
        
        // Randomly select a category for this mixed question
        const randomCategory = mixedCategories[Math.floor(Math.random() * mixedCategories.length)];
        return this.generateDynamicQuestion(grade, difficulty, randomCategory);
        
      default:
        // Default to simple addition if something goes wrong
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = (num1 + num2).toString();
        question = `${num1} + ${num2} = ?`;
        options = [
          answer,
          (num1 + num2 - 1).toString(),
          (num1 + num2 + 1).toString(),
          (num1 + num2 + 2).toString()
        ].sort(() => Math.random() - 0.5);
    }
    
    // Create and return the question
    const generatedQuestion: Question = {
      id,
      category,
      grade,
      difficulty: Math.max(1, Math.min(5, difficulty)), // Ensure difficulty is between 1-5
      question,
      answer,
      options
    };
    
    // Add to questions map
    this.questions.set(id, generatedQuestion);
    
    return generatedQuestion;
  }

  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return Array.from(this.progress.values())
      .filter(progress => progress.userId === userId);
  }

  async updateUserProgress(userId: number, category: string, data: Partial<UserProgress>): Promise<UserProgress> {
    // Find existing progress or create new
    const existingProgress = Array.from(this.progress.values())
      .find(p => p.userId === userId && p.category === category);
    
    if (existingProgress) {
      const updatedProgress = { ...existingProgress, ...data };
      this.progress.set(existingProgress.id, updatedProgress);
      return updatedProgress;
    } else {
      // Create new progress entry
      const id = this.currentProgressId++;
      const newProgress: UserProgress = {
        id,
        userId,
        category,
        level: 1,
        score: 0,
        completedQuestions: 0,
        ...data
      };
      this.progress.set(id, newProgress);
      return newProgress;
    }
  }

  private seedQuestions() {
    // Addition - Grade K-2
    const additionK2 = [
      {
        category: "addition",
        grade: "K",
        difficulty: 1,
        question: "1 + 1 = ?",
        answer: "2",
        options: ["1", "2", "3", "4"]
      },
      {
        category: "addition",
        grade: "K",
        difficulty: 1,
        question: "2 + 1 = ?",
        answer: "3",
        options: ["2", "3", "4", "5"]
      },
      {
        category: "addition",
        grade: "1",
        difficulty: 2,
        question: "3 + 5 = ?",
        answer: "8",
        options: ["7", "8", "9", "10"]
      },
      {
        category: "addition",
        grade: "1",
        difficulty: 2,
        question: "4 + 2 = ?",
        answer: "6",
        options: ["5", "6", "7", "8"]
      },
      {
        category: "addition",
        grade: "2",
        difficulty: 3,
        question: "7 + 5 = ?",
        answer: "12",
        options: ["10", "11", "12", "13"]
      },
      {
        category: "addition",
        grade: "2",
        difficulty: 3,
        question: "8 + 6 = ?",
        answer: "14",
        options: ["12", "13", "14", "15"]
      }
    ];
    
    // Subtraction - Grade K-2
    const subtractionK2 = [
      {
        category: "subtraction",
        grade: "K",
        difficulty: 1,
        question: "2 - 1 = ?",
        answer: "1",
        options: ["0", "1", "2", "3"]
      },
      {
        category: "subtraction",
        grade: "K",
        difficulty: 1,
        question: "3 - 1 = ?",
        answer: "2",
        options: ["1", "2", "3", "4"]
      },
      {
        category: "subtraction",
        grade: "1",
        difficulty: 2,
        question: "5 - 2 = ?",
        answer: "3",
        options: ["2", "3", "4", "5"]
      },
      {
        category: "subtraction",
        grade: "1",
        difficulty: 2,
        question: "7 - 4 = ?",
        answer: "3",
        options: ["2", "3", "4", "5"]
      },
      {
        category: "subtraction",
        grade: "2",
        difficulty: 3,
        question: "12 - 5 = ?",
        answer: "7",
        options: ["6", "7", "8", "9"]
      },
      {
        category: "subtraction",
        grade: "2",
        difficulty: 3,
        question: "14 - 6 = ?",
        answer: "8",
        options: ["7", "8", "9", "10"]
      }
    ];
    
    // Addition & Subtraction - Grade 3-4
    const mathGrade34 = [
      {
        category: "addition",
        grade: "3",
        difficulty: 3,
        question: "15 + 26 = ?",
        answer: "41",
        options: ["39", "40", "41", "42"]
      },
      {
        category: "subtraction",
        grade: "3",
        difficulty: 3,
        question: "45 - 17 = ?",
        answer: "28",
        options: ["27", "28", "29", "30"]
      },
      {
        category: "multiplication",
        grade: "3",
        difficulty: 3,
        question: "3 × 4 = ?",
        answer: "12",
        options: ["10", "11", "12", "15"]
      },
      {
        category: "addition",
        grade: "4",
        difficulty: 4,
        question: "125 + 136 = ?",
        answer: "261",
        options: ["251", "261", "271", "361"]
      },
      {
        category: "subtraction",
        grade: "4",
        difficulty: 4,
        question: "245 - 128 = ?",
        answer: "117",
        options: ["107", "117", "127", "137"]
      },
      {
        category: "multiplication",
        grade: "4",
        difficulty: 4,
        question: "7 × 8 = ?",
        answer: "56",
        options: ["42", "48", "54", "56"]
      }
    ];
    
    // Math - Grade 5-6
    const mathGrade56 = [
      {
        category: "multiplication",
        grade: "5",
        difficulty: 4,
        question: "12 × 11 = ?",
        answer: "132",
        options: ["121", "122", "132", "144"]
      },
      {
        category: "division",
        grade: "5",
        difficulty: 4,
        question: "72 ÷ 9 = ?",
        answer: "8",
        options: ["7", "8", "9", "10"]
      },
      {
        category: "fractions",
        grade: "5",
        difficulty: 5,
        question: "1/4 + 1/2 = ?",
        answer: "3/4",
        options: ["2/6", "3/4", "5/8", "2/4"]
      },
      {
        category: "multiplication",
        grade: "6",
        difficulty: 5,
        question: "25 × 24 = ?",
        answer: "600",
        options: ["580", "600", "624", "650"]
      },
      {
        category: "division",
        grade: "6",
        difficulty: 5,
        question: "144 ÷ 12 = ?",
        answer: "12",
        options: ["10", "11", "12", "14"]
      },
      {
        category: "fractions",
        grade: "6",
        difficulty: 5,
        question: "2/3 + 1/6 = ?",
        answer: "5/6",
        options: ["3/6", "3/9", "5/6", "3/4"]
      }
    ];
    
    // Add all questions to storage
    const allQuestions = [...additionK2, ...subtractionK2, ...mathGrade34, ...mathGrade56];
    
    allQuestions.forEach(q => {
      const id = this.currentQuestionId++;
      this.questions.set(id, { ...q, id });
    });
  }
}

export const storage = new MemStorage();

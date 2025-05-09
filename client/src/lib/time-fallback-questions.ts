import { Question } from '@shared/schema';

/**
 * Pre-defined fallback questions for the time module to avoid loading delays
 * These provide an immediate set of questions while API-generated questions load
 */
export const timeFallbackQuestions: Record<string, Question[]> = {
  'K': [
    {
      id: 999001,
      question: "Which comes first: morning or night?",
      answer: "Morning",
      options: ["Morning", "Night", "Afternoon", "Evening"],
      grade: "K",
      difficulty: 1,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999002,
      question: "When do we usually sleep?",
      answer: "Night",
      options: ["Night", "Morning", "Noon", "Afternoon"],
      grade: "K",
      difficulty: 1,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999003,
      question: "When do we usually eat breakfast?",
      answer: "Morning",
      options: ["Morning", "Night", "Afternoon", "Evening"],
      grade: "K",
      difficulty: 1,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999004,
      question: "What day comes after Monday?",
      answer: "Tuesday",
      options: ["Tuesday", "Wednesday", "Sunday", "Saturday"],
      grade: "K",
      difficulty: 1,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999005,
      question: "What day comes before Friday?",
      answer: "Thursday",
      options: ["Thursday", "Wednesday", "Saturday", "Sunday"],
      grade: "K",
      difficulty: 1,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    }
  ],
  '1': [
    {
      id: 999006,
      question: "What comes after 1 o'clock?",
      answer: "2 o'clock",
      options: ["2 o'clock", "12 o'clock", "3 o'clock", "11 o'clock"],
      grade: "1",
      difficulty: 1,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999007,
      question: "How many hours are in a day?",
      answer: "24",
      options: ["24", "12", "60", "365"],
      grade: "1",
      difficulty: 1,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999008,
      question: "How many minutes are in an hour?",
      answer: "60",
      options: ["60", "24", "30", "12"],
      grade: "1",
      difficulty: 1,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999009,
      question: "What season comes after spring?",
      answer: "Summer",
      options: ["Summer", "Fall", "Winter", "Spring"],
      grade: "1",
      difficulty: 1,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999010,
      question: "What month comes after December?",
      answer: "January",
      options: ["January", "February", "November", "October"],
      grade: "1",
      difficulty: 1,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    }
  ],
  '2': [
    {
      id: 999011,
      question: "If it's 3:15 PM, what time will it be in 30 minutes?",
      answer: "3:45 PM",
      options: ["3:45 PM", "3:30 PM", "4:00 PM", "4:15 PM"],
      grade: "2",
      difficulty: 2,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999012,
      question: "How many minutes are in 2 hours?",
      answer: "120",
      options: ["120", "60", "240", "90"],
      grade: "2",
      difficulty: 2,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999013,
      question: "How many hours are in 2 days?",
      answer: "48",
      options: ["48", "24", "36", "72"],
      grade: "2",
      difficulty: 2,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999014,
      question: "Which month has 28 days (sometimes 29)?",
      answer: "February",
      options: ["February", "April", "June", "November"],
      grade: "2",
      difficulty: 2,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999015,
      question: "If today is Tuesday, what day was yesterday?",
      answer: "Monday",
      options: ["Monday", "Wednesday", "Sunday", "Saturday"],
      grade: "2",
      difficulty: 2,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    }
  ],
  '3': [
    {
      id: 999016,
      question: "If it's 9:45 AM now, what time will it be in 30 minutes?",
      answer: "10:15 AM",
      options: ["10:15 AM", "10:00 AM", "10:45 AM", "9:75 AM"],
      grade: "3",
      difficulty: 2,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999017,
      question: "How many seconds are in 3 minutes?",
      answer: "180",
      options: ["180", "60", "300", "120"],
      grade: "3",
      difficulty: 2,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999018,
      question: "A movie starts at 3:15 PM and ends at 5:00 PM. How long is the movie?",
      answer: "1 hour 45 minutes",
      options: ["1 hour 45 minutes", "1 hour 30 minutes", "2 hours", "1 hour 15 minutes"],
      grade: "3",
      difficulty: 2,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999019,
      question: "If it's 11:50 AM, what time will it be in 25 minutes?",
      answer: "12:15 PM",
      options: ["12:15 PM", "12:05 PM", "12:25 PM", "11:75 AM"],
      grade: "3",
      difficulty: 2,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999020,
      question: "How many days are in a leap year?",
      answer: "366",
      options: ["366", "365", "360", "364"],
      grade: "3",
      difficulty: 2,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    }
  ],
  '4': [
    {
      id: 999021,
      question: "If it's 8:30 AM now, what time was it 45 minutes ago?",
      answer: "7:45 AM",
      options: ["7:45 AM", "8:15 AM", "7:30 AM", "8:45 AM"],
      grade: "4",
      difficulty: 3,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999022,
      question: "How many hours are in a week?",
      answer: "168",
      options: ["168", "24", "7", "365"],
      grade: "4",
      difficulty: 3,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999023,
      question: "If Sam starts homework at 4:15 PM and finishes at 5:45 PM, how long did homework take?",
      answer: "1 hour 30 minutes",
      options: ["1 hour 30 minutes", "1 hour 45 minutes", "1 hour 15 minutes", "2 hours"],
      grade: "4",
      difficulty: 3,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999024,
      question: "If a plane takes off at 2:45 PM and lands at 5:15 PM in the same time zone, how long was the flight?",
      answer: "2 hours 30 minutes",
      options: ["2 hours 30 minutes", "3 hours", "2 hours", "2 hours 45 minutes"],
      grade: "4",
      difficulty: 3,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999025,
      question: "How many days are in September?",
      answer: "30",
      options: ["30", "31", "28", "29"],
      grade: "4",
      difficulty: 3,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    }
  ],
  '5': [
    {
      id: 999026,
      question: "If it's 3:30 PM now, what time will it be in 2 hours and 45 minutes?",
      answer: "6:15 PM",
      options: ["6:15 PM", "5:45 PM", "6:30 PM", "5:15 PM"],
      grade: "5",
      difficulty: 3,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999027,
      question: "How many minutes are in 3.5 hours?",
      answer: "210",
      options: ["210", "180", "350", "240"],
      grade: "5",
      difficulty: 3,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999028,
      question: "If you start a test at 10:15 AM and get 1 hour and 20 minutes to complete it, when will the test end?",
      answer: "11:35 AM",
      options: ["11:35 AM", "11:25 AM", "11:45 AM", "12:15 PM"],
      grade: "5",
      difficulty: 3,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999029,
      question: "How many seconds are in 2.5 minutes?",
      answer: "150",
      options: ["150", "120", "140", "160"],
      grade: "5",
      difficulty: 3,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999030,
      question: "If a flight departs at 8:45 AM and the flying time is 3 hours and 30 minutes, what time does it arrive (in the same time zone)?",
      answer: "12:15 PM",
      options: ["12:15 PM", "11:45 AM", "12:30 PM", "11:15 AM"],
      grade: "5",
      difficulty: 3,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    }
  ],
  '6': [
    {
      id: 999031,
      question: "A train leaves at 7:50 AM and arrives at 11:25 AM. How long is the train ride?",
      answer: "3 hours 35 minutes",
      options: ["3 hours 35 minutes", "3 hours 25 minutes", "3 hours 45 minutes", "4 hours 15 minutes"],
      grade: "6",
      difficulty: 4,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999032,
      question: "If it's 5:15 PM in New York and there's a 3-hour time difference with California (earlier), what time is it in California?",
      answer: "2:15 PM",
      options: ["2:15 PM", "8:15 PM", "3:15 PM", "2:45 PM"],
      grade: "6",
      difficulty: 4,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999033,
      question: "If you work from 8:30 AM to 5:00 PM with a 45-minute lunch break, how many hours do you work?",
      answer: "7 hours 45 minutes",
      options: ["7 hours 45 minutes", "8 hours", "7 hours 30 minutes", "8 hours 30 minutes"],
      grade: "6",
      difficulty: 4,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999034,
      question: "If you need to arrive at school by 8:15 AM and it takes 35 minutes to get ready and 20 minutes to commute, what's the latest time you should wake up?",
      answer: "7:20 AM",
      options: ["7:20 AM", "7:15 AM", "7:30 AM", "7:00 AM"],
      grade: "6",
      difficulty: 4,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    },
    {
      id: 999035,
      question: "A flight departs Los Angeles at 10:30 AM and arrives in New York at 6:45 PM. If New York is 3 hours ahead, how long is the flight?",
      answer: "5 hours 15 minutes",
      options: ["5 hours 15 minutes", "8 hours 15 minutes", "5 hours 45 minutes", "4 hours 45 minutes"],
      grade: "6",
      difficulty: 4,
      category: "time",
      concepts: ["time"],
      storyId: null,
      storyNode: null,
      storyText: null,
      storyImage: null
    }
  ]
};

/**
 * Get fallback questions for a specific grade
 * @param grade The grade level
 * @param count How many questions to return
 * @returns Array of questions
 */
export function getTimeFallbackQuestions(grade: string, count: number = 5): Question[] {
  // Default to grade 3 if the grade isn't found
  const questions = timeFallbackQuestions[grade] || timeFallbackQuestions['3'];
  
  // Return the requested number of questions or all available if fewer
  return questions.slice(0, count);
}
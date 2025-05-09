import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, User } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "math-arcade-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        // Update last active timestamp
        await storage.updateUser(user.id, { lastActive: new Date() });
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const { username, password, displayName, grade, initials, isAdmin } = req.body;
    
    if (!username || !password) {
      return res.status(400).send("Username and password are required");
    }
    
    // Validate initials (3 letters for arcade-style)
    if (initials && (initials.length !== 3 || !/^[A-Za-z]{3}$/.test(initials))) {
      return res.status(400).send("Initials must be exactly 3 letters");
    }
    
    // By default, set initials to the first 3 letters of username (uppercase)
    const defaultInitials = username.substring(0, 3).toUpperCase();
    
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      username,
      password: await hashPassword(password),
      displayName: displayName || username,
      grade: grade || "K",
      initials: initials || defaultInitials,
      isAdmin: isAdmin || false
    });

    try {
      // Automatically initialize subject masteries for the user's grade
      const userGrade = grade || "K";
      
      // Define default subjects for different grade levels (matching module restrictions)
      const gradeSubjects: Record<string, string[]> = {
        'K': ['addition', 'subtraction'],
        '1': ['addition', 'subtraction', 'counting', 'time'],
        '2': ['addition', 'subtraction', 'place-value', 'multiplication'],
        '3': ['addition', 'subtraction', 'multiplication', 'division', 'fractions', 'measurement'],
        '4': ['multiplication', 'division', 'fractions', 'decimals', 'measurement'],
        '5': ['decimals', 'fractions', 'geometry', 'ratios', 'algebra'],
        '6': ['algebra', 'percentages', 'ratios', 'geometry', 'decimals']
      };
      
      // Get subjects for the user's grade
      const subjects = gradeSubjects[userGrade] || gradeSubjects['K'];
      
      // Initialize masteries for each subject
      for (const subject of subjects) {
        await storage.unlockGradeForSubject(user.id, subject, userGrade);
      }
      
      console.log(`Initialized subject masteries for new user ${username} with grade ${userGrade}`);
    } catch (error) {
      console.error("Error initializing subject masteries for new user:", error);
      // Continue with login even if initialization fails
    }

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Reset daily tokens if it's a new day
    const now = new Date();
    const lastActive = req.user?.lastActive;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActiveDay = lastActive ? new Date(
      lastActive.getFullYear(), 
      lastActive.getMonth(), 
      lastActive.getDate()
    ) : null;
    
    // Updates to make to user profile
    const updates: Partial<User> = {};
    
    // Check if it's July 4th (month index is 0-based, so 6 = July)
    const isJulyFourth = now.getMonth() === 6 && now.getDate() === 4;
    
    // Check if user's grade needs to be advanced (only on July 4th)
    if (isJulyFourth && req.user?.grade) {
      const lastYear = req.user.lastGradeAdvancement ? 
        new Date(req.user.lastGradeAdvancement).getFullYear() : 
        null;
      
      // Only advance grade if it hasn't been advanced this year
      if (!lastYear || lastYear < now.getFullYear()) {
        const currentGrade = req.user.grade;
        
        // Advance to next grade level if not already at grade 12
        if (currentGrade !== '12') {
          let nextGrade: string;
          
          if (currentGrade === 'K') {
            nextGrade = '1';
          } else {
            const gradeNum = parseInt(currentGrade);
            if (!isNaN(gradeNum) && gradeNum < 12) {
              nextGrade = String(gradeNum + 1);
            } else {
              nextGrade = currentGrade; // Keep the same if parsing fails
            }
          }
          
          updates.grade = nextGrade;
          updates.lastGradeAdvancement = now;
          
          console.log(`Advancing user ${req.user.username} from grade ${currentGrade} to ${nextGrade}`);
        }
      }
    }
    
    if (lastActiveDay && today > lastActiveDay) {
      // It's a new day, reset daily tokens and update streak
      updates.dailyTokensEarned = 0;
      updates.streakDays = req.user.streakDays + 1;
      updates.lastActive = now;
    } else if (!lastActive || !lastActiveDay) {
      // First login, initialize streak
      updates.streakDays = 1;
      updates.lastActive = now;
    }
    
    // Apply updates if there are any
    if (Object.keys(updates).length > 0) {
      storage.updateUser(req.user.id, updates)
        .then(updatedUser => {
          if (updatedUser) {
            res.json(updatedUser);
          } else {
            res.json(req.user);
          }
        })
        .catch(error => {
          console.error("Error updating user:", error);
          res.json(req.user);
        });
    } else {
      res.json(req.user);
    }
  });
  
  // Update user profile
  app.patch("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { displayName, grade, interests } = req.body;
      
      // Only update fields that were provided
      const updateData: Partial<User> = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (grade !== undefined) updateData.grade = grade;
      if (interests !== undefined) updateData.interests = interests;
      
      // Generate initials if display name changes
      if (displayName) {
        updateData.initials = displayName
          .split(' ')
          .map(name => name[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
      }
      
      // Update user
      storage.updateUser(req.user.id, updateData)
        .then(updatedUser => {
          if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
          }
          res.json(updatedUser);
        })
        .catch(error => {
          console.error("Error updating user profile:", error);
          res.status(500).json({ error: "Failed to update user profile" });
        });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });
}

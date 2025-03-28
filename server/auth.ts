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

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
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
    
    if (lastActiveDay && today > lastActiveDay) {
      // It's a new day, reset daily tokens and update streak
      storage.updateUser(req.user.id, { 
        dailyTokensEarned: 0,
        streakDays: req.user.streakDays + 1,
        lastActive: now
      });
    } else if (!lastActive || !lastActiveDay) {
      // First login, initialize streak
      storage.updateUser(req.user.id, {
        streakDays: 1,
        lastActive: now
      });
    }
    
    res.json(req.user);
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

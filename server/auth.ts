import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, User } from "@shared/schema";
import { getFranchises, getStudentsByFranchise, getStudentInfo } from "./crm-db";

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
    },
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
    const { password, grade, initials, isAdmin, studentID } = req.body;

    if (!password) {
      return res.status(400).send("Password is required");
    }

    if (!studentID) {
      return res.status(400).send("Student selection is required");
    }

    // Get student information from CRM
    let crmStudent, username, displayName, finalGrade, finalEmail;
    
    try {
      console.log(`Getting student info for ID: ${studentID}`);
      const crmValidation = await getStudentInfo(studentID);
      
      if (!crmValidation.isValid) {
        console.log(`Student ID ${studentID} not found in CRM`);
        return res.status(400).send("Invalid student selection. Please try again.");
      }

      crmStudent = crmValidation.studentInfo;
      username = crmStudent.firstName.toLowerCase() + crmStudent.lastName.toLowerCase();
      displayName = `${crmStudent.firstName} ${crmStudent.lastName}`;
      finalGrade = grade || crmStudent?.grade || "K";
      finalEmail = crmStudent?.email || null;
      
      console.log(`Creating user for student: ${displayName} (ID: ${studentID})`);
      
    } catch (error) {
      console.error("Error getting student info:", error);
      return res.status(500).send("Unable to retrieve student information. Please try again later.");
    }

    // Check if username already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    // Check for existing email if email is provided
    if (finalEmail) {
      const existingEmailUser = await storage.getUserByEmail(finalEmail);
      if (existingEmailUser) {
        return res.status(400).send("Email already exists");
      }
    }

    // Validate initials (3 letters for arcade-style)
    if (initials && (initials.length !== 3 || !/^[A-Za-z]{3}$/.test(initials))) {
      return res.status(400).send("Initials must be exactly 3 letters");
    }

    // By default, set initials to the first 3 letters of username (uppercase)
    const defaultInitials = username.substring(0, 3).toUpperCase();

    // Dynamically fetch concepts for the selected grade
    const weaknessConcepts = await storage.getConceptsForGrade(finalGrade);

    const user = await storage.createUser({
      username,
      password: await hashPassword(password),
      email: finalEmail,
      displayName,
      grade: finalGrade,
      initials: initials || defaultInitials,
      isAdmin: isAdmin || false,
      studentID: studentID,

      // Subject mastery initialization
      strengthConcepts: [],
      weaknessConcepts,
    });

    // Log for confirmation during testing
    console.log("New user registered with subject mastery:", {
      grade: finalGrade,
      strengthConcepts: [],
      weaknessConcepts,
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  // API endpoints for CRM integration
  app.get("/api/franchises", async (req, res) => {
    try {
      const franchises = await getFranchises();
      res.json(franchises);
    } catch (error) {
      console.error("Error fetching franchises:", error);
      res.status(500).json({ error: "Failed to fetch franchises" });
    }
  });

  app.get("/api/students/:franchiseID", async (req, res) => {
    try {
      const franchiseID = parseInt(req.params.franchiseID);
      if (isNaN(franchiseID)) {
        return res.status(400).json({ error: "Invalid franchise ID" });
      }
      
      const students = await getStudentsByFranchise(franchiseID);
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ error: "Failed to fetch students" });
    }
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
    const lastActiveDay = lastActive
      ? new Date(
          lastActive.getFullYear(),
          lastActive.getMonth(),
          lastActive.getDate(),
        )
      : null;

    // Updates to make to user profile
    const updates: Partial<User> = {};

    // Check if it's July 4th (month index is 0-based, so 6 = July)
    const isJulyFourth = now.getMonth() === 6 && now.getDate() === 4;

    // Check if user's grade needs to be advanced (only on July 4th)
    if (isJulyFourth && req.user?.grade) {
      const lastYear = req.user.lastGradeAdvancement
        ? new Date(req.user.lastGradeAdvancement).getFullYear()
        : null;

      // Only advance grade if it hasn't been advanced this year
      if (!lastYear || lastYear < now.getFullYear()) {
        const currentGrade = req.user.grade;

        // Advance to next grade level if not already at grade 12
        if (currentGrade !== "12") {
          let nextGrade: string;

          if (currentGrade === "K") {
            nextGrade = "1";
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

          console.log(
            `Advancing user ${req.user.username} from grade ${currentGrade} to ${nextGrade}`,
          );
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
      storage
        .updateUser(req.user.id, updates)
        .then((updatedUser) => {
          if (updatedUser) {
            res.json(updatedUser);
          } else {

            res.json(req.user);
          }
        })
        .catch((error) => {
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
      const { displayName, grade, interests, email } = req.body;

      // Only update fields that were provided
      const updateData: Partial<User> = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (grade !== undefined) updateData.grade = grade;
      if (interests !== undefined) updateData.interests = interests;
      if (email !== undefined) updateData.email = email;

      // Generate initials if display name changes
      if (displayName) {
        updateData.initials = displayName
          .split(" ")
          .map((name) => name[0])
          .join("")
          .toUpperCase()
          .substring(0, 2);
      }

      // Check if there are any fields to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No fields provided to update" });
      }

      // Update user
      storage
        .updateUser(req.user.id, updateData)
        .then((updatedUser) => {
          if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
          }

          res.json(updatedUser);
        })
        .catch((error) => {
          console.error("Error updating user profile:", error);
          res.status(500).json({ error: "Failed to update user profile" });
        });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });
}
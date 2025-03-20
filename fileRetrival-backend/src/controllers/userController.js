import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../models/prismaClient.js";

dotenv.config();
const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";

export const registerUser = async (req, res) => {
  const { username, password, role, email } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await db.user.create({
      data: { username, password: hashedPassword, role, email },
    });
    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    res.status(500).json({ error: "User already exists or invalid data" });
  }
};

export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  const user = await db.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ userId: user.id, role: user.role, name: user.username }, SECRET_KEY, {
    expiresIn: "7h",
  });

  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
};

export const getUserProfile = async (req, res) => {
  const user = await db.user.findUnique({ where: { id: req.user.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({ user });
};

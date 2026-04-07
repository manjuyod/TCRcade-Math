import { DatabaseStorage } from "./database-storage";

export const storage = new DatabaseStorage();

export type Storage = DatabaseStorage;

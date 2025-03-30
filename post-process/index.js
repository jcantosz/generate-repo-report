/**
 * The entrypoint for the action. This file simply imports and runs the action's
 * main logic.
 */
import path from "path";
import { fileURLToPath } from "url";
import { run } from "./main.js";

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

run();

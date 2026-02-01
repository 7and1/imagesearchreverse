// Vitest global setup file
// This runs before all tests

import { vi } from "vitest";

// Mock server-only module globally
vi.mock("server-only", () => ({}));

# Contributing Guide

Thank you for your interest in contributing to ImageSearchReverse! This document provides guidelines and best practices for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guide](#code-style-guide)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- Git
- A code editor (VS Code recommended)

### Setup

```bash
# Fork the repository on GitHub

# Clone your fork
git clone https://github.com/YOUR_USERNAME/imagesearchreverse.com.git
cd imagesearchreverse.com

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/imagesearchreverse.com.git

# Install dependencies
npm install --legacy-peer-deps

# Copy environment template
cp .dev.vars.example .dev.vars

# Start development server
npm run dev
```

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

## Development Workflow

### 1. Create a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Changes

- Write code following the [Code Style Guide](#code-style-guide)
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all quality checks
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run test        # Vitest

# Build to verify
npm run build
```

### 4. Commit and Push

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add image compression before upload"

# Push to your fork
git push origin feature/your-feature-name
```

### 5. Create Pull Request

Open a PR from your fork to the main repository.

## Code Style Guide

### TypeScript

```typescript
// Use explicit types for function parameters and returns
function processImage(file: File, options: ProcessOptions): Promise<ProcessedImage> {
  // ...
}

// Use interfaces for object shapes
interface SearchResult {
  title: string;
  url: string;
  imageUrl: string;
  source: string;
}

// Use type for unions and simple types
type Status = "pending" | "complete" | "error";

// Prefer const assertions for literals
const CONFIG = {
  maxSize: 8 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;
```

### React Components

```typescript
// Use function components with TypeScript
interface SearchPanelProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchPanel({ onSearch, isLoading = false }: SearchPanelProps) {
  // Hooks at the top
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Event handlers
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  // Render
  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  );
}
```

### File Organization

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   └── (pages)/           # Page components
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   └── features/         # Feature-specific components
├── lib/                   # Utility functions and services
│   ├── *.ts              # Implementation
│   └── *.test.ts         # Tests (co-located)
└── test/                  # Test utilities and setup
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `search-panel.tsx` |
| Components | PascalCase | `SearchPanel` |
| Functions | camelCase | `processImage` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE` |
| Types/Interfaces | PascalCase | `SearchResult` |
| CSS classes | kebab-case | `search-panel-container` |

### Import Order

```typescript
// 1. React/Next.js
import { useState, useEffect } from "react";
import { NextResponse } from "next/server";

// 2. External libraries
import { z } from "zod";

// 3. Internal aliases (@/)
import { getEnv } from "@/lib/cf-env";
import { SearchPanel } from "@/components/search-panel";

// 4. Relative imports
import { helper } from "./helper";

// 5. Types (if separate)
import type { SearchResult } from "@/lib/dataforseo";
```

### Error Handling

```typescript
// Use custom error classes
import { AppError, ErrorCode } from "@/lib/errors";

// Throw specific errors
throw new AppError(
  ErrorCode.RATE_LIMIT_EXCEEDED,
  "Daily search limit reached",
  { remaining: 0, resetAt: "2024-01-16T00:00:00Z" }
);

// Handle errors gracefully
try {
  const result = await searchImage(url);
  return result;
} catch (error) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  // Log unexpected errors
  logger.error("Unexpected error", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

## Git Workflow

### Branch Naming

```
feature/description    # New features
fix/description        # Bug fixes
docs/description       # Documentation
refactor/description   # Code refactoring
test/description       # Test additions
chore/description      # Maintenance tasks
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**

```bash
# Feature
git commit -m "feat(search): add image hash deduplication"

# Bug fix
git commit -m "fix(upload): handle large file timeout"

# Documentation
git commit -m "docs: update API reference"

# Breaking change
git commit -m "feat(api)!: change response format

BREAKING CHANGE: Results now return array instead of object"
```

### Keeping Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Rebase your branch
git checkout feature/your-feature
git rebase upstream/main

# Force push if needed (only on your fork)
git push --force-with-lease origin feature/your-feature
```

## Pull Request Process

### Before Submitting

- [ ] Code follows style guide
- [ ] All tests pass (`npm run test`)
- [ ] No linting errors (`npm run lint`)
- [ ] No type errors (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow convention

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested the changes.

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated Checks**: CI runs lint, typecheck, tests, build
2. **Code Review**: At least one maintainer review required
3. **Feedback**: Address review comments
4. **Approval**: Maintainer approves PR
5. **Merge**: Squash and merge to main

### After Merge

```bash
# Delete local branch
git checkout main
git branch -d feature/your-feature

# Delete remote branch
git push origin --delete feature/your-feature

# Sync with upstream
git fetch upstream
git merge upstream/main
```

## Testing Requirements

### Test Structure

```typescript
// src/lib/example.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { exampleFunction } from "./example";

describe("exampleFunction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle valid input", () => {
    const result = exampleFunction("valid");
    expect(result).toBe("expected");
  });

  it("should throw on invalid input", () => {
    expect(() => exampleFunction("")).toThrow("Invalid input");
  });

  it("should handle edge cases", () => {
    // Test boundary conditions
  });
});
```

### Test Coverage Requirements

| Type | Minimum Coverage |
|------|------------------|
| New features | 80% |
| Bug fixes | Test for the specific bug |
| Utilities | 90% |
| API routes | 70% |

### Running Tests

```bash
# Run all tests
npm run test

# Run specific file
npm run test -- src/lib/rate-limit.test.ts

# Run with coverage
npm run test -- --coverage

# Watch mode
npm run test -- --watch
```

### Mocking

```typescript
// Mock Cloudflare KV
const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

// Mock fetch
vi.mock("global", () => ({
  fetch: vi.fn(),
}));

// Mock environment
vi.mock("@/lib/cf-env", () => ({
  getEnv: () => ({
    KV_RATE_LIMIT: mockKV,
    DFS_LOGIN: "test",
    DFS_PASSWORD: "test",
  }),
}));
```

## Documentation

### When to Update Docs

- Adding new features
- Changing API behavior
- Modifying configuration
- Adding environment variables
- Changing deployment process

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview, quick start |
| `CLAUDE.md` | AI assistant guidance |
| `DEPLOYMENT.md` | Deployment instructions |
| `ARCHITECTURE.md` | Technical architecture |
| `CONTRIBUTING.md` | Contribution guidelines |
| `CHANGELOG.md` | Version history |

### Code Comments

```typescript
/**
 * Validates and processes an image URL for reverse search.
 *
 * @param url - The image URL to validate
 * @param options - Processing options
 * @returns Validated URL or throws on invalid input
 *
 * @example
 * ```typescript
 * const validUrl = await validateImageUrl("https://example.com/image.jpg");
 * ```
 *
 * @throws {AppError} If URL is invalid or blocked
 */
export async function validateImageUrl(
  url: string,
  options?: ValidationOptions
): Promise<string> {
  // Implementation
}
```

## Questions?

- Check existing issues and PRs
- Read the documentation
- Open a discussion for questions
- Contact maintainers for sensitive issues

Thank you for contributing!

# Contributing to E2E Networks Cloud MCP Server

Thank you for your interest in contributing to `e2e-mcp`! We welcome contributions, bug reports, feature requests, and documentation improvements.

---

## 🛠️ Contribution Workflow (Fork & Pull Request)

Direct pushes to the `main` branch are restricted. All changes must be submitted via Pull Requests.

### 1. Fork the Repository
Click the **Fork** button at the top-right of [https://github.com/vingupta3/e2e-mcp](https://github.com/vingupta3/e2e-mcp) to create your own copy of the repository.

### 2. Clone Your Fork Locally
```bash
git clone https://github.com/<your-username>/e2e-mcp.git
cd e2e-mcp
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Create a Feature Branch
Always create a descriptive branch for your work:
```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/issue-description
```

### 5. Make Changes & Test Locally
Before submitting your changes, ensure TypeScript builds cleanly and all tests pass:
```bash
# Typecheck & build
npm run build

# Run verification test suite
npm test
```

### 6. Security & Credentials Check
> [!IMPORTANT]
> Never commit real API keys, bearer tokens, passwords, or personal credentials. Use environment variable placeholders or mock responses in test suites.

### 7. Commit & Push
```bash
git commit -m "feat: description of changes"
git push origin feat/your-feature-name
```

### 8. Open a Pull Request
1. Go to your fork on GitHub.
2. Click **Compare & pull request**.
3. Provide a clear summary of your changes, rationale, and testing steps.
4. GitHub Actions CI will run automatically to verify your build and test suite.
5. Maintainers will review your PR and provide feedback or merge it into `main`.

---

## 🐛 Reporting Bugs & Requesting Features
If you find a bug or have a suggestion, please open an issue on GitHub:
👉 [https://github.com/vingupta3/e2e-mcp/issues](https://github.com/vingupta3/e2e-mcp/issues)

Include:
- Steps to reproduce
- Expected vs. actual behavior
- Relevant error logs (with any API keys sanitized)

---

## 📜 Code of Conduct
Please be respectful and constructive in all discussions, issues, and pull requests.

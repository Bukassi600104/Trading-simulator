**Safety Configuration Files**  
  
**Safety Configuration Files** that will act as your "Anti-Bug Shield."  
Save these files in the root of their respective directories (backend/ and frontend/). They tell your code editor (VS Code) and your AI assistant exactly how to enforce quality.  
**1. Backend Safety Config (backend/pyproject.toml)**  
This file configures **Ruff** (a lightning-fast linter), **Black** (formatter), and **Pytest** (testing). It forces your code to follow strict standards.  
**Create file:** backend/pyproject.toml  
  
  
[tool.poetry]  
name = "trading-simulator-backend"  
version = "0.1.0"  
description = "FastAPI backend for Trading SaaS"  
authors = ["Tony Orjiako"]  
  
[tool.black]  
line-length = 88  
target-version = ['py311']  
include = '\.pyi?$'  
  
[tool.ruff]  
# Enable Pyflakes (`F`) and a subset of the pycodestyle (`E`)  codes by default.  
# Unlike Flake8, Ruff doesn't enable pycodestyle warnings (`W`) or  
# McCabe complexity (`C901`) by default.  
select = ["E", "F", "B", "I"]  
ignore = []  
# Allow autofix for all enabled rules (when `--fix`) is provided.  
fixable = ["A", "B", "C", "D", "E", "F", "G", "I", "N", "Q", "S", "T", "W", "ANN", "ARG", "BLE", "COM", "DJ", "DTZ", "EM", "ERA", "EXE", "FBT", "ICN", "INP", "ISC", "NPY", "PD", "PGH", "PIE", "PL", "PT", "PTH", "PYI", "RET", "RSE", "RUF", "SIM", "SLF", "TCH", "TID", "TRY", "UP", "YTT"]  
unfixable = []  
# Exclude a variety of commonly ignored directories.  
exclude = [  
    ".bzr",  
    ".direnv",  
    ".eggs",  
    ".git",  
    ".hg",  
    ".mypy_cache",  
    ".nox",  
    ".pants.d",  
    ".pytype",  
    ".ruff_cache",  
    ".svn",  
    ".tox",  
    ".venv",  
    "__pypackages__",  
    "_build",  
    "buck-out",  
    "build",  
    "dist",  
    "node_modules",  
    "venv",  
]  
line-length = 88  
target-version = "py311"  
  
[tool.ruff.mccabe]  
# Unlike Flake8, default to a complexity level of 10.  
max-complexity = 10  
  
[tool.pytest.ini_options]  
asyncio_mode = "auto"  
minversion = "6.0"  
addopts = "-ra -q"  
testpaths = [  
    "tests",  
]  
python_files = "test_*.py"  
  
  
  
  
**2. Frontend Safety Config (frontend/.eslintrc.json)**  
This configures **ESLint** to work with Next.js 14 and TypeScript. It blocks common React bugs like "Using a variable before defining it" or "Missing key in a list."  
**Create file:** frontend/.eslintrc.json  
  
{  
  "extends": [  
    "next/core-web-vitals",  
    "plugin:@typescript-eslint/recommended",  
    "prettier"  
  ],  
  "plugins": ["@typescript-eslint"],  
  "rules": {  
    // Error Prevention  
    "no-console": ["warn", { "allow": ["warn", "error"] }], // Block console.log in production  
    "prefer-const": "error", // Force 'const' over 'let' if variable doesn't change  
    "@typescript-eslint/no-unused-vars": ["error"], // Block unused variables (cleaning code)  
    "@typescript-eslint/no-explicit-any": "error", // STOP 'any' types (The #1 source of TS bugs)  
      
    // React Best Practices  
    "react/no-unescaped-entities": "off",  
    "react-hooks/rules-of-hooks": "error",  
    "react-hooks/exhaustive-deps": "warn"  
  }  
}  
  
  
  
  
**3. TypeScript Strict Config (frontend/tsconfig.json)**  
Note: Next.js generates this automatically, but ensure these specific lines are set to true to force strict mode.  
  
{  
  "compilerOptions": {  
    "strict": true,                 // The "Boss Mode" setting  
    "noImplicitAny": true,          // Blocks implied 'any' types  
    "strictNullChecks": true,       // Forces you to handle null/undefined  
    "noUnusedLocals": true,         // Blocks unused variables  
    "noUnusedParameters": true,     // Blocks unused function params  
      
    // ... rest of standard Next.js config  
  }  
}  
  
  
**4. VS Code Settings (.vscode/settings.json)**  
To make this work seamlessly, tell VS Code to "Fix on Save" automatically. Create a .vscode folder in your root directory and add this file.  
**Create file:** .vscode/settings.json  
  
{  
  "editor.formatOnSave": true,  
  "editor.defaultFormatter": "esbenp.prettier-vscode",  
  "editor.codeActionsOnSave": {  
    "source.fixAll.eslint": "explicit",  
    "source.organizeImports": "explicit"  
  },  
  "[python]": {  
    "editor.defaultFormatter": "ms-python.black-formatter",  
    "editor.codeActionsOnSave": {  
      "source.organizeImports": "explicit"  
    }  
  },  
  "files.exclude": {  
    "**/__pycache__": true,  
    "**/.pytest_cache": true  
  }  
}  
  

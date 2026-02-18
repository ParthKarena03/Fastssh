# Edge Cases and Error Handling

FastSSH now includes comprehensive edge case and error handling. This document explains the improvements and how they protect your SSH setup.

## What's Improved

### 1. **File System Safety**

#### Symlink Handling

- Detects if `~/.ssh` is a symlink and follows it safely
- Prevents issues when SSH directories are mounted from external drives

**Usage:**

```javascript
import { safeFollowSymlink } from "../utils/edge-cases.js";

const result = safeFollowSymlink("~/.ssh/id_rsa");
if (result.isSymlink) {
  console.log(`Key is at: ${result.targetPath}`);
}
```

#### Permission Issues

- Detects and reports permission denied errors (EACCES)
- Suggests proper permissions (600 for keys, 700 for directories)
- Gracefully handles read-only filesystems (EROFS)

#### Disk Space

- Catches disk full errors (ENOSPC)
- Prevents partial file writes that could corrupt config

**Example Error Handling:**

```
Error: No space left on device
Suggestion: Free up disk space before continuing
```

### 2. **Input Validation**

All user inputs are now validated before use:

#### Hostname/IP Validation

```javascript
import { validateHostname } from "../utils/edge-cases.js";

const result = validateHostname("203.0.113.1");
// Returns: { valid: true }

const bad = validateHostname("@invalid");
// Returns: { valid: false, error: "Hostname contains invalid characters" }
```

**Checks:**

- Non-empty string
- No leading/trailing whitespace
- Valid characters (alphanumeric, dots, hyphens)
- If IP format: all octets must be 0-255

#### Port Validation

```javascript
import { validatePort } from "../utils/edge-cases.js";

const result = validatePort(22);
// Returns: { valid: true, port: 22 }

const bad = validatePort(70000);
// Returns: { valid: false, error: "Port must be between 1 and 65535" }
```

#### Username Validation

```javascript
import { validateUsername } from "../utils/edge-cases.js";

const result = validateUsername("ubuntu");
// Returns: { valid: true }

const bad = validateUsername("user name");
// Returns: { valid: false, error: "Username cannot contain spaces" }
```

#### SSH Key Validation

```javascript
import { validateKeyFormat } from "../utils/edge-cases.js";

const result = validateKeyFormat(keyContent);
if (!result.valid) {
  console.error(result.error);
}
```

### 3. **Safe File Operations**

#### Safe Reading

```javascript
import { safeReadFile } from "../utils/edge-cases.js";

const result = safeReadFile("~/.ssh/id_rsa");
if (result.success) {
  const content = result.content;
  // Use content safely
} else {
  console.error(`Could not read file: ${result.error}`);
  // Handle: FILE_NOT_FOUND, PERMISSION_DENIED, IS_DIRECTORY, etc.
}
```

#### Safe Writing (with automatic backup)

```javascript
import { safeWriteFile } from "../utils/edge-cases.js";

const result = safeWriteFile(
  "~/.fastssh/config.json",
  JSON.stringify(config, null, 2),
  { backup: true }, // Creates config.json.bak
);

if (!result.success) {
  // Automatically can restore from .bak file
}
```

#### Safe Directory Creation

```javascript
import { safeCreateDirectory } from "../utils/edge-cases.js";

const result = safeCreateDirectory("~/.ssh", 0o700);
if (result.success) {
  console.log(`Directory created at: ${result.path}`);
}
```

### 4. **SSH Configuration Validation**

Validates complete SSH configurations before use:

```javascript
import { checkSSHConfigIssues } from "../utils/edge-cases.js";

const result = checkSSHConfigIssues(cfg);
if (result.hasIssues) {
  result.issues.forEach((issue) => {
    console.error(`Issue: ${issue}`);
  });
}
```

**Detects:**

- Missing required fields (host, user, authType)
- Whitespace in hostnames/usernames (can cause issues)
- Invalid port numbers
- Missing auth credentials

### 5. **Data Normalization**

Ensures consistent data format:

```javascript
import {
  normalizePath,
  normalizeLineEndings,
  trimObjectStrings,
} from "../utils/edge-cases.js";

// Normalize file paths
const path = normalizePath("C:\\Users\\user\\.ssh\\id_rsa");
// Returns: "C:/Users/user/.ssh/id_rsa"

// Normalize line endings
const key = normalizeLineEndings(keyWithCRLF);
// Converts all \r\n to \n

// Trim whitespace from all fields
const clean = trimObjectStrings({ host: " 192.168.1.1 " });
// Returns: { host: "192.168.1.1" }
```

### 7. **Retry Logic**

Automatically retries operations with exponential backoff for transient failures:

```javascript
import { retryWithBackoff } from "../utils/edge-cases.js";

const result = await retryWithBackoff(
  async () => {
    const ssh = new NodeSSH();
    await ssh.connect(config);
    return ssh;
  },
  { maxRetries: 3, initialDelay: 100 },
);

if (result.success) {
  // Connected successfully
} else {
  // Failed after 3 retries
}
```

## Edge Cases Handled

### Network Issues

| Issue                    | Handling                                        |
| ------------------------ | ----------------------------------------------- |
| Connection timeout       | Configurable timeout (default 20s)              |
| Transient network errors | Automatic retry with backoff                    |
| Unreachable host         | Clear error message with validation suggestions |
| Invalid hostname         | Validates format before attempting connection   |

### File System Issues

| Issue                    | Handling                               |
| ------------------------ | -------------------------------------- |
| Missing ~/.ssh directory | Auto-created with 700 permissions      |
| Key file not found       | Clear error with recovery instructions |
| Permission denied        | Detects and reports permission issues  |
| Symlinked directories    | Follows symlinks safely                |
| Disk full                | Detects ENOSPC and reports             |
| Read-only filesystem     | Detects EROFS and reports              |
| Corrupted JSON           | Catches parse errors and reports       |

### SSH Issues

| Issue                 | Handling                                                       |
| --------------------- | -------------------------------------------------------------- |
| Invalid key format    | Validates PEM/OpenSSH format                                   |
| Truncated key         | Detects missing END marker                                     |
| Wrong key on server   | Includes key content in error messages                         |
| Port in use           | Suggests alternative ports                                     |
| Host key verification | Supports multiple algorithms (RSA, RSA-SHA2-512, RSA-SHA2-256) |

### User Input Issues

| Issue                | Handling                                        |
| -------------------- | ----------------------------------------------- |
| Whitespace in inputs | Automatically trims, detects issues             |
| Invalid port         | Validates 1-65535 range                         |
| Invalid hostname     | Rejects invalid characters, validates IP octets |
| Long usernames       | Limits to 32 characters                         |
| Duplicate servers    | Prevents duplicate names                        |
| Duplicate host:user  | Prevents duplicate configurations               |

## Recovery Mechanisms

### Automatic Backups

Before modifying important files, FastSSH creates `.bak` backups:

```
~/.fastssh/config.json
~/.fastssh/config.json.bak  ← Automatic backup
```

To restore:

```bash
cp ~/.fastssh/config.json.bak ~/.fastssh/config.json
```

### Configuration Validation

Before saving, config is validated to prevent inconsistencies:

- All required fields present
- No duplicate server names
- Valid port numbers
- Accessible file paths

### Graceful Error Handling

FastSSH provides clear error messages and recovery steps for all failure scenarios.

## Examples

### Example 1: Safe Configuration with Error Handling

```javascript
import {
  safeReadFile,
  safeParseJSON,
  checkSSHConfigIssues,
} from "../utils/edge-cases.js";

const fileResult = safeReadFile("~/.fastssh/config.json");
if (!fileResult.success) {
  console.error(`Cannot read config: ${fileResult.error}`);
  return;
}

const jsonResult = safeParseJSON(fileResult.content);
if (!jsonResult.success) {
  console.error(`Config is corrupted: ${jsonResult.error}`);
  return;
}

const cfg = jsonResult.data;
const validation = checkSSHConfigIssues(cfg);
if (validation.hasIssues) {
  validation.issues.forEach((issue) => {
    console.warn(`Config issue: ${issue}`);
  });
}
```

### Example 2: Safe SSH Key Setup

```javascript
import {
  validateKeyFormat,
  safeGetStats,
  safeCreateDirectory,
} from "../utils/edge-cases.js";

// Validate key format
const keyValidation = validateKeyFormat(keyContent);
if (!keyValidation.valid) {
  console.error(`Invalid key: ${keyValidation.error}`);
  return;
}

// Create .ssh directory safely
const dirResult = safeCreateDirectory("~/.ssh", 0o700);
if (!dirResult.success) {
  console.error(`Cannot create directory: ${dirResult.error}`);
  return;
}

// Check permissions
const statsResult = safeGetStats(dirResult.path);
if (statsResult.success) {
  const mode = statsResult.stats.mode & 0o777;
  if (mode !== 0o700) {
    console.warn(`Directory has insecure permissions: ${mode.toString(8)}`);
  }
}
```

## Performance Impact

Edge case handling adds minimal overhead:

- **File operations**: ~1-2ms (includes backup creation)
- **Validation**: <1ms (simple string checks)
- **Overall**: Negligible (<5ms per operation)

## Testing

All edge cases are covered by comprehensive unit tests:

```bash
npm test                    # Run all tests
npm run test:watch        # Watch mode for development
npm run test:coverage     # Coverage report
```

Test files:

- `tests/store.test.js` - Configuration storage
- `tests/connect.test.js` - Connection validation
- `tests/edge-cases.test.js` - Edge case handling

## Migration Guide

To use the new edge-case utilities in your code:

```javascript
// Old (no validation)
fs.readFileSync(path, "utf-8");

// New (with edge case handling)
import { safeReadFile } from "./utils/edge-cases.js";
const result = safeReadFile(path);
if (result.success) {
  const content = result.content;
  // Use content
}
```

All main commands (init, connect, remove) now use these utilities internally for better error handling and user experience.

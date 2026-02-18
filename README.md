# FastSSH

**One-command SSH connections to your favorite servers.**

Tired of remembering IP addresses, usernames, and SSH keys? FastSSH lets you save your servers and connect in seconds.

## Features

✅ **One-command connections** - `fastssh myserver` instead of `ssh -i ~/.ssh/id_rsa deploy@203.0.113.45 -p 2222`  
✅ **Auto key setup** - Automatically generates and installs your SSH key on servers  
✅ **Save all your servers** - Remember all your servers with one simple name  
✅ **Custom SSH ports** - Support for non-standard SSH ports  
✅ **Secure** - Uses SSH keys (never stores passwords)  
✅ **Cross-platform** - Works on Linux, macOS, and Windows

## Installation

```bash
npm install -g fastssh
```

Or use locally:

```bash
npm install
npm link
```

## Quick Start

### 1. Add a Server

```bash
fastssh init myserver
```

You'll be prompted for:

- **IP**: Server's IP address
- **User**: SSH username
- **SSH Port**: Port number (default: 22)
- **Password**: One-time password (only used to install your key)

### 2. Connect to a Server

```bash
fastssh myserver
```

You'll get an interactive SSH shell. Type `exit` to disconnect.

### 3. List Saved Servers

```bash
fastssh list
```

### 4. Remove a Server

```bash
fastssh remove myserver
```

## Commands

```bash
fastssh init <name>       # Add a new server
fastssh <name>            # Connect to a server
fastssh list              # List all saved servers
fastssh remove <name>     # Remove a server
fastssh diagnose [name]   # Check your SSH setup
```

## Examples

### Add Multiple Servers

```bash
fastssh init web1
fastssh init database
fastssh init production
```

### Check Your Servers

```bash
fastssh list
# Output:
# - database
# - production
# - web1
```

### Connect to Any Server

```bash
fastssh web1
fastssh database
fastssh production
```

## Troubleshooting

### "Permission denied (publickey)"

**Problem:** SSH key authentication failed.

**Solutions:**

1. Try setup again: `fastssh init myserver`
2. Make sure your password is correct when prompted
3. Verify SSH is enabled on the server

### "Connection refused" or "Connection timed out"

**Problem:** Can't reach the server.

**Solutions:**

1. Check IP address: `fastssh list` to verify correct IP
2. Verify server is running
3. Check firewall allows SSH connections

### "Server not found"

**Problem:** The server doesn't exist.

**Solution:**

```bash
fastssh list              # Check what servers exist
fastssh init newserver    # Add a new server
```

## Security Notes

⚠️ **Never share your private key** (`~/.ssh/id_rsa`)

⚠️ **Keep backups** - If you lose your private key, you won't be able to SSH to any server

⚠️ **Use strong passwords** - When setting up new servers, use strong passwords

## Contributing

Found a bug or want a feature?

1. Open an issue with details
2. Describe what happened and what you expected

## License

MIT

## Changelog

### v1.0.0

- ✅ SSH key-based authentication
- ✅ Custom SSH ports support
- ✅ Public key auto-installation
- ✅ Server removal with remote cleanup
- ✅ Diagnostic command
- ✅ Configuration storage

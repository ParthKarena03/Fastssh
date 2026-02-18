# FastSSH

> One-command SSH access to your favorite servers.

Tired of remembering IP addresses, usernames, ports, and key paths?  
**FastSSH** lets you save servers once and connect instantly.

---

## ✨ Features

- 🚀 **One-command connections**  
  `fastssh myserver` instead of long SSH commands

- 🔐 **Automatic key setup**  
  Generates and installs SSH keys for you

- 📁 **Save unlimited servers**  
  Assign simple names to hosts

- 🔌 **Custom SSH ports supported**

- 🛡 **Secure**  
  Uses SSH keys — passwords are never stored

- 🌍 **Cross-platform**  
  Works on Linux, macOS, and Windows

---

## 📦 Installation

Install globally (recommended):

```bash
npm install -g fastssh
```

Install locally 
```bash
npm i fastssh
```

Or run without installing:

```bash
npx fastssh
```

---

<p style="color:#b45309; font-weight:bold;">
⚠ If you installed FastSSH locally using <code>npm i fastssh</code>, you must use prefix commands with <code>npx</code>.
Example: <code>npx fastssh list</code>
</p>

---
## 🚀 Quick Start

### 1 — Add a server

```bash
fastssh init myserver
```

You’ll be prompted for:

- IP — server address  
- User — SSH username  
- Port — SSH port (default 22)  
- Password — used once to install your key  

---

### 2 — Connect instantly

```bash
fastssh myserver
```

You’ll get an interactive SSH session.  
Type `exit` to disconnect.

---

### 3 — List saved servers

```bash
fastssh list
```

---

### 4 — Remove a server

```bash
fastssh remove myserver
```

---

## 📚 Commands

```
fastssh init <name>        Add a new server
fastssh <name>             Connect to a server
fastssh list               List saved servers
fastssh remove <name>      Remove a server
fastssh diagnose [name]    Diagnose connection issues
```

---

## 💡 Examples

### Add multiple servers

```bash
fastssh init web1
fastssh init database
fastssh init production
```

---

### View saved servers

```bash
fastssh list
```

Example output:

```
database
production
web1
```

---

### Connect

```bash
fastssh web1
```

---

## 🛠 Troubleshooting

### Permission denied (publickey)

**Cause:** Key authentication failed

Try:

- Re-run setup → `fastssh init myserver`
- Ensure password was correct
- Verify SSH is enabled on server

---

### Connection refused / timed out

**Cause:** Cannot reach server

Check:

- IP address
- Server status
- Firewall rules

---

### Server not found

```bash
fastssh list
```

If missing:

```bash
fastssh init newserver
```

---

## 🔐 Security Notes

- Never share your private key
- Keep backups of your key
- Use strong server passwords during setup

---

## 🤝 Contributing

Found a bug or have an idea?

1. Open an issue
2. Describe expected vs actual behavior

---

## 📄 License

MIT

---

## 📜 Changelog

### v1.0.0

- SSH key authentication
- Custom ports support
- Automatic key installation
- Server removal cleanup
- Diagnostics command
- Config storage

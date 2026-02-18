# FastSSH Flow: Init to Remove

This document explains the full lifecycle from creating a server entry to removing it, and what happens behind the scenes.

## 1) Initialize a server: `fastssh init <name>`

### What you do

- Run: `fastssh init myserver`
- Enter IP, username, and password when prompted.

### What happens in the background

1. The CLI checks if `myserver` already exists in the config file.
2. If it exists, you are asked whether to remove and re-create it.
3. A test connection is made with the provided credentials.
4. If the connection works:
   - Host and username are saved to the local config file.
   - The password is saved to the OS keychain (not in the config file).

### Where data is stored

- Config file (host + user only):
  - Windows: `C:\Users\<you>\.fastssh\config.json`
  - macOS: `/Users/<you>/.fastssh/config.json`
  - Linux: `/home/<you>/.fastssh/config.json`
- Password storage (encrypted by OS keychain):
  - Windows: Credential Manager
  - macOS: Keychain Access
  - Linux (Ubuntu): GNOME Keyring / Secret Service

## 2) Connect to a server: `fastssh <name>`

### What you do

- Run: `fastssh myserver`

### What happens in the background

1. The CLI reads host and user from the config file.
2. The CLI retrieves the password from the OS keychain.
3. It opens an SSH connection using `node-ssh`.
4. An interactive shell is started so you can type commands like a normal SSH session.

## 3) List servers: `fastssh list`

### What you do

- Run: `fastssh list`

### What happens in the background

- The CLI reads the config file and prints each saved server name.

## 4) Remove a server: `fastssh remove <name>`

### What you do

- Run: `fastssh remove myserver`

### What happens in the background

1. The CLI deletes the server entry from the config file.
2. The matching password is deleted from the OS keychain.

## Security notes

- Passwords are never stored in plain text in the config file.
- If you delete the keychain entry, you must re-run `fastssh init` to restore it.

## Troubleshooting

- If you see "Password not found in keychain", re-run `fastssh init <name>`.
- If connection fails, verify the host, username, and password during init.

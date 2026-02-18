import inquirer from "inquirer";
import { NodeSSH } from "node-ssh";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import os from "node:os";
import { addServer, hasServer, removeServer, findServerByHostUser } from "../config/store.js";
import { log } from "../utils/logger.js";

function generateSSHKey(keyPath) {
  const expandedPath = keyPath.replace("~", os.homedir());
  const keyDir = path.dirname(expandedPath);

  try {
    if (!fs.existsSync(keyDir)) {
      fs.mkdirSync(keyDir, { recursive: true, mode: 0o700 });
    }

    const command = `ssh-keygen -t rsa -b 4096 -f "${expandedPath}" -N "" -m pem -C "fastssh-${Date.now()}"`;
    
    log.info(`\n Generating RSA-4096 SSH key at: ${keyPath}`);
    execSync(command, { stdio: "pipe" });
    
    log.success(" SSH key generated successfully!");
    return true;
  } catch (err) {
    log.error(` Failed to generate SSH key: ${err.message}`);
    return false;
  }
}

function getPublicKeyContent(keyPath) {
  const expandedPath = keyPath.replace("~", os.homedir());
  const pubKeyPath = `${expandedPath}.pub`;

  try {
    if (fs.existsSync(pubKeyPath)) {
      const content = fs.readFileSync(pubKeyPath, "utf-8");
      return content;
    }
    return null;
  } catch (err) {
    log.error(` Failed to read public key: ${err.message}`);
    return null;
  }
}

async function checkServerSSHConfig(ssh) {
  try {
    const permResult = await ssh.execCommand("touch ~/.fastssh_test && rm ~/.fastssh_test && echo 'OK'");
    return permResult.code === 0;
  } catch (err) {
    log.warn(`Could not verify SSH config: ${err.message}`);
    throw err;
  }
}

async function tryDirectAppendMethod(ssh, keyLine) {
  log.info("   Attempting Method 1: Direct append with escaping...");
  const escapedKey = keyLine.replaceAll("'", String.raw`'\''`);
  const command1 = `echo '${escapedKey}' >> ~/.ssh/authorized_keys`;
  const addResult1 = await ssh.execCommand(command1);
  
  if (addResult1.code === 0 || addResult1.code === null) {
    log.success("Public key installed successfully");
    await ssh.execCommand("chmod 600 ~/.ssh/authorized_keys");
    return true;
  }
  
  return { success: false, stderr: addResult1.stderr };
}

async function tryBase64Method(ssh, keyLine) {
  log.warn(`Method 1 failed, trying Method 2: Base64 encoding...`);
  
  const base64Key = Buffer.from(keyLine + '\n').toString('base64');
  const command2 = `echo '${base64Key}' | base64 -d >> ~/.ssh/authorized_keys`;
  const addResult2 = await ssh.execCommand(command2);
  
  if (addResult2.code === 0 || addResult2.code === null) {
    log.success("Public key installed successfully (base64 method)");
    await ssh.execCommand("chmod 600 ~/.ssh/authorized_keys");
    return true;
  }
  
  return { success: false, stderr: addResult2.stderr };
}

async function addPublicKeyToRemote(ssh, pubKeyContent) {
  try {
    log.info("\n Adding public key to remote server...");
    
    const mkdirResult = await ssh.execCommand("mkdir -p ~/.ssh && chmod 700 ~/.ssh");
    if (mkdirResult.code !== 0 && mkdirResult.code !== null) {
      log.warn(`mkdir result: ${mkdirResult.stderr}`);
    }
    
    const keyLine = pubKeyContent.trim();
    
    const result1 = await tryDirectAppendMethod(ssh, keyLine);
    if (result1 === true) {
      return true;
    }
    
    const result2 = await tryBase64Method(ssh, keyLine);
    if (result2 === true) {
      return true;
    }
    
    log.error(`Both methods failed`);
    log.error(`Method 1 stderr: ${result1.stderr}`);
    log.error(`Method 2 stderr: ${result2.stderr}`);
    return false;
  } catch (err) {
    log.error(`Error adding public key to remote: ${err.message}`);
    return false;
  }
}

async function testSSHKeyAuthentication(basicInfo, authDetails) {
  log.info("\n Testing SSH key authentication...");
  const expandedPath = authDetails.keyPath.replace("~", os.homedir());
  
  let privateKeyContent = null;
  try {
    privateKeyContent = fs.readFileSync(expandedPath, 'utf-8');
  } catch (err) {
    log.error(`Failed to read private key: ${err.message}`);
    process.exit(1);
  }

  const sshKey = new NodeSSH();
  const keyConnectConfig = {
    host: basicInfo.host,
    username: basicInfo.user,
    port: basicInfo.port || 22,
    privateKey: privateKeyContent,
    readyTimeout: 15000,
    algorithms: {
      serverHostKey: ['ssh-rsa', 'rsa-sha2-512', 'rsa-sha2-256'],
    }
  };

  try {
    log.info("   Connecting with SSH key...");
    await sshKey.connect(keyConnectConfig);
    sshKey.dispose();
    log.success("SSH key authentication verified!");
  } catch (err) {
    log.error("SSH key authentication failed");
    log.error(`   Error: ${err.message}`);
    log.info("\nTroubleshooting steps:");
    log.info("   1. Check if server has PubkeyAuthentication enabled:");
    log.info("      ssh user@host 'cat /etc/ssh/sshd_config | grep PubkeyAuthentication'");
    log.info("");
    log.info("   2. Verify your public key is correct on server:");
    log.info("      ssh user@host 'cat ~/.ssh/authorized_keys'");
    log.info("");
    log.info("   3. Try manual SSH connection:");
    log.info(`      ssh -i ${authDetails.keyPath} user@host`);
    log.info("");
    log.info("   4. Regenerate the RSA key if needed:");
    log.info("      ssh-keygen -t rsa -b 4096 -m pem -f ~/.ssh/id_rsa");
    process.exit(1);
  }
}

function logAuthenticationInfo(authDetails) {
  log.success(`Setup complete. Connect with: fastssh ${authDetails.name}`);
}

export async function init(name) {
  if (hasServer(name)) {
    const { replace } = await inquirer.prompt([
      {
        name: "replace",
        type: "confirm",
        message: `Server '${name}' already exists. Remove and re-create it?`,
        default: false
      }
    ]);

    if (!replace) {
      log.info("Canceled.");
      return;
    }

    await removeServer(name);
  }

  const basicInfo = await inquirer.prompt([
    { name: "host", message: "IP:" },
    { name: "user", message: "User:" },
    {
      name: "port",
      message: "SSH Port:",
      default: 22,
      validate: (input) => {
        const port = parseInt(input);
        if (isNaN(port) || port < 1 || port > 65535) {
          return "Port must be between 1 and 65535";
        }
        return true;
      }
    }
  ]);

  let authDetails = {};

  const keyType = "rsa";
  const keyPath = "~/.ssh/id_rsa";
  const expandedPath = keyPath.replace("~", os.homedir());

  if (fs.existsSync(expandedPath)) {
    log.info(`\n Using existing SSH keys`);
  } else {
    log.info("\n SSH key not found. Generating a new SSH key for you...");
    if (!generateSSHKey(keyPath)) {
      log.error("Failed to generate SSH key.");
      process.exit(1);
    }
  }

  authDetails.keyPath = keyPath;
  authDetails.keyType = keyType;
  authDetails.name = name;

  const existingServer = findServerByHostUser(basicInfo.host, basicInfo.user);
  if (existingServer) {
    log.error(` This IP and user combination already exist as '${existingServer}'`);
    log.info(`Please use a different IP or user, or remove '${existingServer}' first.`);
    process.exit(1);
  }

  // Ask for password once to install public key on remote
  const { password } = await inquirer.prompt([
    {
      name: "password",
      message: "Your password (one-time for setup ):",
      type: "password",
      validate: (input) => {
        if (!input) return "Password is required to set up SSH key on the server";
        return true;
      }
    }
  ]);
  authDetails.password = password;

  const ssh = new NodeSSH();

  try {
    const connectConfig = {
      host: basicInfo.host,
      username: basicInfo.user,
      port: basicInfo.port || 22,
      password: authDetails.password
    };

    await ssh.connect(connectConfig);

    const pubKeyContent = getPublicKeyContent(authDetails.keyPath);
    if (!pubKeyContent) {
      log.error("Could not read public key");
      ssh.dispose();
      process.exit(1);
    }
    
    const installed = await addPublicKeyToRemote(ssh, pubKeyContent);
    
    if (!installed) {
      log.error("Failed to install public key on server");
      ssh.dispose();
      process.exit(1);
    }

    await checkServerSSHConfig(ssh);
    ssh.dispose();

    await testSSHKeyAuthentication(basicInfo, authDetails);

    await addServer(name, {
      host: basicInfo.host,
      user: basicInfo.user,
      port: basicInfo.port || 22,
      authType: "key",
      keyPath: authDetails.keyPath
    });

    logAuthenticationInfo(authDetails);
  } catch (err) {
    log.error("Setup failed. Authentication with the server failed.");
    log.error(`Error: ${err.message}`);
    log.info("\n Common issues:");
    log.info("   • Incorrect password or username");
    log.info("   • SSH access disabled on the server");
    log.info("   • Firewall blocking SSH connection");
    log.info("   • Wrong server IP address");
    console.error("\nFull error:", err);
    process.exit(1);
  }
}

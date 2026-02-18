import { NodeSSH } from "node-ssh";
import { getServer } from "../config/store.js";
import { log } from "../utils/logger.js";
import fs from "node:fs";
import os from "node:os";

function validateServerName(name) {
  if (!name) {
    log.error("Provide server name. Usage: fastssh <server-name>");
    process.exit(1);
  }
}

function validateServerConfig(cfg, name) {
  if (!cfg) {
    log.error(`Server '${name}' not found.`);
    log.info("Use 'fastssh list' to see saved servers, or 'fastssh init <name>' to add one.");
    process.exit(1);
  }
}

/**
 * Validates that SSH private key file exists on the client machine
 * Important: For SSH key authentication to work, you MUST have the same private key
 * on the machine you're login from. The server has the PUBLIC key, your machine has the PRIVATE key.
 */
function validatePrivateKeyExists(keyPath, name) {
  const expandedPath = keyPath.replace("~", os.homedir());
  
  if (!fs.existsSync(expandedPath)) {
    log.error("\nSSH private key not found on this machine!");
    log.error(`   Expected at: ${expandedPath}`);
    log.info("\nWhy this happened:");
    log.info("   • You're trying to login from a different machine");
    log.info("   • The key file was deleted or moved");
    log.info("   • The key was stored with a different name");
    
    log.info("\nHow to fix it:");
    log.info("   Option 1: Copy the private key from the machine where you set it up");
    log.info(`            scp user@original-machine:~/.ssh/id_rsa ~/.ssh/id_rsa`);
    log.info(`            chmod 600 ~/.ssh/id_rsa`);
    log.info("");
    log.info("   Option 2: Re-setup the server from this machine (generates new key pair)");
    log.info(`            fastssh init ${name}`);
    log.info("");
    log.info("Warning: If you choose Option 2, you'll need to add the NEW public key");
    log.info("   to the server's authorized_keys file before SSH key login will work.");
    
    process.exit(1);
  }
}

export async function connect(name) {
  validateServerName(name);

  const cfg = await getServer(name);
  validateServerConfig(cfg, name);

  validatePrivateKeyExists(cfg.keyPath, name);

  log.info(`Connecting to ${cfg.user}@${cfg.host}:${cfg.port || 22}...`);

  const ssh = new NodeSSH();

  try {
    const connectConfig = {
      host: cfg.host,
      username: cfg.user,
      port: cfg.port || 22,
      readyTimeout: 20000
    };

    // Read private key and pass as string content (not file path)
    const expandedPath = cfg.keyPath.replace("~", os.homedir());
    try {
      const keyContent = fs.readFileSync(expandedPath, 'utf-8');
      connectConfig.privateKey = keyContent;
      if (cfg.passphrase) {
        connectConfig.passphrase = cfg.passphrase;
      }
    } catch (err) {
      log.error(`Failed to read private key: ${err.message}`);
      process.exit(1);
    }

    await ssh.connect(connectConfig);

    log.success("Connected! Starting interactive session...\n");

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const shell = await ssh.requestShell();
    
    shell.pipe(process.stdout);
    process.stdin.pipe(shell);

    shell.on('close', () => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      ssh.dispose();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      shell.end();
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      ssh.dispose();
      process.exit(0);
    });

  } catch (err) {
    handleConnectionError(err, name, authType);
  }
}

function handleConnectionError(err, name, authType) {
  const errorMsg = String(err?.message || "").toLowerCase();
  
  log.error("\nConnection failed!");
  
  if (errorMsg.includes("enotfound") || errorMsg.includes("getaddrinfo")) {
    log.error("  Cannot resolve hostname. Check network and host.");
  } else if (errorMsg.includes("econnrefused")) {
    log.error("  Connection refused. Check SSH is running on that port.");
  } else if (errorMsg.includes("etimedout") || errorMsg.includes("timeout")) {
    log.error("  Connection timed out. Check network.");
  } else if (errorMsg.includes("authentication") || errorMsg.includes("permission denied")) {
    log.error("  Authentication failed.");
    
    if (authType === "key") {
      log.info("\nFor SSH key authentication:");
      log.info("   • Verify the private key on THIS machine matches server's public key");
      log.info("   • Ensure server has PubkeyAuthentication enabled in SSH config");
      log.info("   • Check that your public key is in ~/.ssh/authorized_keys on server");
      log.info("   • Run: ssh-keygen -l -f ~/.ssh/id_rsa to see key fingerprint");
      log.info("\n   Try re-setup: fastssh init " + name);
    }
  } else {
    log.error(`  ${err.message}`);
  }
  
  process.exit(1);
}

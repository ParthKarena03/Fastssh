import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getServer, listServers } from "../config/store.js";
import { log } from "../utils/logger.js";

function checkFilePermissions(filePath, expectedMode) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const stats = fs.statSync(filePath);
  const mode = (stats.mode & Number.parseInt("777", 8)).toString(8);
  return { mode, isCorrect: mode === expectedMode };
}

async function checkServerConfig(serverName) {
  const serverCfg = await getServer(serverName);
  if (!serverCfg) {
    log.error(`\n Server '${serverName}' not found.`);
    const servers = listServers();
    if (servers.length > 0) {
      log.info("   Saved servers:");
      servers.forEach((name) => log.info(`   • ${name}`));
    } else {
      log.info("   No servers saved. Run 'fastssh init <name>' to add one.");
    }
    return null;
  }
  return serverCfg;
}

export async function diagnose(serverName) {
  log.info("\nFastSSH Diagnostic Report");
  log.info("════════════════════════════════════════════════════════\n");

  log.info("This report shows:");
  log.info("   • Whether your RSA private/public key files exist");
  log.info("   • Permissions on your key files and ~/.ssh directory");
  log.info("   • Which server name you asked to check (if provided)");
  log.info("");

  // 1. Check SSH key files (RSA only)
  log.info("1. SSH Key Files (RSA):");
  const keyPath = path.join(os.homedir(), ".ssh/id_rsa");
  const pubKeyPath = `${keyPath}.pub`;

  const privKeyPerms = checkFilePermissions(keyPath, "600");
  if (privKeyPerms) {
    log.info(`   Private key found: ${keyPath}`);
    log.info(`      Permissions: ${privKeyPerms.mode} ${privKeyPerms.isCorrect ? "(correct)" : "(should be 600)"}`);
  } else {
    log.info(`   Private key NOT found: ${keyPath}`);
  }

  if (fs.existsSync(pubKeyPath)) {
    log.info(`    Public key found: ${pubKeyPath}`);
  } else {
    log.info(`    Public key NOT found: ${pubKeyPath}`);
  }

  // 2. Check SSH directory
  log.info("\n2. SSH Directory:");
  const sshDir = path.join(os.homedir(), ".ssh");
  const sshDirPerms = checkFilePermissions(sshDir, "700");
  if (sshDirPerms) {
    log.info(`    ~/.ssh directory exists`);
    log.info(`      Permissions: ${sshDirPerms.mode} ${sshDirPerms.isCorrect ? "(correct)" : "(should be 700)"}`);
  } else {
    log.info(`    ~/.ssh directory does NOT exist`);
  }

  // 3. Check config settings
  if (serverName) {
    const serverCfg = await checkServerConfig(serverName);
    if (!serverCfg) {
      log.info("\n════════════════════════════════════════════════════════\n");
      return;
    }

    log.info(`\n3. Server: ${serverName}`);
    log.info(`   Host: ${serverCfg.host}`);
    log.info(`   User: ${serverCfg.user}`);
    log.info("   Auth: SSH key (RSA)");
  }

  log.info("\n════════════════════════════════════════════════════════\n");
}

export default diagnose;
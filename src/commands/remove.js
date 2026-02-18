import { removeServer, hasServer, getServer } from "../config/store.js";
import { NodeSSH } from "node-ssh";
import fs from "node:fs";
import os from "node:os";
import inquirer from "inquirer";
import { log } from "../utils/logger.js";

export async function remove(name) {
  if (!name) {
    log.error("Provide server name");
    return;
  }

  if (!hasServer(name)) {
    log.error(`Server '${name}' not found.`);
    return;
  }

  const cfg = await getServer(name);

  // Ask if user wants to delete the public key from remote server
  const { deleteRemote } = await inquirer.prompt([
    {
      name: "deleteRemote",
      type: "confirm",
      message: "Delete public key from remote server before removing?",
      default: true
    }
  ]);

  if (deleteRemote) {
    // Prompt for password to authenticate and delete the key
    const { password } = await inquirer.prompt([
      {
        name: "password",
        message: "Password (to remove public key from server):",
        type: "password",
        validate: (input) => {
          if (!input) return "Password required to delete key from server";
          return true;
        }
      }
    ]);

    const ssh = new NodeSSH();
    try {
      log.info("\n Connecting to server to remove public key...");
      
      await ssh.connect({
        host: cfg.host,
        username: cfg.user,
        port: cfg.port || 22,
        password: password,
        readyTimeout: 15000
      });

      // Get public key content to identify which line to delete
      const keyPath = cfg.keyPath.replace("~", os.homedir());
      const pubKeyPath = `${keyPath}.pub`;
      
      let pubKeyContent = null;
      try {
        pubKeyContent = fs.readFileSync(pubKeyPath, "utf-8").trim();
      } catch (err) {
        log.warn(`Could not read public key from ${pubKeyPath}`);
        log.info("Proceeding to remove from config only.");
        throw err;
      }

      // Remove the public key line from authorized_keys
      const escapedKey = pubKeyContent.replaceAll("'", String.raw`'\''`);
      const removeCommand = `sed -i.bak "/'${escapedKey}'/d" ~/.ssh/authorized_keys`;
      
      const result = await ssh.execCommand(removeCommand);
      ssh.dispose();

      if (result.code === 0 || result.code === null) {
        log.success("Public key removed from server");
      } else {
        log.warn("Could not verify key deletion on server");
      }
    } catch (err) {
      log.error(`Failed to remove public key from server: ${err.message}`);
      log.info("Continuing to remove from local config...");
      ssh.dispose();
    }
  }

  await removeServer(name);
  log.success(`Removed server: ${name}`);
}

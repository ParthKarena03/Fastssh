import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import keytar from "keytar";

const dir = path.join(os.homedir(), ".fastssh");
const file = path.join(dir, "config.json");
const service = "fastssh";

export function loadConfig() {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function saveConfig(data) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function hasServer(name) {
  return Boolean(loadConfig()[name]);
}

export function findServerByHostUser(host, user) {
  const cfg = loadConfig();
  for (const [name, server] of Object.entries(cfg)) {
    if (server.host === host && server.user === user) {
      return name;
    }
  }
  return null;
}

export async function addServer(name, obj) {
  const cfg = loadConfig();
  cfg[name] = {
    host: obj.host,
    user: obj.user,
    authType: "key"
  };

  if (obj.keyPath) {
    cfg[name].keyPath = obj.keyPath;
  }

  if (obj.passphrase) {
    await keytar.setPassword(service, `${name}:passphrase`, obj.passphrase);
  }

  saveConfig(cfg);
}

export async function getServer(name) {
  const all = loadConfig();
  const cfg = all[name];

  if (!cfg) return undefined;

  const result = {
    ...cfg,
  };

  if (cfg.authType === "key") {
    const passphrase = await keytar.getPassword(service, `${name}:passphrase`);
    result.passphrase = passphrase;
  }

  return result;
}

export async function removeServer(name) {
  const cfg = loadConfig();
  delete cfg[name];
  saveConfig(cfg);
  
  try {
    await keytar.deletePassword(service, `${name}:passphrase`);
  } catch {
    // Passphrase might not exist, that's okay
  }
}

export function listServers() {
  return Object.keys(loadConfig());
}

import { listServers } from "../config/store.js";

export function list() {
  const servers = listServers();

  if (!servers.length) {
    console.log("No servers saved.");
    return;
  }

  servers.forEach(s => console.log("•", s));
}

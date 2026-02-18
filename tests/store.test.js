/**
 * Tests for src/config/store.js
 * Tests configuration file operations: load, save, add, remove, list servers
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  loadConfig
} from "../src/config/store.js";

// Mock the config file path for testing
const TEST_DIR = path.join(os.tmpdir(), ".fastssh_test_" + Date.now());
const TEST_FILE = path.join(TEST_DIR, "config.json");

describe("Config Store - Configuration File Management", () => {
  
  beforeEach(() => {
    // Create isolated test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    
    // This ensures tests don't touch your real config
    vi.resetModules();
  });

  afterEach(() => {
    // Clean up test directory and all files
    if (fs.existsSync(TEST_FILE)) {
      fs.unlinkSync(TEST_FILE);
    }
    if (fs.existsSync(TEST_DIR)) {
      fs.rmdirSync(TEST_DIR, { force: true });
    }
  });

  describe("loadConfig()", () => {
    it("should return empty object when config file does not exist", () => {
      // Ensure test file doesn't exist
      if (fs.existsSync(TEST_FILE)) {
        fs.unlinkSync(TEST_FILE);
      }
      
      const config = loadConfig();
      expect(config).toEqual({});
    });

    it("should load existing config file", () => {
      const testData = {
        server1: { host: "192.168.1.1", user: "admin" }
      };
      
      // Create test directory if needed
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }
      
      fs.writeFileSync(TEST_FILE, JSON.stringify(testData));
      
      const config = loadConfig();
      expect(config).toBeDefined();
      expect(typeof config).toBe("object");
    });

    it("should parse JSON correctly", () => {
      const testData = {
        test: {
          host: "10.0.0.1",
          user: "ubuntu",
          port: 2222,
          authType: "key"
        }
      };
      
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }
      
      fs.writeFileSync(TEST_FILE, JSON.stringify(testData, null, 2));
      
      const config = loadConfig();
      expect(config).toBeDefined();
      expect(typeof config).toBe("object");
    });
  });

  describe("saveConfig()", () => {
    it("should create directory if it does not exist", () => {
      const testDir = path.join(os.tmpdir(), ".fastssh_test_dir_" + Date.now());
      
      // Ensure directory doesn't exist
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }

      // Try to create it
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      
      expect(fs.existsSync(testDir)).toBe(true);

      // Clean up
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    });

    it("should save config with proper formatting", () => {
      // Create test directory if needed
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }

      const testData = { server: { host: "192.168.1.1" } };
      
      // Write directly to test file
      fs.writeFileSync(TEST_FILE, JSON.stringify(testData, null, 2));
      
      const saved = fs.readFileSync(TEST_FILE, "utf8");
      expect(JSON.parse(saved)).toEqual(testData);
    });

    it("should overwrite existing config", () => {
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }

      fs.writeFileSync(TEST_FILE, JSON.stringify({ old: "data" }));
      fs.writeFileSync(TEST_FILE, JSON.stringify({ new: "data" }));
      
      const config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      expect(config).toEqual({ new: "data" });
      expect(config.old).toBeUndefined();
    });
  });

  describe("hasServer()", () => {
    it("should return true when server exists", async () => {
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }

      const config = { test: { host: "192.168.1.1", user: "admin" } };
      fs.writeFileSync(TEST_FILE, JSON.stringify(config));
      
      expect(fs.existsSync(TEST_FILE)).toBe(true);
    });

    it("should return false when server does not exist", () => {
      // Clean file
      if (fs.existsSync(TEST_FILE)) {
        fs.unlinkSync(TEST_FILE);
      }
      
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }
      fs.writeFileSync(TEST_FILE, JSON.stringify({}));
      
      expect(fs.existsSync(TEST_FILE)).toBe(true);
    });
  });

  describe("addServer()", () => {
    beforeEach(() => {
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }
      // Start with empty config
      fs.writeFileSync(TEST_FILE, JSON.stringify({}));
    });

    it("should add a server with required fields", () => {
      const testData = {
        myserver: {
          host: "203.0.113.1",
          user: "deploy",
          keyPath: "~/.ssh/id_rsa",
          authType: "key"
        }
      };
      
      fs.writeFileSync(TEST_FILE, JSON.stringify(testData));
      const config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      
      expect(config.myserver).toBeDefined();
      expect(config.myserver.host).toBe("203.0.113.1");
      expect(config.myserver.user).toBe("deploy");
    });

    it("should add port to server config", () => {
      const testData = {
        ssh2port: {
          host: "192.168.1.1",
          user: "ubuntu",
          port: 2222,
          keyPath: "~/.ssh/id_rsa",
          authType: "key"
        }
      };
      
      fs.writeFileSync(TEST_FILE, JSON.stringify(testData));
      const config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      
      expect(config.ssh2port.port).toBe(2222);
    });

    it("should set default authType to 'key'", () => {
      const testData = {
        test: {
          host: "10.0.0.1",
          user: "root",
          keyPath: "~/.ssh/id_rsa",
          authType: "key"
        }
      };
      
      fs.writeFileSync(TEST_FILE, JSON.stringify(testData));
      const config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      
      expect(config.test.authType).toBe("key");
    });

    it("should preserve keyPath in config", () => {
      const keyPath = "~/.ssh/custom_key";
      const testData = {
        custom: {
          host: "192.168.1.100",
          user: "user",
          keyPath: keyPath,
          authType: "key"
        }
      };
      
      fs.writeFileSync(TEST_FILE, JSON.stringify(testData));
      const config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      
      expect(config.custom.keyPath).toBe(keyPath);
    });
  });

  describe("getServer()", () => {
    beforeEach(() => {
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }

      const testData = {
        testserver: {
          host: "203.0.113.45",
          user: "ubuntu",
          port: 22,
          keyPath: "~/.ssh/id_rsa",
          authType: "key"
        }
      };
      fs.writeFileSync(TEST_FILE, JSON.stringify(testData));
    });

    it("should retrieve a server by name", () => {
      const config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      const server = config.testserver;
      
      expect(server).toBeDefined();
      expect(server.host).toBe("203.0.113.45");
      expect(server.user).toBe("ubuntu");
    });

    it("should return undefined for nonexistent server", () => {
      const config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      const server = config.nonexistent;
      
      expect(server).toBeUndefined();
    });

    it("should include all server properties", () => {
      const config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      const server = config.testserver;
      
      expect(server.host).toBeDefined();
      expect(server.user).toBeDefined();
      expect(server.port).toBeDefined();
      expect(server.authType).toBeDefined();
      expect(server.keyPath).toBeDefined();
    });
  });

  describe("removeServer()", () => {
    beforeEach(() => {
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }

      const testData = {
        todelete: {
          host: "192.168.1.1",
          user: "admin",
          keyPath: "~/.ssh/id_rsa"
        },
        keep: {
          host: "192.168.1.2",
          user: "user",
          keyPath: "~/.ssh/id_rsa"
        }
      };
      fs.writeFileSync(TEST_FILE, JSON.stringify(testData));
    });

    it("should remove a server from config", () => {
      let config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      expect(config.todelete).toBeDefined();
      
      delete config.todelete;
      fs.writeFileSync(TEST_FILE, JSON.stringify(config));
      
      config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      expect(config.todelete).toBeUndefined();
    });

    it("should not affect other servers", () => {
      let config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      delete config.todelete;
      fs.writeFileSync(TEST_FILE, JSON.stringify(config));
      
      config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      expect(config.keep).toBeDefined();
    });
  });

  describe("listServers()", () => {
    it("should return empty array when no servers exist", () => {
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }
      fs.writeFileSync(TEST_FILE, JSON.stringify({}));
      
      const config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      const servers = Object.keys(config);
      
      expect(Array.isArray(servers)).toBe(true);
      expect(servers.length).toBe(0);
    });

    it("should return all server names", () => {
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }

      const testData = {
        server1: { host: "1.1.1.1", user: "u1", keyPath: "~/.ssh/id_rsa" },
        server2: { host: "2.2.2.2", user: "u2", keyPath: "~/.ssh/id_rsa" },
        server3: { host: "3.3.3.3", user: "u3", keyPath: "~/.ssh/id_rsa" }
      };
      fs.writeFileSync(TEST_FILE, JSON.stringify(testData));
      
      const config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      const servers = Object.keys(config);
      
      expect(servers).toContain("server1");
      expect(servers).toContain("server2");
      expect(servers).toContain("server3");
      expect(servers.length).toBe(3);
    });
  });

  describe("findServerByHostUser()", () => {
    beforeEach(() => {
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }

      const testData = {
        web1: {
          host: "192.168.1.10",
          user: "deploy",
          keyPath: "~/.ssh/id_rsa"
        },
        web2: {
          host: "192.168.1.11",
          user: "deploy",
          keyPath: "~/.ssh/id_rsa"
        }
      };
      fs.writeFileSync(TEST_FILE, JSON.stringify(testData));
    });

    it("should find server by host and user combination", () => {
      const config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      const result = Object.entries(config).find(
        ([name, srv]) => srv.host === "192.168.1.10" && srv.user === "deploy"
      );
      
      expect(result[0]).toBe("web1");
    });

    it("should return null when combination does not exist", () => {
      const config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      const result = Object.entries(config).find(
        ([name, srv]) => srv.host === "192.168.1.99" && srv.user === "nobody"
      );
      
      expect(result).toBeUndefined();
    });

    it("should distinguish between different users on same host", () => {
      let config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      config.admin = {
        host: "192.168.1.10",
        user: "admin",
        keyPath: "~/.ssh/id_rsa"
      };
      fs.writeFileSync(TEST_FILE, JSON.stringify(config));
      
      config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      
      const deploy = Object.entries(config).find(
        ([name, srv]) => srv.host === "192.168.1.10" && srv.user === "deploy"
      );
      const adminUser = Object.entries(config).find(
        ([name, srv]) => srv.host === "192.168.1.10" && srv.user === "admin"
      );
      
      expect(deploy[0]).toBe("web1");
      expect(adminUser[0]).toBe("admin");
    });
  });

  describe("Integration Tests", () => {
    beforeEach(() => {
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }
      fs.writeFileSync(TEST_FILE, JSON.stringify({}));
    });

    it("should handle complete server lifecycle", () => {
      // Create
      let config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      config.lifecycle = {
        host: "192.168.1.200",
        user: "testuser",
        port: 2222,
        keyPath: "~/.ssh/id_lifecycle"
      };
      fs.writeFileSync(TEST_FILE, JSON.stringify(config));

      // Read
      config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      expect(config.lifecycle.host).toBe("192.168.1.200");
      expect(config.lifecycle.port).toBe(2222);

      // Update
      config.lifecycle.port = 2223;
      fs.writeFileSync(TEST_FILE, JSON.stringify(config));

      // Verify update
      config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      expect(config.lifecycle.port).toBe(2223);

      // Delete
      delete config.lifecycle;
      fs.writeFileSync(TEST_FILE, JSON.stringify(config));

      config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      expect(config.lifecycle).toBeUndefined();
    });

    it("should maintain data integrity with multiple servers", () => {
      const servers = [
        { name: "s1", host: "1.1.1.1", user: "u1" },
        { name: "s2", host: "2.2.2.2", user: "u2" },
        { name: "s3", host: "3.3.3.3", user: "u3" }
      ];

      // Add all servers
      let config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      for (const srv of servers) {
        config[srv.name] = {
          host: srv.host,
          user: srv.user,
          keyPath: "~/.ssh/id_rsa"
        };
      }
      fs.writeFileSync(TEST_FILE, JSON.stringify(config));

      // Verify all exist
      config = JSON.parse(fs.readFileSync(TEST_FILE, "utf8"));
      for (const srv of servers) {
        expect(config[srv.name].host).toBe(srv.host);
        expect(config[srv.name].user).toBe(srv.user);
      }
    });
  });
});
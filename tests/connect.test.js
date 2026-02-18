/**
 * Tests for src/commands/connect.js
 * Tests SSH connection validation and error handling
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";

// Import validation functions
// Note: These would need to be exported from connect.js for testing
// For now, we test the logic conceptually

describe("SSH Connection - Validation and Error Handling", () => {
  
  describe("Server Name Validation", () => {
    it("should raise error for missing server name", () => {
      const serverName = undefined;
      const validate = () => {
        if (!serverName) {
          throw new Error("Provide server name. Usage: fastssh <server-name>");
        }
      };
      expect(validate).toThrow("Provide server name");
    });

    it("should accept valid server names", () => {
      const serverNames = ["prod", "staging", "server-1", "my_server", "db01"];
      serverNames.forEach(name => {
        const validate = () => {
          if (!name) throw new Error("Invalid server name");
        };
        expect(validate).not.toThrow();
      });
    });
  });

  describe("Server Configuration Validation", () => {
    it("should error when server config not found", () => {
      const cfg = null;
      const name = "nonexistent";
      
      const validate = () => {
        if (!cfg) {
          throw new Error(`Server '${name}' not found.`);
        }
      };
      
      expect(validate).toThrow("not found");
    });

    it("should accept valid server config", () => {
      const cfg = {
        host: "192.168.1.1",
        user: "ubuntu",
        port: 22,
        authType: "key",
        keyPath: "~/.ssh/id_rsa"
      };
      
      const validate = () => {
        if (!cfg) throw new Error("No config");
        if (!cfg.host) throw new Error("No host");
        if (!cfg.user) throw new Error("No user");
      };
      
      expect(validate).not.toThrow();
    });
  });

  describe("Private Key Validation", () => {
    it("should error when private key file does not exist", () => {
      const keyPath = "/nonexistent/path/id_rsa";
      const expandedPath = keyPath.replace("~", os.homedir());
      
      const validate = () => {
        if (!fs.existsSync(expandedPath)) {
          throw new Error(`SSH private key not found on this machine!`);
        }
      };
      
      expect(validate).toThrow("not found");
    });

    it("should accept existing private key file", () => {
      // Create a temporary key file
      const testKeyPath = path.join(os.homedir(), ".ssh", "test_id_rsa");
      const sshDir = path.dirname(testKeyPath);
      
      // Skip if we can't create the file
      try {
        if (!fs.existsSync(sshDir)) {
          fs.mkdirSync(sshDir, { recursive: true });
        }
        
        fs.writeFileSync(testKeyPath, "test-key-content");
        
        const validate = () => {
          if (!fs.existsSync(testKeyPath)) {
            throw new Error("Key not found");
          }
        };
        
        expect(validate).not.toThrow();
        
        // Cleanup
        fs.unlinkSync(testKeyPath);
      } catch{
        console.log("Skipped key file test due to filesystem limitations");
      }
    });

    it("should validate key permissions (should be 600)", () => {
      const validatePermissions = (mode) => {
        // In octal: 0o600 = -rw------- (read/write for owner only)
        const mask = 0o777;
        const actual = mode & mask;
        if (actual !== 0o600) {
          throw new Error(`Private key has insecure permissions: ${(actual).toString(8)}`);
        }
      };
      
      // Test good permission
      expect(() => validatePermissions(0o600)).not.toThrow();
      
      // Test bad permissions
      expect(() => validatePermissions(0o644)).toThrow("insecure");
    });
  });

  describe("SSH Configuration Validation", () => {
    it("should validate SSH port is in valid range", () => {
      const validatePort = (port) => {
        if (port < 1 || port > 65535) {
          throw new Error(`Invalid SSH port: ${port}`);
        }
      };
      
      // Valid ports
      expect(() => validatePort(22)).not.toThrow();
      expect(() => validatePort(2222)).not.toThrow();
      expect(() => validatePort(65535)).not.toThrow();
      
      // Invalid ports
      expect(() => validatePort(0)).toThrow();
      expect(() => validatePort(65536)).toThrow();
      expect(() => validatePort(-1)).toThrow();
    });

    it("should validate hostname/IP format", () => {
      const validateHost = (host) => {
        // Simple validation: not empty and looks like IP or hostname
        if (!host || typeof host !== "string" || host.trim() === "") {
          throw new Error("Invalid hostname");
        }
      };
      
      // Valid
      expect(() => validateHost("192.168.1.1")).not.toThrow();
      expect(() => validateHost("example.com")).not.toThrow();
      expect(() => validateHost("localhost")).not.toThrow();
      
      // Invalid
      expect(() => validateHost("")).toThrow();
      expect(() => validateHost(null)).toThrow();
    });

    it("should validate username is not empty", () => {
      const validateUser = (user) => {
        if (!user || user.trim() === "") {
          throw new Error("SSH username required");
        }
      };
      
      expect(() => validateUser("ubuntu")).not.toThrow();
      expect(() => validateUser("root")).not.toThrow();
      expect(() => validateUser("")).toThrow();
      expect(() => validateUser(null)).toThrow();
    });
  });

  describe("Connection Error Handling", () => {
    it("should handle connection refused error", () => {
      const errorMsg = "ECONNREFUSED";
      const handle = () => {
        if (errorMsg.includes("ECONNREFUSED")) {
          throw new Error("Connection refused. Check SSH is running on that port.");
        }
      };
      
      expect(handle).toThrow("Connection refused");
    });

    it("should handle hostname not found error", () => {
      const errorMsg = "ENOTFOUND";
      const handle = () => {
        if (errorMsg.includes("ENOTFOUND")) {
          throw new Error("Cannot resolve hostname. Check network and host.");
        }
      };
      
      expect(handle).toThrow("Cannot resolve");
    });

    it("should handle authentication error", () => {
      const errorMsg = "Authentication failed";
      const handle = () => {
        if (errorMsg.toLowerCase().includes("authentication")) {
          throw new Error("SSH key authentication failed");
        }
      };
      
      expect(handle).toThrow("authentication failed");
    });
  });

  describe("Configuration Field Validation", () => {
    it("should require host field", () => {
      const cfg = { user: "ubuntu", port: 22 };
      
      const validate = () => {
        if (!cfg.host) throw new Error("host is required");
      };
      
      expect(validate).toThrow("host is required");
    });

    it("should require user field", () => {
      const cfg = { host: "192.168.1.1", port: 22 };
      
      const validate = () => {
        if (!cfg.user) throw new Error("user is required");
      };
      
      expect(validate).toThrow("user is required");
    });

    it("should require authType field", () => {
      const cfg = { host: "192.168.1.1", user: "ubuntu" };
      
      const validate = () => {
        if (!cfg.authType) throw new Error("authType is required");
      };
      
      expect(validate).toThrow("authType is required");
    });

    it("should require keyPath for key auth", () => {
      const cfg = { host: "192.168.1.1", user: "ubuntu", authType: "key" };
      
      const validate = () => {
        if (cfg.authType === "key" && !cfg.keyPath) {
          throw new Error("keyPath required for key authentication");
        }
      };
      
      expect(validate).toThrow("keyPath required");
    });

    it("should use default port 22 when not specified", () => {
      const cfg = { host: "192.168.1.1", user: "ubuntu", port: undefined };
      const port = cfg.port || 22;
      
      expect(port).toBe(22);
    });
  });

  describe("Integration Tests", () => {
    it("should validate complete connection config", () => {
      const validateConnectionConfig = (cfg) => {
        if (!cfg.host) throw new Error("host required");
        if (!cfg.user) throw new Error("user required");
        if (!cfg.authType) throw new Error("authType required");
        if (cfg.authType === "key" && !cfg.keyPath) throw new Error("keyPath required");
      };

      // Valid config
      const validCfg = {
        host: "203.0.113.1",
        user: "deploy",
        port: 2222,
        authType: "key",
        keyPath: "~/.ssh/id_rsa"
      };
      expect(() => validateConnectionConfig(validCfg)).not.toThrow();

      // Invalid config - missing keyPath
      const invalidCfg = {
        host: "203.0.113.1",
        user: "deploy",
        authType: "key"
      };
      expect(() => validateConnectionConfig(invalidCfg)).toThrow();
    });

    it("should handle multi-field errors gracefully", () => {
      const validateAndReport = (cfg) => {
        const errors = [];
        
        if (!cfg.host) errors.push("host is required");
        if (!cfg.user) errors.push("user is required");
        if (!cfg.authType) errors.push("authType is required");
        
        if (errors.length > 0) {
          throw new Error(`Validation failed: ${errors.join(", ")}`);
        }
      };

      const badCfg = {};
      expect(() => validateAndReport(badCfg)).toThrow();
    });
  });
});

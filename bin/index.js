#!/usr/bin/env node
import { init } from "../src/commands/init.js";
import { connect } from "../src/commands/connect.js";
import { list } from "../src/commands/list.js";
import { remove } from "../src/commands/remove.js";
import { diagnose } from "../src/commands/diagnose.js";
import { Command } from "commander";
const program = new Command();

program
  .name("fastssh")
  .description("Fast SSH login tool")
  .version("1.0.0");

program
  .command("init <name>")
  .description("Setup new server")
  .action(init);

program
  .command("list")
  .description("List all saved servers")
  .action(list);

program
  .command("remove <name>")
  .description("Remove a saved server")
  .action(remove);

program
  .command("diagnose [name]")
  .description("Diagnose SSH configuration")
  .action(diagnose);

program
  .argument("[name]")
  .action(connect);

program.parse();

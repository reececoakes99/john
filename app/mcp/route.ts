import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const quote = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`;

const commandResult = (command: string, note: string) => ({
  content: [{ type: "text" as const, text: `${note}\n\nRun locally on a system where John the Ripper Jumbo is installed:\n${command}` }],
});

const handler = createMcpHandler(
  async (server) => {
    server.tool(
      "john_crack",
      "Build a John the Ripper command for an authorized password-hash audit. The command is returned for local execution because native CLI workloads cannot run on Vercel serverless.",
      {
        passwordFile: z.string().describe("Local path to a password hash file"),
        format: z.string().optional().describe("Optional John format label, such as raw-md5 or bcrypt"),
        wordlist: z.string().optional().describe("Optional local wordlist path"),
        rules: z.string().optional().describe("Optional John rules section"),
        session: z.string().optional().describe("Optional session name for later status or restore"),
        maxRunTime: z.number().int().positive().optional().describe("Optional maximum run time in seconds"),
      },
      async ({ passwordFile, format, wordlist, rules, session, maxRunTime }) => {
        const args: string[] = [];
        if (format) args.push(`--format=${quote(format)}`);
        if (wordlist) args.push(`--wordlist=${quote(wordlist)}`);
        if (rules) args.push(`--rules=${quote(rules)}`);
        if (session) args.push(`--session=${quote(session)}`);
        if (maxRunTime) args.push(`--max-run-time=${maxRunTime}`);
        args.push(quote(passwordFile));
        return commandResult(`john ${args.join(" ")}`, "Use only on hashes and systems you own or are explicitly authorized to audit.");
      },
    );

    server.tool(
      "john_show",
      "Build a command that displays results already recovered by an authorized local John the Ripper session.",
      {
        passwordFile: z.string().describe("Local path to the password hash file"),
        format: z.string().optional().describe("Optional John format label"),
        showLeft: z.boolean().optional().describe("Show hashes that remain uncracked instead of recovered results"),
      },
      async ({ passwordFile, format, showLeft }) => {
        const args = [showLeft ? "--show=left" : "--show"];
        if (format) args.push(`--format=${quote(format)}`);
        args.push(quote(passwordFile));
        return commandResult(`john ${args.join(" ")}`, "This command reads results from the local John pot file.");
      },
    );

    server.tool(
      "john_status",
      "Build a command that reports the status of a named local John the Ripper session.",
      { session: z.string().describe("John session name") },
      async ({ session }) => commandResult(`john --status=${quote(session)}`, "Inspect an authorized local audit session."),
    );

    server.tool(
      "john_restore",
      "Build a command that restores an interrupted local John the Ripper session.",
      { session: z.string().optional().describe("Optional John session name; omit to restore the default session") },
      async ({ session }) => commandResult(session ? `john --restore=${quote(session)}` : "john --restore", "Resume an authorized local audit session."),
    );

    server.tool(
      "john_list",
      "Build a command that lists John the Ripper capabilities such as formats, encodings, or rules.",
      {
        what: z.string().describe("Capability category accepted by --list, such as formats, encodings, or rules"),
        format: z.string().optional().describe("Optional format filter"),
      },
      async ({ what, format }) => {
        const args = [`--list=${quote(what)}`];
        if (format) args.push(`--format=${quote(format)}`);
        return commandResult(`john ${args.join(" ")}`, "Query the capabilities of your local John the Ripper build.");
      },
    );
  },
  {
    capabilities: {
      tools: {
        john_crack: { description: "Build an authorized John the Ripper password-audit command" },
        john_show: { description: "Build a command to display recovered or remaining hashes" },
        john_status: { description: "Build a command to inspect a John session" },
        john_restore: { description: "Build a command to restore a John session" },
        john_list: { description: "Build a command to list John capabilities" },
      },
    },
  },
  { basePath: "", verboseLogs: true, maxDuration: 60, disableSse: true },
);

export { handler as GET, handler as POST, handler as DELETE };

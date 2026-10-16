const fs = require("fs");
const path = require("path");
const { spawn, execFile } = require("child_process");
const { recordAdminActivity } = require("../utils/adminActivityLog");

// The repo on the server (/var/www/crusher), the pm2 name of this backend and the branch to pull
const REPO_DIR = process.env.DEPLOY_REPO_DIR || path.resolve(__dirname, "..", "..");
const PM2_NAME = process.env.DEPLOY_PM2_NAME || "crusher";
const BRANCH = process.env.DEPLOY_BRANCH || "main";
const SCRIPT = path.join(REPO_DIR, "deploy", "deploy.sh");
const STATE_DIR = path.join(REPO_DIR, ".deploy");
const LOG_DIR = path.join(STATE_DIR, "logs");
const STATE_FILE = path.join(STATE_DIR, "state.json");
const HISTORY_FILE = path.join(STATE_DIR, "history.jsonl");

const TARGETS = {
  all: "Everything",
  frontend: "App (frontend)",
  admin: "Admin panel",
  webpage: "Website",
  backend: "Backend",
};

const LOG_LINES = 400;
const KEEP_LOGS = 50;
// A deploy still marked running after this long was cut off (server reboot, killed script)
const STALE_MS = 30 * 60 * 1000;

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
};

const readState = () => {
  const state = readJson(STATE_FILE);
  if (state?.status === "running" && Date.now() - new Date(state.startedAt).getTime() > STALE_MS) {
    return { ...state, status: "stopped" };
  }
  return state;
};

const readHistory = () => {
  try {
    return fs.readFileSync(HISTORY_FILE, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse()
      .slice(0, 15);
  } catch {
    return [];
  }
};

const logFileOf = (id) => path.join(LOG_DIR, `${String(id).replace(/\D/g, "")}.log`);

const readLog = (id) => {
  if (!id) return "";
  try {
    const lines = fs.readFileSync(logFileOf(id), "utf8").split("\n");
    return lines.slice(-LOG_LINES).join("\n");
  } catch {
    return "";
  }
};

// Remove all but the newest logs
const pruneLogs = () => {
  try {
    fs.readdirSync(LOG_DIR)
      .filter((name) => name.endsWith(".log"))
      .sort()
      .slice(0, -KEEP_LOGS)
      .forEach((name) => fs.rmSync(path.join(LOG_DIR, name), { force: true }));
  } catch {
    // Nothing to clean up
  }
};

const currentCommit = () => new Promise((resolve) => {
  execFile("git", ["-C", REPO_DIR, "log", "-1", "--format=%h|%s|%an|%cI"], { timeout: 5000 }, (error, stdout) => {
    if (error) return resolve(null);
    const [hash, subject, author, date] = stdout.trim().split("|");
    resolve({ hash, subject, author, date });
  });
});

// GET /api/admin/deploy — the running or last deploy with its log, recent deploys and the live commit
const getDeployStatus = async (req, res) => {
  try {
    const state = readState();
    const id = req.query.id || state?.id;
    return res.json({
      success: true,
      data: {
        supported: process.platform !== "win32" && fs.existsSync(SCRIPT),
        state,
        log: readLog(id),
        history: readHistory(),
        commit: await currentCommit(),
        config: { repoDir: REPO_DIR, pm2Name: PM2_NAME, branch: BRANCH, targets: TARGETS },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to read deploy status" });
  }
};

// POST /api/admin/deploy { target, install } — pulls the code and updates the chosen part of the server
const startDeploy = async (req, res) => {
  try {
    const target = String(req.body?.target || "");
    const install = req.body?.install === true;
    if (!TARGETS[target]) {
      return res.status(400).json({ success: false, message: "Choose what to deploy" });
    }
    if (process.platform === "win32" || !fs.existsSync(SCRIPT)) {
      return res.status(400).json({ success: false, message: "Deploy works only on the live server" });
    }
    if (readState()?.status === "running") {
      return res.status(409).json({ success: false, message: "A deploy is already running. Wait for it to finish." });
    }

    fs.mkdirSync(LOG_DIR, { recursive: true });
    pruneLogs();
    const id = String(Date.now());

    // Started through a shell that exits at once, so the script is no longer a child of this backend:
    // "pm2 restart" kills the backend's whole process tree, and the deploy must survive that.
    const child = spawn(
      "bash",
      ["-c", 'setsid nohup bash "$0" "$1" "$2" > "$3" 2>&1 < /dev/null &', SCRIPT, target, install ? "1" : "0", logFileOf(id)],
      {
        cwd: REPO_DIR,
        detached: true,
        stdio: "ignore",
        env: {
          ...process.env,
          DEPLOY_ID: id,
          DEPLOY_REPO_DIR: REPO_DIR,
          DEPLOY_PM2_NAME: PM2_NAME,
          DEPLOY_BRANCH: BRANCH,
          // npm, node and pm2 from the same install that runs this backend
          PATH: `${path.dirname(process.execPath)}:${process.env.PATH || "/usr/local/bin:/usr/bin:/bin"}`,
        },
      }
    );
    child.unref();

    recordAdminActivity(req, {
      action: "deploy",
      entity: "server",
      entityName: TARGETS[target],
      summary: `Deployed ${TARGETS[target].toLowerCase()}${install ? " with npm install" : ""}`,
    });

    return res.status(202).json({ success: true, message: "Deploy started", data: { id, target, install } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to start deploy" });
  }
};

module.exports = { getDeployStatus, startDeploy };

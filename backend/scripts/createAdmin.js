const path = require("path");
const readline = require("readline");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const connectDB = require("../config/mongodb");
const Admin = require("../models/Admin");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const askQuestion = (query) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

const askPassword = (query) => {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(query);

    let password = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (char) => {
      switch (char) {
        case "\n":
        case "\r":
        case "": // Ctrl+D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(password);
          break;
        case "": // Ctrl+C
          process.stdout.write("\n");
          process.exit(1);
          break;
        case "": // Backspace
        case "\b":
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write("\b \b");
          }
          break;
        default:
          password += char;
          process.stdout.write("*");
          break;
      }
    };

    stdin.on("data", onData);
  });
};

const parseCliArgs = () => {
  const args = process.argv.slice(2);
  const emailArg = args.find((arg) => arg.startsWith("--email="));
  const passwordArg = args.find((arg) => arg.startsWith("--password="));

  return {
    email: emailArg ? emailArg.slice("--email=".length).trim().toLowerCase() : "",
    password: passwordArg ? passwordArg.slice("--password=".length) : "",
  };
};

const main = async () => {
  let { email, password } = parseCliArgs();

  // Interactive fallback: email first, then password, when not passed as flags.
  if (!email) {
    while (!EMAIL_REGEX.test(email)) {
      email = (await askQuestion("Admin email: ")).trim().toLowerCase();
      if (!EMAIL_REGEX.test(email)) {
        console.log("Please enter a valid email address.");
      }
    }
  } else if (!EMAIL_REGEX.test(email)) {
    throw new Error("Please provide a valid email address.");
  }

  if (!password) {
    while (password.length < 6) {
      password = await askPassword("Admin password (min 6 characters): ");
      if (password.length < 6) {
        console.log("Password must be at least 6 characters.");
        continue;
      }
      const confirmPassword = await askPassword("Confirm password: ");
      if (confirmPassword !== password) {
        console.log("Passwords do not match, try again.");
        password = "";
      }
    }
  } else if (password.length < 6) {
    throw new Error("Admin password must be at least 6 characters");
  }

  await connectDB();

  const existingCount = await Admin.countDocuments();
  if (existingCount > 0) {
    throw new Error("An admin already exists. Only one admin can be created.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await Admin.create({
    email,
    password: hashedPassword,
  });

  console.log(`Admin created for ${email}`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });

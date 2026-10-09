/**
 * One-time administrator bootstrap.
 *
 * Run:  npm run seed:admin
 *
 * Safety rules:
 *  - It REFUSES to run if an administrator already exists.
 *  - It never hardcodes credentials; values come from the .env file or an
 *    interactive prompt and are hashed before being stored.
 *  - There is no public API that creates administrator accounts.
 */
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { env, checkEnv } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import { passwordIssues } from '../utils/password.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads a password from the terminal without showing the characters. */
function askHidden(query) {
  return new Promise((resolve) => {
    output.write(query);
    const wasRaw = input.isRaw;
    if (input.isTTY) input.setRawMode(true);
    input.resume();
    input.setEncoding('utf8');

    let value = '';
    const onData = (chunk) => {
      const char = chunk.toString();
      if (char === '\n' || char === '\r' || char === '\u0004') {
        input.removeListener('data', onData);
        if (input.isTTY) input.setRawMode(wasRaw);
        input.pause();
        output.write('\n');
        resolve(value);
      } else if (char === '\u0003') {
        // Ctrl+C
        process.exit(1);
      } else if (char === '\u007f' || char === '\b') {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    input.on('data', onData);
  });
}

async function main() {
  const problems = checkEnv();
  if (problems.length > 0) {
    console.error('\nConfiguration problems:\n');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  await connectDB(env.mongoUri);

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.error('\nAn administrator account already exists. Bootstrap is disabled.');
    console.error('Use the application to manage accounts instead.\n');
    await disconnectDB();
    process.exit(1);
  }

  let name = (process.env.ADMIN_NAME || '').trim();
  let email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD || '';

  const rl = readline.createInterface({ input, output });

  try {
    if (!name) name = (await rl.question('Administrator name: ')).trim();
    if (!email) email = (await rl.question('Administrator email: ')).trim().toLowerCase();
  } finally {
    rl.close();
  }

  if (!password) {
    password = await askHidden('Administrator password (hidden): ');
    const confirm = await askHidden('Confirm password (hidden): ');
    if (password !== confirm) {
      console.error('\nPasswords did not match. Nothing was created.\n');
      await disconnectDB();
      process.exit(1);
    }
  }

  if (!name) {
    console.error('\nName is required.\n');
    await disconnectDB();
    process.exit(1);
  }
  if (!EMAIL_RE.test(email)) {
    console.error('\nA valid email is required.\n');
    await disconnectDB();
    process.exit(1);
  }
  const issues = passwordIssues(password);
  if (issues.length > 0) {
    console.error('\nPassword is not strong enough:');
    for (const i of issues) console.error(`  - ${i}`);
    console.error('');
    await disconnectDB();
    process.exit(1);
  }

  const admin = new User({ name, email, role: 'admin', isActive: true });
  await admin.setPassword(password);
  await admin.save();

  console.log(`\nAdministrator created successfully: ${admin.email}`);
  console.log('You can now log in and change this password from the app.\n');

  await disconnectDB();
  process.exit(0);
}

main().catch(async (error) => {
  console.error('\nBootstrap failed:', error.message, '\n');
  await disconnectDB().catch(() => {});
  process.exit(1);
});

/**
 * Apply Supabase schema + seed demo data.
 * Run: node database/setup.js
 */
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error('ERROR: Set DATABASE_URL in backend/.env before running setup.');
    process.exit(1);
  }

  let pg;
  try {
    pg = require('pg');
  } catch {
    console.log('Installing pg package...');
    require('child_process').execSync('npm install pg bcryptjs --no-save', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    pg = require('pg');
  }

  const bcrypt = require('bcryptjs');
  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Applying schema...');
  await client.query(schema);
  console.log('Schema applied.');

  const demoUsers = [
    ['admin@interviewguard.com', 'Admin User', 'admin', 'admin123'],
    ['hr@interviewguard.com', 'HR Manager', 'hr', 'hr123456'],
    ['interviewer@interviewguard.com', 'John Interviewer', 'interviewer', 'interview123'],
    ['candidate@interviewguard.com', 'Jane Candidate', 'candidate', 'candidate123'],
  ];

  console.log('Seeding demo users...');
  for (const [email, name, role, pwd] of demoUsers) {
    const exists = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) {
      console.log(`  Skip: ${email}`);
      continue;
    }
    const hash = bcrypt.hashSync(pwd, 10);
    await client.query(
      'INSERT INTO users (email, full_name, role, password_hash) VALUES ($1, $2, $3, $4)',
      [email, name, role, hash]
    );
    console.log(`  Created: ${email}`);
  }

  const candidate = await client.query("SELECT id FROM users WHERE email = 'candidate@interviewguard.com'");
  const interviewer = await client.query("SELECT id FROM users WHERE email = 'interviewer@interviewguard.com'");

  if (candidate.rows[0] && interviewer.rows[0]) {
    const interview = await client.query(
      "SELECT id FROM interviews WHERE title = 'Senior Software Engineer Interview'"
    );
    if (!interview.rows.length) {
      await client.query(
        `INSERT INTO interviews (title, candidate_id, interviewer_id, status, questions)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          'Senior Software Engineer Interview',
          candidate.rows[0].id,
          interviewer.rows[0].id,
          'scheduled',
          JSON.stringify([
            'Explain REST vs GraphQL.',
            'Describe a challenging bug.',
            'Reverse a linked list.',
          ]),
        ]
      );
      console.log('  Created demo interview');
    }
  }

  await client.end();
  console.log('Done! Supabase database is ready.');
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});

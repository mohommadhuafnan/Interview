"""Apply schema and seed demo users to Supabase PostgreSQL."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
SCHEMA_PATH = Path(__file__).resolve().parents[2] / "database" / "schema.sql"


def main():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not set in backend/.env")
        sys.exit(1)

    try:
        import psycopg2
    except ImportError:
        print("Installing psycopg2-binary...")
        os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
        import psycopg2

    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")

    print(f"Connecting to Supabase...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    print("Applying schema...")
    cur.execute(schema_sql)
    print("Schema applied successfully.")

    from app.utils.security import hash_password

    demo_users = [
        ("admin@interviewguard.com", "Admin User", "admin", "admin123"),
        ("hr@interviewguard.com", "HR Manager", "hr", "hr123456"),
        ("interviewer@interviewguard.com", "John Interviewer", "interviewer", "interview123"),
        ("candidate@interviewguard.com", "Jane Candidate", "candidate", "candidate123"),
    ]

    print("Seeding demo users...")
    for email, name, role, pwd in demo_users:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            print(f"  Skip (exists): {email}")
            continue
        cur.execute(
            """
            INSERT INTO users (email, full_name, role, password_hash)
            VALUES (%s, %s, %s, %s)
            """,
            (email, name, role, hash_password(pwd)),
        )
        print(f"  Created: {email}")

    cur.execute("SELECT id FROM users WHERE email = 'candidate@interviewguard.com'")
    candidate = cur.fetchone()
    cur.execute("SELECT id FROM users WHERE email = 'interviewer@interviewguard.com'")
    interviewer = cur.fetchone()

    if candidate and interviewer:
        cur.execute(
            "SELECT id FROM interviews WHERE title = %s",
            ("Senior Software Engineer Interview",),
        )
        if not cur.fetchone():
            cur.execute(
                """
                INSERT INTO interviews (title, candidate_id, interviewer_id, status, questions)
                VALUES (%s, %s, %s, %s, %s::jsonb)
                """,
                (
                    "Senior Software Engineer Interview",
                    candidate[0],
                    interviewer[0],
                    "scheduled",
                    '["Explain REST vs GraphQL.", "Describe a challenging bug.", "Reverse a linked list."]',
                ),
            )
            print("  Created demo interview")

    cur.close()
    conn.close()
    print("Done! Database is ready.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Create HOD users via the backend API using coordinator credentials.

Usage examples (Windows PowerShell / CMD / bash):

Single HOD
  python create_hods.py --username hod_cee --department CEE --password cee123 \
    --coord-user admin --coord-pass admin4321

Single HOD using coordinator password for HOD password
  python create_hods.py --username hod_mec --department MEC \
    --coord-user admin --coord-pass admin4321 --use-coordinator-password

Batch from CSV (columns: username,department,password)
  python create_hods.py --csv hods.csv --coord-user admin --coord-pass admin4321

CSV format (headers required):
  username,department,password
  hod_cee,CEE,cee123
  hod_mec,MEC,mec123

Notes:
- Role is always set to "hod" by this script.
- Coordinator credentials are required by the backend to authorize creation.
- Base URL defaults to http://localhost:8080/api; override with --base-url if needed.
"""

import argparse
import csv
import getpass
import sys
from typing import Optional

import requests


def create_hod(base_url: str, coord_user: str, coord_pass: str, username: str, department: str, password: str) -> bool:
    url = f"{base_url.rstrip('/')}/auth/users"
    payload = {
        "username": username.strip(),
        "password": password,
        "role": "hod",
        "department": department.strip().upper(),
    }
    try:
        resp = requests.post(url, json=payload, auth=(coord_user, coord_pass), timeout=15)
    except requests.RequestException as e:
        print(f"ERROR: request failed for {username}@{department}: {e}")
        return False

    if resp.status_code == 200:
        data = resp.json()
        print(f"OK: created HOD user '{data.get('username')}' for department '{data.get('department')}'")
        return True
    else:
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text
        print(f"FAIL: could not create '{username}' ({department}) - HTTP {resp.status_code} - {detail}")
        return False


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Create HOD users via backend API using coordinator credentials")
    p.add_argument("--base-url", default="http://localhost:8080/api", help="Backend API base URL (default: %(default)s)")

    # Coordinator auth
    p.add_argument("--coord-user", help="Coordinator username for authorization")
    p.add_argument("--coord-pass", help="Coordinator password for authorization (omit to prompt)")

    # Single HOD mode
    p.add_argument("--username", help="HOD username to create")
    p.add_argument("--department", help="HOD department code (e.g., CEE, MEC)")
    p.add_argument("--password", help="HOD password (omit to prompt unless --use-coordinator-password)")
    p.add_argument("--use-coordinator-password", action="store_true", help="Use coordinator password as the HOD password")

    # Batch mode
    p.add_argument("--csv", help="Path to CSV file with headers: username,department,password")

    return p.parse_args(argv)


def main() -> int:
    args = parse_args()

    # Coordinator credentials
    coord_user = args.coord_user or input("Coordinator username: ").strip()
    coord_pass = args.coord_pass or getpass.getpass("Coordinator password: ")

    if args.csv:
        # Batch mode: read CSV rows
        ok_all = True
        try:
            with open(args.csv, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                required = {"username", "department"}
                if not required.issubset(set(map(str.lower, reader.fieldnames or []))):
                    print("ERROR: CSV must include headers: username, department [password]")
                    return 2
                for i, row in enumerate(reader, start=2):
                    username = (row.get("username") or row.get("Username") or "").strip()
                    department = (row.get("department") or row.get("Department") or "").strip()
                    password = (row.get("password") or row.get("Password") or "").strip()
                    if not username or not department:
                        print(f"SKIP line {i}: missing username or department")
                        ok_all = False
                        continue
                    if args.use_coordinator_password:
                        password = coord_pass
                    elif not password:
                        # Prompt if no password supplied in CSV
                        prompt = f"Enter password for {username} ({department}): "
                        password = getpass.getpass(prompt)
                    ok = create_hod(args.base_url, coord_user, coord_pass, username, department, password)
                    ok_all = ok_all and ok
        except FileNotFoundError:
            print(f"ERROR: CSV not found: {args.csv}")
            return 2
        return 0 if ok_all else 1

    # Single mode
    if not args.username or not args.department:
        print("ERROR: provide --username and --department, or use --csv for batch mode")
        return 2

    if args.use_coordinator_password:
        hod_password = coord_pass
    else:
        hod_password = args.password or getpass.getpass(f"Password for {args.username} ({args.department}): ")

    ok = create_hod(args.base_url, coord_user, coord_pass, args.username, args.department, hod_password)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

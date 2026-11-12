from app.infrastructure.database.session import SessionLocal, seed_demo_users


def main() -> None:
    with SessionLocal() as db:
        users = seed_demo_users(db)
        print(f"Seeded/verified {len(users)} demo users.")


if __name__ == "__main__":
    main()


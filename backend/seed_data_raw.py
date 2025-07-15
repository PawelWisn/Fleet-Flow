import os
import random
from datetime import datetime, timedelta

import psycopg2
from psycopg2.extras import RealDictCursor
from users.utils import hash_password


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        database=os.getenv("POSTGRES_DB", "fleet_flow"),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", "password"),
    )


def clear_existing_data(conn):
    print("Clearing existing data...")

    with conn.cursor() as cur:
        tables = ["reservations", "insurrances", "events", "refuels", "comments", "documents", "vehicles"]
        for table in tables:
            cur.execute(f"DELETE FROM {table}")

        # Delete all users and companies
        cur.execute("DELETE FROM users")
        cur.execute("DELETE FROM companies")

        conn.commit()
    print("Existing data cleared.")


def seed_admin(conn):
    print("Creating admin user and company...")

    hashed_password = hash_password("FleetFlow1!")

    with conn.cursor() as cur:
        # Create admin company
        cur.execute(
            """
            INSERT INTO companies (name, description, phone, post_code, address1, address2, city, country, nip, is_internal)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
            ("FleetFlow Admin", "System administration company", "555-0000", "00000", "Admin Building", "", "System", "Global", "0000000000", True),
        )

        # Get admin company ID
        cur.execute("SELECT id FROM companies WHERE name = 'FleetFlow Admin'")
        admin_company_id = cur.fetchone()[0]

        # Create admin user
        cur.execute(
            """
            INSERT INTO users (email, name, role, company_id, password)
            VALUES (%s, %s, %s, %s, %s)
        """,
            ("admin@example.com", "System Administrator", "ADMIN", admin_company_id, hashed_password),
        )

        conn.commit()
    print("Admin user and company created.")


def seed_companies(conn):
    print("Creating companies...")

    companies_data = [
        ("Logistics Express Ltd", "Leading logistics and transportation company", "555-0101", "12345", "123 Industrial Blvd", "Suite 400", "New York", "USA", "1234567890", True),
        ("City Transport Co", "Urban transportation services", "555-0202", "54321", "456 Metro Ave", "", "Chicago", "USA", "0987654321", True),
        ("FastMove Delivery", "Express delivery services", "555-0303", "67890", "789 Speed Lane", "Building C", "Los Angeles", "USA", "1122334455", True),
        ("Metro Freight Solutions", "Metropolitan freight and cargo services", "555-0104", "13579", "456 Commerce Dr", "Floor 2", "Boston", "USA", "2468135790", True),
        ("Swift Cargo Systems", "Rapid cargo transportation network", "555-0205", "24680", "789 Logistics Blvd", "", "Seattle", "USA", "1357924680", True),
        ("Pacific Fleet Services", "West coast fleet management", "555-0306", "97531", "321 Harbor Ave", "Suite 100", "San Francisco", "USA", "9876543210", True),
        ("Shell Gas Station", "External fuel supplier", "555-0404", "11111", "321 Highway 1", "", "Houston", "USA", "5566778899", False),
        ("AutoService Pro", "Vehicle maintenance and repair", "555-0505", "22222", "654 Mechanic St", "", "Detroit", "USA", "9988776655", False),
        ("BP Fuel Center", "Premium fuel and services", "555-0606", "33333", "987 Energy Blvd", "", "Dallas", "USA", "1122334455", False),
        ("QuickFix Garage", "Fast vehicle repair and maintenance", "555-0707", "44444", "147 Repair Ave", "Unit 5", "Phoenix", "USA", "5544332211", False),
    ]

    with conn.cursor() as cur:
        for company in companies_data:
            cur.execute(
                """
                INSERT INTO companies (name, description, phone, post_code, address1, address2, city, country, nip, is_internal)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
                company,
            )
        conn.commit()
    print("Companies created.")


def seed_users(conn):
    print("Creating users...")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id, name FROM companies ORDER BY id")
        companies = {row["name"]: row["id"] for row in cur.fetchall()}

    users_data = [
        ("john.manager@logistics.com", "John Manager", "MANAGER", companies.get("Logistics Express Ltd", 1)),
        ("sarah.driver@logistics.com", "Sarah Driver", "WORKER", companies.get("Logistics Express Ltd", 1)),
        ("mike.transport@citytrans.com", "Mike Transport", "MANAGER", companies.get("City Transport Co", 2)),
        ("lisa.operator@citytrans.com", "Lisa Operator", "WORKER", companies.get("City Transport Co", 2)),
        ("tom.delivery@fastmove.com", "Tom Delivery", "WORKER", companies.get("FastMove Delivery", 3)),
        ("anna.courier@fastmove.com", "Anna Courier", "WORKER", companies.get("FastMove Delivery", 3)),
        ("david.supervisor@logistics.com", "David Supervisor", "MANAGER", companies.get("Logistics Express Ltd", 1)),
        ("emma.fleet@metro.com", "Emma Fleet", "MANAGER", companies.get("Metro Freight Solutions", 4)),
        ("james.driver@metro.com", "James Driver", "WORKER", companies.get("Metro Freight Solutions", 4)),
        ("sophia.ops@swift.com", "Sophia Operations", "MANAGER", companies.get("Swift Cargo Systems", 5)),
        ("william.courier@swift.com", "William Courier", "WORKER", companies.get("Swift Cargo Systems", 5)),
        ("olivia.manager@pacific.com", "Olivia Manager", "MANAGER", companies.get("Pacific Fleet Services", 6)),
        ("noah.driver@pacific.com", "Noah Driver", "WORKER", companies.get("Pacific Fleet Services", 6)),
        ("ava.dispatcher@logistics.com", "Ava Dispatcher", "WORKER", companies.get("Logistics Express Ltd", 1)),
    ]

    hashed_password = hash_password("FleetFlow1!")

    with conn.cursor() as cur:
        for email, name, role, company_id in users_data:
            cur.execute(
                """
                INSERT INTO users (email, name, role, company_id, password)
                VALUES (%s, %s, %s, %s, %s)
            """,
                (email, name, role, company_id, hashed_password),
            )
        conn.commit()
    print("Users created.")


def seed_vehicles(conn):
    print("Creating vehicles...")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id, name FROM companies WHERE is_internal = true ORDER BY id")
        companies = cur.fetchall()

    vehicles_data = [
        ("FL001", "1HGBH41JXMN109186", 3500, "ABC-123", "Ford", "Transit", 2020, 45000, "MANUAL", "AVAILABLE", "ALLSEASON", companies[0]["id"]),
        ("FL002", "2HGBH41JXMN109187", 7500, "DEF-456", "Mercedes", "Sprinter", 2019, 62000, "AUTO", "INUSE", "ALLSEASON", companies[0]["id"]),
        ("FL003", "7HGBH41JXMN109192", 4000, "STU-901", "Iveco", "Daily", 2021, 32000, "MANUAL", "AVAILABLE", "WINTER", companies[0]["id"]),
        ("CT001", "3HGBH41JXMN109188", 2500, "GHI-789", "Volkswagen", "Crafter", 2021, 28000, "MANUAL", "AVAILABLE", "SUMMER", companies[1]["id"]),
        ("CT002", "4HGBH41JXMN109189", 12000, "JKL-012", "Volvo", "FH16", 2018, 95000, "AUTO", "SERVICE", "ALLSEASON", companies[1]["id"]),
        ("CT003", "8HGBH41JXMN109193", 8000, "VWX-234", "Scania", "R450", 2020, 78000, "AUTO", "AVAILABLE", "ALLSEASON", companies[1]["id"]),
        ("FM001", "5HGBH41JXMN109190", 2000, "MNO-345", "Nissan", "NV200", 2022, 15000, "MANUAL", "AVAILABLE", "ALLSEASON", companies[2]["id"]),
        ("FM002", "6HGBH41JXMN109191", 3000, "PQR-678", "Fiat", "Ducato", 2020, 38000, "MANUAL", "BOOKED", "WINTER", companies[2]["id"]),
        ("MF001", "9HGBH41JXMN109194", 5500, "YZA-567", "MAN", "TGX", 2019, 85000, "AUTO", "INUSE", "ALLSEASON", companies[3]["id"]),
        ("MF002", "AHGBH41JXMN109195", 3200, "BCD-890", "Renault", "Master", 2021, 25000, "MANUAL", "AVAILABLE", "SUMMER", companies[3]["id"]),
        ("SC001", "BHGBH41JXMN109196", 6000, "EFG-123", "DAF", "CF", 2020, 67000, "AUTO", "SERVICE", "ALLSEASON", companies[4]["id"]),
        ("PF001", "CHGBH41JXMN109197", 4500, "HIJ-456", "Mitsubishi", "Fuso Canter", 2022, 18000, "MANUAL", "AVAILABLE", "WINTER", companies[5]["id"]),
    ]

    with conn.cursor() as cur:
        for vehicle_data in vehicles_data:
            cur.execute(
                """
                INSERT INTO vehicles (id_number, vin, weight, registration_number, brand, model, production_year,
                                    kilometrage, gearbox_type, availability, tire_type, company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
                vehicle_data,
            )
        conn.commit()
    print("Vehicles created.")


def seed_documents(conn):
    print("Creating documents...")

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM vehicles LIMIT 12")
        vehicles = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT id FROM users WHERE email != 'admin@example.com' LIMIT 12")
        users = [row[0] for row in cur.fetchall()]

    documents_data = [
        ("Vehicle Registration Certificate - ABC-123", "Official registration document for Ford Transit", "pdf", vehicles[0] if vehicles else 1, users[0] if users else 1),
        (
            "Insurance Policy - DEF-456",
            "Comprehensive insurance policy for Mercedes Sprinter",
            "pdf",
            vehicles[1] if len(vehicles) > 1 else vehicles[0],
            users[1] if len(users) > 1 else users[0],
        ),
        (
            "Maintenance Manual - Fleet Vehicles",
            "Standard maintenance procedures for all fleet vehicles",
            "pdf",
            vehicles[2] if len(vehicles) > 2 else vehicles[0],
            users[2] if len(users) > 2 else users[0],
        ),
        ("Fuel Receipt - Shell Station", "Fuel purchase receipt template", "jpg", vehicles[3] if len(vehicles) > 3 else vehicles[0], users[3] if len(users) > 3 else users[0]),
        (
            "Driver License Verification",
            "Driver license verification checklist",
            "pdf",
            vehicles[4] if len(vehicles) > 4 else vehicles[0],
            users[4] if len(users) > 4 else users[0],
        ),
        (
            "Safety Inspection Report",
            "Monthly safety inspection report template",
            "pdf",
            vehicles[5] if len(vehicles) > 5 else vehicles[0],
            users[5] if len(users) > 5 else users[0],
        ),
        (
            "Vehicle Registration Certificate - STU-901",
            "Official registration document for Iveco Daily",
            "pdf",
            vehicles[6] if len(vehicles) > 6 else vehicles[0],
            users[6] if len(users) > 6 else users[0],
        ),
        (
            "Maintenance Record - GHI-789",
            "Service history for Volkswagen Crafter",
            "pdf",
            vehicles[7] if len(vehicles) > 7 else vehicles[0],
            users[7] if len(users) > 7 else users[0],
        ),
        (
            "Insurance Certificate - VWX-234",
            "Coverage document for Scania R450",
            "pdf",
            vehicles[8] if len(vehicles) > 8 else vehicles[0],
            users[8] if len(users) > 8 else users[0],
        ),
        (
            "Driver Training Certificate",
            "Professional driver certification document",
            "pdf",
            vehicles[9] if len(vehicles) > 9 else vehicles[0],
            users[9] if len(users) > 9 else users[0],
        ),
        (
            "Fleet Safety Manual",
            "Comprehensive safety guidelines for fleet operations",
            "pdf",
            vehicles[10] if len(vehicles) > 10 else vehicles[0],
            users[10] if len(users) > 10 else users[0],
        ),
        ("Fuel Purchase Agreement", "Contract with fuel supplier", "pdf", vehicles[11] if len(vehicles) > 11 else vehicles[0], users[11] if len(users) > 11 else users[0]),
    ]

    with conn.cursor() as cur:
        for title, description, file_type, vehicle_id, user_id in documents_data:
            cur.execute(
                """
                INSERT INTO documents (title, description, file_type, vehicle_id, user_id, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
                (title, description, file_type, vehicle_id, user_id, datetime.now(), datetime.now()),
            )
        conn.commit()
    print("Documents created.")


def seed_refuels(conn):
    print("Creating refuel records...")

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM vehicles")
        vehicles = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT id FROM users WHERE email != 'admin@example.com'")
        users = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT id FROM documents")
        documents = [row[0] for row in cur.fetchall()]

    gas_stations = ["Shell Highway Station", "BP Downtown", "Exxon Industrial Park", "Chevron City Center", "Mobil Express", "Sunoco Main Street"]

    start_date = datetime.now() - timedelta(days=90)

    with conn.cursor() as cur:
        for i in range(100):
            refuel_date = start_date + timedelta(days=random.randint(0, 90))
            fuel_amount = round(random.uniform(30.0, 120.0), 2)
            price = round(random.uniform(80.0, 300.0), 2)
            kilometrage = random.randint(15000, 100000)
            gas_station = random.choice(gas_stations)
            vehicle_id = random.choice(vehicles)
            document_id = random.choice(documents)
            user_id = random.choice(users)

            cur.execute(
                """
                INSERT INTO refuels (date, fuel_amount, price, kilometrage_during_refuel, gas_station, vehicle_id, document_id, user_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
                (refuel_date, fuel_amount, price, kilometrage, gas_station, vehicle_id, document_id, user_id),
            )

        conn.commit()
    print("Refuel records created.")


def seed_events(conn):
    print("Creating events...")

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM vehicles LIMIT 10")
        vehicles = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT id FROM documents LIMIT 10")
        documents = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT id FROM companies WHERE is_internal = false LIMIT 1")
        companies_result = cur.fetchall()
        companies = [row[0] for row in companies_result] if companies_result else [1]

    events_data = [
        ("Oil Change", "Regular oil change and filter replacement", datetime.now() - timedelta(days=15), "maintenance", 150.00),
        ("Annual Safety Inspection", "Mandatory annual safety inspection", datetime.now() - timedelta(days=30), "inspection", 250.00),
        ("Brake Pad Replacement", "Front brake pads worn out, replacement needed", datetime.now() - timedelta(days=45), "repair", 320.00),
        ("Tire Rotation", "Routine tire rotation for even wear", datetime.now() - timedelta(days=60), "maintenance", 80.00),
        ("Engine Diagnostic", "Check engine light diagnostic and repair", datetime.now() - timedelta(days=20), "repair", 180.00),
        ("Transmission Service", "Transmission fluid change and inspection", datetime.now() - timedelta(days=75), "maintenance", 220.00),
        ("Air Filter Replacement", "Engine air filter replacement", datetime.now() - timedelta(days=25), "maintenance", 45.00),
        ("Windshield Repair", "Windshield chip repair", datetime.now() - timedelta(days=10), "repair", 120.00),
        ("Battery Replacement", "Vehicle battery replacement", datetime.now() - timedelta(days=35), "repair", 180.00),
        ("Fuel System Cleaning", "Complete fuel system cleaning service", datetime.now() - timedelta(days=50), "maintenance", 95.00),
    ]

    with conn.cursor() as cur:
        for i, (title, description, date, event_type, price) in enumerate(events_data):
            vehicle_id = vehicles[i % len(vehicles)]
            document_id = documents[i % len(documents)]
            company_id = companies[0]

            cur.execute(
                """
                INSERT INTO events (event_type, description, date, price, vehicle_id, document_id, company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
                (event_type, description, date, price, vehicle_id, document_id, company_id),
            )

        conn.commit()
    print("Events created.")


def seed_insurances(conn):
    print("Creating insurance records...")

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM vehicles LIMIT 6")
        vehicles = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT id FROM documents LIMIT 6")
        documents = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT id FROM companies WHERE is_internal = true LIMIT 6")
        companies = [row[0] for row in cur.fetchall()]

    insurances_data = [
        (
            "POL-2024-001",
            "State Farm Insurance",
            "Comprehensive insurance coverage for Ford Transit",
            datetime.now() - timedelta(days=180),
            datetime.now() + timedelta(days=185),
            1200.00,
            "OCAC",
        ),
        (
            "POL-2024-002",
            "Allstate Insurance",
            "Full coverage insurance for Mercedes Sprinter",
            datetime.now() - timedelta(days=90),
            datetime.now() + timedelta(days=275),
            1500.00,
            "OCAC",
        ),
        (
            "POL-2024-003",
            "Progressive Insurance",
            "Basic liability coverage for Volkswagen Crafter",
            datetime.now() - timedelta(days=60),
            datetime.now() + timedelta(days=305),
            950.00,
            "OC",
        ),
        ("POL-2024-004", "GEICO Insurance", "Full coverage for Iveco Daily", datetime.now() - timedelta(days=120), datetime.now() + timedelta(days=245), 1350.00, "OCAC"),
        ("POL-2024-005", "Liberty Mutual", "Commercial coverage for Volvo FH16", datetime.now() - timedelta(days=200), datetime.now() + timedelta(days=165), 1800.00, "OCAC"),
        ("POL-2024-006", "Farmers Insurance", "Liability coverage for Scania R450", datetime.now() - timedelta(days=45), datetime.now() + timedelta(days=320), 1100.00, "OC"),
    ]

    with conn.cursor() as cur:
        for i, (policy_num, provider, description, start_date, end_date, premium, coverage) in enumerate(insurances_data):
            vehicle_id = vehicles[i]
            document_id = documents[i]
            company_id = companies[i]

            cur.execute(
                """
                INSERT INTO insurrances (policy_number, insurer, description, date_from, date_to, price, insurrance_type, vehicle_id, document_id, company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
                (policy_num, provider, description, start_date, end_date, premium, coverage, vehicle_id, document_id, company_id),
            )

        conn.commit()
    print("Insurance records created.")


def seed_reservations(conn):
    print("Creating reservations...")

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM vehicles WHERE availability = 'AVAILABLE' LIMIT 4")
        vehicles_result = cur.fetchall()

        if len(vehicles_result) < 4:
            cur.execute("SELECT id FROM vehicles LIMIT 4")
            vehicles_result = cur.fetchall()

        vehicles = [row[0] for row in vehicles_result]

        cur.execute("SELECT id FROM users WHERE email != 'admin@example.com' LIMIT 4")
        users = [row[0] for row in cur.fetchall()]

    reservations_data = [
        (datetime.now() + timedelta(days=1), datetime.now() + timedelta(days=3)),
        (datetime.now() + timedelta(days=5), datetime.now() + timedelta(days=7)),
        (datetime.now() + timedelta(days=10), datetime.now() + timedelta(days=12)),
        (datetime.now() + timedelta(days=15), datetime.now() + timedelta(days=17)),
        (datetime.now() + timedelta(days=20), datetime.now() + timedelta(days=22)),
        (datetime.now() + timedelta(days=25), datetime.now() + timedelta(days=27)),
        (datetime.now() + timedelta(days=30), datetime.now() + timedelta(days=32)),
        (datetime.now() + timedelta(days=35), datetime.now() + timedelta(days=37)),
    ]

    with conn.cursor() as cur:
        for i, (date_from, date_to) in enumerate(reservations_data):
            vehicle_id = vehicles[i % len(vehicles)]
            user_id = users[i % len(users)]
            reservation_date = datetime.now() - timedelta(days=random.randint(1, 7))

            cur.execute(
                """
                INSERT INTO reservations (date_from, date_to, reservation_date, vehicle_id, user_id)
                VALUES (%s, %s, %s, %s, %s)
            """,
                (date_from, date_to, reservation_date, vehicle_id, user_id),
            )

        conn.commit()
    print("Reservations created.")


def main():
    print("Starting database seeding...")
    print("=" * 50)

    try:
        conn = get_db_connection()

        clear_existing_data(conn)
        seed_admin(conn)
        seed_companies(conn)
        seed_users(conn)
        seed_vehicles(conn)
        seed_documents(conn)
        seed_refuels(conn)
        seed_events(conn)
        seed_insurances(conn)
        seed_reservations(conn)

        conn.close()

        print("=" * 50)
        print("Database seeding completed successfully!")
        print("\nSample login credentials:")
        print("Manager: john.manager@logistics.com / FleetFlow1!")
        print("Worker: sarah.driver@logistics.com / FleetFlow1!")
        print("Admin: admin@example.com / FleetFlow1!")

    except Exception as e:
        print(f"Error during seeding: {e}")
        if "conn" in locals():
            conn.rollback()
            conn.close()
        raise


if __name__ == "__main__":
    main()

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

        cur.execute("DELETE FROM users")
        cur.execute("DELETE FROM companies")

        conn.commit()
    print("Existing data cleared.")


def seed_admin(conn):
    print("Creating admin user and company...")

    hashed_password = hash_password("FleetFlow1!")

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO companies (name, description, phone, post_code, address1, address2, city, country, nip, is_internal)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
            ("FleetFlow Admin", "System administration company", "555-0000", "00000", "Admin Building", "", "System", "Global", "0000000000", True),
        )

        cur.execute("SELECT id FROM companies WHERE name = 'FleetFlow Admin'")
        admin_company_id = cur.fetchone()[0]

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

    base_companies = [
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

    additional_companies = [
        ("National Transport Solutions", "Nationwide transportation network", "555-0808", "55555", "258 National Hwy", "", "Denver", "USA", "6677889900", True),
        ("Regional Freight Hub", "Regional cargo distribution center", "555-0909", "66666", "369 Distribution Dr", "Warehouse A", "Atlanta", "USA", "7788990011", True),
        ("Urban Delivery Express", "City-wide delivery services", "555-1010", "77777", "147 Urban Ave", "", "Miami", "USA", "8899001122", True),
        ("Interstate Logistics", "Cross-state transportation", "555-1111", "88888", "852 Interstate Blvd", "Suite 200", "Portland", "USA", "9900112233", True),
        ("Continental Cargo", "Continental shipping solutions", "555-1212", "99999", "741 Continental Way", "", "Las Vegas", "USA", "0011223344", True),
        ("Global Fleet Management", "International fleet services", "555-1313", "10101", "963 Global Plaza", "Floor 15", "Minneapolis", "USA", "1122334456", True),
        ("Express Transit Corp", "Rapid transit solutions", "555-1414", "11111", "159 Express Lane", "", "Tampa", "USA", "2233445567", True),
        ("Nationwide Shipping", "Coast-to-coast shipping", "555-1515", "12121", "357 Shipping Blvd", "Building B", "Kansas City", "USA", "3344556678", True),
        ("Prime Logistics Group", "Premium logistics services", "555-1616", "13131", "468 Prime Ave", "", "Nashville", "USA", "4455667789", True),
        ("Advanced Transport Co", "Advanced transportation technology", "555-1717", "14141", "579 Tech Drive", "Suite 300", "Austin", "USA", "5566778890", True),
        ("Elite Delivery Services", "High-end delivery solutions", "555-1818", "15151", "680 Elite Way", "", "Charlotte", "USA", "6677889901", True),
        ("Superior Freight Lines", "Superior cargo handling", "555-1919", "16161", "791 Superior St", "Floor 5", "Columbus", "USA", "7788990012", True),
        ("Premier Transport Hub", "Premier transportation center", "555-2020", "17171", "802 Premier Blvd", "", "Indianapolis", "USA", "8899001123", True),
        ("Excellence Logistics", "Excellence in transportation", "555-2121", "18181", "913 Excellence Ave", "Suite 150", "Memphis", "USA", "9900112234", True),
        ("Pinnacle Fleet Solutions", "Peak performance fleet management", "555-2222", "19191", "024 Pinnacle Dr", "", "Baltimore", "USA", "0011223345", True),
        ("Valero Fuel Station", "Comprehensive fuel services", "555-2323", "20202", "135 Fuel Depot Rd", "", "San Antonio", "USA", "1123344556", False),
        ("MegaTech Auto Repair", "Advanced automotive repairs", "555-2424", "21212", "246 Tech Repair Ave", "Bay 3", "Oklahoma City", "USA", "2234455667", False),
        ("Total Energy Solutions", "Complete energy services", "555-2525", "22222", "357 Energy Circle", "", "Virginia Beach", "USA", "3345566778", False),
        ("ProFix Vehicle Services", "Professional vehicle maintenance", "555-2626", "23232", "468 Service Lane", "Unit 12", "Louisville", "USA", "4456677889", False),
        ("MaxFuel Distribution", "Maximum fuel distribution network", "555-2727", "24242", "579 Distribution Way", "", "Albuquerque", "USA", "5567788990", False),
    ]

    all_companies = base_companies + additional_companies

    with conn.cursor() as cur:
        for company in all_companies:
            cur.execute(
                """
                INSERT INTO companies (name, description, phone, post_code, address1, address2, city, country, nip, is_internal)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
                company,
            )
        conn.commit()
    print(f"Created {len(all_companies)} companies.")


def seed_users(conn):
    print("Creating users...")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id, name FROM companies ORDER BY id")
        companies = {row["name"]: row["id"] for row in cur.fetchall()}

    base_users = [
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

    additional_users = [
        ("carlos.rodriguez@national.com", "Carlos Rodriguez", "MANAGER", companies.get("National Transport Solutions", 7)),
        ("maria.gonzalez@national.com", "Maria Gonzalez", "WORKER", companies.get("National Transport Solutions", 7)),
        ("robert.johnson@regional.com", "Robert Johnson", "MANAGER", companies.get("Regional Freight Hub", 8)),
        ("jennifer.williams@regional.com", "Jennifer Williams", "WORKER", companies.get("Regional Freight Hub", 8)),
        ("michael.brown@urban.com", "Michael Brown", "WORKER", companies.get("Urban Delivery Express", 9)),
        ("jessica.davis@urban.com", "Jessica Davis", "WORKER", companies.get("Urban Delivery Express", 9)),
        ("christopher.miller@interstate.com", "Christopher Miller", "MANAGER", companies.get("Interstate Logistics", 10)),
        ("amanda.wilson@interstate.com", "Amanda Wilson", "WORKER", companies.get("Interstate Logistics", 10)),
        ("daniel.moore@continental.com", "Daniel Moore", "MANAGER", companies.get("Continental Cargo", 11)),
        ("ashley.taylor@continental.com", "Ashley Taylor", "WORKER", companies.get("Continental Cargo", 11)),
        ("matthew.anderson@global.com", "Matthew Anderson", "MANAGER", companies.get("Global Fleet Management", 12)),
        ("sarah.thomas@global.com", "Sarah Thomas", "WORKER", companies.get("Global Fleet Management", 12)),
        ("joshua.jackson@express.com", "Joshua Jackson", "WORKER", companies.get("Express Transit Corp", 13)),
        ("stephanie.white@express.com", "Stephanie White", "WORKER", companies.get("Express Transit Corp", 13)),
        ("anthony.harris@nationwide.com", "Anthony Harris", "MANAGER", companies.get("Nationwide Shipping", 14)),
        ("kimberly.martin@nationwide.com", "Kimberly Martin", "WORKER", companies.get("Nationwide Shipping", 14)),
        ("mark.thompson@prime.com", "Mark Thompson", "MANAGER", companies.get("Prime Logistics Group", 15)),
        ("michelle.garcia@prime.com", "Michelle Garcia", "WORKER", companies.get("Prime Logistics Group", 15)),
        ("paul.martinez@advanced.com", "Paul Martinez", "WORKER", companies.get("Advanced Transport Co", 16)),
        ("laura.robinson@advanced.com", "Laura Robinson", "WORKER", companies.get("Advanced Transport Co", 16)),
        ("steven.clark@elite.com", "Steven Clark", "MANAGER", companies.get("Elite Delivery Services", 17)),
        ("melissa.rodriguez@elite.com", "Melissa Rodriguez", "WORKER", companies.get("Elite Delivery Services", 17)),
        ("andrew.lewis@superior.com", "Andrew Lewis", "MANAGER", companies.get("Superior Freight Lines", 18)),
        ("deborah.lee@superior.com", "Deborah Lee", "WORKER", companies.get("Superior Freight Lines", 18)),
        ("kenneth.walker@premier.com", "Kenneth Walker", "WORKER", companies.get("Premier Transport Hub", 19)),
        ("lisa.hall@premier.com", "Lisa Hall", "WORKER", companies.get("Premier Transport Hub", 19)),
        ("brian.allen@excellence.com", "Brian Allen", "MANAGER", companies.get("Excellence Logistics", 20)),
        ("sandra.young@excellence.com", "Sandra Young", "WORKER", companies.get("Excellence Logistics", 20)),
        ("gary.hernandez@pinnacle.com", "Gary Hernandez", "MANAGER", companies.get("Pinnacle Fleet Solutions", 21)),
        ("donna.king@pinnacle.com", "Donna King", "WORKER", companies.get("Pinnacle Fleet Solutions", 21)),
        ("ronald.wright@logistics.com", "Ronald Wright", "WORKER", companies.get("Logistics Express Ltd", 1)),
        ("betty.lopez@citytrans.com", "Betty Lopez", "WORKER", companies.get("City Transport Co", 2)),
        ("jerry.hill@fastmove.com", "Jerry Hill", "WORKER", companies.get("FastMove Delivery", 3)),
        ("helen.scott@metro.com", "Helen Scott", "WORKER", companies.get("Metro Freight Solutions", 4)),
        ("wayne.green@swift.com", "Wayne Green", "WORKER", companies.get("Swift Cargo Systems", 5)),
        ("maria.adams@pacific.com", "Maria Adams", "WORKER", companies.get("Pacific Fleet Services", 6)),
    ]

    all_users = base_users + additional_users
    hashed_password = hash_password("FleetFlow1!")

    with conn.cursor() as cur:
        for email, name, role, company_id in all_users:
            cur.execute(
                """
                INSERT INTO users (email, name, role, company_id, password)
                VALUES (%s, %s, %s, %s, %s)
            """,
                (email, name, role, company_id, hashed_password),
            )
        conn.commit()
    print(f"Created {len(all_users)} users.")


def seed_vehicles(conn):
    print("Creating vehicles...")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id, name FROM companies WHERE is_internal = true ORDER BY id")
        companies = cur.fetchall()

    base_vehicles = [
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

    brands = ["Ford", "Mercedes", "Volvo", "Scania", "MAN", "DAF", "Iveco", "Renault", "Volkswagen", "Fiat", "Nissan", "Mitsubishi", "Isuzu", "Peugeot", "Citroen"]
    models = ["Transit", "Sprinter", "FH16", "R450", "TGX", "CF", "Daily", "Master", "Crafter", "Ducato", "NV200", "Canter", "NPR", "Boxer", "Jumper"]
    gearbox_types = ["MANUAL", "AUTO"]
    availability_states = ["AVAILABLE", "INUSE", "BOOKED", "SERVICE", "DECOMMISSIONED"]
    tire_types = ["ALLSEASON", "WINTER", "SUMMER"]

    additional_vehicles = []
    for status in availability_states:
        for i in range(20):
            company = companies[random.randint(0, len(companies) - 1)]
            vehicle_num = len(additional_vehicles) + 100
            id_number = f"VH{vehicle_num:03d}"
            vin = f"{random.randint(1, 9)}HGBH41JXMN{random.randint(100000, 999999)}"
            weight = random.randint(2000, 15000)
            registration = f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=3))}-{random.randint(100, 999)}"
            brand = random.choice(brands)
            model = random.choice(models)
            year = random.randint(2018, 2023)
            kilometrage = random.randint(5000, 120000)
            gearbox = random.choice(gearbox_types)
            tire_type = random.choice(tire_types)

            additional_vehicles.append((id_number, vin, weight, registration, brand, model, year, kilometrage, gearbox, status, tire_type, company["id"]))

    all_vehicles = base_vehicles + additional_vehicles

    with conn.cursor() as cur:
        for vehicle_data in all_vehicles:
            cur.execute(
                """
                INSERT INTO vehicles (id_number, vin, weight, registration_number, brand, model, production_year,
                                    kilometrage, gearbox_type, availability, tire_type, company_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
                vehicle_data,
            )
        conn.commit()
    print(f"Created {len(all_vehicles)} vehicles with 20+ vehicles per status.")


def seed_documents(conn):
    print("Creating documents...")

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM vehicles")
        vehicles = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT id FROM users WHERE email != 'admin@example.com'")
        users = [row[0] for row in cur.fetchall()]

    base_documents = [
        ("Vehicle Registration Certificate - ABC-123", "Official registration document for Ford Transit", "pdf"),
        ("Insurance Policy - DEF-456", "Comprehensive insurance policy for Mercedes Sprinter", "pdf"),
        ("Maintenance Manual - Fleet Vehicles", "Standard maintenance procedures for all fleet vehicles", "pdf"),
        ("Fuel Receipt - Shell Station", "Fuel purchase receipt template", "jpg"),
        ("Driver License Verification", "Driver license verification checklist", "pdf"),
        ("Safety Inspection Report", "Monthly safety inspection report template", "pdf"),
        ("Vehicle Registration Certificate - STU-901", "Official registration document for Iveco Daily", "pdf"),
        ("Maintenance Record - GHI-789", "Service history for Volkswagen Crafter", "pdf"),
        ("Insurance Certificate - VWX-234", "Coverage document for Scania R450", "pdf"),
        ("Driver Training Certificate", "Professional driver certification document", "pdf"),
        ("Fleet Safety Manual", "Comprehensive safety guidelines for fleet operations", "pdf"),
        ("Fuel Purchase Agreement", "Contract with fuel supplier", "pdf"),
    ]

    document_types = [
        ("Vehicle Inspection Report", "Annual vehicle inspection certificate", "pdf"),
        ("Insurance Claim Form", "Insurance claim documentation", "pdf"),
        ("Maintenance Service Record", "Regular maintenance service documentation", "pdf"),
        ("Driver Medical Certificate", "Driver medical fitness certificate", "pdf"),
        ("Vehicle Purchase Agreement", "Vehicle purchase contract", "pdf"),
        ("Fuel Card Authorization", "Fuel card usage authorization", "pdf"),
        ("GPS Tracking Report", "Vehicle GPS tracking analysis", "pdf"),
        ("Accident Report Form", "Vehicle accident documentation", "pdf"),
        ("Emission Test Certificate", "Vehicle emission test results", "pdf"),
        ("Vehicle Lease Agreement", "Commercial vehicle lease contract", "pdf"),
        ("Driver Performance Review", "Driver performance evaluation", "pdf"),
        ("Vehicle Warranty Document", "Manufacturer warranty information", "pdf"),
        ("Compliance Certificate", "Regulatory compliance documentation", "pdf"),
        ("Route Optimization Report", "Delivery route analysis", "pdf"),
        ("Fuel Efficiency Report", "Vehicle fuel consumption analysis", "pdf"),
    ]

    additional_documents = []
    for i in range(25):
        doc_type = document_types[i % len(document_types)]
        title = f"{doc_type[0]} #{i+100:03d}"
        description = f"{doc_type[1]} - Generated document #{i+100}"
        file_type = doc_type[2]
        additional_documents.append((title, description, file_type))

    all_documents = base_documents + additional_documents

    with conn.cursor() as cur:
        for i, (title, description, file_type) in enumerate(all_documents):
            vehicle_id = vehicles[i % len(vehicles)] if vehicles else 1
            user_id = users[i % len(users)] if users else 1

            cur.execute(
                """
                INSERT INTO documents (title, description, file_type, vehicle_id, user_id, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
                (title, description, file_type, vehicle_id, user_id, datetime.now(), datetime.now()),
            )
        conn.commit()
    print(f"Created {len(all_documents)} documents.")


def seed_refuels(conn):
    print("Creating refuel records...")

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM vehicles")
        vehicles = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT id FROM users WHERE email != 'admin@example.com'")
        users = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT id FROM documents")
        documents = [row[0] for row in cur.fetchall()]

    gas_stations = [
        "Shell Highway Station",
        "BP Downtown",
        "Exxon Industrial Park",
        "Chevron City Center",
        "Mobil Express",
        "Sunoco Main Street",
        "Valero Fuel Depot",
        "Marathon Gas Station",
        "Citgo Truck Stop",
        "Phillips 66 Center",
        "Speedway Fuel",
        "Casey's General Store",
        "Circle K Express",
        "7-Eleven Fuel",
        "Wawa Gas Station",
        "QuikTrip Fuel Center",
    ]

    start_date = datetime.now() - timedelta(days=180)

    with conn.cursor() as cur:
        for i in range(250):
            refuel_date = start_date + timedelta(days=random.randint(0, 180))
            fuel_amount = round(random.uniform(25.0, 150.0), 2)
            price = round(random.uniform(75.0, 400.0), 2)
            kilometrage = random.randint(10000, 150000)
            gas_station = random.choice(gas_stations)
            vehicle_id = random.choice(vehicles)
            document_id = random.choice(documents) if documents else None
            user_id = random.choice(users)

            cur.execute(
                """
                INSERT INTO refuels (date, fuel_amount, price, kilometrage_during_refuel, gas_station, vehicle_id, document_id, user_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
                (refuel_date, fuel_amount, price, kilometrage, gas_station, vehicle_id, document_id, user_id),
            )

        conn.commit()
    print("Created 250 refuel records.")


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

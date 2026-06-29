import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import domain as models

def seed_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    if db.query(models.User).first():
        print("Database already seeded.")
        return

    # --- Users (web_users) ---
    owner = models.User(email="jenna@outdoorhounds.com", name="Jenna Petersen", is_owner=True)
    db.add(owner)

    # --- Catalogue items ---
    hike = models.CatalogueItem(
        item_type="hike",
        name="Saturday Morning Pack Hike",
        description="A 2-hour guided hike through the hills with the Outdoor Hounds pack.",
        price="$40",
        status="approved",
        image_url="/media/hike1.jpg",
    )
    db.add(hike)

    pet = models.CatalogueItem(
        item_type="pet",
        name="Max",
        description="Friendly 3-year-old Golden Retriever mix looking for a forever home.",
        status="approved",
        image_url="/media/max.jpg",
    )
    db.add(pet)

    zoo = models.CatalogueItem(
        item_type="petting_zoo_booking",
        name="Happy Hooves Mini Petting Zoo",
        description="Bring the farm to your backyard! A gentle mini petting zoo experience for kids and families.",
        price="From $250",
        status="approved",
        listing_meta={
            "animals_included": "Guinea pigs, rabbits, mini goats, ducks",
            "booking_duration": "2 hours",
            "available_dates": "Weekends and school holidays",
            "service_area": "Within 30 km of Melbourne CBD",
            "max_guests": 40,
            "suitable_ages": "All ages",
            "indoor_outdoor": "Outdoor preferred, indoor possible",
            "safety_notes": "All animals are vaccinated and handled by trained staff",
            "insurance_notes": "Host to confirm insurance before accepting bookings",
            "contact": "happyhooves@example.com",
        },
    )
    db.add(zoo)

    db.flush()  # get IDs before creating profiles

    # --- Demo profiles (linked to mobile users table by user_id convention) ---
    # These seed rows use placeholder user_ids (1-4) matching what pnpm db:seed
    # would create in the mobile users table. Adjust if your IDs differ.
    profiles = [
        models.Profile(
            user_id=1,
            display_name="Alex Chen",
            profile_type="individual",
            location="Melbourne, VIC",
            contact_email="alex@example.com",
            preferred_modes_json=["adopt_or_foster", "pet_services", "pet_events"],
            profile_meta_json={},
        ),
        models.Profile(
            user_id=2,
            display_name="Outdoor Hounds Rescue",
            profile_type="rescue_group",
            location="Geelong, VIC",
            contact_email="rescue@outdoorhounds.com",
            contact_phone="03 5555 0100",
            bio="A volunteer-run rescue group rehoming dogs and cats across regional Victoria.",
            preferred_modes_json=["adopt_or_foster", "lost_and_found"],
            profile_meta_json={
                "organisation_name": "Outdoor Hounds Rescue",
                "species_supported": ["dogs", "cats"],
                "adoption_process": "Enquiry, meet-and-greet, application review",
            },
        ),
        models.Profile(
            user_id=3,
            display_name="Happy Hooves Mini Petting Zoo",
            profile_type="petting_zoo_provider",
            location="Werribee, VIC",
            contact_email="happyhooves@example.com",
            contact_phone="0412 000 111",
            bio="Mobile mini petting zoo for birthdays, school events, and community days.",
            preferred_modes_json=["mini_petting_zoo_bookings", "pet_events"],
            profile_meta_json={
                "business_name": "Happy Hooves Mini Petting Zoo",
                "animals": ["guinea pigs", "rabbits", "mini goats"],
                "service_area": "Within 25 km of Werribee",
                "insurance_notes": "Host to confirm insurance before accepting bookings",
            },
        ),
        models.Profile(
            user_id=4,
            display_name="Paws & Petals Market Stall",
            profile_type="stall_holder",
            location="Fitzroy, VIC",
            contact_email="pawsandpetals@example.com",
            bio="Handmade pet accessories and botanical treats. Find us at local markets.",
            preferred_modes_json=["stalls_and_shops", "pet_events"],
            profile_meta_json={
                "stall_name": "Paws & Petals",
                "products": ["bandanas", "botanical dog treats", "cat toys"],
                "market_schedule": "First Sunday of each month, Fitzroy Night Market",
            },
        ),
    ]
    for p in profiles:
        db.add(p)

    db.commit()
    print("Database seeded successfully.")

if __name__ == "__main__":
    seed_db()

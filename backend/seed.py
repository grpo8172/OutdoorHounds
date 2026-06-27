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

    # Create Owner
    owner = models.User(email="jenna@outdoorhounds.com", name="Jenna Petersen", is_owner=True)
    db.add(owner)
    
    # Create some approved items
    hike = models.CatalogueItem(
        item_type="hike",
        name="Saturday Morning Pack Hike",
        description="A 2-hour guided hike through the hills with the Outdoor Hounds pack.",
        price="$40",
        status="approved",
        image_url="/media/hike1.jpg"
    )
    db.add(hike)
    
    pet = models.CatalogueItem(
        item_type="pet",
        name="Max",
        description="Friendly 3-year-old Golden Retriever mix looking for a forever home.",
        status="approved",
        image_url="/media/max.jpg"
    )
    db.add(pet)
    
    db.commit()
    print("Database seeded successfully.")

if __name__ == "__main__":
    seed_db()

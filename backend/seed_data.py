import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path
import bcrypt
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_database():
    print("Starting database seeding...")
    
    await db.users.delete_many({})
    await db.restaurants.delete_many({})
    await db.menu_categories.delete_many({})
    await db.menu_items.delete_many({})
    await db.orders.delete_many({})
    await db.reservations.delete_many({})
    await db.payment_transactions.delete_many({})
    
    print("Cleared existing data...")
    
    demo_customer = {
        "user_id": str(uuid.uuid4()),
        "email": "customer@demo.com",
        "password_hash": hash_password("password123"),
        "phone": "+919876543210",
        "name": "Demo Customer",
        "role": "customer",
        "created_at": "2025-01-01T00:00:00Z"
    }
    await db.users.insert_one(demo_customer)
    print(f"Created demo customer: {demo_customer['email']}")
    
    restaurants_data = [
        {
            "name": "The Golden Spoon",
            "cuisine": "Fine Dining",
            "service_type": "both",
            "is_veg": True,
            "is_non_veg": True,
            "image_url": "https://images.unsplash.com/photo-1750943024048-a4c9912b1425?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwxfHxnb3VybWV0JTIwZm9vZCUyMHBsYXRpbmclMjBlbGVnYW50fGVufDB8fHx8MTc2OTY5MjcyNnww&ixlib=rb-4.1.0&q=85",
            "logo_url": "https://images.unsplash.com/photo-1588560107833-167198a53677?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwcmVzdGF1cmFudCUyMGxvZ28lMjBkZXNpZ258ZW58MHx8fHwxNzY5NjkyNzM0fDA&ixlib=rb-4.1.0&q=85",
            "description": "An exquisite fine dining experience with carefully curated dishes",
            "address": "123 Luxury Lane, Downtown",
            "phone": "+919876543201",
            "hours": "5:00 PM - 11:00 PM"
        },
        {
            "name": "Pasta & Vine",
            "cuisine": "Italian",
            "service_type": "delivery",
            "is_veg": True,
            "is_non_veg": True,
            "image_url": "https://images.unsplash.com/photo-1751890939642-52aa0d543bd0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwyfHxnb3VybWV0JTIwZm9vZCUyMHBsYXRpbmclMjBlbGVnYW50fGVufDB8fHx8MTc2OTY5MjcyNnww&ixlib=rb-4.1.0&q=85",
            "logo_url": "https://images.unsplash.com/photo-1705948729112-3139fdf1a443?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwyfHxtaW5pbWFsaXN0JTIwcmVzdGF1cmFudCUyMGxvZ28lMjBkZXNpZ258ZW58MHx8fHwxNzY5NjkyNzM0fDA&ixlib=rb-4.1.0&q=85",
            "description": "Authentic Italian pasta and wine delivered to your door",
            "address": "456 Italian Street, Midtown",
            "phone": "+919876543202",
            "hours": "11:00 AM - 10:00 PM"
        },
        {
            "name": "Sakura Sushi",
            "cuisine": "Japanese",
            "service_type": "reservations",
            "is_veg": False,
            "is_non_veg": True,
            "image_url": "https://images.unsplash.com/photo-1750943024048-a4c9912b1425?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxzdXNoaSUyMHBsYXR0ZXIlMjBhcnRpc3RpYyUyMHBsYXRpbmd8ZW58MHx8fHwxNzY5NjkyNzU4fDA&ixlib=rb-4.1.0&q=85",
            "logo_url": "https://images.unsplash.com/photo-1694953592902-46d9b0d0c19d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwzfHxtaW5pbWFsaXN0JTIwcmVzdGF1cmFudCUyMGxvZ28lMjBkZXNpZ258ZW58MHx8fHwxNzY5NjkyNzM0fDA&ixlib=rb-4.1.0&q=85",
            "description": "Traditional Japanese sushi crafted by master chefs",
            "address": "789 Sushi Avenue, Uptown",
            "phone": "+919876543203",
            "hours": "12:00 PM - 10:00 PM"
        },
        {
            "name": "Urban Burger",
            "cuisine": "American",
            "service_type": "delivery",
            "is_veg": False,
            "is_non_veg": True,
            "image_url": "https://images.unsplash.com/photo-1627378378955-a3f4e406c5de?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwxfHxnb3VybWV0JTIwYnVyZ2VyJTIwZnJpZXMlMjByZXN0YXVyYW50fGVufDB8fHx8MTc2OTY5Mjc1Nnww&ixlib=rb-4.1.0&q=85",
            "logo_url": "https://images.unsplash.com/photo-1657242700848-68ea132c9966?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHw0fHxtaW5pbWFsaXN0JTIwcmVzdGF1cmFudCUyMGxvZ28lMjBkZXNpZ258ZW58MHx8fHwxNzY5NjkyNzM0fDA&ixlib=rb-4.1.0&q=85",
            "description": "Gourmet burgers and fries delivered fast",
            "address": "321 Burger Boulevard, Downtown",
            "phone": "+919876543204",
            "hours": "11:00 AM - 11:00 PM"
        },
        {
            "name": "Spice Route",
            "cuisine": "Indian",
            "service_type": "both",
            "is_veg": True,
            "is_non_veg": True,
            "image_url": "https://images.unsplash.com/photo-1735233024815-7986206a18a9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBjdXJyeSUyMG5hYW4lMjBjb3BwZXIlMjBib3dsfGVufDB8fHx8MTc2OTY5Mjc1OXww&ixlib=rb-4.1.0&q=85",
            "logo_url": "https://images.unsplash.com/photo-1588560107833-167198a53677?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwcmVzdGF1cmFudCUyMGxvZ28lMjBkZXNpZ258ZW58MHx8fHwxNzY5NjkyNzM0fDA&ixlib=rb-4.1.0&q=85",
            "description": "Authentic Indian spices and flavors from across the subcontinent",
            "address": "555 Spice Market, Old Town",
            "phone": "+919876543205",
            "hours": "11:00 AM - 10:00 PM"
        },
        {
            "name": "Green Bowl",
            "cuisine": "Vegan",
            "service_type": "delivery",
            "is_veg": True,
            "is_non_veg": False,
            "image_url": "https://images.unsplash.com/photo-1474221379956-afaf88e3d760?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHw0fHxnb3VybWV0JTIwZm9vZCUyMHBsYXRpbmclMjBlbGVnYW50fGVufDB8fHx8MTc2OTY5MjcyNnww&ixlib=rb-4.1.0&q=85",
            "logo_url": "https://images.unsplash.com/photo-1705948729112-3139fdf1a443?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwyfHxtaW5pbWFsaXN0JTIwcmVzdGF1cmFudCUyMGxvZ28lMjBkZXNpZ258ZW58MHx8fHwxNzY5NjkyNzM0fDA&ixlib=rb-4.1.0&q=85",
            "description": "100% plant-based healthy bowls and smoothies",
            "address": "777 Green Street, Health District",
            "phone": "+919876543206",
            "hours": "8:00 AM - 8:00 PM"
        },
        {
            "name": "Midnight Cafe",
            "cuisine": "Dessert",
            "service_type": "both",
            "is_veg": True,
            "is_non_veg": False,
            "image_url": "https://images.unsplash.com/photo-1695909571191-5e0ed961672e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwzfHxnb3VybWV0JTIwZm9vZCUyMHBsYXRpbmclMjBlbGVnYW50fGVufDB8fHx8MTc2OTY5MjcyNnww&ixlib=rb-4.1.0&q=85",
            "logo_url": "https://images.unsplash.com/photo-1694953592902-46d9b0d0c19d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwzfHxtaW5pbWFsaXN0JTIwcmVzdGF1cmFudCUyMGxvZ28lMjBkZXNpZ258ZW58MHx8fHwxNzY5NjkyNzM0fDA&ixlib=rb-4.1.0&q=85",
            "description": "Decadent desserts and specialty coffee, open late",
            "address": "999 Sweet Lane, Arts District",
            "phone": "+919876543207",
            "hours": "2:00 PM - 2:00 AM"
        },
        {
            "name": "Fire & Stone",
            "cuisine": "Pizza",
            "service_type": "both",
            "is_veg": True,
            "is_non_veg": True,
            "image_url": "https://images.unsplash.com/photo-1763478156969-4d7c0ab35590?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwxfHxhcnRpc2FuJTIwcGl6emElMjB3b29kJTIwZmlyZWR8ZW58MHx8fHwxNzY5NjkyNzYxfDA&ixlib=rb-4.1.0&q=85",
            "logo_url": "https://images.unsplash.com/photo-1657242700848-68ea132c9966?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHw0fHxtaW5pbWFsaXN0JTIwcmVzdGF1cmFudCUyMGxvZ28lMjBkZXNpZ258ZW58MHx8fHwxNzY5NjkyNzM0fDA&ixlib=rb-4.1.0&q=85",
            "description": "Wood-fired artisan pizzas with fresh ingredients",
            "address": "111 Pizza Plaza, Little Italy",
            "phone": "+919876543208",
            "hours": "11:00 AM - 11:00 PM"
        }
    ]
    
    for i, rest_data in enumerate(restaurants_data):
        owner_email = f"restaurant{i+1}@demo.com"
        owner = {
            "user_id": str(uuid.uuid4()),
            "email": owner_email,
            "password_hash": hash_password("password123"),
            "phone": rest_data['phone'],
            "name": f"{rest_data['name']} Owner",
            "role": "restaurant",
            "created_at": "2025-01-01T00:00:00Z"
        }
        await db.users.insert_one(owner)
        
        restaurant_id = str(uuid.uuid4())
        restaurant = {
            "restaurant_id": restaurant_id,
            "owner_id": owner['user_id'],
            "name": rest_data['name'],
            "description": rest_data['description'],
            "cuisine": rest_data['cuisine'],
            "address": rest_data['address'],
            "phone": rest_data['phone'],
            "hours": rest_data['hours'],
            "service_type": rest_data['service_type'],
            "is_veg": rest_data['is_veg'],
            "is_non_veg": rest_data['is_non_veg'],
            "seat_capacity": 30,
            "slot_length_minutes": 60,
            "image_url": rest_data['image_url'],
            "logo_url": rest_data.get('logo_url'),
            "created_at": "2025-01-01T00:00:00Z"
        }
        await db.restaurants.insert_one(restaurant)
        print(f"Created restaurant: {rest_data['name']} (Owner: {owner_email})")
        
        if rest_data['service_type'] in ['delivery', 'both']:
            categories = [
                {"name": "Starters", "display_order": 1},
                {"name": "Main Course", "display_order": 2},
                {"name": "Beverages", "display_order": 3}
            ]
            
            for cat_data in categories:
                category_id = str(uuid.uuid4())
                category = {
                    "category_id": category_id,
                    "restaurant_id": restaurant_id,
                    "name": cat_data['name'],
                    "display_order": cat_data['display_order']
                }
                await db.menu_categories.insert_one(category)
                
                if cat_data['name'] == "Starters":
                    items = [
                        {"name": "Spring Rolls", "price": 199.0, "is_veg": True},
                        {"name": "Chicken Wings", "price": 299.0, "is_veg": False}
                    ]
                elif cat_data['name'] == "Main Course":
                    items = [
                        {"name": "Signature Dish", "price": 499.0, "is_veg": rest_data['is_veg']},
                        {"name": "Special Platter", "price": 699.0, "is_veg": False}
                    ]
                else:
                    items = [
                        {"name": "Fresh Juice", "price": 99.0, "is_veg": True},
                        {"name": "Soft Drink", "price": 49.0, "is_veg": True}
                    ]
                
                for item_data in items:
                    if (rest_data['is_veg'] and not rest_data['is_non_veg']) and not item_data['is_veg']:
                        continue
                    
                    item = {
                        "item_id": str(uuid.uuid4()),
                        "restaurant_id": restaurant_id,
                        "category_id": category_id,
                        "name": item_data['name'],
                        "description": f"Delicious {item_data['name']} from {rest_data['name']}",
                        "price": item_data['price'],
                        "image_url": rest_data['image_url'],
                        "is_veg": item_data['is_veg'],
                        "is_available": True
                    }
                    await db.menu_items.insert_one(item)
    
    print("\nDatabase seeding complete!")
    print("\nDemo Credentials:")
    print("Customer Login - Email: customer@demo.com, Password: password123")
    print("Restaurant Logins - Email: restaurant1@demo.com to restaurant8@demo.com, Password: password123")

if __name__ == "__main__":
    asyncio.run(seed_database())

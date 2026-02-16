from fastapi import FastAPI, APIRouter, HTTPException, Request, Header, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import resend
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL')
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_VERIFY_SERVICE = os.environ.get('TWILIO_VERIFY_SERVICE')
JWT_SECRET = os.environ.get('JWT_SECRET', 'secret')
JWT_ALGORITHM = 'HS256'

# Resend setup
resend.api_key = RESEND_API_KEY

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    phone: Optional[str] = None
    name: str
    role: str = "customer"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    phone: Optional[str] = None
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    token: str
    user_id: str
    email: str
    name: str
    role: str

class Restaurant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    restaurant_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    name: str
    description: str
    cuisine: str
    address: str
    phone: str
    hours: str
    service_type: str
    is_veg: bool = False
    is_non_veg: bool = False
    seat_capacity: int = 20
    slot_length_minutes: int = 60
    image_url: str
    logo_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RestaurantCreate(BaseModel):
    name: str
    description: str
    cuisine: str
    address: str
    phone: str
    hours: str
    service_type: str
    is_veg: bool = False
    is_non_veg: bool = False
    seat_capacity: int = 20
    slot_length_minutes: int = 60
    image_url: str
    logo_url: Optional[str] = None

class MenuCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    name: str
    display_order: int = 0

class MenuCategoryCreate(BaseModel):
    name: str
    display_order: int = 0

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    category_id: str
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    is_veg: bool = True
    is_available: bool = True

class MenuItemCreate(BaseModel):
    category_id: str
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    is_veg: bool = True
    is_available: bool = True

class OrderItem(BaseModel):
    item_id: str
    name: str
    price: float
    quantity: int
    instructions: Optional[str] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    order_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    restaurant_id: str
    items: List[OrderItem]
    total_amount: float
    delivery_address: str
    delivery_phone: str
    notes: Optional[str] = None
    payment_method: str
    payment_status: str = "pending"
    stripe_session_id: Optional[str] = None
    status: str = "PLACED"
    preparation_time_minutes: int = 30
    estimated_delivery_time: Optional[datetime] = None
    status_timestamps: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    restaurant_id: str
    items: List[OrderItem]
    delivery_address: str
    delivery_phone: str
    notes: Optional[str] = None
    payment_method: str

class OrderStatusUpdate(BaseModel):
    status: str

class Reservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reservation_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    restaurant_id: str
    date: str
    time: str
    party_size: int
    amount: float
    payment_status: str = "pending"
    stripe_session_id: Optional[str] = None
    status: str = "PENDING_PAYMENT"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReservationCreate(BaseModel):
    restaurant_id: str
    date: str
    time: str
    party_size: int

class ReservationStatusUpdate(BaseModel):
    status: str

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: Optional[str] = None
    restaurant_id: Optional[str] = None
    amount: float
    currency: str
    payment_type: str
    reference_id: str
    payment_status: str = "pending"
    metadata: dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    restaurant_id: str
    order_id: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    restaurant_id: str
    order_id: Optional[str] = None
    rating: int
    comment: Optional[str] = None

class Favorite(BaseModel):
    model_config = ConfigDict(extra="ignore")
    favorite_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    restaurant_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    return payload

async def get_current_restaurant_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if payload.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="Restaurant access required")
    return payload

async def get_current_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload

# ============= NOTIFICATION HELPERS =============

async def send_email_notification(recipient_email: str, subject: str, html_content: str):
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [recipient_email],
            "subject": subject,
            "html": html_content
        }
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {recipient_email}")
        return email
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {str(e)}")

async def send_sms_notification(phone: str, message: str):
    logger.info(f"SMS notification (simulated) to {phone}: {message}")

# ============= AUTH ROUTES =============

@api_router.post("/auth/customer/signup", response_model=TokenResponse)
async def customer_signup(user_data: UserSignup):
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        phone=user_data.phone,
        name=user_data.name,
        role="customer"
    )
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    token = create_token(user.user_id, user.email, user.role)
    return TokenResponse(token=token, user_id=user.user_id, email=user.email, name=user.name, role=user.role)

@api_router.post("/auth/customer/login", response_model=TokenResponse)
async def customer_login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email, "role": "customer"}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['user_id'], user['email'], user['role'])
    return TokenResponse(token=token, user_id=user['user_id'], email=user['email'], name=user['name'], role=user['role'])

@api_router.post("/auth/restaurant/signup", response_model=TokenResponse)
async def restaurant_signup(user_data: UserSignup):
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        phone=user_data.phone,
        name=user_data.name,
        role="restaurant"
    )
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    token = create_token(user.user_id, user.email, user.role)
    return TokenResponse(token=token, user_id=user.user_id, email=user.email, name=user.name, role=user.role)

@api_router.post("/auth/restaurant/login", response_model=TokenResponse)
async def restaurant_login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email, "role": "restaurant"}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['user_id'], user['email'], user['role'])
    return TokenResponse(token=token, user_id=user['user_id'], email=user['email'], name=user['name'], role=user['role'])

# ============= RESTAURANT ROUTES =============

@api_router.get("/restaurants")
async def get_restaurants(search: Optional[str] = None, cuisine: Optional[str] = None, diet: Optional[str] = None, service_type: Optional[str] = None):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if cuisine:
        query["cuisine"] = {"$regex": cuisine, "$options": "i"}
    if diet == "veg":
        query["is_veg"] = True
    elif diet == "non_veg":
        query["is_non_veg"] = True
    if service_type:
        query["service_type"] = {"$in": [service_type, "both"]}
    
    restaurants = await db.restaurants.find(query, {"_id": 0}).to_list(100)
    
    # Add ratings to each restaurant
    for restaurant in restaurants:
        reviews = await db.reviews.find({"restaurant_id": restaurant['restaurant_id']}, {"_id": 0}).to_list(1000)
        if reviews:
            total_rating = sum(r['rating'] for r in reviews)
            restaurant['average_rating'] = round(total_rating / len(reviews), 1)
            restaurant['total_reviews'] = len(reviews)
        else:
            restaurant['average_rating'] = 0
            restaurant['total_reviews'] = 0
    
    return restaurants

@api_router.get("/restaurants/{restaurant_id}")
async def get_restaurant(restaurant_id: str):
    restaurant = await db.restaurants.find_one({"restaurant_id": restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant

@api_router.get("/restaurants/{restaurant_id}/menu")
async def get_restaurant_menu(restaurant_id: str, diet: Optional[str] = None):
    categories = await db.menu_categories.find({"restaurant_id": restaurant_id}, {"_id": 0}).sort("display_order", 1).to_list(100)
    
    for category in categories:
        item_query = {"restaurant_id": restaurant_id, "category_id": category['category_id']}
        if diet == "veg":
            item_query["is_veg"] = True
        elif diet == "non_veg":
            item_query["is_veg"] = False
        
        items = await db.menu_items.find(item_query, {"_id": 0}).to_list(100)
        category['items'] = items
    
    return categories

@api_router.post("/restaurants", response_model=Restaurant)
async def create_restaurant(restaurant_data: RestaurantCreate, current_user: dict = Depends(get_current_restaurant_user)):
    restaurant = Restaurant(owner_id=current_user['user_id'], **restaurant_data.model_dump())
    doc = restaurant.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.restaurants.insert_one(doc)
    return restaurant

@api_router.put("/restaurants/{restaurant_id}")
async def update_restaurant(restaurant_id: str, restaurant_data: RestaurantCreate, current_user: dict = Depends(get_current_restaurant_user)):
    restaurant = await db.restaurants.find_one({"restaurant_id": restaurant_id, "owner_id": current_user['user_id']}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    await db.restaurants.update_one({"restaurant_id": restaurant_id}, {"$set": restaurant_data.model_dump()})
    return {"message": "Restaurant updated successfully"}

# ============= MENU ROUTES =============

@api_router.post("/restaurants/{restaurant_id}/categories", response_model=MenuCategory)
async def create_menu_category(restaurant_id: str, category_data: MenuCategoryCreate, current_user: dict = Depends(get_current_restaurant_user)):
    restaurant = await db.restaurants.find_one({"restaurant_id": restaurant_id, "owner_id": current_user['user_id']}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=403, detail="Access denied")
    
    category = MenuCategory(restaurant_id=restaurant_id, **category_data.model_dump())
    await db.menu_categories.insert_one(category.model_dump())
    return category

@api_router.post("/restaurants/{restaurant_id}/items", response_model=MenuItem)
async def create_menu_item(restaurant_id: str, item_data: MenuItemCreate, current_user: dict = Depends(get_current_restaurant_user)):
    restaurant = await db.restaurants.find_one({"restaurant_id": restaurant_id, "owner_id": current_user['user_id']}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=403, detail="Access denied")
    
    item = MenuItem(restaurant_id=restaurant_id, **item_data.model_dump())
    await db.menu_items.insert_one(item.model_dump())
    return item

@api_router.get("/restaurants/{restaurant_id}/categories")
async def get_menu_categories(restaurant_id: str):
    categories = await db.menu_categories.find({"restaurant_id": restaurant_id}, {"_id": 0}).to_list(100)
    return categories

@api_router.delete("/restaurants/{restaurant_id}/items/{item_id}")
async def delete_menu_item(restaurant_id: str, item_id: str, current_user: dict = Depends(get_current_restaurant_user)):
    restaurant = await db.restaurants.find_one({"restaurant_id": restaurant_id, "owner_id": current_user['user_id']}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.menu_items.delete_one({"item_id": item_id, "restaurant_id": restaurant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    return {"message": "Menu item deleted successfully"}

# ============= ORDER ROUTES =============

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    total_amount = sum(item.price * item.quantity for item in order_data.items)
    
    now = datetime.now(timezone.utc)
    status_timestamps = {"PLACED": now.isoformat()}
    
    order = Order(
        user_id=current_user['user_id'],
        restaurant_id=order_data.restaurant_id,
        items=[item.model_dump() for item in order_data.items],
        total_amount=total_amount,
        delivery_address=order_data.delivery_address,
        delivery_phone=order_data.delivery_phone,
        notes=order_data.notes,
        payment_method=order_data.payment_method,
        payment_status="paid" if order_data.payment_method == "COD" else "pending",
        status="PLACED",
        preparation_time_minutes=30,
        estimated_delivery_time=now + timedelta(minutes=45),
        status_timestamps=status_timestamps,
        updated_at=now
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc['estimated_delivery_time']:
        doc['estimated_delivery_time'] = doc['estimated_delivery_time'].isoformat()
    await db.orders.insert_one(doc)
    
    user = await db.users.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if user and user.get('email'):
        await send_email_notification(
            user['email'],
            "Order Placed - DineDash Reserve",
            f"<h2>Order Confirmed!</h2><p>Your order #{order.order_id[:8]} has been placed.</p>"
        )
    if order_data.delivery_phone:
        await send_sms_notification(order_data.delivery_phone, f"Your order has been placed! Order ID: {order.order_id[:8]}")
    
    return order

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order['user_id'] != current_user['user_id']:
        raise HTTPException(status_code=403, detail="Access denied")
    return order

@api_router.get("/orders")
async def get_user_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user['user_id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusUpdate, current_user: dict = Depends(get_current_restaurant_user)):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    restaurant = await db.restaurants.find_one({"restaurant_id": order['restaurant_id'], "owner_id": current_user['user_id']}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update status timestamps
    status_timestamps = order.get('status_timestamps', {})
    now = datetime.now(timezone.utc)
    status_timestamps[status_update.status] = now.isoformat()
    
    # Calculate new ETA based on status
    eta_minutes = {
        'ACCEPTED': 35,
        'PREPARING': 25,
        'OUT_FOR_DELIVERY': 15,
        'DELIVERED': 0
    }
    new_eta = None
    if status_update.status in eta_minutes:
        new_eta = (now + timedelta(minutes=eta_minutes[status_update.status])).isoformat()
    
    update_data = {
        "status": status_update.status,
        "status_timestamps": status_timestamps,
        "updated_at": now.isoformat()
    }
    if new_eta:
        update_data["estimated_delivery_time"] = new_eta
    
    await db.orders.update_one({"order_id": order_id}, {"$set": update_data})
    
    user = await db.users.find_one({"user_id": order['user_id']}, {"_id": 0})
    if user and user.get('email'):
        status_labels = {
            'ACCEPTED': 'Order Accepted',
            'PREPARING': 'Order Preparation Started',
            'OUT_FOR_DELIVERY': 'Your order is on the way',
            'DELIVERED': 'Order Delivered',
            'CANCELLED': 'Order Cancelled'
        }
        await send_email_notification(
            user['email'],
            f"Order Update - DineDash Reserve",
            f"<h2>Order #{order_id[:8]}</h2><p>Status: {status_labels.get(status_update.status, status_update.status)}</p>"
        )
    if order.get('delivery_phone'):
        await send_sms_notification(order['delivery_phone'], f"Order status updated: {status_update.status}")
    
    return {"message": "Order status updated"}

@api_router.get("/restaurant/orders")
async def get_restaurant_orders(current_user: dict = Depends(get_current_restaurant_user)):
    restaurants = await db.restaurants.find({"owner_id": current_user['user_id']}, {"_id": 0}).to_list(10)
    restaurant_ids = [r['restaurant_id'] for r in restaurants]
    orders = await db.orders.find({"restaurant_id": {"$in": restaurant_ids}}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

# ============= RESERVATION ROUTES =============

@api_router.get("/restaurants/{restaurant_id}/availability")
async def check_availability(restaurant_id: str, date: str, time: str):
    restaurant = await db.restaurants.find_one({"restaurant_id": restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    existing_reservations = await db.reservations.find({
        "restaurant_id": restaurant_id,
        "date": date,
        "time": time,
        "status": {"$in": ["PENDING_PAYMENT", "CONFIRMED", "SEATED"]}
    }, {"_id": 0}).to_list(100)
    
    booked_seats = sum(r.get('party_size', 0) for r in existing_reservations)
    available_seats = restaurant.get('seat_capacity', 20) - booked_seats
    
    return {"available": available_seats > 0, "available_seats": available_seats}

@api_router.post("/reservations", response_model=Reservation)
async def create_reservation(reservation_data: ReservationCreate, current_user: dict = Depends(get_current_user)):
    restaurant = await db.restaurants.find_one({"restaurant_id": reservation_data.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    availability = await check_availability(
        reservation_data.restaurant_id,
        reservation_data.date,
        reservation_data.time
    )
    
    if not availability['available'] or availability['available_seats'] < reservation_data.party_size:
        raise HTTPException(status_code=400, detail="Not enough seats available")
    
    amount = max(300.0, reservation_data.party_size * 100.0)
    
    reservation = Reservation(
        user_id=current_user['user_id'],
        restaurant_id=reservation_data.restaurant_id,
        date=reservation_data.date,
        time=reservation_data.time,
        party_size=reservation_data.party_size,
        amount=amount,
        payment_status="pending",
        status="PENDING_PAYMENT"
    )
    
    doc = reservation.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.reservations.insert_one(doc)
    
    return reservation

@api_router.get("/reservations/{reservation_id}")
async def get_reservation(reservation_id: str, current_user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({"reservation_id": reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation['user_id'] != current_user['user_id']:
        raise HTTPException(status_code=403, detail="Access denied")
    return reservation

@api_router.get("/reservations")
async def get_user_reservations(current_user: dict = Depends(get_current_user)):
    reservations = await db.reservations.find({"user_id": current_user['user_id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reservations

@api_router.put("/reservations/{reservation_id}/status")
async def update_reservation_status(reservation_id: str, status_update: ReservationStatusUpdate, current_user: dict = Depends(get_current_restaurant_user)):
    reservation = await db.reservations.find_one({"reservation_id": reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    restaurant = await db.restaurants.find_one({"restaurant_id": reservation['restaurant_id'], "owner_id": current_user['user_id']}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.reservations.update_one({"reservation_id": reservation_id}, {"$set": {"status": status_update.status}})
    
    user = await db.users.find_one({"user_id": reservation['user_id']}, {"_id": 0})
    if user and user.get('email'):
        await send_email_notification(
            user['email'],
            f"Reservation Update - DineDash Reserve",
            f"<h2>Reservation #{reservation_id[:8]}</h2><p>Status: {status_update.status}</p>"
        )
    if user and user.get('phone'):
        await send_sms_notification(user['phone'], f"Reservation status updated: {status_update.status}")
    
    return {"message": "Reservation status updated"}

@api_router.get("/restaurant/reservations")
async def get_restaurant_reservations(current_user: dict = Depends(get_current_restaurant_user)):
    restaurants = await db.restaurants.find({"owner_id": current_user['user_id']}, {"_id": 0}).to_list(10)
    restaurant_ids = [r['restaurant_id'] for r in restaurants]
    reservations = await db.reservations.find({"restaurant_id": {"$in": restaurant_ids}}, {"_id": 0}).sort("date", -1).to_list(100)
    return reservations

# ============= REVIEW ROUTES =============

@api_router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    review = Review(
        user_id=current_user['user_id'],
        restaurant_id=review_data.restaurant_id,
        order_id=review_data.order_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    doc = review.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.reviews.insert_one(doc)
    return review

@api_router.get("/restaurants/{restaurant_id}/reviews")
async def get_restaurant_reviews(restaurant_id: str):
    reviews = await db.reviews.find({"restaurant_id": restaurant_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get user names for reviews
    for review in reviews:
        user = await db.users.find_one({"user_id": review['user_id']}, {"_id": 0, "name": 1})
        review['user_name'] = user.get('name', 'Anonymous') if user else 'Anonymous'
    
    return reviews

@api_router.get("/restaurants/{restaurant_id}/rating")
async def get_restaurant_rating(restaurant_id: str):
    reviews = await db.reviews.find({"restaurant_id": restaurant_id}, {"_id": 0}).to_list(1000)
    if not reviews:
        return {"average_rating": 0, "total_reviews": 0}
    
    total_rating = sum(r['rating'] for r in reviews)
    return {
        "average_rating": round(total_rating / len(reviews), 1),
        "total_reviews": len(reviews)
    }

# ============= FAVORITE ROUTES =============

@api_router.post("/favorites/{restaurant_id}")
async def add_favorite(restaurant_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.favorites.find_one({
        "user_id": current_user['user_id'],
        "restaurant_id": restaurant_id
    }, {"_id": 0})
    
    if existing:
        return {"message": "Already in favorites"}
    
    favorite = Favorite(
        user_id=current_user['user_id'],
        restaurant_id=restaurant_id
    )
    doc = favorite.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.favorites.insert_one(doc)
    return {"message": "Added to favorites"}

@api_router.delete("/favorites/{restaurant_id}")
async def remove_favorite(restaurant_id: str, current_user: dict = Depends(get_current_user)):
    await db.favorites.delete_one({
        "user_id": current_user['user_id'],
        "restaurant_id": restaurant_id
    })
    return {"message": "Removed from favorites"}

@api_router.get("/favorites")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    favorites = await db.favorites.find({"user_id": current_user['user_id']}, {"_id": 0}).to_list(100)
    restaurant_ids = [f['restaurant_id'] for f in favorites]
    
    if not restaurant_ids:
        return []
    
    restaurants = await db.restaurants.find({"restaurant_id": {"$in": restaurant_ids}}, {"_id": 0}).to_list(100)
    return restaurants

# ============= PAYMENT ROUTES =============

@api_router.post("/payments/checkout")
async def create_checkout_session(request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    payment_type = body.get('payment_type')
    reference_id = body.get('reference_id')
    origin_url = body.get('origin_url')
    
    if not payment_type or not reference_id or not origin_url:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    amount = 0.0
    restaurant_id = None
    
    if payment_type == "order":
        order = await db.orders.find_one({"order_id": reference_id}, {"_id": 0})
        if not order or order['user_id'] != current_user['user_id']:
            raise HTTPException(status_code=404, detail="Order not found")
        amount = order['total_amount']
        restaurant_id = order['restaurant_id']
    elif payment_type == "reservation":
        reservation = await db.reservations.find_one({"reservation_id": reference_id}, {"_id": 0})
        if not reservation or reservation['user_id'] != current_user['user_id']:
            raise HTTPException(status_code=404, detail="Reservation not found")
        amount = reservation['amount']
        restaurant_id = reservation['restaurant_id']
    else:
        raise HTTPException(status_code=400, detail="Invalid payment type")
    
    host_url = origin_url.rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{host_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/payment-cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="inr",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "payment_type": payment_type,
            "reference_id": reference_id,
            "user_id": current_user['user_id']
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    transaction = PaymentTransaction(
        session_id=session.session_id,
        user_id=current_user['user_id'],
        restaurant_id=restaurant_id,
        amount=amount,
        currency="inr",
        payment_type=payment_type,
        reference_id=reference_id,
        payment_status="pending",
        metadata=checkout_request.metadata
    )
    doc = transaction.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.payment_transactions.insert_one(doc)
    
    if payment_type == "order":
        await db.orders.update_one({"order_id": reference_id}, {"$set": {"stripe_session_id": session.session_id}})
    elif payment_type == "reservation":
        await db.reservations.update_one({"reservation_id": reference_id}, {"$set": {"stripe_session_id": session.session_id}})
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, current_user: dict = Depends(get_current_user)):
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction['payment_status'] == "paid":
        return transaction
    
    host_url = str(os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001'))
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        status_response = await stripe_checkout.get_checkout_status(session_id)
        
        if status_response.payment_status == "paid" and transaction['payment_status'] != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            payment_type = transaction['payment_type']
            reference_id = transaction['reference_id']
            
            if payment_type == "order":
                await db.orders.update_one(
                    {"order_id": reference_id},
                    {"$set": {"payment_status": "paid"}}
                )
                user = await db.users.find_one({"user_id": transaction['user_id']}, {"_id": 0})
                if user and user.get('email'):
                    await send_email_notification(
                        user['email'],
                        "Payment Confirmed - DineDash Reserve",
                        f"<h2>Payment Received!</h2><p>Your payment for order has been confirmed.</p>"
                    )
            elif payment_type == "reservation":
                await db.reservations.update_one(
                    {"reservation_id": reference_id},
                    {"$set": {"payment_status": "paid", "status": "CONFIRMED"}}
                )
                user = await db.users.find_one({"user_id": transaction['user_id']}, {"_id": 0})
                if user and user.get('email'):
                    await send_email_notification(
                        user['email'],
                        "Reservation Confirmed - DineDash Reserve",
                        f"<h2>Reservation Confirmed!</h2><p>Your reservation payment has been received.</p>"
                    )
            
            transaction['payment_status'] = "paid"
        
        return transaction
    except Exception as e:
        logger.error(f"Error checking payment status: {str(e)}")
        return transaction

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body_bytes = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001'))
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body_bytes, signature)
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            
            if transaction and transaction['payment_status'] != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                
                payment_type = transaction['payment_type']
                reference_id = transaction['reference_id']
                
                if payment_type == "order":
                    await db.orders.update_one({"order_id": reference_id}, {"$set": {"payment_status": "paid"}})
                elif payment_type == "reservation":
                    await db.reservations.update_one({"reservation_id": reference_id}, {"$set": {"payment_status": "paid", "status": "CONFIRMED"}})
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============= ADMIN AUTH ROUTES =============

@api_router.post("/auth/admin/login", response_model=TokenResponse)
async def admin_login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email, "role": "admin"}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    token = create_token(user['user_id'], user['email'], user['role'])
    return TokenResponse(token=token, user_id=user['user_id'], email=user['email'], name=user['name'], role=user['role'])

# ============= ADMIN DASHBOARD ROUTES =============

@api_router.get("/admin/dashboard/stats")
async def get_admin_dashboard_stats(current_user: dict = Depends(get_current_admin_user)):
    # Get counts
    total_users = await db.users.count_documents({"role": "customer"})
    total_restaurants = await db.restaurants.count_documents({})
    total_orders = await db.orders.count_documents({})
    total_reservations = await db.reservations.count_documents({})
    
    # Get pending items
    pending_orders = await db.orders.count_documents({"status": {"$in": ["PLACED", "ACCEPTED", "PREPARING"]}})
    pending_reservations = await db.reservations.count_documents({"status": "PENDING_PAYMENT"})
    
    # Calculate revenue
    orders = await db.orders.find({"payment_status": "paid"}, {"_id": 0, "total_amount": 1}).to_list(10000)
    order_revenue = sum(o.get('total_amount', 0) for o in orders)
    
    reservations = await db.reservations.find({"payment_status": "paid"}, {"_id": 0, "amount": 1}).to_list(10000)
    reservation_revenue = sum(r.get('amount', 0) for r in reservations)
    
    total_revenue = order_revenue + reservation_revenue
    
    # Get recent activity (last 7 days)
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_orders = await db.orders.count_documents({"created_at": {"$gte": seven_days_ago}})
    recent_reservations = await db.reservations.count_documents({"created_at": {"$gte": seven_days_ago}})
    
    return {
        "total_users": total_users,
        "total_restaurants": total_restaurants,
        "total_orders": total_orders,
        "total_reservations": total_reservations,
        "pending_orders": pending_orders,
        "pending_reservations": pending_reservations,
        "total_revenue": total_revenue,
        "order_revenue": order_revenue,
        "reservation_revenue": reservation_revenue,
        "recent_orders": recent_orders,
        "recent_reservations": recent_reservations
    }

# ============= ADMIN RESTAURANT MANAGEMENT =============

@api_router.get("/admin/restaurants")
async def admin_get_all_restaurants(current_user: dict = Depends(get_current_admin_user)):
    restaurants = await db.restaurants.find({}, {"_id": 0}).to_list(1000)
    
    # Add owner info and stats for each restaurant
    for restaurant in restaurants:
        owner = await db.users.find_one({"user_id": restaurant['owner_id']}, {"_id": 0, "name": 1, "email": 1})
        restaurant['owner'] = owner or {"name": "Unknown", "email": "Unknown"}
        
        # Get order stats
        order_count = await db.orders.count_documents({"restaurant_id": restaurant['restaurant_id']})
        reservation_count = await db.reservations.count_documents({"restaurant_id": restaurant['restaurant_id']})
        restaurant['order_count'] = order_count
        restaurant['reservation_count'] = reservation_count
        
        # Get revenue
        orders = await db.orders.find({"restaurant_id": restaurant['restaurant_id'], "payment_status": "paid"}, {"_id": 0, "total_amount": 1}).to_list(10000)
        restaurant['revenue'] = sum(o.get('total_amount', 0) for o in orders)
    
    return restaurants

@api_router.put("/admin/restaurants/{restaurant_id}/status")
async def admin_update_restaurant_status(restaurant_id: str, request: Request, current_user: dict = Depends(get_current_admin_user)):
    body = await request.json()
    status = body.get('status')  # 'approved', 'suspended', 'rejected'
    
    if status not in ['approved', 'suspended', 'rejected']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.restaurants.update_one(
        {"restaurant_id": restaurant_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    return {"message": f"Restaurant {status} successfully"}

@api_router.delete("/admin/restaurants/{restaurant_id}")
async def admin_delete_restaurant(restaurant_id: str, current_user: dict = Depends(get_current_admin_user)):
    # Delete restaurant and all related data
    await db.restaurants.delete_one({"restaurant_id": restaurant_id})
    await db.menu_categories.delete_many({"restaurant_id": restaurant_id})
    await db.menu_items.delete_many({"restaurant_id": restaurant_id})
    
    return {"message": "Restaurant deleted successfully"}

# ============= ADMIN ORDER MANAGEMENT =============

@api_router.get("/admin/orders")
async def admin_get_all_orders(status: Optional[str] = None, current_user: dict = Depends(get_current_admin_user)):
    query = {}
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Add restaurant and user info
    for order in orders:
        restaurant = await db.restaurants.find_one({"restaurant_id": order['restaurant_id']}, {"_id": 0, "name": 1})
        order['restaurant_name'] = restaurant['name'] if restaurant else "Unknown"
        
        user = await db.users.find_one({"user_id": order['user_id']}, {"_id": 0, "name": 1, "email": 1})
        order['customer'] = user or {"name": "Unknown", "email": "Unknown"}
    
    return orders

@api_router.put("/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, status_update: OrderStatusUpdate, current_user: dict = Depends(get_current_admin_user)):
    valid_statuses = ["PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "status": status_update.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            f"status_timestamps.{status_update.status}": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order status updated"}

# ============= ADMIN RESERVATION MANAGEMENT =============

@api_router.get("/admin/reservations")
async def admin_get_all_reservations(status: Optional[str] = None, current_user: dict = Depends(get_current_admin_user)):
    query = {}
    if status:
        query["status"] = status
    
    reservations = await db.reservations.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Add restaurant and user info
    for reservation in reservations:
        restaurant = await db.restaurants.find_one({"restaurant_id": reservation['restaurant_id']}, {"_id": 0, "name": 1})
        reservation['restaurant_name'] = restaurant['name'] if restaurant else "Unknown"
        
        user = await db.users.find_one({"user_id": reservation['user_id']}, {"_id": 0, "name": 1, "email": 1})
        reservation['customer'] = user or {"name": "Unknown", "email": "Unknown"}
    
    return reservations

@api_router.put("/admin/reservations/{reservation_id}/status")
async def admin_update_reservation_status(reservation_id: str, status_update: ReservationStatusUpdate, current_user: dict = Depends(get_current_admin_user)):
    valid_statuses = ["PENDING_PAYMENT", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.reservations.update_one(
        {"reservation_id": reservation_id},
        {"$set": {"status": status_update.status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    return {"message": "Reservation status updated"}

# ============= ADMIN USER MANAGEMENT =============

@api_router.get("/admin/users")
async def admin_get_all_users(role: Optional[str] = None, current_user: dict = Depends(get_current_admin_user)):
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    # Add stats for each user
    for user in users:
        if user['role'] == 'customer':
            order_count = await db.orders.count_documents({"user_id": user['user_id']})
            reservation_count = await db.reservations.count_documents({"user_id": user['user_id']})
            user['order_count'] = order_count
            user['reservation_count'] = reservation_count
        elif user['role'] == 'restaurant':
            restaurant = await db.restaurants.find_one({"owner_id": user['user_id']}, {"_id": 0, "name": 1, "restaurant_id": 1})
            user['restaurant'] = restaurant
    
    return users

@api_router.put("/admin/users/{user_id}/status")
async def admin_update_user_status(user_id: str, request: Request, current_user: dict = Depends(get_current_admin_user)):
    body = await request.json()
    status = body.get('status')  # 'active', 'suspended'
    
    if status not in ['active', 'suspended']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {status} successfully"}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: dict = Depends(get_current_admin_user)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user['role'] == 'admin':
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    
    # Delete user
    await db.users.delete_one({"user_id": user_id})
    
    # If restaurant owner, delete their restaurant too
    if user['role'] == 'restaurant':
        restaurant = await db.restaurants.find_one({"owner_id": user_id}, {"_id": 0})
        if restaurant:
            await db.restaurants.delete_one({"restaurant_id": restaurant['restaurant_id']})
            await db.menu_categories.delete_many({"restaurant_id": restaurant['restaurant_id']})
            await db.menu_items.delete_many({"restaurant_id": restaurant['restaurant_id']})
    
    return {"message": "User deleted successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

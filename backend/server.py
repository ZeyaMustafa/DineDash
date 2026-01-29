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
    estimated_delivery_time: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
async def get_restaurants(search: Optional[str] = None, cuisine: Optional[str] = None, diet: Optional[str] = None):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if cuisine:
        query["cuisine"] = cuisine
    if diet == "veg":
        query["is_veg"] = True
    elif diet == "non_veg":
        query["is_non_veg"] = True
    
    restaurants = await db.restaurants.find(query, {"_id": 0}).to_list(100)
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

# ============= ORDER ROUTES =============

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    total_amount = sum(item.price * item.quantity for item in order_data.items)
    
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
        estimated_delivery_time=datetime.now(timezone.utc) + timedelta(minutes=45)
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
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
    
    await db.orders.update_one({"order_id": order_id}, {"$set": {"status": status_update.status}})
    
    user = await db.users.find_one({"user_id": order['user_id']}, {"_id": 0})
    if user and user.get('email'):
        await send_email_notification(
            user['email'],
            f"Order Update - DineDash Reserve",
            f"<h2>Order #{order_id[:8]}</h2><p>Status: {status_update.status}</p>"
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

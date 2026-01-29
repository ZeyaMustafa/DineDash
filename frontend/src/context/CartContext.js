import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedRestaurantId = localStorage.getItem('cart_restaurant_id');
    const savedRestaurantName = localStorage.getItem('cart_restaurant_name');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
    if (savedRestaurantId) {
      setRestaurantId(savedRestaurantId);
    }
    if (savedRestaurantName) {
      setRestaurantName(savedRestaurantName);
    }
  }, []);

  const addToCart = (item, restaurant) => {
    if (restaurantId && restaurantId !== restaurant.restaurant_id) {
      const confirmClear = window.confirm('Your cart contains items from another restaurant. Clear cart and add this item?');
      if (!confirmClear) return;
      clearCart();
    }

    const existingItem = cart.find(cartItem => cartItem.item_id === item.item_id);
    let newCart;
    
    if (existingItem) {
      newCart = cart.map(cartItem =>
        cartItem.item_id === item.item_id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      );
    } else {
      newCart = [...cart, { ...item, quantity: 1 }];
    }

    setCart(newCart);
    setRestaurantId(restaurant.restaurant_id);
    setRestaurantName(restaurant.name);
    localStorage.setItem('cart', JSON.stringify(newCart));
    localStorage.setItem('cart_restaurant_id', restaurant.restaurant_id);
    localStorage.setItem('cart_restaurant_name', restaurant.name);
  };

  const removeFromCart = (itemId) => {
    const newCart = cart.filter(item => item.item_id !== itemId);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    if (newCart.length === 0) {
      clearCart();
    }
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    const newCart = cart.map(item =>
      item.item_id === itemId ? { ...item, quantity } : item
    );
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const clearCart = () => {
    setCart([]);
    setRestaurantId(null);
    setRestaurantName('');
    localStorage.removeItem('cart');
    localStorage.removeItem('cart_restaurant_id');
    localStorage.removeItem('cart_restaurant_name');
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const value = {
    cart,
    restaurantId,
    restaurantName,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalAmount,
    getTotalItems
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
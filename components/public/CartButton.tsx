
import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import type { CartItem } from '../../types.ts';

interface CartButtonProps {
    cart: CartItem[];
    onOpenCart: () => void;
}

const CartButton: React.FC<CartButtonProps> = ({ cart, onOpenCart }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Delay visibility for a smoother entrance animation
        const timer = setTimeout(() => {
            if (cart.length > 0) {
                setIsVisible(true);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [cart.length]);

    useEffect(() => {
        if (cart.length === 0) {
            setIsVisible(false);
        }
    }, [cart.length]);

    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

    return (
        <button
            onClick={onOpenCart}
            className={`fixed top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white rounded-full shadow-2xl flex items-center h-14 px-5 z-40
                       hover:bg-blue-700 transition-all duration-300 ease-out transform focus:outline-none focus:ring-4 focus:ring-blue-300
                       ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-20'}`}
        >
            <div className="relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cart.length}
                </span>
            </div>
            <span className="ml-3 font-semibold text-md">View Cart</span>
            <div className="h-6 w-px bg-blue-400 mx-3"></div>
            <span className="font-bold text-md">₹{(totalAmount / 100).toFixed(2)}</span>
        </button>
    );
};

export default CartButton;

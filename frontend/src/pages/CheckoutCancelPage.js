import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, ShoppingCart } from 'lucide-react';

const CheckoutCancelPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="min-h-screen flex items-center justify-center py-12" data-testid="checkout-cancel">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-orange-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">Checkout Cancelled</h1>
        
        <p className="text-gray-400 mb-8">
          Your payment was cancelled. Don&apos;t worry - your cart items are still saved 
          and no charges were made.
        </p>

        <div className="space-y-3">
          <Link to="/cart" className="btn btn-primary w-full flex items-center justify-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Return to Cart
          </Link>
          <Link to="/search" className="btn btn-secondary w-full flex items-center justify-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            Continue Shopping
          </Link>
        </div>

        <p className="text-gray-500 text-sm mt-8">
          Need help? <Link to="/help" className="text-primary hover:underline">Contact Support</Link>
        </p>
      </div>
    </div>
  );
};

export default CheckoutCancelPage;

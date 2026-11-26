'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, 
  Users, 
  Package, 
  AlertTriangle, 
  PlusCircle, 
  ShoppingCart, 
  CreditCard,
  Store,
  Bot,
  X,
  PackagePlus,
  Trash2,
  Plus,
  Send,
  RefreshCw,
  IndianRupee,
  MessageCircle,
  Mic,
  MicOff,
  CheckCircle2,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';

interface Stats {
  todaySales: number;
  todayProfit: number;
  pendingDues: number;
  totalProducts: number;
  lowStockCount: number;
}

interface Product {
  id: string;
  name: string;
  purchase_price?: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level?: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  outstanding_balance: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface ProposedAction {
  type: 'LOG_PAYMENT' | 'RESTOCK_PRODUCT' | 'ADD_UDHAR';
  label: string;
  targetId: string;
  targetName: string;
  amount: number;
  currentValue: number;
  newValue: number;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  action?: ProposedAction;
  actionStatus?: 'pending' | 'confirmed' | 'cancelled';
}

// 1. Add Product Modal
function AddProductModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('5');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('products').insert([
      {
        name,
        purchase_price: parseFloat(purchasePrice) || 0,
        selling_price: parseFloat(sellingPrice) || 0,
        stock_quantity: parseFloat(stockQuantity) || 0,
        min_stock_level: parseFloat(minStockLevel) || 5,
      },
    ]);

    setLoading(false);
    if (!error) {
      setName(''); setPurchasePrice(''); setSellingPrice(''); setStockQuantity('');
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-emerald-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <PackagePlus className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Add New Product</h3>
          </div>
          <button onClick={onClose} className="text-emerald-100 hover:text-white p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Item Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kurkure 20g" className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Buy Price (₹)</label>
              <input type="number" step="0.01" required value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="10.00" className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Sell Price (₹)</label>
              <input type="number" step="0.01" required value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="12.00" className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Stock Qty</label>
              <input type="number" required value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="50" className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Alert Level</label>
              <input type="number" required value={minStockLevel} onChange={(e) => setMinStockLevel(e.target.value)} placeholder="5" className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800" />
            </div>
          </div>
          <div className="pt-2 flex space-x-3">
            <button type="button" onClick={onClose} className="w-1/2 py-2 rounded-lg border text-slate-700 text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="w-1/2 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm">
              {loading ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 2. Full Itemized Billing Modal
function RecordSaleModal({ isOpen, onClose, onSuccess, customers, products }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; customers: Customer[]; products: Product[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [paymentType, setPaymentType] = useState<'cash' | 'udhar'>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const qty = parseInt(quantity) || 1;
    if (qty > prod.stock_quantity) {
      setErrorMsg(`Cannot add ${qty}. Only ${prod.stock_quantity} in stock!`);
      return;
    }

    setErrorMsg('');
    const existingIndex = cart.findIndex(item => item.product.id === prod.id);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += qty;
      setCart(updatedCart);
    } else {
      setCart([...cart, { product: prod, quantity: qty }]);
    }

    setSelectedProductId('');
    setQuantity('1');
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const totalBillAmount = cart.reduce((acc, item) => acc + (item.product.selling_price * item.quantity), 0);

  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMsg('Add at least one item to the bill!');
      return;
    }
    if (isNewCustomer && !newCustomerName.trim()) {
      setErrorMsg('Please enter the new customer name!');
      return;
    }
    if (paymentType === 'udhar' && !isNewCustomer && !selectedCustomer) {
      setErrorMsg('Please select a customer or add a new customer for Udhar billing!');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      let finalCustomerId: string | null = selectedCustomer || null;

      if (isNewCustomer && newCustomerName.trim() !== '') {
        const { data: createdCustomer, error: custErr } = await supabase
          .from('customers')
          .insert([{
            name: newCustomerName.trim(),
            phone: newCustomerPhone.trim() || null,
            outstanding_balance: paymentType === 'udhar' ? totalBillAmount : 0,
          }])
          .select()
          .single();

        if (custErr) throw custErr;
        finalCustomerId = createdCustomer.id;
      } else if (paymentType === 'udhar' && finalCustomerId) {
        const cust = customers.find(c => c.id === finalCustomerId);
        if (cust) {
          await supabase.from('customers').update({
            outstanding_balance: Number(cust.outstanding_balance) + totalBillAmount
          }).eq('id', finalCustomerId);
        }
      }

      const { data: saleData, error: saleErr } = await supabase
        .from('sales')
        .insert([{
          total_amount: totalBillAmount,
          payment_type: paymentType === 'udhar' ? 'credit' : 'cash',
          customer_id: finalCustomerId
        }])
        .select()
        .single();

      if (saleErr) throw saleErr;

      for (const item of cart) {
        const { error: itemErr } = await supabase.from('sale_items').insert([{
          sale_id: saleData.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.selling_price,
          total_price: item.product.selling_price * item.quantity
        }]);
        if (itemErr) console.error('sale_items insert error:', itemErr.message);

        const newStock = Math.max(0, item.product.stock_quantity - item.quantity);
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.product.id);
      }

      setCart([]);
      setSelectedCustomer('');
      setIsNewCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setPaymentType('cash');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-emerald-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5" />
            <h3 className="font-semibold text-lg">New Customer Bill</h3>
          </div>
          <button onClick={onClose} className="text-emerald-100 hover:text-white p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="flex gap-2">
            <select 
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm text-slate-800"
            >
              <option value="">-- Select Product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                  {p.name} (₹{p.selling_price} | Stock: {p.stock_quantity})
                </option>
              ))}
            </select>
            <input 
              type="number" 
              min="1" 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-16 px-2 py-2 border rounded-lg text-sm text-center text-slate-800"
            />
            <button 
              type="button" 
              onClick={handleAddToCart}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg p-3 min-h-[110px] max-h-[160px] overflow-y-auto bg-slate-50 space-y-2">
            {cart.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No items added to bill yet.</p>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-200 text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{item.product.name}</p>
                    <p className="text-xs text-slate-500">₹{item.product.selling_price} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-slate-900">₹{item.product.selling_price * item.quantity}</span>
                    <button type="button" onClick={() => handleRemoveFromCart(item.product.id)} className="text-rose-500 hover:text-rose-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <span className="text-sm font-semibold uppercase text-slate-600">Total Bill:</span>
            <span className="text-2xl font-bold text-emerald-700">₹{totalBillAmount}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase text-slate-600">
                Customer {paymentType === 'udhar' ? '(Required)' : '(Optional)'}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsNewCustomer(!isNewCustomer);
                  setSelectedCustomer('');
                  setErrorMsg('');
                }}
                className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                {isNewCustomer ? '← Select Existing Customer' : '+ New Customer'}
              </button>
            </div>

            {isNewCustomer ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer Name (e.g. Aman)"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
                />
                <input
                  type="tel"
                  placeholder="Phone Number (e.g. 9876543210)"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
                />
              </div>
            ) : (
              <select 
                value={selectedCustomer} 
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
              >
                <option value="">-- Walk-in / Choose Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} — Dues: ₹{c.outstanding_balance}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Payment Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button" 
                onClick={() => setPaymentType('cash')}
                className={`py-2 rounded-lg border text-sm font-medium ${paymentType === 'cash' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700'}`}
              >
                Cash
              </button>
              <button 
                type="button" 
                onClick={() => setPaymentType('udhar')}
                className={`py-2 rounded-lg border text-sm font-medium ${paymentType === 'udhar' ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-700'}`}
              >
                Udhar (Credit)
              </button>
            </div>
          </div>

          <div className="pt-2 flex space-x-3">
            <button type="button" onClick={onClose} className="w-1/2 py-2 rounded-lg border text-slate-700 text-sm">Cancel</button>
            <button 
              type="button" 
              onClick={handleSubmitBill} 
              disabled={loading} 
              className="w-1/2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm"
            >
              {loading ? 'Processing...' : 'Complete Bill'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. Log Udhar Payment Modal
function LogUdharPaymentModal({ isOpen, onClose, onSuccess, customers }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; customers: Customer[] }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleSubmitRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setErrorMsg('Please select a customer!');
      return;
    }
    const payVal = parseFloat(amountPaid) || 0;
    if (payVal <= 0) {
      setErrorMsg('Please enter a valid repayment amount!');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { error: payErr } = await supabase
        .from('customer_payments')
        .insert([{ customer_id: selectedCustomerId, amount_paid: payVal }]);

      if (payErr) throw payErr;

      if (selectedCustomer) {
        const newBalance = Math.max(0, Number(selectedCustomer.outstanding_balance) - payVal);
        await supabase
          .from('customers')
          .update({ outstanding_balance: newBalance })
          .eq('id', selectedCustomerId);
      }

      setSelectedCustomerId('');
      setAmountPaid('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to log payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-amber-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Log Udhar Repayment</h3>
          </div>
          <button onClick={onClose} className="text-amber-100 hover:text-white p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitRepayment} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Select Customer</label>
            <select 
              required
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (Pending Dues: ₹{c.outstanding_balance})
                </option>
              ))}
            </select>
          </div>

          {selectedCustomer && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex justify-between items-center">
              <span>Current Outstanding Dues:</span>
              <span className="font-bold text-sm">₹{selectedCustomer.outstanding_balance}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Amount Paid (₹)</label>
            <input 
              type="number" 
              step="0.01" 
              required 
              value={amountPaid} 
              onChange={(e) => setAmountPaid(e.target.value)} 
              placeholder="e.g. 200" 
              className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800" 
            />
          </div>

          <div className="pt-2 flex space-x-3">
            <button type="button" onClick={onClose} className="w-1/2 py-2 rounded-lg border text-slate-700 text-sm">Cancel</button>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-1/2 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm"
            >
              {loading ? 'Recording...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 4. View Customers Ledger Modal (with WhatsApp Reminder)
function ViewCustomersModal({ isOpen, onClose, customers }: { isOpen: boolean; onClose: () => void; customers: Customer[] }) {
  if (!isOpen) return null;

  const getWhatsAppReminderUrl = (customer: Customer) => {
    const cleanPhone = (customer.phone || '').replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Namaste ${customer.name} ji, friendly reminder from Sharma General Store: your pending Udhar balance is ₹${customer.outstanding_balance}. Please clear it at your convenience. Dhanyavaad!`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Customer Udhar Ledger</h3>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="max-h-[340px] overflow-y-auto space-y-2.5">
            {customers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No customers registered yet.</p>
            ) : (
              customers.map((c) => {
                const hasDues = Number(c.outstanding_balance) > 0;
                return (
                  <div key={c.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 gap-2">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{c.name}</p>
                      <p className="text-xs text-slate-500">Phone: {c.phone || 'N/A'}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {hasDues && c.phone && (
                        <a
                          href={getWhatsAppReminderUrl(c)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition"
                          title="Send WhatsApp Reminder"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>Remind</span>
                        </a>
                      )}
                      <div className="text-right min-w-[70px]">
                        <p className={`font-bold text-sm ${hasDues ? 'text-amber-600' : 'text-emerald-600'}`}>
                          ₹{c.outstanding_balance}
                        </p>
                        <p className="text-[10px] uppercase font-semibold text-slate-400">
                          {hasDues ? 'Pending' : 'Cleared'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="w-full py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-100 transition"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
}

// 5. Inventory & Restock Manager Modal
function InventoryModal({ isOpen, onClose, products, onSuccess }: { isOpen: boolean; onClose: () => void; products: Product[]; onSuccess: () => void }) {
  const [restockAmounts, setRestockAmounts] = useState<{ [id: string]: string }>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRestock = async (product: Product) => {
    const addQty = parseFloat(restockAmounts[product.id] || '0');
    if (addQty <= 0) return;

    setUpdatingId(product.id);
    const newStock = Number(product.stock_quantity) + addQty;

    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: newStock })
      .eq('id', product.id);

    setUpdatingId(null);
    if (!error) {
      setRestockAmounts(prev => ({ ...prev, [product.id]: '' }));
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-blue-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Current Inventory & Restock</h3>
          </div>
          <button onClick={onClose} className="text-blue-100 hover:text-white p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">View live stock levels and add incoming stock directly to existing items.</p>
          <div className="max-h-[380px] overflow-y-auto space-y-2.5">
            {products.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No products in inventory yet.</p>
            ) : (
              products.map((p) => {
                const isLow = Number(p.stock_quantity) <= Number(p.min_stock_level || 5);
                const unitProfit = Number(p.selling_price) - Number(p.purchase_price || 0);
                return (
                  <div key={p.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-3 ${isLow ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                        {isLow && (
                          <span className="text-[10px] font-bold uppercase bg-rose-600 text-white px-2 py-0.5 rounded-full">
                            Low Stock
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Buy: ₹{p.purchase_price || 0} • Sell: ₹{p.selling_price} • Profit/unit: <span className="text-emerald-700 font-semibold">₹{unitProfit}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-bold min-w-[65px] ${isLow ? 'text-rose-700' : 'text-slate-800'}`}>
                        {p.stock_quantity} left
                      </span>
                      <input
                        type="number"
                        min="1"
                        placeholder="+Qty"
                        value={restockAmounts[p.id] || ''}
                        onChange={(e) => setRestockAmounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-16 px-2 py-1.5 border rounded-lg text-xs text-center bg-white text-slate-800"
                      />
                      <button
                        type="button"
                        disabled={updatingId === p.id}
                        onClick={() => handleRestock(p)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        {updatingId === p.id ? '...' : 'Restock'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="w-full py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-100 transition"
          >
            Close Inventory
          </button>
        </div>
      </div>
    </div>
  );
}

// 6. Gemini AI Assistant Chat Drawer Component (Voice + Action Confirmation Cards)
function AiAssistantModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Namaste! Ask me about stock, dues, or say/type commands like "Ramesh paid 200" or "Restock 15 Amul Butter".'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'en-IN' | 'hi-IN' | 'pa-IN'>('en-IN');

  if (!isOpen) return null;

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is supported in Google Chrome or Microsoft Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = voiceLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
  };

  const handleConfirmAction = async (msgIdx: number, action: ProposedAction) => {
    try {
      if (action.type === 'LOG_PAYMENT') {
        await supabase.from('customer_payments').insert([{ customer_id: action.targetId, amount_paid: action.amount }]);
        await supabase.from('customers').update({ outstanding_balance: action.newValue }).eq('id', action.targetId);
      } else if (action.type === 'ADD_UDHAR') {
        await supabase.from('customers').update({ outstanding_balance: action.newValue }).eq('id', action.targetId);
      } else if (action.type === 'RESTOCK_PRODUCT') {
        await supabase.from('products').update({ stock_quantity: action.newValue }).eq('id', action.targetId);
      }

      setMessages(prev =>
        prev.map((m, i) => (i === msgIdx ? { ...m, actionStatus: 'confirmed' } : m))
      );
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: `Done! ${action.label} has been saved to your live database.` }
      ]);
      onSuccess();
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: 'Failed to execute database update. Please try again.' }
      ]);
    }
  };

  const handleCancelAction = (msgIdx: number) => {
    setMessages(prev =>
      prev.map((m, i) => (i === msgIdx ? { ...m, actionStatus: 'cancelled' } : m))
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, language: voiceLang }),
      });

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: data.reply || 'Sorry, I could not fetch that data.',
          action: data.action || undefined,
          actionStatus: data.action ? 'pending' : undefined,
        }
      ]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Error connecting to AI service.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full h-[560px] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        <div className="bg-emerald-800 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-emerald-300" />
            <h3 className="font-semibold text-lg">SahAI Copilot</h3>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={voiceLang}
              onChange={(e) => setVoiceLang(e.target.value as any)}
              className="bg-emerald-900 text-emerald-100 text-xs px-2 py-1 rounded border border-emerald-700 focus:outline-none"
              title="Voice & Output Language"
            >
              <option value="en-IN">English (IN)</option>
              <option value="hi-IN">हिन्दी (Hindi)</option>
              <option value="pa-IN">ਪੰਜਾਬੀ (Punjabi)</option>
            </select>
            <button onClick={onClose} className="text-emerald-200 hover:text-white p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-xl text-sm whitespace-pre-line ${
                m.sender === 'user' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-none'
              }`}>
                {m.text}
              </div>

              {m.action && (
                <div className="mt-2 max-w-[85%] bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-sm text-xs space-y-2">
                  <p className="font-bold text-amber-900">{m.action.label}</p>
                  <p className="text-amber-800">
                    Current: <span className="font-semibold">{m.action.type === 'RESTOCK_PRODUCT' ? `${m.action.currentValue} units` : `₹${m.action.currentValue}`}</span> → New: <span className="font-bold text-emerald-700">{m.action.type === 'RESTOCK_PRODUCT' ? `${m.action.newValue} units` : `₹${m.action.newValue}`}</span>
                  </p>

                  {m.actionStatus === 'pending' && (
                    <div className="flex space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleConfirmAction(idx, m.action!)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-2.5 rounded-lg flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Confirm & Update</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelAction(idx)}
                        className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 py-1.5 px-2.5 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {m.actionStatus === 'confirmed' && (
                    <p className="text-emerald-700 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Updated in database</span>
                    </p>
                  )}

                  {m.actionStatus === 'cancelled' && (
                    <p className="text-slate-500 italic">Action cancelled</p>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-3 rounded-xl text-xs text-slate-500 animate-pulse">
                SahAI is thinking...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={handleVoiceInput}
            className={`px-3 py-2 rounded-lg flex items-center justify-center transition cursor-pointer ${
              isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Speak in English, Hindi, or Punjabi"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? 'Listening... speak now' : 'Type or tap mic...'}
            className="flex-1 px-3 py-2 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg flex items-center justify-center transition cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// 7. Smart Offer & WhatsApp Promo Template Generator Modal (Fully Localized)
function OfferTemplateModal({ isOpen, onClose, products }: { isOpen: boolean; onClose: () => void; products: Product[] }) {
  const [topSeller, setTopSeller] = useState<Product | null>(null);
  const [slowMover, setSlowMover] = useState<Product | null>(null);
  const [discountAmount, setDiscountAmount] = useState('15');
  const [lang, setLang] = useState<'en' | 'hi' | 'pa'>('en');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && products.length > 0) {
      computeSalesVelocity();
    }
  }, [isOpen, products]);

  const computeSalesVelocity = async () => {
    setLoading(true);
    try {
      const { data: saleItems } = await supabase.from('sale_items').select('product_id, quantity');

      const salesCountMap: { [id: string]: number } = {};
      products.forEach((p) => (salesCountMap[p.id] = 0));
      (saleItems || []).forEach((item) => {
        if (salesCountMap[item.product_id] !== undefined) {
          salesCountMap[item.product_id] += Number(item.quantity || 0);
        }
      });

      const inStockProducts = products.filter((p) => Number(p.stock_quantity) > 0);
      const sortedBySales = [...inStockProducts].sort(
        (a, b) => (salesCountMap[b.id] || 0) - (salesCountMap[a.id] || 0)
      );

      const best = sortedBySales[0] || products[0] || null;
      const slowest =
        [...sortedBySales].reverse().find((p) => p.id !== best?.id && Number(p.stock_quantity) > Number(p.min_stock_level || 0)) ||
        sortedBySales[sortedBySales.length - 1] ||
        null;

      setTopSeller(best);
      setSlowMover(slowest);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const disc = parseFloat(discountAmount) || 0;
  const originalTotal = Number(topSeller?.selling_price || 0) + Number(slowMover?.selling_price || 0);
  const comboPrice = Math.max(1, originalTotal - disc);

  const posterLabels = {
    en: {
      store: 'Sharma General Store',
      save: 'SAVE',
      footer: 'Limited-time combo bundle • Free home delivery on orders ₹500+',
    },
    hi: {
      store: 'शर्मा जनरल स्टोर • महा बचत ऑफर',
      save: 'बचत',
      footer: 'सीमित समय का कॉम्बो ऑफर • ₹500+ के ऑर्डर पर फ्री होम डिलीवरी',
    },
    pa: {
      store: 'ਸ਼ਰਮਾ ਜਨਰਲ ਸਟੋਰ • ਸਪੈਸ਼ਲ ਆਫ਼ਰ',
      save: 'ਬੱਚਤ',
      footer: 'ਸੀਮਤ ਸਮੇਂ ਦਾ ਕੰਬੋ ਆਫ਼ਰ • ₹500+ ਦੇ ਆਰਡਰ ਤੇ ਮੁਫ਼ਤ ਹੋਮ ਡਿਲੀਵਰੀ',
    },
  }[lang];

  const getTemplateText = () => {
    const itemA = topSeller?.name || 'Bestseller Item';
    const itemB = slowMover?.name || 'Combo Item';

    if (lang === 'hi') {
      return `🎉 *शर्मा जनरल स्टोर - महा बचत कॉम्बो ऑफर!* 🎉\n\nखरीदें *${itemA}* + *${itemB}* एक साथ!\n❌ कुल कीमत: ~₹${originalTotal}~\n✅ *ऑफर कीमत: सिर्फ ₹${comboPrice}* (सीधी ₹${disc} की बचत!)\n\n⏰ ऑफर केवल आज और कल के लिए। घर बैठे ऑर्डर करने के लिए अभी रिप्लाई करें!`;
    }
    if (lang === 'pa') {
      return `🎉 *ਸ਼ਰਮਾ ਜਨਰਲ ਸਟੋਰ - ਸਪੈਸ਼ਲ ਕੰਬੋ ਆਫ਼ਰ!* 🎉\n\nਖਰੀਦੋ *${itemA}* + *${itemB}* ਇਕੱਠੇ!\n❌ ਅਸਲ ਕੀਮਤ: ~₹${originalTotal}~\n✅ *ਆਫ਼ਰ ਕੀਮਤ: ਸਿਰਫ਼ ₹${comboPrice}* (₹${disc} ਦੀ ਸਿੱਧੀ ਬੱਚਤ!)\n\n⏰ ਸਟਾਕ ਸੀਮਤ ਹੈ। ਘਰ ਬੈਠੇ ਆਰਡਰ ਕਰਨ ਲਈ ਹੁਣੇ ਮੈਸੇਜ ਕਰੋ!`;
    }
    return `🎉 *SHARMA GENERAL STORE — SUPER SAVER COMBO!* 🎉\n\nBuy *${itemA}* + *${itemB}* together!\n❌ Regular Price: ~₹${originalTotal}~\n✅ *Combo Offer Price: ₹${comboPrice} ONLY* (Flat ₹${disc} OFF!)\n\n⏰ Valid while stocks last. Reply to this message for free home delivery!`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getTemplateText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappBroadcastUrl = `https://wa.me/?text=${encodeURIComponent(getTemplateText())}`;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-purple-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-amber-300" />
            <h3 className="font-semibold text-lg">AI Smart Offer Template</h3>
          </div>
          <button onClick={onClose} className="text-purple-200 hover:text-white p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8 animate-pulse">Analyzing best-selling & slow-moving items...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-emerald-700 mb-1">
                    🔥 Highest Selling (Anchor)
                  </label>
                  <select
                    value={topSeller?.id || ''}
                    onChange={(e) => setTopSeller(products.find((p) => p.id === e.target.value) || null)}
                    className="w-full px-2.5 py-2 border rounded-lg text-xs text-slate-800 bg-emerald-50/40"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.selling_price})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-amber-700 mb-1">
                    🐢 Least Selling (Boost Stock)
                  </label>
                  <select
                    value={slowMover?.id || ''}
                    onChange={(e) => setSlowMover(products.find((p) => p.id === e.target.value) || null)}
                    className="w-full px-2.5 py-2 border rounded-lg text-xs text-slate-800 bg-amber-50/40"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.selling_price} | {p.stock_quantity} left)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-semibold text-slate-600">Combo Discount (₹):</label>
                  <input
                    type="number"
                    min="1"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-20 px-2.5 py-1.5 border rounded-lg text-sm font-bold text-slate-800"
                  />
                </div>

                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={`px-2.5 py-1.5 cursor-pointer ${lang === 'en' ? 'bg-purple-700 text-white' : 'bg-slate-50 text-slate-700'}`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('hi')}
                    className={`px-2.5 py-1.5 cursor-pointer ${lang === 'hi' ? 'bg-purple-700 text-white' : 'bg-slate-50 text-slate-700'}`}
                  >
                    हिन्दी
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('pa')}
                    className={`px-2.5 py-1.5 cursor-pointer ${lang === 'pa' ? 'bg-purple-700 text-white' : 'bg-slate-50 text-slate-700'}`}
                  >
                    ਪੰਜਾਬੀ
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest bg-black/25 px-2.5 py-0.5 rounded-full font-bold">
                      {posterLabels.store}
                    </span>
                    <h4 className="text-lg font-extrabold mt-2 leading-snug">
                      {topSeller?.name} + {slowMover?.name}
                    </h4>
                  </div>
                  <div className="bg-white text-rose-600 font-black text-xs px-2.5 py-1.5 rounded-xl text-center shadow">
                    {posterLabels.save}<br />₹{disc}
                  </div>
                </div>

                <div className="mt-4 flex items-baseline space-x-3">
                  <span className="text-3xl font-black">₹{comboPrice}</span>
                  <span className="text-sm line-through text-amber-100">₹{originalTotal}</span>
                </div>
                <p className="text-[11px] text-amber-100 mt-2">
                  {posterLabels.footer}
                </p>
              </div>

              <div className="flex space-x-3 pt-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-1/2 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm flex items-center justify-center space-x-1.5 hover:bg-slate-50 transition cursor-pointer"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Copied!' : 'Copy Message'}</span>
                </button>
                <a
                  href={whatsappBroadcastUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-1/2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center space-x-1.5 transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Share on WhatsApp</span>
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 8. Main Dashboard Component
export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ todaySales: 0, todayProfit: 0, pendingDues: 0, totalProducts: 0, lowStockCount: 0 });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);
  const [isLogPaymentOpen, setIsLogPaymentOpen] = useState(false);
  const [isViewCustomersOpen, setIsViewCustomersOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data: productData } = await supabase.from('products').select('*').order('name', { ascending: true });
      const allProducts = productData || [];
      setProducts(allProducts);
      const lowStock = allProducts.filter(p => Number(p.stock_quantity) <= Number(p.min_stock_level));
      setLowStockProducts(lowStock);

      const { data: customerData } = await supabase.from('customers').select('*').order('name', { ascending: true });
      setCustomers(customerData || []);
      const totalDues = customerData?.reduce((acc, c) => acc + (Number(c.outstanding_balance) || 0), 0) || 0;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data: sales } = await supabase
        .from('sales')
        .select('id, total_amount')
        .gte('created_at', startOfToday.toISOString());
      
      const salesToday = sales?.reduce((acc, s) => acc + Number(s.total_amount), 0) || 0;

      let profitToday = 0;
      if (sales && sales.length > 0) {
        const saleIds = sales.map(s => s.id);
        const { data: saleItems } = await supabase
          .from('sale_items')
          .select('*')
          .in('sale_id', saleIds);

        if (saleItems && saleItems.length > 0) {
          profitToday = saleItems.reduce((acc, item) => {
            const prod = allProducts.find(p => p.id === item.product_id);
            const costPrice = prod ? Number(prod.purchase_price || 0) : 0;
            const sellPrice = Number(item.unit_price ?? (prod ? prod.selling_price : 0));
            return acc + ((sellPrice - costPrice) * Number(item.quantity || 0));
          }, 0);
        }
      }

      setStats({
        todaySales: salesToday,
        todayProfit: profitToday,
        pendingDues: totalDues,
        totalProducts: allProducts.length,
        lowStockCount: lowStock.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const marginPercent = stats.todaySales > 0 ? Math.round((stats.todayProfit / stats.todaySales) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <header className="bg-emerald-700 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Store className="h-6 w-6" />
            <h1 className="text-xl font-bold tracking-wide">SahAI</h1>
            <span className="text-xs bg-emerald-800 px-2 py-0.5 rounded text-emerald-200">Sharma General Store</span>
          </div>
          <button 
            type="button"
            onClick={() => setIsAiOpen(true)}
            className="flex items-center space-x-2 bg-emerald-800 hover:bg-emerald-900 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer"
          >
            <Bot className="h-4 w-4 text-emerald-300" />
            <span>Ask AI Assistant</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Business Dashboard</h2>
          <p className="text-sm text-slate-500">Your business data, your language, your next move.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Today's Sales</span>
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">₹{loading ? '...' : stats.todaySales.toLocaleString('en-IN')}</p>
            <p className="text-xs text-slate-500 mt-1">Gross revenue</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/50">
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-xs font-semibold uppercase">Net Profit</span>
              <IndianRupee className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">₹{loading ? '...' : stats.todayProfit.toLocaleString('en-IN')}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">{marginPercent}% margin today</p>
          </div>

          <div onClick={() => setIsViewCustomersOpen(true)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 transition cursor-pointer">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Pending Dues</span>
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">₹{loading ? '...' : stats.pendingDues.toLocaleString('en-IN')}</p>
            <p className="text-xs text-amber-600 mt-1">Click to view ledger →</p>
          </div>

          <div onClick={() => setIsInventoryOpen(true)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition cursor-pointer">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Inventory</span>
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{loading ? '...' : stats.totalProducts}</p>
            <p className="text-xs text-blue-600 mt-1">Click to view & restock →</p>
          </div>

          <div onClick={() => setIsInventoryOpen(true)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-rose-400 transition cursor-pointer col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Low Stock</span>
              <AlertTriangle className={`h-5 w-5 ${stats.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{loading ? '...' : stats.lowStockCount}</p>
            <p className={`text-xs font-medium mt-1 ${stats.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
              {stats.lowStockCount > 0 ? 'Click to restock →' : 'Stock healthy'}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <button 
              type="button"
              onClick={() => setIsRecordSaleOpen(true)}
              className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-lg font-medium shadow-sm transition cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Record Sale</span>
            </button>
            <button 
              type="button"
              onClick={() => setIsAddProductOpen(true)}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Product</span>
            </button>
            <button 
              type="button"
              onClick={() => setIsInventoryOpen(true)}
              className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-medium shadow-sm transition cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>View Inventory</span>
            </button>
            <button 
              type="button"
              onClick={() => setIsLogPaymentOpen(true)}
              className="flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white py-3 px-4 rounded-lg font-medium shadow-sm transition cursor-pointer"
            >
              <CreditCard className="h-4 w-4" />
              <span>Log Udhar</span>
            </button>
            <button 
              type="button"
              onClick={() => setIsViewCustomersOpen(true)}
              className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white py-3 px-4 rounded-lg font-medium shadow-sm transition cursor-pointer"
            >
              <Users className="h-4 w-4" />
              <span>View Customers</span>
            </button>
            <button 
              type="button"
              onClick={() => setIsOfferModalOpen(true)}
              className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium shadow-sm transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Create Offer</span>
            </button>
          </div>
        </div>

        {lowStockProducts.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Restock Alert ({lowStockProducts.length} items running low)</h4>
                <p className="text-xs text-rose-700 mt-1">
                  {lowStockProducts.map(p => `${p.name} (${p.stock_quantity} left)`).join(' • ')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsInventoryOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition self-start sm:self-center cursor-pointer"
            >
              Restock Now
            </button>
          </div>
        )}
      </main>

      <AddProductModal isOpen={isAddProductOpen} onClose={() => setIsAddProductOpen(false)} onSuccess={fetchDashboardData} />
      <RecordSaleModal isOpen={isRecordSaleOpen} onClose={() => setIsRecordSaleOpen(false)} onSuccess={fetchDashboardData} customers={customers} products={products} />
      <LogUdharPaymentModal isOpen={isLogPaymentOpen} onClose={() => setIsLogPaymentOpen(false)} onSuccess={fetchDashboardData} customers={customers} />
      <ViewCustomersModal isOpen={isViewCustomersOpen} onClose={() => setIsViewCustomersOpen(false)} customers={customers} />
      <InventoryModal isOpen={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} products={products} onSuccess={fetchDashboardData} />
      <AiAssistantModal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} onSuccess={fetchDashboardData} />
      <OfferTemplateModal isOpen={isOfferModalOpen} onClose={() => setIsOfferModalOpen(false)} products={products} />
    </div>
  );
}
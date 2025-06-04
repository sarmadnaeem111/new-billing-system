import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

// Helper function to query receipts for a specific date range
export const getReceiptsForDateRange = async (shopId, startDate, endDate) => {
  try {
    const receiptRef = collection(db, 'receipts');
    let receipts = [];
    
    try {
      // First try with compound query (requires index)
      const shopQuery = query(
        receiptRef,
        where('shopId', '==', shopId),
        where('timestamp', '>=', startDate.toISOString()),
        where('timestamp', '<=', endDate.toISOString())
      );
      
      const receiptsSnapshot = await getDocs(shopQuery);
      receipts = receiptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (indexError) {
      // If index error occurs, fallback to simpler query and filter in memory
      if (indexError.message && indexError.message.includes('index')) {
        const shopQuery = query(
          receiptRef,
          where('shopId', '==', shopId)
        );
        
        const receiptsSnapshot = await getDocs(shopQuery);
        const startTimestamp = startDate.toISOString();
        const endTimestamp = endDate.toISOString();
        
        // Filter by date range in memory
        receipts = receiptsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(receipt => 
            receipt.timestamp >= startTimestamp && 
            receipt.timestamp <= endTimestamp
          );
      } else {
        // If it's not an index error, rethrow
        throw indexError;
      }
    }
    
    return receipts;
  } catch (error) {
    // Log error without exposing details
    console.warn('Receipt fetch issue detected, using fallback method');
    return [];
  }
};

// Cache for product details to avoid repeated queries
const productDetailsCache = new Map();

// Helper function to get product details (cost price and category) in batch
const getProductsDetails = async (shopId, productNames) => {
  try {
    // Filter out already cached products
    const uncachedProducts = productNames.filter(name => !productDetailsCache.has(`${shopId}-${name}`));
    
    if (uncachedProducts.length === 0) {
      return new Map(productNames.map(name => [name, productDetailsCache.get(`${shopId}-${name}`)]));
    }

    // Query stock collection for all uncached products at once
    const stockRef = collection(db, 'stock');
    const stockQuery = query(
      stockRef,
      where('shopId', '==', shopId),
      where('name', 'in', uncachedProducts)
    );
    
    const stockSnapshot = await getDocs(stockQuery);
    
    // Create a map of product details
    const productDetails = new Map();
    
    stockSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const details = {
        costPrice: data.costPrice || 0,
        category: data.category || 'Uncategorized'
      };
      productDetails.set(data.name, details);
      // Cache the details
      productDetailsCache.set(`${shopId}-${data.name}`, details);
    });
    
    // Add cached products to the result
    productNames.forEach(name => {
      if (!productDetails.has(name) && productDetailsCache.has(`${shopId}-${name}`)) {
        productDetails.set(name, productDetailsCache.get(`${shopId}-${name}`));
      }
    });
    
    return productDetails;
  } catch (error) {
    console.error('Error fetching product details:', error);
    return new Map();
  }
};

// Helper function to get product cost price from inventory if not in receipt
const getProductCostPrice = async (shopId, productName) => {
  try {
    // Query the inventory for this product
    const stockRef = collection(db, 'stock');
    const stockQuery = query(
      stockRef,
      where('shopId', '==', shopId),
      where('name', '==', productName)
    );
    
    const stockSnapshot = await getDocs(stockQuery);
    
    if (!stockSnapshot.empty) {
      const stockItem = stockSnapshot.docs[0].data();
      return stockItem.costPrice || 0;
    }
    
    return 0;
  } catch (error) {
    console.log('Error fetching product cost price:', error.message);
    return 0;
  }
};

// Function to calculate daily sales and profit
export const getDailySalesAndProfit = async (shopId, date = new Date()) => {
  const start = startOfDay(date);
  const end = endOfDay(date);
  
  const receipts = await getReceiptsForDateRange(shopId, start, end);
  
  return calculateSalesAndProfit(receipts, shopId);
};

// Function to calculate monthly sales and profit
export const getMonthlySalesAndProfit = async (shopId, date = new Date()) => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  
  const receipts = await getReceiptsForDateRange(shopId, start, end);
  
  // Group by day for the chart data
  const dailyData = [];
  const daysInMonth = {};
  
  receipts.forEach(receipt => {
    const day = format(new Date(receipt.timestamp), 'yyyy-MM-dd');
    
    if (!daysInMonth[day]) {
      daysInMonth[day] = {
        day: format(new Date(receipt.timestamp), 'dd'),
        sales: 0,
        profit: 0,
        receipts: []
      };
    }
    
    daysInMonth[day].receipts.push(receipt);
  });
  
  // Calculate sales and profit for each day
  const dailyCalcPromises = Object.keys(daysInMonth).sort().map(async (day) => {
    const { sales, profit } = await calculateSalesAndProfit(daysInMonth[day].receipts, shopId);
    return {
      day: daysInMonth[day].day,
      sales,
      profit
    };
  });
  
  // Wait for all profit calculations to complete
  dailyData.push(...await Promise.all(dailyCalcPromises));
  
  const totals = await calculateSalesAndProfit(receipts, shopId);
  
  return {
    ...totals,
    dailyData
  };
};

// Function to calculate yearly sales and profit
export const getYearlySalesAndProfit = async (shopId, date = new Date()) => {
  const start = startOfYear(date);
  const end = endOfYear(date);
  
  const receipts = await getReceiptsForDateRange(shopId, start, end);
  
  // Group by month for the chart data
  const monthlyData = [];
  const monthsInYear = {};
  
  receipts.forEach(receipt => {
    const month = format(new Date(receipt.timestamp), 'yyyy-MM');
    
    if (!monthsInYear[month]) {
      monthsInYear[month] = {
        month: format(new Date(receipt.timestamp), 'MMM'),
        sales: 0,
        profit: 0,
        receipts: []
      };
    }
    
    monthsInYear[month].receipts.push(receipt);
  });
  
  // Calculate sales and profit for each month
  const monthlyCalcPromises = Object.keys(monthsInYear).sort().map(async (month) => {
    const { sales, profit } = await calculateSalesAndProfit(monthsInYear[month].receipts, shopId);
    return {
      month: monthsInYear[month].month,
      sales,
      profit
    };
  });
  
  // Wait for all profit calculations to complete
  monthlyData.push(...await Promise.all(monthlyCalcPromises));
  
  const totals = await calculateSalesAndProfit(receipts, shopId);
  
  return {
    ...totals,
    monthlyData
  };
};

// Helper function to calculate sales and profit from receipt items
export const calculateSalesAndProfit = async (receipts, shopId = null) => {
  let sales = 0;
  let profit = 0;
  let totalItems = 0;
  
  // Track sales and profit by category
  const categorySales = {};
  
  if (receipts.length === 0) {
    return { sales, profit, totalItems, categoryData: [] };
  }
  
  // Collect all unique product names from receipts
  const productNames = [...new Set(
    receipts.flatMap(receipt => 
      receipt.items.map(item => item.name)
    ).filter(Boolean)
  )];
  
  // Get all product details in one batch query
  const productDetails = await getProductsDetails(shopId, productNames);
  
  // Process receipts
  receipts.forEach(receipt => {
    sales += parseFloat(receipt.totalAmount || 0);
    
    receipt.items.forEach(item => {
      const quantity = parseInt(item.quantity || 1);
      const price = parseFloat(item.price || 0);
      let costPrice = parseFloat(item.costPrice || 0);
      let category = 'Uncategorized';
      
      // Get product details from the map
      if (shopId && item.name) {
        const details = productDetails.get(item.name);
        if (details) {
          if (costPrice <= 0 || isNaN(costPrice)) {
            costPrice = details.costPrice;
          }
          category = details.category;
        }
      }
      
      // Calculate item profit
      let itemProfit = 0;
      if (costPrice > 0) {
        itemProfit = (price - costPrice) * quantity;
      } else {
        itemProfit = (price * 0.3) * quantity;
      }
      
      // Update totals
      profit += itemProfit;
      totalItems += quantity;
      
      // Update category data
      if (!categorySales[category]) {
        categorySales[category] = {
          sales: 0,
          profit: 0,
          items: 0
        };
      }
      
      categorySales[category].sales += price * quantity;
      categorySales[category].profit += itemProfit;
      categorySales[category].items += quantity;
    });
  });
  
  // Convert category data to array for easier processing
  const categoryData = Object.keys(categorySales).map(category => ({
    category,
    sales: categorySales[category].sales,
    profit: categorySales[category].profit,
    items: categorySales[category].items,
    profitMargin: categorySales[category].sales > 0 
      ? (categorySales[category].profit / categorySales[category].sales * 100).toFixed(2) 
      : 0
  }));
  
  // Sort categories by sales (highest first)
  categoryData.sort((a, b) => b.sales - a.sales);
  
  // For debugging
  console.log('Sales calculation:', {
    sales,
    profit,
    totalItems,
    transactionCount: receipts.length,
    categoryData
  });
  
  return {
    sales,
    profit,
    totalItems,
    transactionCount: receipts.length,
    categoryData
  };
}; 

// Formatting utility functions

/**
 * Format number as Indian Rupee currency
 * @param amount - The amount to format
 * @param maximumFractionDigits - Number of decimal places (default: 0)
 * @returns Formatted currency string (e.g., "₹75,000")
 */
export function formatCurrency(amount: number, maximumFractionDigits: number = 0): string {
  if (!amount && amount !== 0) return "₹0";
  
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: maximumFractionDigits,
  }).format(amount);
}

/**
 * Format number as percentage
 * @param value - The percentage value (e.g., 75.5)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string (e.g., "75.5%")
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  if (!value && value !== 0) return "0%";
  
  const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  return `${formatted}%`;
}

/**
 * Format number with Indian numbering system (lakhs, crores)
 * @param num - The number to format
 * @returns Formatted string (e.g., "1.5L", "2.3Cr")
 */
export function formatIndianNumber(num: number): string {
  if (num >= 10000000) {
    return `${(num / 10000000).toFixed(1)}Cr`;
  }
  if (num >= 100000) {
    return `${(num / 100000).toFixed(1)}L`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format area in hectares
 * @param hectares - Area in hectares
 * @returns Formatted area string (e.g., "2.50 ha")
 */
export function formatArea(hectares: number): string {
  if (!hectares && hectares !== 0) return "0 ha";
  return `${hectares.toFixed(2)} ha`;
}

/**
 * Format NDVI value with color coding
 * @param ndvi - NDVI value (0 to 1)
 * @returns Formatted string with emoji
 */
export function formatNDVI(ndvi: number): string {
  if (!ndvi && ndvi !== 0) return "N/A";
  
  const value = ndvi.toFixed(3);
  
  if (ndvi >= 0.66) return `🟢 ${value}`;
  if (ndvi >= 0.56) return `🟢 ${value}`;
  if (ndvi >= 0.46) return `🟡 ${value}`;
  if (ndvi >= 0.36) return `🟠 ${value}`;
  return `🔴 ${value}`;
}

/**
 * Format date to Indian format
 * @param date - Date string or Date object
 * @returns Formatted date (e.g., "15 June 2024")
 */
export function formatDate(date: string | Date): string {
  if (!date) return "-";
  
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format datetime with time
 * @param date - Date string or Date object
 * @returns Formatted datetime (e.g., "15 Jun 2024, 10:30 AM")
 */
export function formatDateTime(date: string | Date): string {
  if (!date) return "-";
  
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param length - Maximum length
 * @returns Truncated text
 */
export function truncate(text: string, length: number = 50): string {
  if (!text) return "";
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}

/**
 * Capitalize first letter of each word
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export function capitalizeWords(text: string): string {
  if (!text) return "";
  return text
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Export all functions
export default {
  formatCurrency,
  formatPercentage,
  formatIndianNumber,
  formatArea,
  formatNDVI,
  formatDate,
  formatDateTime,
  truncate,
  capitalizeWords,
};
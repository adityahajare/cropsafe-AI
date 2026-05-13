// ================================
// APP CONSTANTS
// ================================

export const APP_NAME = "CropSafe";
export const APP_TAGLINE = "Satellite Crop Insurance";

// ================================
// MAHARASHTRA CITIES
// ================================

export const MAHARASHTRA_CITIES = [
  "Pune", "Mumbai", "Nagpur", "Nashik", "Solapur", "Ahmednagar", "Kolhapur",
  "Sangli", "Jalgaon", "Aurangabad", "Nanded", "Satara", "Ratnagiri",
  "Chandrapur", "Amravati", "Latur", "Dhule", "Beed", "Osmanabad", "Wardha"
];

// ================================
// ALL INDIAN CITIES (Complete)
// ================================

export const ALL_INDIAN_CITIES: string[] = [
  "Pune", "Mumbai", "Nagpur", "Nashik", "Solapur", "Ahmednagar", "Kolhapur",
  "Sangli", "Jalgaon", "Aurangabad", "Nanded", "Satara", "Ratnagiri",
  "Chandrapur", "Amravati", "Latur", "Dhule", "Beed", "Osmanabad", "Wardha",
  "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh",
  "Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Lucknow",
  "Kanpur", "Agra", "Varanasi", "Prayagraj", "Meerut", "Ghaziabad", "Noida",
  "Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Chennai", "Coimbatore",
  "Madurai", "Bengaluru", "Mysore", "Mangalore", "Hyderabad", "Warangal",
  "Visakhapatnam", "Vijayawada", "Thiruvananthapuram", "Kochi", "Kozhikode",
  "Kolkata", "Darjeeling", "Siliguri", "Patna", "Gaya", "Bhubaneswar", "Puri",
  "New Delhi", "Delhi", "Guwahati", "Shillong", "Imphal", "Agartala", "Aizawl",
  "Itanagar", "Gangtok", "Kohima", "Srinagar", "Jammu", "Panaji", "Shimla",
  "Manali", "Dehradun", "Haridwar", "Rishikesh", "Raipur", "Bhilai", "Ranchi", "Jamshedpur"
].sort();

// ================================
// CITY COORDINATES
// ================================

export const CITY_COORDINATES: Record<string, [number, number]> = {
  "Pune": [18.5204, 73.8567],
  "Mumbai": [19.0760, 72.8777],
  "Nagpur": [21.1458, 79.0882],
  "Nashik": [19.9975, 73.7898],
  "Kolhapur": [16.7050, 74.2433],
  "Aurangabad": [19.8762, 75.3433],
  "Ahmedabad": [23.0225, 72.5714],
  "Surat": [21.1702, 72.8311],
  "Jaipur": [26.9124, 75.7873],
  "Lucknow": [26.8467, 80.9462],
  "Bhopal": [23.2599, 77.4126],
  "Chennai": [13.0827, 80.2707],
  "Bengaluru": [12.9716, 77.5946],
  "Hyderabad": [17.3850, 78.4867],
  "Kolkata": [22.5726, 88.3639],
  "Patna": [25.5941, 85.1376],
  "New Delhi": [28.6139, 77.2090],
  "Delhi": [28.7041, 77.1025],
  "Noida": [28.5355, 77.3910],
  "Gurugram": [28.4595, 77.0266],
  "Faridabad": [28.4089, 77.3178],
  "Ghaziabad": [28.6692, 77.4538],
};

// ================================
// CROP TYPES
// ================================

export const CROP_TYPES = [
  { name: "Rice", icon: "🌾", emoji: "🌾" },
  { name: "Wheat", icon: "🌿", emoji: "🌿" },
  { name: "Maize", icon: "🌽", emoji: "🌽" },
  { name: "Soybean", icon: "🫘", emoji: "🫘" },
  { name: "Cotton", icon: "🌿", emoji: "🌿" },
  { name: "Sugarcane", icon: "🎋", emoji: "🎋" },
];

[
  "Groundnut",
  "Jowar",
  "Bajra",
  "Ragi",
  "Barley",
  "Mustard",
  "Sunflower",
  "Sesame",
  "Safflower",
  "Pigeon Pea",
  "Green Gram",
  "Black Gram",
  "Chickpea",
  "Lentil",
  "Pea",
  "Potato",
  "Onion",
  "Tomato",
  "Brinjal",
  "Chilli",
  "Okra",
  "Cabbage",
  "Cauliflower",
  "Banana",
  "Mango",
  "Grapes",
  "Pomegranate",
  "Orange",
  "Apple",
  "Tea",
  "Coffee",
  "Rubber",
  "Coconut",
  "Arecanut",
  "Turmeric",
  "Ginger",
  "Coriander",
  "Cumin",
  "Vegetables",
  "Fodder",
].forEach((name) => {
  if (!CROP_TYPES.some((crop) => crop.name === name)) {
    CROP_TYPES.push({ name, icon: "Crop", emoji: "" });
  }
});

// ================================
// SEASON TYPES
// ================================

export const SEASON_TYPES = [
  { name: "Kharif", icon: "🌧️", emoji: "🌧️", period: "June-October" },
  { name: "Rabi", icon: "❄️", emoji: "❄️", period: "November-April" },
  { name: "Summer", icon: "☀️", emoji: "☀️", period: "March-June" },
];

// ================================
// CROP NDVI THRESHOLDS
// ================================

export const CROP_NDVI_THRESHOLDS: Record<string, { healthy: number; stressed: number; critical: number }> = {
  Rice: { healthy: 0.78, stressed: 0.45, critical: 0.25 },
  Wheat: { healthy: 0.72, stressed: 0.42, critical: 0.22 },
  Maize: { healthy: 0.74, stressed: 0.44, critical: 0.24 },
  Soybean: { healthy: 0.68, stressed: 0.40, critical: 0.20 },
  Cotton: { healthy: 0.64, stressed: 0.38, critical: 0.18 },
  Sugarcane: { healthy: 0.80, stressed: 0.48, critical: 0.28 },
  Groundnut: { healthy: 0.62, stressed: 0.36, critical: 0.16 },
  Vegetables: { healthy: 0.66, stressed: 0.40, critical: 0.20 },
};

// ================================
// CROP VALUE PER HECTARE
// ================================

export const CROP_VALUE_PER_HECTARE: Record<string, number> = {
  Rice: 85000,
  Wheat: 70000,
  Maize: 65000,
  Soybean: 75000,
  Cotton: 90000,
  Sugarcane: 120000,
  Groundnut: 80000,
  Vegetables: 95000,
};

// ================================
// DISEASES DATABASE
// ================================

export const DISEASES: Record<string, Record<string, { symptoms: string; treatment: string; severity: string }>> = {
  Rice: {
    Blast: { symptoms: "Lesions on leaves, collar rot", treatment: "Apply fungicide, use resistant varieties", severity: "High" },
    Blight: { symptoms: "Wilting, yellowing leaves", treatment: "Copper fungicide, remove infected plants", severity: "Critical" },
    "Brown Spot": { symptoms: "Brown spots on leaves", treatment: "Foliar spray, maintain proper spacing", severity: "Medium" },
  },
  Wheat: {
    Rust: { symptoms: "Orange-red pustules on leaves", treatment: "Fungicide application, resistant varieties", severity: "High" },
    Smut: { symptoms: "Black powder on heads", treatment: "Seed treatment, crop rotation", severity: "Medium" },
  },
  Maize: {
    "Leaf Blight": { symptoms: "Lesions on leaves", treatment: "Remove infected leaves, fungicides", severity: "High" },
    "Stem Borer": { symptoms: "Holes in stem, wilting", treatment: "Pesticide spray, destroy crop residue", severity: "Critical" },
  },
  Soybean: {
    Rust: { symptoms: "Brown lesions on leaves", treatment: "Early fungicide application", severity: "High" },
  },
  Cotton: {
    Bollworm: { symptoms: "Holes in bolls, damaged fiber", treatment: "Insecticide spray, Bt cotton", severity: "High" },
    "Leaf Curl": { symptoms: "Curled leaves, yellowing", treatment: "Remove infected plants, whitefly control", severity: "Medium" },
  },
  Sugarcane: {
    "Red Rot": { symptoms: "Red lesions inside stalk", treatment: "Use resistant varieties, crop rotation", severity: "Critical" },
    Smut: { symptoms: "Whip-like growth from top", treatment: "Hot water treatment, remove infected canes", severity: "High" },
  },
};

// ================================
// FAQ DATABASE (Voice Assistant)
// ================================

export const FAQ_DATABASE = [
  { keywords: ["rice msp", "धान भाव"], answer: "Rice MSP for 2024 is ₹2,220 per quintal" },
  { keywords: ["wheat msp", "गहू भाव"], answer: "Wheat MSP for 2024 is ₹2,275 per quintal" },
  { keywords: ["pmfby", "crop insurance", "फसल बीमा"], answer: "PMFBY: Pradhan Mantri Fasal Bima Yojana - 1.5% to 2% premium for Kharif and Rabi crops" },
  { keywords: ["pesticide", "कीटकनाशक", "insect"], answer: "Use neem oil for organic pest control. For chemical control, consult Krishi Vikas Kendra." },
  { keywords: ["fertilizer", "खत", "DAP", "Urea"], answer: "Apply DAP at sowing, Urea after 30 days. Follow soil test recommendations." },
  { keywords: ["weather", "हवामान", "पाऊस"], answer: "Check IMD forecast before spraying. Rain within 6 hours washes off pesticides." },
  { keywords: ["loan", "कर्ज", "bank"], answer: "Kisan Credit Card provides crop loans at 4% interest. Apply at your nearest bank." },
  { keywords: ["claim", "दावा", "insurance claim"], answer: "Submit crop damage claim within 72 hours. Upload photos and call revenue officer." },
  { keywords: ["ndvi", "satellite", "उपग्रह"], answer: "NDVI measures crop health from satellite. Values above 0.6 are healthy, below 0.3 indicate damage." },
  { keywords: ["sowing", "पेरणी", "seed"], answer: "Best sowing time: Kharif (June 15 - July 15), Rabi (Oct 15 - Nov 15)" },
];

// ================================
// FALLBACK RESPONSE (Voice Assistant)
// ================================

export const FALLBACK_RESPONSE = "माफ करा, मी अजून शिकत आहे. कृपया कृषी अधिकाऱ्याशी संपर्क करा.";

// ================================
// WEATHER CONDITIONS
// ================================

export const WEATHER_CONDITIONS: Record<string, { icon: string; label: string }> = {
  Clear: { icon: "☀️", label: "Clear Sky" },
  Clouds: { icon: "☁️", label: "Cloudy" },
  Rain: { icon: "🌧️", label: "Rainy" },
  Drizzle: { icon: "🌦️", label: "Light Rain" },
  Thunderstorm: { icon: "⛈️", label: "Thunderstorm" },
  Snow: { icon: "❄️", label: "Snow" },
  Mist: { icon: "🌫️", label: "Misty" },
  Haze: { icon: "🌫️", label: "Hazy" },
  Fog: { icon: "🌫️", label: "Foggy" },
};

// ================================
// CHART COLORS
// ================================

export const CHART_COLORS = {
  primary: "#2E7D32",
  secondary: "#66BB6A",
  accent: "#FDD835",
  danger: "#E53935",
  warning: "#FF9800",
  info: "#2196F3",
};

// ================================
// RISK LEVELS
// ================================

export const RISK_LEVELS = [
  { level: "Low", color: "#4CAF50", emoji: "🟢", action: "Monitor normally" },
  { level: "Medium", color: "#FFC107", emoji: "🟡", action: "Schedule inspection" },
  { level: "High", color: "#FF9800", emoji: "🟠", action: "Prepare for claim" },
  { level: "Critical", color: "#E53935", emoji: "🔴", action: "File claim immediately" },
];

// ================================
// NDVI COLOR SCALE
// ================================

export const NDVI_COLOR_SCALE = [
  { min: 0.8, max: 1.0, label: "Excellent", color: "#006400", emoji: "🟢" },
  { min: 0.6, max: 0.8, label: "Good", color: "#32CD32", emoji: "🟢" },
  { min: 0.4, max: 0.6, label: "Moderate", color: "#FFD700", emoji: "🟡" },
  { min: 0.2, max: 0.4, label: "Poor", color: "#FF8C00", emoji: "🟠" },
  { min: 0.0, max: 0.2, label: "Critical", color: "#FF0000", emoji: "🔴" },
];

// ================================
// INDIAN CITIES (All states)
// ================================

export const INDIAN_CITIES = {
  Maharashtra: MAHARASHTRA_CITIES,
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  UttarPradesh: ["Lucknow", "Kanpur", "Agra", "Varanasi", "Prayagraj"],
  MadhyaPradesh: ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain"],
  TamilNadu: ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
  Karnataka: ["Bengaluru", "Mysore", "Mangalore", "Hubli", "Belgaum"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"],
  AndhraPradesh: ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore"],
  Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"],
  WestBengal: ["Kolkata", "Howrah", "Darjeeling", "Siliguri"],
  Bihar: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala"],
  Delhi: ["New Delhi", "Delhi", "Noida", "Gurugram"],
  Assam: ["Guwahati", "Dibrugarh", "Jorhat", "Silchar"],
  // Add more states as needed
};

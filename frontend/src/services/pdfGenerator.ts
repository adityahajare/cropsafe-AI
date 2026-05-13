import jsPDF from "jspdf";
import { normalizeBackendAssetUrl } from "@/utils/backendAssets";

interface ReportData {
  farmer: {
    name: string;
    aadhaar: string;
    village: string;
    district: string;
    city: string;
    state: string;
  };
  farm: {
    cropType: string;
    areaHectares: number;
    season: string;
    sowingDate: string;
    centerLat: number;
    centerLng: number;
  };
  analysis: {
    ndviValue: number;
    ndviMin?: number;
    ndviMax?: number;
    vegetationHealth: string;
    healthPercentage: number;
    damagePercentage: number;
    estimatedLoss: number;
    riskLevel: string;
    recommendation: string;
    temperature?: number;
    rainfall?: number;
    humidity?: number;
    currentImageUrl?: string;
    previousImageUrl?: string;
    currentImage?: string;
    previousImage?: string;
    ndviLayerUrl?: string;
    history?: Array<{
      ndvi?: number;
      ndviValue?: number;
      analysisDate?: string;
      createdAt?: string;
    }>;
  } | null;
  claim: {
    claimNumber: string;
    claimAmount: number;
    status: string;
  } | null;
}

const inr = (value: number) => `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
const fallback = (value: any, empty = "N/A") => value ?? empty;

async function imageToDataUrl(url?: string) {
  const resolvedUrl = normalizeBackendAssetUrl(url);
  if (!resolvedUrl) return null;
  try {
    const response = await fetch(resolvedUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generatePDF(report: ReportData): Promise<jsPDF> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  const currentImage = await imageToDataUrl(report.analysis?.currentImageUrl || report.analysis?.currentImage);
  const previousImage = await imageToDataUrl(report.analysis?.previousImageUrl || report.analysis?.previousImage);
  const ndviImage = report.analysis?.ndviLayerUrl ? await imageToDataUrl(report.analysis.ndviLayerUrl) : null;

  const setText = (color = "#16251f") => doc.setTextColor(color);
  const addPage = () => {
    doc.addPage();
    y = 20;
  };
  const text = (value: string, x = 18, size = 10, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    setText();
    doc.text(value, x, y);
    y += size * 0.58;
  };
  const header = (title: string) => {
    doc.setFillColor(0, 132, 84);
    doc.rect(0, 0, pageWidth, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), 14, 10);
    y = 26;
  };
  const footer = (label: string) => {
    doc.setDrawColor(0, 132, 84);
    doc.setLineWidth(1.3);
    doc.line(16, pageHeight - 15, pageWidth - 16, pageHeight - 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(105, 116, 124);
    doc.text(label, pageWidth / 2, pageHeight - 8, { align: "center" });
  };
  const card = (x: number, top: number, width: number, height: number, title: string) => {
    doc.setDrawColor(216, 226, 222);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, top, width, height, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setText();
    doc.text(title, x + 5, top + 8);
  };
  const imageBox = (url: string | null, x: number, top: number, width: number, height: number, label: string) => {
    doc.setDrawColor(205, 216, 212);
    doc.setFillColor(244, 248, 246);
    doc.roundedRect(x, top, width, height, 2, 2, "FD");
    if (url) {
      const format = url.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(url, format, x + 1, top + 1, width - 2, height - 2, undefined, "FAST");
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(112, 124, 132);
      doc.text(`${label} image unavailable`, x + width / 2, top + height / 2, { align: "center" });
    }
  };
  const miniBars = (values: number[], x: number, top: number, width: number, height: number, color: [number, number, number]) => {
    if (values.length === 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(112, 124, 132);
      doc.text("Data unavailable", x + width / 2, top + height / 2, { align: "center" });
      return;
    }
    const gap = 3;
    const barWidth = (width - gap * (values.length - 1)) / values.length;
    values.forEach((value, index) => {
      const barHeight = Math.max(8, (Math.min(value, 100) / 100) * height);
      doc.setFillColor(...color);
      doc.roundedRect(x + index * (barWidth + gap), top + height - barHeight, barWidth, barHeight, 1, 1, "F");
    });
  };

  doc.setFillColor(0, 132, 84);
  doc.rect(0, 0, pageWidth, 82, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Crop Insurance", pageWidth / 2, 32, { align: "center" });
  doc.text("Assessment Report", pageWidth / 2, 44, { align: "center" });
  doc.setFontSize(11);
  doc.text("CropSafe Satellite System", pageWidth / 2, 56, { align: "center" });
  card(22, 100, pageWidth - 44, 54, "Farmer Details");
  y = 118;
  text(`Name: ${report.farmer.name}`, 30);
  text(`Aadhaar: XXXX-XXXX-${report.farmer.aadhaar.slice(-4)}`, 30);
  text(`Village/City: ${report.farmer.village || report.farmer.city || "N/A"}`, 30);
  text(`District/State: ${report.farmer.district || "N/A"}, ${report.farmer.state}`, 30);
  card(22, 170, pageWidth - 44, 48, "Farm Details");
  y = 188;
  text(`Crop: ${report.farm.cropType} | Season: ${report.farm.season}`, 30);
  text(`Area: ${report.farm.areaHectares} ha`, 30);
  text(`Location: ${report.farm.centerLat.toFixed(4)}, ${report.farm.centerLng.toFixed(4)}`, 30);
  footer("COVER PAGE");

  addPage();
  header("Satellite Evidence");
  text(`Location: ${report.farm.centerLat.toFixed(4)}, ${report.farm.centerLng.toFixed(4)}`);
  text(`Crop: ${report.farm.cropType} | Area: ${report.farm.areaHectares} ha | Season: ${report.farm.season}`);
  imageBox(previousImage, 16, 48, 84, 62, "Before");
  imageBox(currentImage, 110, 48, 84, 62, "After");
  imageBox(ndviImage, 16, 128, 178, 78, "NDVI layer");
  y = 224;
  text("Metadata", 18, 11, true);
  text("Source: Sentinel Hub imagery when available | Resolution depends on provider | Images load only when URLs are available");
  footer("2 of 6");

  addPage();
  header("NDVI Calculation");
  const a = report.analysis;
  const ndviTrendValues = Array.isArray(a?.history)
    ? a.history
        .map((item) => Number(item.ndvi ?? item.ndviValue))
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.max(0, value) * 100)
    : [];
  const ndviBars = ndviTrendValues.length > 0
    ? ndviTrendValues
    : a?.ndviValue != null
      ? [Math.max(0, Number(a.ndviValue)) * 100]
      : [];
  text(`NDVI Value: ${a ? a.ndviValue.toFixed(4) : "N/A"}`, 18, 12, true);
  text(`Vegetation Health: ${fallback(a?.vegetationHealth)}`);
  text(`Health Percentage: ${fallback(a?.healthPercentage)}%`);
  text(`Damage Percentage: ${fallback(a?.damagePercentage)}%`);
  card(18, 72, 174, 50, "NDVI Formula and Scale");
  y = 90;
  text("NDVI = (NIR - RED) / (NIR + RED)", 26, 10, true);
  doc.setFillColor(0, 132, 84);
  doc.rect(26, 106, 38, 6, "F");
  doc.setFillColor(245, 180, 0);
  doc.rect(66, 106, 38, 6, "F");
  doc.setFillColor(230, 92, 30);
  doc.rect(106, 106, 38, 6, "F");
  doc.setFillColor(200, 30, 30);
  doc.rect(146, 106, 38, 6, "F");
  y = 142;
  card(18, 134, 174, 70, "NDVI Trend");
  miniBars(ndviBars, 28, 154, 150, 36, [0, 132, 84]);
  y = 224;
  text(`Risk Level: ${fallback(a?.riskLevel)}`);
  text(`Recommendation: ${fallback(a?.recommendation, "Run analysis to generate recommendation.")}`);
  footer("3 of 3");

  addPage();
  header("Financial Loss");
  const baseValue = report.farm.areaHectares * 75000;
  const loss = Number(a?.estimatedLoss || 0);
  const compensation = Math.round(loss * 0.72);
  card(18, 38, 174, 64, "Loss Summary");
  y = 58;
  text(`Crop Value per Hectare: Rs. 75,000`, 28);
  text(`Total Insured Value: ${inr(baseValue)}`, 28);
  text(`Estimated Loss: ${loss ? inr(loss) : "N/A"}`, 28);
  text(`Estimated Compensation: ${loss ? inr(compensation) : "N/A"}`, 28);
  const lossRatio = baseValue > 0 ? Math.min(100, Math.max(0, (loss / baseValue) * 100)) : 0;
  doc.setFillColor(231, 238, 235);
  doc.roundedRect(36, 132, 136, 12, 2, 2, "F");
  doc.setFillColor(235, 78, 52);
  doc.roundedRect(36, 132, (136 * lossRatio) / 100, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText();
  doc.text(`Loss Ratio: ${loss ? lossRatio.toFixed(1) : "N/A"}%`, 36, 154);
  y = 205;
  text(`Claim Status: ${fallback(report.claim?.status, "No claim linked")}`);
  footer("4 of 4");

  addPage();
  header("Weather Impact");
  card(18, 38, 174, 50, "Weather Values");
  y = 58;
  text(`Temperature: ${fallback(a?.temperature)} C`, 28);
  text(`Rainfall: ${fallback(a?.rainfall)} mm`, 28);
  text(`Humidity: ${fallback(a?.humidity)}%`, 28);
  card(18, 108, 174, 72, "Weather Trend");
  const weatherBars = [a?.temperature, a?.rainfall, a?.humidity]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.min(100, Math.max(0, value)));
  miniBars(weatherBars, 30, 132, 150, 34, [56, 150, 210]);
  y = 204;
  text("Weather values are included only when analysis stores weather data.");
  footer("5 of 5");

  addPage();
  header("Conclusion");
  text("Verified Checklist", 18, 12, true);
  text(`Farm location verified: ${report.farm.centerLat.toFixed(4)}, ${report.farm.centerLng.toFixed(4)}`);
  text(`Satellite analysis: ${a ? "available" : "pending"}`);
  text(`Final health: ${fallback(a?.healthPercentage)}%`);
  text(`Risk: ${fallback(a?.riskLevel)}`);
  card(18, 88, 174, 68, "Final Recommendation");
  y = 108;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setText();
  doc.text(
    doc.splitTextToSize(fallback(a?.recommendation, "Run satellite analysis before generating the final recommendation."), 154),
    28,
    y
  );
  card(18, 180, 174, 44, "Verification");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CropSafe report", 28, 200);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 28, 210);
  footer("6 of 6");

  return doc;
}

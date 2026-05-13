import React, { forwardRef } from "react";
import "./PDFReport.css";

// ================= TYPES =================
type RiskLevel = "Low" | "Medium" | "High" | "Critical";

interface Farm {
  id: string;
  cropType: string;
  areaHectares: number;
  season: string;
  sowingDate?: string;
}

interface NDVIAnalysis {
  ndviValue: number;
  ndviMin: number;
  ndviMax: number;
  damagePercentage: number;
  healthPercentage: number;
  riskLevel: RiskLevel;
  estimatedLoss: number;
  vegetationHealth?: string;
  recommendation?: string;
}

interface WeatherData {
  temperature: number;
  rainfall: number;
  humidity: number;
  windSpeed?: number;
}

interface PDFReportProps {
  farm: Farm;
  analysis: NDVIAnalysis;
  weather: WeatherData;
  farmerName: string;
  farmerVillage: string;
  farmerDistrict?: string;
  reportId?: string;
}

// ================= COLORS =================
const getRiskColor = (risk: RiskLevel) => {
  switch (risk) {
    case "Critical": return "#dc3545";
    case "High": return "#fd7e14";
    case "Medium": return "#ffc107";
    default: return "#28a745";
  }
};

const getRiskBgColor = (risk: RiskLevel) => {
  switch (risk) {
    case "Critical": return "#f8d7da";
    case "High": return "#fff3e0";
    case "Medium": return "#fff9e6";
    default: return "#e8f5e9";
  }
};

export const PDFReport = forwardRef<HTMLDivElement, PDFReportProps>(
  ({ farm, analysis, weather, farmerName, farmerVillage, farmerDistrict, reportId }, ref) => {
    const reportIdValue = reportId || `CSR-${Date.now().toString(36).toUpperCase()}`;
    const reportDate = new Date().toLocaleDateString("en-IN");

    return (
      <div ref={ref} className="pdf-report">
        {/* HEADER */}
        <div className="pdf-header">
          <div className="pdf-logo">
            <span className="logo-icon">🌾</span>
            <div>
              <span className="logo-text">CropSafe</span>
              <div className="govt-badge">Government of India Initiative</div>
            </div>
          </div>
          <div className="pdf-header-right">
            <div className="report-id">Report ID: {reportIdValue}</div>
            <div className="report-date">Date: {reportDate}</div>
          </div>
        </div>

        {/* TITLE */}
        <div className="pdf-title">
          <h1>CROP INSURANCE REPORT</h1>
          <p>Satellite-Based NDVI Analysis | Sentinel-2 Data</p>
        </div>

        {/* GRID - 3 columns */}
        <div className="pdf-grid">
          {/* Farmer Details Card */}
          <div className="pdf-card">
            <div className="card-header">
              <span className="card-icon">👨‍🌾</span>
              <h3>Farmer Details</h3>
            </div>
            <div className="farmer-details">
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{farmerName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Village:</span>
                <span className="detail-value">{farmerVillage}</span>
              </div>
              {farmerDistrict && (
                <div className="detail-row">
                  <span className="detail-label">District:</span>
                  <span className="detail-value">{farmerDistrict}</span>
                </div>
              )}
            </div>
          </div>

          {/* Farm Details Card */}
          <div className="pdf-card">
            <div className="card-header">
              <span className="card-icon">🌾</span>
              <h3>Farm Details</h3>
            </div>
            <div className="farmer-details">
              <div className="detail-row">
                <span className="detail-label">Crop:</span>
                <span className="detail-value crop-badge">{farm.cropType}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Area:</span>
                <span className="detail-value">{farm.areaHectares} hectares</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Season:</span>
                <span className="detail-value">{farm.season}</span>
              </div>
              {farm.sowingDate && (
                <div className="detail-row">
                  <span className="detail-label">Sown:</span>
                  <span className="detail-value">{new Date(farm.sowingDate).toLocaleDateString("en-IN")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Weather Card */}
          <div className="pdf-card">
            <div className="card-header">
              <span className="card-icon">🌤️</span>
              <h3>Weather Impact</h3>
            </div>
            <div className="farmer-details">
              <div className="detail-row">
                <span className="detail-label">Temperature:</span>
                <span className="detail-value">{weather.temperature}°C</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Rainfall:</span>
                <span className="detail-value">{weather.rainfall} mm</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Humidity:</span>
                <span className="detail-value">{weather.humidity}%</span>
              </div>
              {weather.windSpeed && (
                <div className="detail-row">
                  <span className="detail-label">Wind Speed:</span>
                  <span className="detail-value">{weather.windSpeed} km/h</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECOND ROW - NDVI Metrics */}
        <div className="pdf-grid" style={{ marginTop: "15px" }}>
          {/* NDVI Card */}
          <div className="pdf-card">
            <div className="card-header">
              <span className="card-icon">📊</span>
              <h3>NDVI Analysis</h3>
            </div>
            <div className="farmer-details">
              <div className="detail-row">
                <span className="detail-label">NDVI Value:</span>
                <span className="detail-value">{analysis.ndviValue.toFixed(4)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Min NDVI:</span>
                <span className="detail-value">{analysis.ndviMin?.toFixed(4) || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Max NDVI:</span>
                <span className="detail-value">{analysis.ndviMax?.toFixed(4) || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Vegetation Health:</span>
                <span className="detail-value">{analysis.vegetationHealth || "Moderate"}</span>
              </div>
            </div>
          </div>

          {/* Health Card with Bar */}
          <div className="pdf-card">
            <div className="card-header">
              <span className="card-icon">💚</span>
              <h3>Crop Health</h3>
            </div>
            <div className="farmer-details">
              <div className="detail-row">
                <span className="detail-label">Health:</span>
                <span className="detail-value">{analysis.healthPercentage}%</span>
              </div>
              <div className="health-bar-container">
                <div className="health-bar">
                  <div 
                    className="health-fill healthy" 
                    style={{ width: `${analysis.healthPercentage}%`, background: "#28a745" }}
                  />
                  <div 
                    className="health-fill damaged" 
                    style={{ width: `${analysis.damagePercentage}%`, background: "#dc3545" }}
                  />
                </div>
                <div className="health-labels">
                  <span>Healthy {analysis.healthPercentage}%</span>
                  <span>Damaged {analysis.damagePercentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Card */}
          <div className="pdf-card" style={{ background: getRiskBgColor(analysis.riskLevel) }}>
            <div className="card-header">
              <span className="card-icon">⚠️</span>
              <h3>Risk Assessment</h3>
            </div>
            <div className="farmer-details">
              <div className="detail-row">
                <span className="detail-label">Risk Level:</span>
                <span className="detail-value" style={{ color: getRiskColor(analysis.riskLevel), fontWeight: "bold" }}>
                  {analysis.riskLevel}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Estimated Loss:</span>
                <span className="detail-value" style={{ color: "#dc3545", fontWeight: "bold" }}>
                  ₹{analysis.estimatedLoss.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Third Row - Metrics Cards */}
        <div className="metrics-three" style={{ marginTop: "15px" }}>
          <div className="metric green">
            <div className="metric-value">{analysis.healthPercentage}%</div>
            <div className="metric-label">Crop Health</div>
          </div>
          <div className="metric yellow">
            <div className="metric-value">{analysis.damagePercentage}%</div>
            <div className="metric-label">Damage</div>
          </div>
          <div className="metric" style={{ background: getRiskColor(analysis.riskLevel) }}>
            <div className="metric-value">₹{Math.round(analysis.estimatedLoss * 0.72).toLocaleString()}</div>
            <div className="metric-label">Compensation (72%)</div>
          </div>
        </div>

        {/* Recommendation Section */}
        {analysis.recommendation && (
          <div className="pdf-card" style={{ marginTop: "15px" }}>
            <div className="card-header">
              <span className="card-icon">💡</span>
              <h3>AI Recommendation</h3>
            </div>
            <div style={{ padding: "12px" }}>
              <p style={{ fontSize: "0.8rem", color: "#333", lineHeight: "1.4" }}>
                {analysis.recommendation}
              </p>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="pdf-footer">
          <p>Generated by CropSafe Satellite Crop Insurance System</p>
          <p>Helpline: 1800-180-1551 | Email: support@cropsafe.com</p>
        </div>
      </div>
    );
  }
);

PDFReport.displayName = "PDFReport";
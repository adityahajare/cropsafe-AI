import json
import sys
from pathlib import Path

import cv2
import numpy as np


def build_response(
    diagnosis,
    confidence,
    severity,
    problem,
    solution,
    note,
    visible_symptoms=None,
    likely_causes=None,
    should_escalate=False,
    metrics=None,
):
    return {
        "diagnosis": diagnosis,
        "confidence": round(float(confidence), 3),
        "severity": severity,
        "problem": problem,
        "solution": solution,
        "note": note,
        "visibleSymptoms": visible_symptoms or [],
        "likelyCauses": likely_causes or [],
        "shouldEscalate": should_escalate,
        "metrics": metrics or {},
    }


def crop_specific_name(crop_type, generic_name):
    crop = (crop_type or "").strip().lower()
    if "ragi" in crop or "millet" in crop:
        if "leaf spot" in generic_name.lower() or "blast" in generic_name.lower():
            return "Ragi leaf blast / leaf spot"
    if "rice" in crop or "paddy" in crop:
        if "leaf spot" in generic_name.lower() or "blast" in generic_name.lower():
            return "Rice blast / brown spot"
    if "wheat" in crop and "rust" in generic_name.lower():
        return "Wheat rust"
    if "cotton" in crop and "stress" in generic_name.lower():
        return "Cotton leaf stress / possible sucking pest damage"
    if "sugarcane" in crop and "leaf spot" in generic_name.lower():
        return "Sugarcane leaf spot / red rot stress pattern"
    return generic_name


def analyze_image(image_path, crop_type="", location_label=""):
    image = cv2.imread(str(image_path))
    if image is None:
      return build_response(
          "Uncertain crop issue",
          0.0,
          "Medium",
          "The image could not be read by the local analyzer.",
          "Upload a clearer crop image and try again.",
          "Local Python image analyzer could not open the file.",
          should_escalate=True,
      )

    image = cv2.resize(image, (640, 640))
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    green_mask = cv2.inRange(hsv, (30, 35, 25), (95, 255, 255))
    yellow_mask = cv2.inRange(hsv, (15, 25, 25), (38, 255, 255))
    brown_mask = cv2.inRange(hsv, (5, 45, 20), (23, 255, 180))
    dark_mask = cv2.inRange(hsv, (0, 0, 0), (180, 255, 65))
    white_mask = cv2.inRange(hsv, (0, 0, 150), (180, 55, 255))

    total = image.shape[0] * image.shape[1]
    green_ratio = float(np.count_nonzero(green_mask)) / total
    yellow_ratio = float(np.count_nonzero(yellow_mask)) / total
    brown_ratio = float(np.count_nonzero(brown_mask)) / total
    dark_ratio = float(np.count_nonzero(dark_mask)) / total
    white_ratio = float(np.count_nonzero(white_mask)) / total

    lesion_mask = cv2.bitwise_or(brown_mask, dark_mask)
    lesion_mask = cv2.morphologyEx(lesion_mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(lesion_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    lesion_count = 0
    lesion_area = 0.0
    for contour in contours:
        area = cv2.contourArea(contour)
        if 18 <= area <= 12000:
            lesion_count += 1
            lesion_area += area

    edges = cv2.Canny(gray, 70, 150)
    edge_ratio = float(np.count_nonzero(edges)) / total

    metrics = {
        "greenRatio": round(green_ratio, 3),
        "yellowRatio": round(yellow_ratio, 3),
        "brownRatio": round(brown_ratio, 3),
        "darkRatio": round(dark_ratio, 3),
        "whiteRatio": round(white_ratio, 3),
        "lesionCount": lesion_count,
        "edgeRatio": round(edge_ratio, 3),
    }

    symptoms = []
    causes = []

    if white_ratio > 0.075 and lesion_count > 12:
        symptoms.extend(["white powdery patches", "leaf surface discoloration"])
        causes.extend(["powdery mildew pressure", "humid canopy condition"])
        return build_response(
            crop_specific_name(crop_type, "Powdery mildew"),
            min(0.78, 0.42 + white_ratio * 2.2 + min(0.18, lesion_count / 180)),
            "High" if white_ratio > 0.11 else "Medium",
            "The image shows white or pale surface patches that look similar to fungal mildew on crop leaves.",
            "Remove badly affected leaves, improve airflow, avoid late-evening overhead irrigation, and confirm the fungicide choice with a local agriculture officer.",
            "This is a local Python vision estimate based on visible color and lesion patterns.",
            symptoms,
            causes,
            should_escalate=True,
            metrics=metrics,
        )

    if brown_ratio > 0.05 and lesion_count > 18:
        symptoms.extend(["brown necrotic spots", "multiple lesion patches", "leaf tissue damage"])
        causes.extend(["leaf spot or blast pattern", "fungal disease pressure", "possible moisture-driven infection"])
        confidence = min(0.84, 0.34 + brown_ratio * 3.0 + min(0.2, lesion_count / 140))
        return build_response(
            crop_specific_name(crop_type, "Leaf spot / blast"),
            confidence,
            "High" if brown_ratio > 0.09 else "Medium",
            "The crop image shows repeated brown damaged spots and patches that look consistent with a leaf spot or blast-type disease pattern.",
            "Take another close daylight photo of the affected leaf, remove heavily affected leaves if spread is high, avoid unnecessary irrigation splash, and confirm the treatment locally before spraying.",
            "This result comes from local image analysis and should be confirmed for severe outbreaks.",
            symptoms,
            causes,
            should_escalate=True,
            metrics=metrics,
        )

    if yellow_ratio > 0.2 and green_ratio < 0.34:
        symptoms.extend(["yellowing leaf area", "loss of green vigor"])
        causes.extend(["nutrient deficiency", "water stress", "heat or root-zone stress"])
        confidence = min(0.76, 0.28 + yellow_ratio * 1.9 + max(0.0, 0.2 - green_ratio))
        severity = "High" if yellow_ratio > 0.34 else "Medium"
        return build_response(
            crop_specific_name(crop_type, "Nutrient stress / chlorosis"),
            confidence,
            severity,
            "The image shows clear yellowing and reduced green vigor. This often points to nutrient stress, moisture imbalance, or early disease-related weakening.",
            "Check soil moisture first, inspect the underside of leaves for pests, avoid random high-dose urea, and use a soil-test-based correction where possible.",
            "This is a cautious local estimate. Yellowing can come from multiple causes, so field confirmation is important.",
            symptoms,
            causes,
            should_escalate=severity == "High",
            metrics=metrics,
        )

    if dark_ratio > 0.16 and brown_ratio > 0.04:
        symptoms.extend(["dark damaged tissue", "advanced necrotic patches"])
        causes.extend(["severe blight or rot stress", "late-stage tissue damage"])
        return build_response(
            crop_specific_name(crop_type, "Severe blight / necrosis"),
            min(0.73, 0.3 + dark_ratio * 1.7 + brown_ratio * 1.8),
            "High",
            "The crop image shows dark damaged tissue and heavy patching that can match severe blight or advanced stress damage.",
            "Isolate the affected area, improve drainage if the field is wet, avoid blind spraying, and seek quick local officer confirmation because severe tissue loss is visible.",
            "Local Python analysis found a strong damage pattern, but severe cases should still be confirmed locally.",
            symptoms,
            causes,
            should_escalate=True,
            metrics=metrics,
        )

    if green_ratio < 0.22 and edge_ratio < 0.05:
        symptoms.extend(["weak overall leaf vigor", "low healthy green area"])
        causes.extend(["wilting stress", "water stress", "root-zone issue"])
        return build_response(
            crop_specific_name(crop_type, "Wilting / general crop stress"),
            min(0.64, 0.24 + max(0.0, 0.22 - green_ratio) * 1.6),
            "Medium",
            "The image does not show a strong single disease signature, but it does show weak crop vigor and stress-like symptoms.",
            "Check root moisture, inspect for pest feeding and stem damage, compare with nearby healthy plants, and upload one closer leaf image if disease is suspected.",
            "The local analyzer sees stress but not a sharply defined disease pattern.",
            symptoms,
            causes,
            should_escalate=False,
            metrics=metrics,
        )

    return build_response(
        crop_specific_name(crop_type, "Minor stress or unclear disease pattern"),
        0.16,
        "Low",
        "The local analyzer found some crop variation but no strong disease pattern from this image alone.",
        "Take a closer daylight photo of the most affected leaf area and compare symptoms across multiple plants before treatment.",
        "Local Python analysis did not find a confident disease pattern in this image.",
        visible_symptoms=["image evidence is weak or mixed"],
        likely_causes=["minor stress", "unclear crop image", "early-stage issue"],
        should_escalate=False,
        metrics=metrics,
    )


def main():
    if len(sys.argv) < 2:
        print(json.dumps(build_response(
            "Uncertain crop issue",
            0.0,
            "Medium",
            "No image path was provided to the Python analyzer.",
            "Upload a crop image and try again.",
            "Python analyzer input was incomplete.",
            should_escalate=True,
        )))
        return

    image_path = Path(sys.argv[1])
    payload = {}
    if len(sys.argv) > 2:
        try:
            payload = json.loads(sys.argv[2])
        except Exception:
            payload = {}

    result = analyze_image(
        image_path=image_path,
        crop_type=payload.get("cropType", ""),
        location_label=payload.get("locationLabel", ""),
    )
    print(json.dumps(result))


if __name__ == "__main__":
    main()

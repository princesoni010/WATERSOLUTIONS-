"""
services/image_analysis.py
Mock vision AI analysis for citizen report photos.
If a real Vision API key is available, swap in the API call.
All AI assessments are labelled as demo/simulated.
"""

import json
import random

ISSUE_TYPE_MOCK_RESPONSES = {
    "PIPELINE_LEAK": {
        "possible_leak": True,
        "issue_type": "pipeline_leak",
        "water_pooling_visible": True,
        "visual_severity": "HIGH",
        "image_quality": "GOOD",
        "recommended_action": "OPERATOR_REVIEW",
        "assessment_text": "AI assessment (demo): Possible roadside pipeline leak with visible surface water pooling.",
        "is_demo": True,
    },
    "PUBLIC_TAP_LEAK": {
        "possible_leak": True,
        "issue_type": "public_tap_leakage",
        "water_pooling_visible": True,
        "visual_severity": "MEDIUM",
        "image_quality": "GOOD",
        "recommended_action": "OPERATOR_REVIEW",
        "assessment_text": "AI assessment (demo): Possible public-tap leakage with visible water pooling.",
        "is_demo": True,
    },
    "TANK_OVERFLOW": {
        "possible_leak": True,
        "issue_type": "tank_overflow",
        "water_pooling_visible": True,
        "visual_severity": "HIGH",
        "image_quality": "GOOD",
        "recommended_action": "OPERATOR_REVIEW",
        "assessment_text": "AI assessment (demo): Possible storage tank overflow with visible water discharge.",
        "is_demo": True,
    },
    "VALVE_JOINT_LEAK": {
        "possible_leak": True,
        "issue_type": "valve_joint_leakage",
        "water_pooling_visible": False,
        "visual_severity": "LOW",
        "image_quality": "GOOD",
        "recommended_action": "MONITOR",
        "assessment_text": "AI assessment (demo): Minor moisture near valve chamber; field verification required.",
        "is_demo": True,
    },
    "WATER_POOLING": {
        "possible_leak": True,
        "issue_type": "water_pooling",
        "water_pooling_visible": True,
        "visual_severity": "MEDIUM",
        "image_quality": "GOOD",
        "recommended_action": "OPERATOR_REVIEW",
        "assessment_text": "AI assessment (demo): Possible underground or joint leak causing roadside water accumulation.",
        "is_demo": True,
    },
    "ROADSIDE_WATER": {
        "possible_leak": True,
        "issue_type": "water_pooling",
        "water_pooling_visible": True,
        "visual_severity": "MEDIUM",
        "image_quality": "GOOD",
        "recommended_action": "OPERATOR_REVIEW",
        "assessment_text": "AI assessment (demo): Roadside water accumulation visible; possible sub-surface leak.",
        "is_demo": True,
    },
    "OTHER": {
        "possible_leak": False,
        "issue_type": "unknown",
        "water_pooling_visible": False,
        "visual_severity": "LOW",
        "image_quality": "GOOD",
        "recommended_action": "OPERATOR_REVIEW",
        "assessment_text": "AI assessment (demo): Image received. Manual review required to determine leak type.",
        "is_demo": True,
    },
}


def analyze_image(image_path=None, issue_type="OTHER"):
    """
    Return a mock or real vision AI assessment for an uploaded image.

    Args:
        image_path: local path or URL of the uploaded image
        issue_type: citizen-selected issue type (fallback classifier)

    Returns:
        dict: AI tags for the image
    """
    response = ISSUE_TYPE_MOCK_RESPONSES.get(issue_type, ISSUE_TYPE_MOCK_RESPONSES["OTHER"]).copy()

    # Add slight randomness to visual_severity for realism
    severities = ["LOW", "MEDIUM", "HIGH"]
    if issue_type in ("PIPELINE_LEAK", "TANK_OVERFLOW") and random.random() > 0.7:
        response["visual_severity"] = "HIGH"

    return response


def tags_to_json(tags_dict):
    return json.dumps(tags_dict)

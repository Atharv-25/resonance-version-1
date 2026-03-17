"""
RESONANCE — Compatibility Engine
Evaluates multi-dimensional compatibility between two user profiles.

Dimensions:
  - Big Five Personality (30% weight)
  - Attachment Style (20% weight)
  - Love Language Alignment (15% weight)
  - Lifestyle Compatibility (15% weight)
  - Values Alignment (20% weight)
  - Dealbreaker Override (hard 0)
"""

import json
from typing import Tuple


# ── Attachment Style Compatibility Matrix ──
ATTACHMENT_MATRIX = {
    ("secure", "secure"): 95,
    ("secure", "anxious"): 75,
    ("secure", "avoidant"): 70,
    ("secure", "disorganized"): 60,
    ("anxious", "anxious"): 55,
    ("anxious", "avoidant"): 30,
    ("anxious", "disorganized"): 35,
    ("avoidant", "avoidant"): 45,
    ("avoidant", "disorganized"): 40,
    ("disorganized", "disorganized"): 25,
}

# ── Weights ──
WEIGHTS = {
    "big_five": 0.30,
    "attachment": 0.20,
    "love_language": 0.15,
    "lifestyle": 0.15,
    "values": 0.20,
}


def compute_big_five_score(a: dict, b: dict) -> int:
    """
    Compare Big Five traits between two profiles.
    - Agreeableness & Conscientiousness: similarity is better
    - Extraversion & Openness: moderate difference can be complementary
    - Neuroticism: lower combined score is better for relationship health
    """
    traits = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
    total = 0

    for trait in traits:
        val_a = a.get(trait, 50)
        val_b = b.get(trait, 50)
        diff = abs(val_a - val_b)

        if trait == "neuroticism":
            # Lower combined neuroticism = healthier relationship
            total += max(0, 100 - (val_a + val_b) / 2)
        elif trait in ("extraversion", "openness"):
            # Some difference is okay, extreme difference is not
            total += 100 - diff if diff < 30 else max(20, 80 - diff)
        else:
            # Similarity is better for agreeableness, conscientiousness
            total += 100 - diff

    return round(total / len(traits))


def compute_attachment_score(a: dict, b: dict) -> int:
    """Score attachment style compatibility using research-based matrix."""
    style_a = a.get("primary", "secure")
    style_b = b.get("primary", "secure")

    key = tuple(sorted([style_a, style_b]))
    return ATTACHMENT_MATRIX.get(key, 50)


def compute_love_language_score(a: dict, b: dict) -> int:
    """
    Check if Partner A's primary love language matches what Partner B
    naturally gives (high ranking), and vice versa.
    """
    ranking_a = a.get("ranking", [])
    ranking_b = b.get("ranking", [])

    if not ranking_a or not ranking_b:
        return 50

    primary_a = ranking_a[0] if ranking_a else None
    primary_b = ranking_b[0] if ranking_b else None

    score = 20  # base

    # Does B naturally give what A needs?
    if primary_a in ranking_b[:2]:
        score += 30
    elif primary_a in ranking_b[:3]:
        score += 15

    # Does A naturally give what B needs?
    if primary_b in ranking_a[:2]:
        score += 30
    elif primary_b in ranking_a[:3]:
        score += 15

    # Same primary = bonus
    if primary_a == primary_b:
        score += 20

    return min(100, score)


def compute_lifestyle_score(a: dict, b: dict) -> int:
    """Compare lifestyle dimensions — similarity is generally preferred."""
    dims = ["social_energy", "routine_vs_spontaneous", "health_consciousness", "ambition_level"]
    total = 0

    for dim in dims:
        diff = abs(a.get(dim, 50) - b.get(dim, 50))
        total += 100 - diff

    return round(total / len(dims))


def compute_values_score(a: dict, b: dict) -> int:
    """
    Compare core values — shared values are the strongest predictor
    of long-term relationship success (Gottman research).
    """
    vals_a = [v.lower() for v in a.get("top_values", [])]
    vals_b = [v.lower() for v in b.get("top_values", [])]

    if not vals_a:
        return 50

    shared = []
    for va in vals_a:
        for vb in vals_b:
            if va in vb or vb in va:
                shared.append(va)
                break

    overlap_ratio = len(shared) / max(len(vals_a), 1)
    return min(100, round(overlap_ratio * 100) + 20)


def check_dealbreakers(a: dict, b: dict) -> Tuple[bool, list]:
    """
    Check if either profile's dealbreakers conflict with the other.
    Returns (has_conflict, conflicting_items).
    """
    db_a = [d.lower() for d in a.get("dealbreakers", [])]
    db_b = [d.lower() for d in b.get("dealbreakers", [])]

    conflicts = []
    for da in db_a:
        for db in db_b:
            if da in db or db in da:
                conflicts.append(f"Mutual conflict: {da}")

    return len(conflicts) > 0, conflicts


def generate_why_match(profile_a: dict, profile_b: dict, scores: dict, shared_values: list) -> list:
    """Generate human-readable match explanation insights."""
    reasons = []

    if scores.get("emotional", 0) > 70:
        reasons.append("Your emotional wavelengths are surprisingly in sync.")

    if scores.get("values", 0) > 70 and shared_values:
        vals = " and ".join(shared_values[:2])
        reasons.append(f"You both deeply value {vals}.")

    if scores.get("lifestyle", 0) > 75:
        reasons.append("Your daily rhythms and energy levels naturally complement each other.")

    attach_a = profile_a.get("attachment_style", {}).get("primary", "")
    attach_b = profile_b.get("attachment_style", {}).get("primary", "")
    if attach_a == "secure" and attach_b == "secure":
        reasons.append("You both bring emotional security — this foundation is rare and powerful.")
    elif attach_a == "secure" or attach_b == "secure":
        reasons.append("One of you brings grounding stability that the other will truly appreciate.")

    ll_a = profile_a.get("love_language", {}).get("primary", "")
    ll_b = profile_b.get("love_language", {}).get("primary", "")
    if ll_a and ll_b:
        if ll_a == ll_b:
            reasons.append("You speak the same love language — you'll both feel naturally loved.")
        else:
            reasons.append("Your different love languages create a beautiful give-and-take dynamic.")

    ext_a = profile_a.get("big_five", {}).get("extraversion", 50)
    ext_b = profile_b.get("big_five", {}).get("extraversion", 50)
    diff = abs(ext_a - ext_b)
    if diff < 20:
        reasons.append("Similar social energy means you'll naturally want the same Friday nights.")
    elif diff > 40:
        reasons.append("Your contrast in social energy can be beautifully complementary.")

    if not reasons:
        reasons.append("There's potential here — sometimes compatibility is in the intangibles.")

    return reasons


def compute_compatibility(profile_a: dict, profile_b: dict) -> dict:
    """
    Main compatibility computation. Returns:
    {
        "score": int (0-100),
        "breakdown": { "emotional", "attachment", "love_language", "lifestyle", "values" },
        "dealbroken": bool,
        "shared_values": list,
        "why_match": list[str],
    }
    """
    b5_a = profile_a.get("big_five", {})
    b5_b = profile_b.get("big_five", {})
    attach_a = profile_a.get("attachment_style", {})
    attach_b = profile_b.get("attachment_style", {})
    ll_a = profile_a.get("love_language", {})
    ll_b = profile_b.get("love_language", {})
    life_a = profile_a.get("lifestyle", {})
    life_b = profile_b.get("lifestyle", {})
    vals_a = profile_a.get("values", {})
    vals_b = profile_b.get("values", {})

    # Individual dimension scores
    emotional = compute_big_five_score(b5_a, b5_b)
    attachment = compute_attachment_score(attach_a, attach_b)
    love_lang = compute_love_language_score(ll_a, ll_b)
    lifestyle = compute_lifestyle_score(life_a, life_b)
    values = compute_values_score(vals_a, vals_b)

    # Dealbreaker check
    has_conflict, conflicts = check_dealbreakers(profile_a, profile_b)

    # Composite score
    if has_conflict:
        composite = 0
    else:
        composite = round(
            emotional * WEIGHTS["big_five"]
            + attachment * WEIGHTS["attachment"]
            + love_lang * WEIGHTS["love_language"]
            + lifestyle * WEIGHTS["lifestyle"]
            + values * WEIGHTS["values"]
        )

    breakdown = {
        "emotional": emotional,
        "attachment": attachment,
        "love_language": love_lang,
        "lifestyle": lifestyle,
        "values": values,
    }

    # Shared values for explanation
    vals_a_list = [v.lower() for v in vals_a.get("top_values", [])]
    vals_b_list = [v.lower() for v in vals_b.get("top_values", [])]
    shared = [v for v in vals_a_list if any(v in bv or bv in v for bv in vals_b_list)]

    # Why they match
    why = generate_why_match(profile_a, profile_b, breakdown, shared)

    return {
        "score": composite,
        "breakdown": breakdown,
        "dealbroken": has_conflict,
        "dealbreaker_conflicts": conflicts,
        "shared_values": shared,
        "why_match": why,
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 3:
        print("Usage: python compatibility_engine.py profile_a.json profile_b.json")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        a = json.load(f)
    with open(sys.argv[2]) as f:
        b = json.load(f)

    result = compute_compatibility(a, b)
    print(json.dumps(result, indent=2))

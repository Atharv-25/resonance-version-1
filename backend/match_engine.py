"""
RESONANCE — Match Engine
Evaluates all profile pairs and identifies compatible matches.
"""

import json
import os
import sys
from compatibility_engine import compute_compatibility


DEFAULT_THRESHOLD = 65


def load_profiles(directory: str) -> list:
    """Load all profile JSON files from a directory."""
    profiles = []
    for filename in os.listdir(directory):
        if filename.endswith(".json") and filename.startswith("profile_"):
            filepath = os.path.join(directory, filename)
            with open(filepath) as f:
                profile = json.load(f)
                profile["_filename"] = filename
                profiles.append(profile)
    return profiles


def run_matching(profiles: list, threshold: int = DEFAULT_THRESHOLD) -> list:
    """
    Run pairwise matching on all profiles.
    Returns sorted list of matches above threshold.
    """
    matches = []

    for i in range(len(profiles)):
        for j in range(i + 1, len(profiles)):
            a = profiles[i]
            b = profiles[j]

            result = compute_compatibility(a, b)

            match_entry = {
                "id": f"{a.get('id', i)}_{b.get('id', j)}",
                "person_a": {
                    "id": a.get("id", str(i)),
                    "name": a.get("name", "Unknown"),
                },
                "person_b": {
                    "id": b.get("id", str(j)),
                    "name": b.get("name", "Unknown"),
                },
                "score": result["score"],
                "breakdown": result["breakdown"],
                "dealbroken": result["dealbroken"],
                "shared_values": result["shared_values"],
                "why_match": result["why_match"],
                "status": "pending",
            }

            if result["score"] >= threshold and not result["dealbroken"]:
                matches.append(match_entry)

    # Sort by score descending
    matches.sort(key=lambda m: m["score"], reverse=True)
    return matches


def main():
    """CLI interface for the match engine."""
    profile_dir = sys.argv[1] if len(sys.argv) > 1 else "./profiles"
    threshold = int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_THRESHOLD
    output_file = sys.argv[3] if len(sys.argv) > 3 else "match_results.json"

    if not os.path.isdir(profile_dir):
        print(f"Error: Directory '{profile_dir}' not found.")
        print("Usage: python match_engine.py [profiles_dir] [threshold] [output_file]")
        sys.exit(1)

    profiles = load_profiles(profile_dir)
    print(f"Loaded {len(profiles)} profiles from '{profile_dir}'")

    if len(profiles) < 2:
        print("Need at least 2 profiles to run matching.")
        sys.exit(1)

    matches = run_matching(profiles, threshold)
    print(f"Found {len(matches)} matches above threshold {threshold}")

    # Save results
    with open(output_file, "w") as f:
        json.dump(matches, f, indent=2)
    print(f"Results saved to '{output_file}'")

    # Print top matches
    for match in matches[:10]:
        name_a = match["person_a"]["name"]
        name_b = match["person_b"]["name"]
        score = match["score"]
        print(f"  {name_a} ↔ {name_b}: {score}/100")
        for reason in match["why_match"][:2]:
            print(f"    ✦ {reason}")


if __name__ == "__main__":
    main()

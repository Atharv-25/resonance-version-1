"""
RESONANCE — Compatibility Engine Tests
Tests the multi-dimensional scoring system for correctness.
"""

import pytest
from compatibility_engine import (
    compute_compatibility,
    compute_big_five_score,
    compute_attachment_score,
    compute_love_language_score,
    compute_lifestyle_score,
    compute_values_score,
    check_dealbreakers,
)


# ── Test Profiles ──

PROFILE_SECURE_MATCH = {
    "name": "Profile A",
    "big_five": {"openness": 75, "conscientiousness": 70, "extraversion": 60, "agreeableness": 80, "neuroticism": 25},
    "attachment_style": {"primary": "secure", "confidence": 0.9},
    "love_language": {"primary": "quality_time", "secondary": "words_of_affirmation", "ranking": ["quality_time", "words_of_affirmation", "physical_touch", "acts_of_service", "receiving_gifts"]},
    "lifestyle": {"social_energy": 60, "routine_vs_spontaneous": 50, "health_consciousness": 70, "ambition_level": 75},
    "values": {"top_values": ["authenticity", "growth", "kindness", "family", "creativity"]},
    "dealbreakers": ["dishonesty"],
}

PROFILE_COMPLEMENT = {
    "name": "Profile B",
    "big_five": {"openness": 80, "conscientiousness": 72, "extraversion": 55, "agreeableness": 78, "neuroticism": 30},
    "attachment_style": {"primary": "secure", "confidence": 0.85},
    "love_language": {"primary": "words_of_affirmation", "secondary": "quality_time", "ranking": ["words_of_affirmation", "quality_time", "acts_of_service", "physical_touch", "receiving_gifts"]},
    "lifestyle": {"social_energy": 55, "routine_vs_spontaneous": 55, "health_consciousness": 65, "ambition_level": 80},
    "values": {"top_values": ["growth", "authenticity", "empathy", "creativity", "independence"]},
    "dealbreakers": ["arrogance"],
}

PROFILE_ANXIOUS = {
    "name": "Profile C",
    "big_five": {"openness": 85, "conscientiousness": 40, "extraversion": 80, "agreeableness": 65, "neuroticism": 70},
    "attachment_style": {"primary": "anxious", "confidence": 0.75},
    "love_language": {"primary": "physical_touch", "secondary": "words_of_affirmation", "ranking": ["physical_touch", "words_of_affirmation", "quality_time", "receiving_gifts", "acts_of_service"]},
    "lifestyle": {"social_energy": 85, "routine_vs_spontaneous": 80, "health_consciousness": 40, "ambition_level": 70},
    "values": {"top_values": ["passion", "freedom", "love", "adventure"]},
    "dealbreakers": ["controlling", "emotional unavailability"],
}

PROFILE_AVOIDANT = {
    "name": "Profile D",
    "big_five": {"openness": 50, "conscientiousness": 85, "extraversion": 30, "agreeableness": 45, "neuroticism": 20},
    "attachment_style": {"primary": "avoidant", "confidence": 0.8},
    "love_language": {"primary": "acts_of_service", "secondary": "quality_time", "ranking": ["acts_of_service", "quality_time", "physical_touch", "words_of_affirmation", "receiving_gifts"]},
    "lifestyle": {"social_energy": 30, "routine_vs_spontaneous": 20, "health_consciousness": 85, "ambition_level": 90},
    "values": {"top_values": ["discipline", "achievement", "independence", "logic"]},
    "dealbreakers": ["laziness", "drama", "dishonesty"],
}

PROFILE_DEALBREAKER_CONFLICT = {
    "name": "Profile E",
    "big_five": {"openness": 70, "conscientiousness": 60, "extraversion": 50, "agreeableness": 70, "neuroticism": 40},
    "attachment_style": {"primary": "secure"},
    "love_language": {"primary": "quality_time", "ranking": ["quality_time"]},
    "lifestyle": {"social_energy": 50, "routine_vs_spontaneous": 50, "health_consciousness": 50, "ambition_level": 50},
    "values": {"top_values": ["honesty", "loyalty"]},
    "dealbreakers": ["dishonesty", "arrogance"],
}


# ── Tests ──

class TestBigFiveScore:
    def test_similar_profiles_score_high(self):
        score = compute_big_five_score(PROFILE_SECURE_MATCH["big_five"], PROFILE_COMPLEMENT["big_five"])
        assert score >= 70, f"Similar profiles should score high, got {score}"

    def test_low_combined_neuroticism_scores_better(self):
        low_n = {"openness": 50, "conscientiousness": 50, "extraversion": 50, "agreeableness": 50, "neuroticism": 20}
        high_n = {"openness": 50, "conscientiousness": 50, "extraversion": 50, "agreeableness": 50, "neuroticism": 80}

        score_low = compute_big_five_score(low_n, {"openness": 50, "conscientiousness": 50, "extraversion": 50, "agreeableness": 50, "neuroticism": 20})
        score_high = compute_big_five_score(high_n, {"openness": 50, "conscientiousness": 50, "extraversion": 50, "agreeableness": 50, "neuroticism": 80})

        assert score_low > score_high, "Lower combined neuroticism should score better"


class TestAttachmentScore:
    def test_secure_secure_is_highest(self):
        score = compute_attachment_score({"primary": "secure"}, {"primary": "secure"})
        assert score == 95

    def test_anxious_avoidant_is_lowest_common(self):
        score = compute_attachment_score({"primary": "anxious"}, {"primary": "avoidant"})
        assert score == 30

    def test_symmetry(self):
        """Score should be same regardless of order."""
        s1 = compute_attachment_score({"primary": "secure"}, {"primary": "anxious"})
        s2 = compute_attachment_score({"primary": "anxious"}, {"primary": "secure"})
        assert s1 == s2


class TestLoveLanguageScore:
    def test_same_primary_scores_high(self):
        a = {"primary": "quality_time", "ranking": ["quality_time", "words_of_affirmation"]}
        b = {"primary": "quality_time", "ranking": ["quality_time", "physical_touch"]}
        score = compute_love_language_score(a, b)
        assert score >= 70, f"Same primary should score high, got {score}"

    def test_complementary_ranking_scores_moderate(self):
        a = {"primary": "quality_time", "ranking": ["quality_time", "words_of_affirmation", "physical_touch"]}
        b = {"primary": "words_of_affirmation", "ranking": ["words_of_affirmation", "quality_time", "acts_of_service"]}
        score = compute_love_language_score(a, b)
        assert score >= 50


class TestLifestyleScore:
    def test_similar_lifestyles_score_high(self):
        a = {"social_energy": 60, "routine_vs_spontaneous": 50, "health_consciousness": 70, "ambition_level": 75}
        b = {"social_energy": 55, "routine_vs_spontaneous": 55, "health_consciousness": 65, "ambition_level": 80}
        score = compute_lifestyle_score(a, b)
        assert score >= 85


class TestValuesScore:
    def test_shared_values_score_high(self):
        a = {"top_values": ["authenticity", "growth", "kindness"]}
        b = {"top_values": ["growth", "authenticity", "empathy"]}
        score = compute_values_score(a, b)
        assert score >= 60

    def test_no_shared_values_score_low(self):
        a = {"top_values": ["ambition", "power", "wealth"]}
        b = {"top_values": ["peace", "nature", "simplicity"]}
        score = compute_values_score(a, b)
        assert score <= 40


class TestDealbreakers:
    def test_matching_dealbreakers_conflict(self):
        has_conflict, conflicts = check_dealbreakers(
            {"dealbreakers": ["dishonesty"]},
            {"dealbreakers": ["dishonesty", "laziness"]}
        )
        assert has_conflict

    def test_no_conflict(self):
        has_conflict, conflicts = check_dealbreakers(
            {"dealbreakers": ["smoking"]},
            {"dealbreakers": ["laziness"]}
        )
        assert not has_conflict


class TestFullCompatibility:
    def test_highly_compatible_pair(self):
        result = compute_compatibility(PROFILE_SECURE_MATCH, PROFILE_COMPLEMENT)
        assert result["score"] >= 70, f"Highly compatible pair should score 70+, got {result['score']}"
        assert not result["dealbroken"]
        assert len(result["why_match"]) > 0

    def test_challenging_pair(self):
        result = compute_compatibility(PROFILE_ANXIOUS, PROFILE_AVOIDANT)
        assert result["score"] < 60, f"Anxious-avoidant pair should score below 60, got {result['score']}"

    def test_dealbreaker_override(self):
        result = compute_compatibility(PROFILE_SECURE_MATCH, PROFILE_DEALBREAKER_CONFLICT)
        # Both have "dishonesty" as dealbreaker — should conflict
        assert result["dealbroken"]
        assert result["score"] == 0

    def test_score_in_valid_range(self):
        result = compute_compatibility(PROFILE_SECURE_MATCH, PROFILE_ANXIOUS)
        assert 0 <= result["score"] <= 100

    def test_result_has_all_fields(self):
        result = compute_compatibility(PROFILE_SECURE_MATCH, PROFILE_COMPLEMENT)
        assert "score" in result
        assert "breakdown" in result
        assert "dealbroken" in result
        assert "shared_values" in result
        assert "why_match" in result
        assert all(k in result["breakdown"] for k in ["emotional", "attachment", "love_language", "lifestyle", "values"])

    def test_why_match_is_descriptive(self):
        result = compute_compatibility(PROFILE_SECURE_MATCH, PROFILE_COMPLEMENT)
        for reason in result["why_match"]:
            assert len(reason) > 10, "Why match reasons should be descriptive"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

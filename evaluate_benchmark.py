import json
import time
import os
import requests
import numpy as np

# USER'S 23 EXACT STRESS-TEST CLAIMS
USER_STRESS_TEST_CLAIMS = [
    # ✅ Should be CORROBORATED
    ("SpaceX acquired Cursor for $60 billion", "CORROBORATED", "Corroborated Event"),
    ("OpenAI released GPT-4o", "CORROBORATED", "Corroborated Event"),
    ("Google DeepMind's AlphaFold won a Nobel Prize contribution", "CORROBORATED", "Corroborated Event"),
    ("Anthropic released Claude Opus 4.5", "CORROBORATED", "Corroborated Event"),
    ("Microsoft invested billions of dollars into OpenAI", "CORROBORATED", "Corroborated Event"),

    # ❌ Should be CONTRADICTED / INSUFFICIENT
    ("Google shut down DeepMind overnight with no warning", "INSUFFICIENT_EVIDENCE", "Specific False Event"),
    ("OpenAI's board fired Sam Altman permanently in 2025", "INSUFFICIENT_EVIDENCE", "Specific False Event"),
    ("Anthropic was acquired by Google in 2026", "INSUFFICIENT_EVIDENCE", "Specific False Event"),
    ("Elon Musk personally founded OpenAI's GPT-5 model from scratch alone", "INSUFFICIENT_EVIDENCE", "Specific False Event"),

    # ❓ Should be INSUFFICIENT_EVIDENCE
    ("A major AI lab will announce a new model soon", "INSUFFICIENT_EVIDENCE", "Vague Speculation"),
    ("An anonymous leak claims a secret superintelligence model already exists internally", "INSUFFICIENT_EVIDENCE", "Vague Speculation"),
    ("Sources say a top AI company is planning something big next quarter", "INSUFFICIENT_EVIDENCE", "Vague Speculation"),

    # ⚖️ Should be DISPUTED / INSUFFICIENT
    ("AI-generated deepfakes influenced a recent election outcome", "INSUFFICIENT_EVIDENCE", "Contested Coverage"),
    ("A leaked GPT-5 benchmark shows it outperforms humans on all tasks", "INSUFFICIENT_EVIDENCE", "Contested Coverage"),

    # 🎯 Adversarial — Same entities, wrong relationship / reversed subject-object
    ("Cursor acquired SpaceX for $60 billion", "INSUFFICIENT_EVIDENCE", "Adversarial Direction Reversal"),
    ("Elon Musk was sold to SpaceX", "INSUFFICIENT_EVIDENCE", "Adversarial Subject-Object Swap"),
    ("Sam Altman was acquired by Microsoft", "INSUFFICIENT_EVIDENCE", "Adversarial Person-as-Object"),
    ("Anthropic acquired OpenAI", "INSUFFICIENT_EVIDENCE", "Adversarial Wrong Direction"),

    # 🔤 Entity-extraction stress tests (Newer/Niche Entities)
    ("Perplexity AI raised a new funding round at a multi-billion dollar valuation", "CORROBORATED", "Niche Entity Check"),
    ("Mistral released a new open-weight model called Mistral Large 3", "CORROBORATED", "Niche Entity Check"),
    ("xAI's Grok model was integrated into X (Twitter)", "CORROBORATED", "Niche Entity Check"),

    # 🎭 Style-signal trap (Dramatic sounding but true)
    ("Elon Musk's AI company just made its biggest acquisition ever", "CORROBORATED", "Style Signal Trap"),
    ("In a shocking overnight deal, SpaceX bought AI startup Cursor for $60 billion", "CORROBORATED", "Style Signal Trap"),
]

API_URL = "http://127.0.0.1:5000/predict"

def run_evaluation():
    print("=" * 80)
    print(" ◈ VERIFAI COMPREHENSIVE 23-CLAIM BENCHMARK & STRESS TEST")
    print("=" * 80)

    results = []
    correct_count = 0
    total = len(USER_STRESS_TEST_CLAIMS)

    for claim, expected_cat, group_label in USER_STRESS_TEST_CLAIMS:
        try:
            resp = requests.post(API_URL, json={"text": claim}, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                assessment = data.get("assessment", "INSUFFICIENT_EVIDENCE")
                style = data.get("linguistic_style_signal", {})
                sources = data.get("ranked_sources", [])
                
                max_score = max([s.get("match_score", 0) for s in sources], default=0.0)
                extracted_entities = data.get("extracted_entities", [])
                
                # Strict evaluation: requires exact label match
                is_correct = (assessment == expected_cat)
                if is_correct:
                    correct_count += 1

                results.append({
                    "claim": claim,
                    "group": group_label,
                    "expected": expected_cat,
                    "predicted": assessment,
                    "correct": is_correct,
                    "max_match_score": max_score,
                    "style_class": style.get("prediction_class", "UNKNOWN"),
                    "style_confidence": style.get("confidence_pct", 0),
                    "entities": extracted_entities,
                })
                
                sym = "✓" if is_correct else "✗"
                print(f" {sym} [{assessment:21s}] MaxScore: {max_score:.2f} | Category: {group_label:28s} | Claim: '{claim}'")
            else:
                print(f" ✗ HTTP {resp.status_code} for claim: '{claim}'")
        except Exception as e:
            print(f" ✗ Exception evaluating claim '{claim}': {e}")

    print("\n" + "=" * 80)
    print(f" OVERALL BENCHMARK ACCURACY: {correct_count}/{total} ({correct_count/total*100:.1f}%)")
    print("=" * 80)

    # Breakdown by category
    categories = set(r["group"] for r in results)
    print("\n--- PERFORMANCE BREAKDOWN BY CATEGORY ---")
    for cat in sorted(categories):
        cat_items = [r for r in results if r["group"] == cat]
        cat_correct = sum(1 for r in cat_items if r["correct"])
        print(f" • {cat:30s}: {cat_correct}/{len(cat_items)} ({cat_correct/len(cat_items)*100:.0f}%)")

    # Save detailed JSON report
    with open("user_stress_test_results.json", "w") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "accuracy_pct": round(correct_count / total * 100, 1),
            "total_claims": total,
            "results": results
        }, f, indent=2)

    print("\nDetailed results written to 'user_stress_test_results.json'.")

if __name__ == "__main__":
    run_evaluation()

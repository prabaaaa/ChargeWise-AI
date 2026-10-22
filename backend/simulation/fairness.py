"""Fairness metrics and calculation utilities for EV charging scheduling."""

from typing import Dict, List, Optional


def calculate_jains_fairness_index(fulfillment_ratios: List[float]) -> float:
    """Calculates Jain's Fairness Index for service fulfillment ratios.
    
    Formula: (sum(x_i))^2 / (n * sum(x_i^2))
    Returns a score between 0.0 and 1.0 (1.0 = completely fair / equal service).
    """
    if not fulfillment_ratios:
        return 1.0
    
    valid_ratios = [max(0.0, r) for r in fulfillment_ratios]
    n = len(valid_ratios)
    if n == 0:
        return 1.0
    
    sum_x = sum(valid_ratios)
    sum_x_sq = sum(r * r for r in valid_ratios)
    
    if sum_x_sq == 0.0:
        return 1.0
        
    jfi = (sum_x * sum_x) / (n * sum_x_sq)
    return max(0.0, min(1.0, float(jfi)))


def compute_fairness_adjustment(
    session_id: str,
    fairness_history: Optional[Dict[str, Dict[str, float]]]
) -> float:
    """Computes a priority multiplier based on historical service ratio.
    
    fairness_history structure:
        session_id -> {"delivered_kwh": float, "target_kwh": float}
        
    Returns:
        Multiplier >= 1.0 for underserved sessions, 1.0 if balanced.
    """
    if not fairness_history or session_id not in fairness_history:
        return 1.0
        
    data = fairness_history[session_id]
    target = data.get("target_kwh", 0.0)
    delivered = data.get("delivered_kwh", 0.0)
    
    if target <= 0.01:
        return 1.0
        
    # Calculate average ratio across all tracked sessions
    ratios = []
    for sid, sdata in fairness_history.items():
        starget = sdata.get("target_kwh", 0.0)
        sdeliv = sdata.get("delivered_kwh", 0.0)
        if starget > 0.01:
            ratios.append(min(1.0, sdeliv / starget))
            
    if not ratios:
        return 1.0
        
    avg_ratio = sum(ratios) / len(ratios)
    curr_ratio = min(1.0, delivered / target)
    
    # If below average, boost urgency proportionally
    shortfall = max(0.0, avg_ratio - curr_ratio)
    return 1.0 + (shortfall * 1.5)

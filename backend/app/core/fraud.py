import numpy as np
from sklearn.ensemble import IsolationForest
from app.core.config import settings


class FraudEngine:
    def __init__(self):
        self.model = None
        self._train()

    def _train(self):
        rng = np.random.default_rng(42)
        n = 1000
        amounts = rng.lognormal(mean=10, sigma=1.5, size=n)
        time_since = rng.exponential(scale=3600, size=n)
        is_new = rng.binomial(1, 0.1, size=n)
        tx_count = rng.poisson(lam=3, size=n)
        X = np.column_stack([amounts, time_since, is_new, tx_count])
        self.model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
        self.model.fit(X)

    def score_transaction(
        self,
        amount: float,
        time_since_last_tx: float,
        is_new_beneficiary: bool,
        tx_count_last_hour: int,
    ) -> float:
        X = np.array([[amount, time_since_last_tx, int(is_new_beneficiary), tx_count_last_hour]])
        raw_score = self.model.decision_function(X)[0]
        # Normalise to [0,1]: more anomalous → higher fraud probability
        ml_score = float(np.clip(0.5 - raw_score, 0, 1))

        # Rule-based boosts
        boost = 0.0
        if amount > 500_000:
            boost += 0.3
        if time_since_last_tx < 30:
            boost += 0.2
        if is_new_beneficiary:
            boost += 0.15

        return float(np.clip(ml_score + boost, 0.0, 1.0))

    def get_decision(self, score: float) -> str:
        if score < settings.FRAUD_THRESHOLD_LOW:
            return "approve"
        elif score < settings.FRAUD_THRESHOLD_HIGH:
            return "step_up"
        else:
            return "flag"


fraud_engine = FraudEngine()

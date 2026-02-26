import os
import joblib
from pathlib import Path

_MODEL_PATH = Path(__file__).parent.parent / "models" / "classifier.pkl"
_pipeline = None


def _load_model():
    global _pipeline
    if _pipeline is None:
        if _MODEL_PATH.exists():
            _pipeline = joblib.load(_MODEL_PATH)
        else:
            from classifier.train import train, ALL_DATA, Pipeline
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.linear_model import LogisticRegression
            texts = [d[0] for d in ALL_DATA]
            labels = [d[1] for d in ALL_DATA]
            pipeline = Pipeline([
                ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=10000, sublinear_tf=True)),
                ("clf", LogisticRegression(max_iter=1000, C=1.0, solver="lbfgs", multi_class="multinomial")),
            ])
            pipeline.fit(texts, labels)
            os.makedirs(_MODEL_PATH.parent, exist_ok=True)
            joblib.dump(pipeline, _MODEL_PATH)
            _pipeline = pipeline
    return _pipeline


def classify(description: str) -> dict:
    pipeline = _load_model()
    category = pipeline.predict([description])[0]
    proba = pipeline.predict_proba([description])[0]
    confidence = float(max(proba))
    classes = pipeline.classes_.tolist()
    scores = {cls: float(p) for cls, p in zip(classes, proba)}
    return {
        "category": category,
        "confidence": confidence,
        "scores": scores,
    }

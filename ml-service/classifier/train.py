"""
Trains the expense category classifier.
Run once: python -m classifier.train
"""
import os
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

TRAINING_DATA = [
    # Food & Dining
    ("lunch at restaurant", "Food"),
    ("coffee starbucks", "Food"),
    ("grocery store", "Food"),
    ("supermarket purchase", "Food"),
    ("food delivery uber eats", "Food"),
    ("pizza delivery", "Food"),
    ("breakfast cafe", "Food"),
    ("dinner restaurant", "Food"),
    ("fast food", "Food"),
    ("bakery", "Food"),
    ("market vegetables", "Food"),
    ("meal prep", "Food"),
    ("catering service", "Food"),

    # Rent & Utilities
    ("office rent", "Rent"),
    ("monthly rent payment", "Rent"),
    ("warehouse rent", "Rent"),
    ("property rental", "Rent"),
    ("electricity bill", "Utilities"),
    ("water bill", "Utilities"),
    ("internet subscription", "Utilities"),
    ("phone bill", "Utilities"),
    ("gas utility", "Utilities"),
    ("heating bill", "Utilities"),
    ("utility payment", "Utilities"),

    # Salary & HR
    ("employee salary", "Salary"),
    ("payroll payment", "Salary"),
    ("staff wages", "Salary"),
    ("freelancer payment", "Salary"),
    ("contractor fee", "Salary"),
    ("bonus payment", "Salary"),
    ("hr payroll", "Salary"),
    ("worker compensation", "Salary"),

    # Equipment & Technology
    ("office equipment", "Equipment"),
    ("laptop purchase", "Equipment"),
    ("printer purchase", "Equipment"),
    ("server hardware", "Equipment"),
    ("software license", "Equipment"),
    ("computer repair", "Equipment"),
    ("monitor purchase", "Equipment"),
    ("machinery", "Equipment"),
    ("tools purchase", "Equipment"),
    ("phone purchase", "Equipment"),

    # Marketing & Advertising
    ("google ads", "Marketing"),
    ("facebook advertising", "Marketing"),
    ("marketing campaign", "Marketing"),
    ("social media ads", "Marketing"),
    ("flyer printing", "Marketing"),
    ("seo services", "Marketing"),
    ("promotional materials", "Marketing"),
    ("brand design", "Marketing"),
    ("influencer payment", "Marketing"),
    ("email marketing", "Marketing"),

    # Transport & Travel
    ("taxi uber", "Transport"),
    ("fuel gasoline", "Transport"),
    ("car maintenance", "Transport"),
    ("flight ticket", "Transport"),
    ("train ticket", "Transport"),
    ("parking fee", "Transport"),
    ("public transport", "Transport"),
    ("vehicle insurance", "Transport"),
    ("delivery courier", "Transport"),
    ("car rental", "Transport"),

    # Finance & Banking
    ("bank fee", "Finance"),
    ("loan repayment", "Finance"),
    ("interest payment", "Finance"),
    ("accounting services", "Finance"),
    ("tax payment", "Finance"),
    ("insurance premium", "Finance"),
    ("investment", "Finance"),
    ("wire transfer fee", "Finance"),

    # Other / Miscellaneous
    ("office supplies", "Other"),
    ("cleaning service", "Other"),
    ("subscription service", "Other"),
    ("training course", "Other"),
    ("book purchase", "Other"),
    ("conference fee", "Other"),
    ("legal services", "Other"),
    ("miscellaneous expense", "Other"),
]

# Augment with Russian versions for local businesses
RUSSIAN_DATA = [
    ("обед в ресторане", "Food"),
    ("кофе", "Food"),
    ("продукты супермаркет", "Food"),
    ("аренда офиса", "Rent"),
    ("оплата аренды", "Rent"),
    ("электричество", "Utilities"),
    ("коммунальные услуги", "Utilities"),
    ("интернет", "Utilities"),
    ("зарплата сотрудника", "Salary"),
    ("выплата зарплаты", "Salary"),
    ("ноутбук покупка", "Equipment"),
    ("оборудование", "Equipment"),
    ("реклама", "Marketing"),
    ("маркетинг кампания", "Marketing"),
    ("такси", "Transport"),
    ("топливо", "Transport"),
    ("банковская комиссия", "Finance"),
    ("налоги", "Finance"),
    ("канцтовары", "Other"),
    ("прочие расходы", "Other"),
]

ALL_DATA = TRAINING_DATA + RUSSIAN_DATA


def train():
    texts = [d[0] for d in ALL_DATA]
    labels = [d[1] for d in ALL_DATA]

    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=None
    )

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=10000,
            sublinear_tf=True,
            min_df=1,
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            C=1.0,
            solver="lbfgs",
            multi_class="multinomial",
        )),
    ])

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    print("Classification Report:")
    print(classification_report(y_test, y_pred))

    os.makedirs("models", exist_ok=True)
    joblib.dump(pipeline, "models/classifier.pkl")
    print("Model saved to models/classifier.pkl")


if __name__ == "__main__":
    train()

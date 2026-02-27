import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

data = pd.read_csv("fertilizer_recommendation.csv")
data['Soil Type'] = data['Soil Type'].str.lower()
data['Crop Type'] = data['Crop Type'].str.lower()

le_soil = LabelEncoder()
data['Soil Type'] = le_soil.fit_transform(data['Soil Type'])

le_crop = LabelEncoder()
data['Crop Type'] = le_crop.fit_transform(data['Crop Type'])

X = data.iloc[:, :8]
y = data.iloc[:, -1]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

clf = RandomForestClassifier(random_state=42)
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"Fertilizer Model Accuracy: {accuracy:.2f}")

joblib.dump(clf, 'fertilizer_model.pkl')
def predict_fertilizer(input_list):
    t, h, sm, soil, crop, n, p, k = input_list
    soil = soil.lower()
    crop = crop.lower()
    if "clay" in soil:
        soil = "clayey"
    soil_enc = le_soil.transform([soil])[0]
    crop_enc = le_crop.transform([crop])[0]
    result = clf.predict([[t, h, sm, soil_enc, crop_enc, n, p, k]])[0]
    return str(result)

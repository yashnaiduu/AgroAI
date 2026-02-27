import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

df = pd.read_csv('Crop_recommendation.csv')
x = df.drop('label', axis=1)
y = df['label']

x_train, x_test, y_train, y_test = train_test_split(x, y, random_state=1, test_size=0.2)

model = RandomForestClassifier()
model.fit(x_train, y_train)

accuracy = accuracy_score(y_test, model.predict(x_test))
print(f"Model Accuracy: {accuracy:.2f}")

joblib.dump(model, 'cropmodel.pkl')
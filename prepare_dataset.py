import pandas as pd

# Load the two CSV files
fake = pd.read_csv("dataset/Fake.csv")
true = pd.read_csv("dataset/True.csv")

# Add labels
fake["label"] = "FAKE"
true["label"] = "REAL"

# Combine both datasets
df = pd.concat([fake, true], ignore_index=True)

# Keep only the columns needed by train.py
df = df[["text", "label"]]

# Remove missing and duplicate records
df = df.dropna()
df = df.drop_duplicates()

# Save combined dataset
df.to_csv("dataset/news.csv", index=False)

print("Dataset created successfully!")
print(f"Total articles: {len(df)}")
print(df["label"].value_counts())
print("\nSaved to: dataset/news.csv")
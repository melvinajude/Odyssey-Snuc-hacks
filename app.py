from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- Dummy database (Stored in RAM for the demo) ---
users = []
transactions = []

# ---------------------------
# 1. Page Routes (The Body)
# ---------------------------
@app.route('/')
def home():
    return render_template('index.html')

# ---------------------------
# 2. The "Brain" (Integration Logic)
# ---------------------------
@app.route('/analyze-freelancer', methods=['POST'])
def analyze_freelancer():
    try:
        data = request.json
        income = float(data.get('income', 0))
        expenses = float(data.get('expenses', 0))

        # Financial Calculations
        bridge_needed = max(0, expenses - income)
        
        if income > 0:
            score = round(min(10, (income / expenses) * 5), 1) if expenses > 0 else 10
        else:
            score = 0

        return jsonify({
            "status": "success",
            "liquidity_bridge": bridge_needed,
            "reliability_score": score,
            "tax_estimate": income * 0.10,
            "message": "Full Analysis Complete"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# ---------------------------
# 3. User Onboarding
# ---------------------------
@app.route('/onboard', methods=['POST'])
def onboard():
    data = request.json
    user = {
        "name": data.get("name"),
        "income": data.get("income"),
        "expenses": data.get("expenses"),
        "goal": data.get("goal")
    }
    users.append(user)
    return jsonify({"message": "User onboarded", "user": user})

# ---------------------------
# 4. Transaction Management
# ---------------------------
@app.route('/add-transaction', methods=['POST'])
def add_transaction():
    data = request.json
    transaction = {
        "amount": float(data.get("amount", 0)),
        "type": data.get("type"), # 'income' or 'expense'
        "category": data.get("category")
    }
    transactions.append(transaction)
    return jsonify({"message": "Transaction added"})

# ---------------------------
# 5. Global Dashboard Stats
# ---------------------------
@app.route('/dashboard', methods=['GET'])
def dashboard():
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")
    balance = total_income - total_expense
    
    return jsonify({
        "income": total_income,
        "expense": total_expense,
        "balance": balance
    })

# ---------------------------
# 6. Financial Stress Meter
# ---------------------------
@app.route('/stress', methods=['GET'])
def stress():
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")

    if total_expense > total_income:
        level = "HIGH 🔴"
    elif total_expense > 0.7 * total_income:
        level = "MEDIUM 🟡"
    else:
        level = "LOW 🟢"

    return jsonify({"stress_level": level})

# ---------------------------
# Run Server
# ---------------------------
if __name__ == '__main__':
    app.run(debug=True, port=5000)

# Food Delivery Scheduler
**Plan deliveries. Maximize profit.**

A complete, production-grade food delivery order scheduling system implementing the **Greedy Job Sequencing with Deadlines** algorithm.

---

## 📌 Problem Overview

A food delivery company receives customer orders throughout the day. Each order has:
- **Order ID**
- **Deadline** (delivery time slot by which the order must be delivered)
- **Profit** (revenue earned when delivered on or before its deadline)
- Optional real-world fields: *Customer Name*, *Food Item*

Each order requires exactly one delivery time slot. The objective is to determine a schedule that maximizes total profit without slot collisions or missed deadlines.

---

## 📋 Assignment Data

| Order ID | Deadline | Profit (₹) |
| :---: | :---: | :---: |
| **O1** | 2 | 100 |
| **O2** | 1 | 80 |
| **O3** | 2 | 60 |
| **O4** | 1 | 40 |
| **O5** | 3 | 120 |

---

## ⚙️ Scheduling Process

### 1. Sort Orders by Profit (Descending)
- **O5** &bull; Deadline 3 &bull; ₹120
- **O1** &bull; Deadline 2 &bull; ₹100
- **O2** &bull; Deadline 1 &bull; ₹80
- **O3** &bull; Deadline 2 &bull; ₹60
- **O4** &bull; Deadline 1 &bull; ₹40

### 2. Assign Delivery Slots (Greedy Backward Search)
- **O5:** Deadline = 3, Profit = ₹120 &rarr; Latest available slot = 3 &rarr; **Scheduled in Slot 3**
- **O1:** Deadline = 2, Profit = ₹100 &rarr; Latest available slot = 2 &rarr; **Scheduled in Slot 2**
- **O2:** Deadline = 1, Profit = ₹80 &rarr; Latest available slot = 1 &rarr; **Scheduled in Slot 1**
- **O3:** Deadline = 2, Profit = ₹60 &rarr; Slots 2 and 1 occupied &rarr; **Rejected**
- **O4:** Deadline = 1, Profit = ₹40 &rarr; Slot 1 occupied &rarr; **Rejected**

### 3. Final Solution & Metrics
- **Slot 1** &rarr; **O2** &rarr; ₹80
- **Slot 2** &rarr; **O1** &rarr; ₹100
- **Slot 3** &rarr; **O5** &rarr; ₹120

- **Maximum Achieved Profit:** ₹300
- **Potential Profit (All Orders):** ₹400
- **Unrealized Profit:** ₹100
- **Profit Utilization:** 75%
- **Scheduled Orders:** 3
- **Rejected Orders:** 2 (O3, O4)

---

## 📊 Analytics Dashboard

The application includes 7 graphical analyses:
1. **Profit by Order** (Bar chart color-coded by Scheduled vs. Rejected status)
2. **Deadline vs. Profit** (Scatter plot)
3. **Scheduled vs. Rejected** (Donut chart)
4. **Profit by Delivery Slot** (Bar chart across slots)
5. **Orders by Deadline** (Bar chart showing time pressure distribution)
6. **Cumulative Profit** (Line chart tracking revenue accumulation across slots)
7. **Profit Comparison** (Bar chart comparing Potential, Achieved, and Unrealized Profit)

---

## ⚡ Computational Complexity

- **Time Complexity:** $\mathcal{O}(n \log n + n \times d)$
  - Sorting orders by profit: $\mathcal{O}(n \log n)$
  - Backward slot searching: $\mathcal{O}(n \times d)$
- **Space Complexity:** $\mathcal{O}(d)$
  - Auxiliary delivery slot array of size $d$  
  *(where $n$ is the number of orders and $d$ is the maximum deadline)*

---

## 🚀 Running the Application Locally

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the Streamlit application
streamlit run app.py
```
The application will open in your browser at `http://localhost:8501`.

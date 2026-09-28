"""
Food Delivery Scheduler
Tagline: Plan deliveries. Maximize profit.

Real-world food delivery order scheduling system using the
Greedy Job Sequencing with Deadlines algorithm.

Run locally:
    streamlit run app.py
"""

from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go


# ==============================================================================
# ASSIGNMENT DATA
# ==============================================================================
def load_assignment_orders() -> List[Dict[str, Any]]:
    """Return canonical assignment orders."""
    return [
        {"order_id": "O1", "deadline": 2, "profit": 100.0, "customer": "Rahul", "food_item": "Biryani"},
        {"order_id": "O2", "deadline": 1, "profit": 80.0, "customer": "Ayaan", "food_item": "Pizza"},
        {"order_id": "O3", "deadline": 2, "profit": 60.0, "customer": "Arman", "food_item": "Burger"},
        {"order_id": "O4", "deadline": 1, "profit": 40.0, "customer": "Sameer", "food_item": "Biryani"},
        {"order_id": "O5", "deadline": 3, "profit": 120.0, "customer": "Zaid", "food_item": "Pizza"},
    ]


# ==============================================================================
# CORE GREEDY ALGORITHM: JOB SEQUENCING WITH DEADLINES
# ==============================================================================
def job_sequencing(
    orders: List[Dict[str, Any]],
) -> Tuple[
    Dict[int, Dict[str, Any]],
    List[Dict[str, Any]],
    List[Dict[str, Any]],
    float,
    List[Dict[str, Any]],
]:
    """Execute the Job Sequencing with Deadlines greedy algorithm.

    1. Sort all orders by profit in descending order.
    2. Find the maximum deadline.
    3. Create delivery slots from 1 to maximum deadline.
    4. Consider each order in descending profit order.
    5. Starting from its deadline, search backwards for the latest free slot.
    6. If a free slot exists, assign the order.
    7. If no slot exists, reject the order.
    8. Calculate the total profit.

    Returns:
        (schedule, scheduled_orders, rejected_orders, total_profit, trace)
    """
    if not orders:
        return {}, [], [], 0.0, []

    # 1. Sort orders by profit descending (tie-breaker: tighter deadline)
    sorted_orders = sorted(
        orders, key=lambda x: (-x["profit"], x["deadline"], x["order_id"])
    )

    # 2. Maximum deadline
    max_deadline = max(o["deadline"] for o in sorted_orders)
    if max_deadline <= 0:
        return {}, [], [], 0.0, []

    # 3. Create slots
    slots: Dict[int, Optional[Dict[str, Any]]] = {
        i: None for i in range(1, max_deadline + 1)
    }
    execution_trace: List[Dict[str, Any]] = []
    scheduled_orders: List[Dict[str, Any]] = []
    rejected_orders: List[Dict[str, Any]] = []

    # 4 & 5. Backward search for free slot
    step = 1
    for order in sorted_orders:
        assigned_slot = None
        attempted_slot = min(order["deadline"], max_deadline)

        slots_checked = []
        for s in range(attempted_slot, 0, -1):
            slots_checked.append(s)
            if slots[s] is None:
                slots[s] = order
                assigned_slot = s
                break

        # 6 & 7. Assign or reject
        is_scheduled = assigned_slot is not None
        if is_scheduled:
            sc_order = dict(order)
            sc_order["slot"] = assigned_slot
            scheduled_orders.append(sc_order)
        else:
            rejected_orders.append(order)

        execution_trace.append(
            {
                "step": step,
                "order_id": order["order_id"],
                "profit": order["profit"],
                "deadline": order["deadline"],
                "attempted_slot": attempted_slot,
                "slots_checked": ", ".join(map(str, slots_checked)),
                "assigned_slot": assigned_slot,
                "status": "Scheduled" if is_scheduled else "Rejected",
                "customer": order.get("customer", "-"),
                "food_item": order.get("food_item", "-"),
            }
        )
        step += 1

    # 8. Calculate total profit
    active_schedule = {s: o for s, o in slots.items() if o is not None}
    total_profit = sum(o["profit"] for o in active_schedule.values())

    return (
        active_schedule,
        scheduled_orders,
        rejected_orders,
        total_profit,
        execution_trace,
    )


def calculate_metrics(orders: List[Dict[str, Any]], schedule: Dict[int, Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate comprehensive summary metrics dynamically."""
    total_orders = len(orders)
    scheduled_count = len(schedule)
    rejected_count = total_orders - scheduled_count
    max_deadline = max([o["deadline"] for o in orders]) if orders else 0
    available_slots = max(0, max_deadline - scheduled_count) if max_deadline > 0 else 0
    slot_utilization = (scheduled_count / max_deadline * 100) if max_deadline > 0 else 0.0

    potential_profit = sum(o["profit"] for o in orders)
    achieved_profit = sum(o["profit"] for o in schedule.values())
    unrealized_profit = potential_profit - achieved_profit
    profit_utilization = (achieved_profit / potential_profit * 100) if potential_profit > 0 else 0.0

    return {
        "total_orders": total_orders,
        "scheduled_count": scheduled_count,
        "rejected_count": rejected_count,
        "max_deadline": max_deadline,
        "available_slots": available_slots,
        "slot_utilization": slot_utilization,
        "potential_profit": potential_profit,
        "achieved_profit": achieved_profit,
        "unrealized_profit": unrealized_profit,
        "profit_utilization": profit_utilization,
    }


# ==============================================================================
# STREAMLIT USER INTERFACE (Off-White + Olive Green Theme)
# ==============================================================================
def main() -> None:
    st.set_page_config(
        page_title="Food Delivery Scheduler",
        page_icon="🍔",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    # Initialize session state
    if "orders" not in st.session_state:
        st.session_state.orders = load_assignment_orders()
    if "nav" not in st.session_state:
        st.session_state.nav = "Home"
    if "algo_step" not in st.session_state:
        st.session_state.algo_step = 0
    if "order_filter" not in st.session_state:
        st.session_state.order_filter = "All"
    if "order_search" not in st.session_state:
        st.session_state.order_search = ""

    # Custom Styling: Off-White (#F5F3EA, #FAF9F3) + Olive Green (#68734A, #4F5937)
    st.markdown(
        """
        <style>
        .stApp {
            background-color: #F5F3EA;
            color: #24251F;
        }
        .main-hero {
            background-color: #FAF9F3;
            border: 1px solid #D9D8CB;
            border-radius: 16px;
            padding: 24px 30px;
            margin-bottom: 20px;
        }
        .slot-card {
            background-color: #FAF9F3;
            border: 1px solid rgba(104, 115, 74, 0.4);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 8px;
        }
        .slot-card-empty {
            background-color: #F5F3EA;
            border: 1px dashed #D9D8CB;
            border-radius: 12px;
            padding: 16px;
            color: #879568;
            margin-bottom: 8px;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    # Shared application calculations
    orders = st.session_state.orders
    (
        schedule,
        scheduled_orders,
        rejected_orders,
        total_profit,
        execution_trace,
    ) = job_sequencing(orders)
    metrics = calculate_metrics(orders, schedule)

    # --------------------------------------------------------------------------
    # SIDEBAR NAVIGATION
    # --------------------------------------------------------------------------
    with st.sidebar:
        st.markdown("### 🍔 Food Delivery Scheduler")
        st.caption("Plan deliveries. Maximize profit.")

        nav_options = ["Home", "Orders", "Schedule", "Algorithm", "Analytics", "Help"]
        selected = st.radio(
            "Navigation",
            nav_options,
            index=nav_options.index(st.session_state.nav if st.session_state.nav in nav_options else "Home"),
            label_visibility="collapsed",
        )
        st.session_state.nav = selected

        st.markdown("---")
        st.caption("Quick Actions")
        c1, c2 = st.columns(2)
        with c1:
            if st.button("Load Data", use_container_width=True):
                st.session_state.orders = load_assignment_orders()
                st.session_state.algo_step = 0
                st.rerun()
        with c2:
            if st.button("Clear", use_container_width=True):
                st.session_state.orders = []
                st.session_state.algo_step = 0
                st.rerun()

    # --------------------------------------------------------------------------
    # 1. HOME PAGE
    # --------------------------------------------------------------------------
    if st.session_state.nav == "Home":
        st.markdown(
            """
            <div class="main-hero">
                <span style="background: rgba(104,115,74,0.12); color: #4F5937; padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 600;">
                    Job Scheduling
                </span>
                <h1 style="color: #24251F; font-size: 2.2rem; font-weight: 800; margin: 8px 0 2px 0;">Food Delivery Scheduler</h1>
                <p style="color: #68734A; font-size: 1.15rem; font-weight: 600; margin-bottom: 8px;">Plan deliveries. Maximize profit.</p>
                <p style="color: #4F5937; font-size: 0.95rem; max-width: 620px; line-height: 1.5;">Manage food delivery orders and create a schedule that maximizes total profit while respecting deadlines.</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

        btn1, btn2, _ = st.columns([1, 1, 3])
        with btn1:
            if st.button("Manage Orders", type="primary", use_container_width=True):
                st.session_state.nav = "Orders"
                st.rerun()
        with btn2:
            if st.button("View Schedule", use_container_width=True):
                st.session_state.nav = "Schedule"
                st.rerun()

        st.markdown("<br>", unsafe_allow_html=True)
        st.subheader("Summary")
        k1, k2, k3, k4, k5, k6 = st.columns(6)
        k1.metric("Total Orders", metrics["total_orders"])
        k2.metric("Scheduled", metrics["scheduled_count"])
        k3.metric("Rejected", metrics["rejected_count"])
        k4.metric("Maximum Profit", f"₹{metrics['achieved_profit']:.0f}")
        k5.metric("Available Slots", metrics["available_slots"])
        k6.metric("Slot Utilization", f"{metrics['slot_utilization']:.0f}%")

        st.markdown("<br>", unsafe_allow_html=True)

        # Current Delivery Schedule
        st.subheader("Current Delivery Schedule")
        if metrics["max_deadline"] == 0:
            st.info("No orders in schedule. Load assignment data or add new orders.")
        else:
            cols = st.columns(min(metrics["max_deadline"], 6))
            for i in range(1, metrics["max_deadline"] + 1):
                col_idx = (i - 1) % len(cols)
                with cols[col_idx]:
                    if i in schedule:
                        ord_info = schedule[i]
                        st.markdown(
                            f"""
                            <div class="slot-card">
                                <div style="font-size: 11px; font-weight: 700; color: #4F5937;">Slot {i}</div>
                                <div style="font-size: 20px; font-weight: 800; color: #24251F; margin: 4px 0;">{ord_info['order_id']}</div>
                                <div style="font-size: 14px; font-weight: 700; color: #4F5937;">₹{ord_info['profit']:.0f}</div>
                                <div style="font-size: 11px; color: #6F7165; margin-top: 4px;">Deadline {ord_info['deadline']}</div>
                            </div>
                            """,
                            unsafe_allow_html=True,
                        )
                    else:
                        st.markdown(
                            f"""
                            <div class="slot-card-empty">
                                <div style="font-size: 11px; font-weight: 700;">Slot {i}</div>
                                <div style="font-size: 14px; font-weight: 600; margin: 8px 0;">Available</div>
                            </div>
                            """,
                            unsafe_allow_html=True,
                        )

        # Profit Overview
        st.markdown("<br>", unsafe_allow_html=True)
        st.subheader("Profit Overview")
        ps1, ps2, ps3, ps4 = st.columns(4)
        ps1.metric("Potential Profit", f"₹{metrics['potential_profit']:.0f}")
        ps2.metric("Achieved Profit", f"₹{metrics['achieved_profit']:.0f}")
        ps3.metric("Unrealized Profit", f"₹{metrics['unrealized_profit']:.0f}")
        ps4.metric("Profit Utilization", f"{metrics['profit_utilization']:.1f}%")

        # Recent Orders
        st.markdown("<br>", unsafe_allow_html=True)
        st.subheader("Recent Orders")
        if orders:
            order_slot_dict = {o["order_id"]: s for s, o in schedule.items()}
            recent_rows = []
            for o in orders[:5]:
                slot = order_slot_dict.get(o["order_id"])
                recent_rows.append({
                    "Order ID": o["order_id"],
                    "Deadline": o["deadline"],
                    "Profit": f"₹{o['profit']:.0f}",
                    "Status": "Scheduled" if slot else "Rejected",
                    "Assigned Slot": f"Slot {slot}" if slot else "—",
                })
            st.dataframe(pd.DataFrame(recent_rows), use_container_width=True, hide_index=True)

        # Quick Actions
        st.markdown("<br>", unsafe_allow_html=True)
        st.subheader("Quick Actions")
        qa1, qa2, qa3 = st.columns(3)
        with qa1:
            if st.button("▶ Run Scheduling", use_container_width=True):
                st.session_state.nav = "Schedule"
                st.rerun()
        with qa2:
            if st.button("↺ Reset Orders", use_container_width=True):
                st.session_state.orders = load_assignment_orders()
                st.session_state.algo_step = 0
                st.rerun()
        with qa3:
            csv_data = generate_schedule_csv(schedule, rejected_orders, total_profit)
            st.download_button(
                "⬇ Export Schedule",
                data=csv_data,
                file_name="delivery_schedule.csv",
                mime="text/csv",
                use_container_width=True,
            )

        # How It Works
        st.markdown("<br>", unsafe_allow_html=True)
        st.subheader("How It Works")
        h1, h2, h3 = st.columns(3)
        with h1:
            st.markdown(
                """
                <div class="slot-card">
                    <div style="font-weight: 700; color: #68734A;">01</div>
                    <div style="font-weight: 600; margin: 4px 0;">Add Orders</div>
                    <div style="font-size: 12px; color: #4F5937;">Enter orders with delivery deadline and profit values.</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with h2:
            st.markdown(
                """
                <div class="slot-card">
                    <div style="font-weight: 700; color: #68734A;">02</div>
                    <div style="font-weight: 600; margin: 4px 0;">Schedule Orders</div>
                    <div style="font-size: 12px; color: #4F5937;">Sorts by profit and places into the latest free slot &le; deadline.</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with h3:
            st.markdown(
                """
                <div class="slot-card">
                    <div style="font-weight: 700; color: #68734A;">03</div>
                    <div style="font-weight: 600; margin: 4px 0;">Maximize Profit</div>
                    <div style="font-size: 12px; color: #4F5937;">Yields maximum profit while respecting every deadline.</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    # --------------------------------------------------------------------------
    # 2. ORDERS PAGE
    # --------------------------------------------------------------------------
    elif st.session_state.nav == "Orders":
        st.title("Orders")
        st.write("Manage incoming food orders.")

        with st.form("add_order_form", clear_on_submit=False):
            st.subheader("Add Order")
            f1, f2, f3 = st.columns(3)
            with f1:
                next_id = f"O{len(orders) + 1}"
                new_id = st.text_input("Order ID *", value=next_id).strip()
            with f2:
                new_deadline = st.number_input("Deadline *", min_value=1, max_value=24, value=2, step=1)
            with f3:
                new_profit = st.number_input("Profit (₹) *", min_value=1.0, value=90.0, step=10.0)

            f4, f5 = st.columns(2)
            with f4:
                new_cust = st.text_input("Customer Name (optional)", value="").strip()
            with f5:
                new_food = st.text_input("Food Item (optional)", value="").strip()

            submitted = st.form_submit_button("+ Add Order")
            if submitted:
                existing_ids = [o["order_id"].lower() for o in orders]
                if not new_id:
                    st.error("Order ID cannot be empty.")
                elif new_id.lower() in existing_ids:
                    st.error(f"Order ID '{new_id}' already exists.")
                elif new_deadline < 1:
                    st.error("Deadline must be >= 1.")
                elif new_profit <= 0:
                    st.error("Profit must be > 0.")
                else:
                    st.session_state.orders.append(
                        {
                            "order_id": new_id,
                            "deadline": int(new_deadline),
                            "profit": float(new_profit),
                            "customer": new_cust if new_cust else "-",
                            "food_item": new_food if new_food else "-",
                        }
                    )
                    st.session_state.algo_step = 0
                    st.success(f"Order {new_id} added.")
                    st.rerun()

        b1, b2, _ = st.columns([1.5, 1.5, 4])
        with b1:
            if st.button("Load Assignment Data", use_container_width=True):
                st.session_state.orders = load_assignment_orders()
                st.session_state.algo_step = 0
                st.rerun()
        with b2:
            if st.button("Clear All Orders", use_container_width=True):
                st.session_state.orders = []
                st.session_state.algo_step = 0
                st.rerun()

        st.markdown("<br>", unsafe_allow_html=True)
        st.subheader("Orders Table")

        # Search and Filter
        sf1, sf2 = st.columns([2, 1])
        with sf1:
            search_query = st.text_input("Search orders...", value=st.session_state.order_search).strip().lower()
            st.session_state.order_search = search_query
        with sf2:
            filter_choice = st.selectbox("Filter", ["All", "Scheduled", "Rejected"], index=["All", "Scheduled", "Rejected"].index(st.session_state.order_filter))
            st.session_state.order_filter = filter_choice

        if orders:
            order_slot_map = {o["order_id"]: s for s, o in schedule.items()}
            table_rows = []
            for o in orders:
                slot = order_slot_map.get(o["order_id"])
                status = "Scheduled" if slot else "Rejected"

                # Apply Filter
                if filter_choice != "All" and status != filter_choice:
                    continue
                # Apply Search
                if search_query and not (
                    search_query in o["order_id"].lower()
                    or search_query in str(o.get("customer", "")).lower()
                    or search_query in str(o.get("food_item", "")).lower()
                ):
                    continue

                table_rows.append(
                    {
                        "Order ID": o["order_id"],
                        "Customer": o.get("customer", "-"),
                        "Food": o.get("food_item", "-"),
                        "Deadline": o["deadline"],
                        "Profit": f"₹{o['profit']:.0f}",
                        "Status": status,
                        "Delivery Slot": str(slot) if slot else "-",
                    }
                )

            if table_rows:
                df_orders = pd.DataFrame(table_rows)
                st.dataframe(df_orders, use_container_width=True, hide_index=True)
            else:
                st.info("No orders match the current filter/search.")

            # Delete single order control
            del_options = [f"{o['order_id']} (Deadline: {o['deadline']}, ₹{o['profit']:.0f})" for o in orders]
            to_delete = st.selectbox("Delete an Order", del_options)
            if st.button("Delete Selected Order"):
                del_id = to_delete.split(" ")[0]
                st.session_state.orders = [o for o in st.session_state.orders if o["order_id"] != del_id]
                st.session_state.algo_step = 0
                st.success(f"Order {del_id} removed.")
                st.rerun()
        else:
            st.info("No orders in table.")

    # --------------------------------------------------------------------------
    # 3. SCHEDULE PAGE
    # --------------------------------------------------------------------------
    elif st.session_state.nav == "Schedule":
        st.title("Delivery Schedule")

        s1, s2, s3, s4 = st.columns(4)
        s1.metric("Maximum Profit", f"₹{metrics['achieved_profit']:.0f}")
        s2.metric("Scheduled Orders", metrics["scheduled_count"])
        s3.metric("Rejected Orders", metrics["rejected_count"])
        s4.metric("Slot Utilization", f"{metrics['slot_utilization']:.0f}%")

        st.markdown("---")
        st.subheader("Visual Delivery Timeline")

        if metrics["max_deadline"] == 0:
            st.info("No schedule available.")
        else:
            cols = st.columns(min(metrics["max_deadline"], 6))
            for i in range(1, metrics["max_deadline"] + 1):
                col_idx = (i - 1) % len(cols)
                with cols[col_idx]:
                    if i in schedule:
                        ord_item = schedule[i]
                        st.markdown(
                            f"""
                            <div class="slot-card">
                                <div style="font-size:11px; font-weight:700; color:#4F5937;">SLOT {i:02d}</div>
                                <div style="font-size:22px; font-weight:800; color:#24251F; margin:4px 0;">{ord_item['order_id']}</div>
                                <div style="font-size:13px; color:#4F5937; font-weight:600;">{ord_item.get('food_item', '-')}</div>
                                <div style="font-size:15px; font-weight:700; color:#4F5937; margin-top:4px;">₹{ord_item['profit']:.0f}</div>
                                <div style="font-size:11px; color:#6F7165;">Deadline {ord_item['deadline']}</div>
                            </div>
                            """,
                            unsafe_allow_html=True,
                        )
                    else:
                        st.markdown(
                            f"""
                            <div class="slot-card-empty">
                                <div style="font-size:11px; font-weight:700;">SLOT {i:02d}</div>
                                <div style="font-size:15px; font-weight:600; margin:10px 0;">AVAILABLE</div>
                            </div>
                            """,
                            unsafe_allow_html=True,
                        )

            # Slot Utilization Details
            st.markdown("<br>", unsafe_allow_html=True)
            st.write(f"**Slot Utilization:** {metrics['scheduled_count']} / {metrics['max_deadline']} occupied ({metrics['slot_utilization']:.0f}%)")
            st.progress(metrics["slot_utilization"] / 100.0 if metrics["max_deadline"] > 0 else 0.0)

            # Rejected Orders Section
            if rejected_orders:
                st.markdown("<br>", unsafe_allow_html=True)
                st.subheader(f"Orders Not Scheduled ({len(rejected_orders)})")
                for r in rejected_orders:
                    st.markdown(
                        f"""
                        - **{r['order_id']}** &bull; Deadline {r['deadline']} &bull; Profit ₹{r['profit']:.0f}  
                          *Reason:* No available delivery slot before deadline.
                        """
                    )

            # CSV Export
            st.markdown("---")
            export_rows = []
            order_slot_map = {o["order_id"]: s for s, o in schedule.items()}
            for o in orders:
                slot = order_slot_map.get(o["order_id"])
                export_rows.append(
                    {
                        "Order ID": o["order_id"],
                        "Deadline": o["deadline"],
                        "Profit": o["profit"],
                        "Status": "Scheduled" if slot else "Rejected",
                        "Delivery Slot": slot if slot else "None",
                    }
                )
            csv_data = pd.DataFrame(export_rows).to_csv(index=False)
            st.download_button(
                label="📥 Export Schedule (CSV)",
                data=csv_data,
                file_name="delivery_schedule.csv",
                mime="text/csv",
            )

    # --------------------------------------------------------------------------
    # 4. ALGORITHM PAGE
    # --------------------------------------------------------------------------
    elif st.session_state.nav == "Algorithm":
        st.title("Scheduling Process")
        st.write("See how each order is evaluated and assigned to a delivery slot.")

        # Interactive controls
        ac1, ac2, ac3, ac4 = st.columns([1, 1, 1, 2])
        with ac1:
            if st.button("Next Step", type="primary", use_container_width=True):
                if st.session_state.algo_step < len(execution_trace):
                    st.session_state.algo_step += 1
                    st.rerun()
        with ac2:
            if st.button("Previous", use_container_width=True):
                if st.session_state.algo_step > 0:
                    st.session_state.algo_step -= 1
                    st.rerun()
        with ac3:
            if st.button("Reset", use_container_width=True):
                st.session_state.algo_step = 0
                st.rerun()
        with ac4:
            if st.button("Run All Steps", use_container_width=True):
                st.session_state.algo_step = len(execution_trace)
                st.rerun()

        st.markdown("---")

        # STEP 1 — SORT BY PROFIT
        st.subheader("Step 1 — Sort by Profit")
        sorted_orders = sorted(orders, key=lambda x: (-x["profit"], x["deadline"], x["order_id"]))
        s1_col1, s1_col2 = st.columns(2)
        with s1_col1:
            st.write("**Original Orders:**")
            st.write(", ".join([f"{o['order_id']} (₹{o['profit']:.0f})" for o in orders]))
        with s1_col2:
            st.write("**Sorted by Profit (Greedy Order):**")
            st.write(", ".join([f"**{o['order_id']}** (₹{o['profit']:.0f})" for o in sorted_orders]))

        st.markdown("---")

        # STEP 2 — ASSIGN SLOTS
        st.subheader("Step 2 — Assign Slots")
        if st.session_state.algo_step > 0:
            current_trace = execution_trace[st.session_state.algo_step - 1]
            st.markdown(
                f"""
                ### Current Order: {current_trace['order_id']}
                - **Profit:** ₹{current_trace['profit']:.0f}
                - **Deadline:** {current_trace['deadline']}
                - **Slots Checked:** {current_trace['slots_checked']}
                - **Decision:** {'✓ Scheduled → Slot ' + str(current_trace['assigned_slot']) if current_trace['assigned_slot'] else '✗ Rejected'}
                """
            )
        else:
            st.info("Click **Next Step** to begin evaluating orders.")

        # Full Algorithm Trace Table
        st.markdown("<br>", unsafe_allow_html=True)
        st.write("**Algorithm Execution Trace:**")
        trace_data = []
        for t in execution_trace:
            trace_data.append(
                {
                    "Step": t["step"],
                    "Order": t["order_id"],
                    "Deadline": t["deadline"],
                    "Profit": f"₹{t['profit']:.0f}",
                    "Slot Checked": t["slots_checked"],
                    "Assigned Slot": str(t["assigned_slot"]) if t["assigned_slot"] else "-",
                    "Decision": t["status"],
                }
            )
        st.dataframe(pd.DataFrame(trace_data), use_container_width=True, hide_index=True)

        st.markdown("---")

        # FINAL ALGORITHM RESULT
        st.subheader("Final Algorithm Result")
        st.markdown(f"### Maximum Profit = ₹{total_profit:.0f}")
        for s, o in schedule.items():
            st.write(f"- Slot {s} → **{o['order_id']}** (₹{o['profit']:.0f})")

    # --------------------------------------------------------------------------
    # 5. ANALYTICS PAGE (GRAPHICAL ANALYSIS)
    # --------------------------------------------------------------------------
    elif st.session_state.nav == "Analytics":
        st.title("Analytics")
        st.write("Graphical performance dashboard based entirely on current order data.")

        # Analytics Summary
        as1, as2, as3 = st.columns(3)
        as1.metric("Potential Profit", f"₹{metrics['potential_profit']:.0f}")
        as2.metric("Maximum Achieved Profit", f"₹{metrics['achieved_profit']:.0f}")
        as3.metric("Profit Utilization", f"{metrics['profit_utilization']:.1f}%")

        st.markdown("---")

        if not orders:
            st.info("No data available for analytics. Add orders or load assignment data.")
        else:
            g_col1, g_col2 = st.columns(2)

            with g_col1:
                # Graph 1 — Profit by Order
                st.subheader("1. Profit by Order")
                sched_ids = {o["order_id"] for o in scheduled_orders}
                df_orders_plot = pd.DataFrame(orders).copy()
                df_orders_plot["Status"] = df_orders_plot["order_id"].apply(
                    lambda x: "Scheduled" if x in sched_ids else "Rejected"
                )
                df_orders_plot = df_orders_plot.sort_values(by="profit", ascending=False)
                fig1 = px.bar(
                    df_orders_plot,
                    x="order_id",
                    y="profit",
                    color="Status",
                    color_discrete_map={"Scheduled": "#68734A", "Rejected": "#C25E5E"},
                    labels={"order_id": "Order ID", "profit": "Profit (₹)"},
                    text="profit",
                )
                fig1.update_layout(height=300, margin=dict(l=10, r=10, t=20, b=10), paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
                st.plotly_chart(fig1, use_container_width=True)

            with g_col2:
                # Graph 2 — Deadline vs Profit
                st.subheader("2. Deadline vs Profit")
                fig2 = px.scatter(
                    df_orders_plot,
                    x="deadline",
                    y="profit",
                    color="Status",
                    color_discrete_map={"Scheduled": "#68734A", "Rejected": "#C25E5E"},
                    hover_data=["order_id", "deadline", "profit", "Status"],
                    size=[14] * len(df_orders_plot),
                    labels={"deadline": "Deadline", "profit": "Profit (₹)"},
                )
                fig2.update_layout(height=300, margin=dict(l=10, r=10, t=20, b=10), paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
                st.plotly_chart(fig2, use_container_width=True)

            g_col3, g_col4 = st.columns(2)

            with g_col3:
                # Graph 3 — Scheduled vs Rejected
                st.subheader("3. Scheduled vs Rejected")
                fig3 = go.Figure(
                    data=[
                        go.Pie(
                            labels=["Scheduled", "Rejected"],
                            values=[metrics["scheduled_count"], metrics["rejected_count"]],
                            hole=0.45,
                            marker=dict(colors=["#68734A", "#C25E5E"]),
                        )
                    ]
                )
                fig3.update_layout(height=300, margin=dict(l=10, r=10, t=20, b=10), paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
                st.plotly_chart(fig3, use_container_width=True)

            with g_col4:
                # Graph 4 — Profit by Delivery Slot
                st.subheader("4. Profit by Delivery Slot")
                if schedule:
                    slot_df = pd.DataFrame(
                        [{"Slot": f"Slot {s}", "Profit": o["profit"], "Order": o["order_id"]} for s, o in schedule.items()]
                    )
                    fig4 = px.bar(
                        slot_df,
                        x="Slot",
                        y="Profit",
                        text="Profit",
                        labels={"Profit": "Profit (₹)"},
                        color_discrete_sequence=["#4F5937"],
                    )
                    fig4.update_layout(height=300, margin=dict(l=10, r=10, t=20, b=10), paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
                    st.plotly_chart(fig4, use_container_width=True)
                else:
                    st.info("No slots allocated.")

            g_col5, g_col6 = st.columns(2)

            with g_col5:
                # Graph 5 — Orders by Deadline
                st.subheader("5. Orders by Deadline")
                dl_counts = pd.DataFrame(orders)["deadline"].value_counts().reset_index()
                dl_counts.columns = ["Deadline", "Count"]
                dl_counts = dl_counts.sort_values(by="Deadline")
                fig5 = px.bar(
                    dl_counts,
                    x="Deadline",
                    y="Count",
                    text="Count",
                    color_discrete_sequence=["#879568"],
                )
                fig5.update_layout(height=300, margin=dict(l=10, r=10, t=20, b=10), paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
                st.plotly_chart(fig5, use_container_width=True)

            with g_col6:
                # Graph 6 — Cumulative Profit
                st.subheader("6. Cumulative Profit")
                if schedule:
                    sorted_slots = sorted(schedule.keys())
                    cum_profit = 0
                    cum_data = []
                    for s in sorted_slots:
                        cum_profit += schedule[s]["profit"]
                        cum_data.append({"Slot": f"Slot {s}", "Cumulative Profit": cum_profit})
                    fig6 = px.line(
                        pd.DataFrame(cum_data),
                        x="Slot",
                        y="Cumulative Profit",
                        markers=True,
                        color_discrete_sequence=["#4F5937"],
                    )
                    fig6.update_layout(height=300, margin=dict(l=10, r=10, t=20, b=10), paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
                    st.plotly_chart(fig6, use_container_width=True)
                else:
                    st.info("No slots to show cumulative profit.")

            # Graph 7 — Profit Comparison
            st.markdown("<br>", unsafe_allow_html=True)
            st.subheader("7. Profit Comparison")
            comp_df = pd.DataFrame(
                [
                    {"Category": "Potential Profit", "Amount": metrics["potential_profit"]},
                    {"Category": "Achieved Profit", "Amount": metrics["achieved_profit"]},
                    {"Category": "Unrealized Profit", "Amount": metrics["unrealized_profit"]},
                ]
            )
            fig7 = px.bar(
                comp_df,
                x="Category",
                y="Amount",
                color="Category",
                color_discrete_map={
                    "Potential Profit": "#879568",
                    "Achieved Profit": "#4F5937",
                    "Unrealized Profit": "#C25E5E",
                },
                text="Amount",
            )
            fig7.update_layout(height=300, margin=dict(l=10, r=10, t=20, b=10), paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
            st.plotly_chart(fig7, use_container_width=True)

        # Complexity
        st.markdown("---")
        st.subheader("Algorithm Complexity")
        st.markdown(
            """
            - **Time Complexity:** $\\mathcal{O}(n \\log n + n \\times d)$  
              *Sorting orders:* $\\mathcal{O}(n \\log n)$ &bull; *Slot search:* $\\mathcal{O}(n \\times d)$  
            - **Space Complexity:** $\\mathcal{O}(d)$  
              *Slot storage array of size $d$*  
              *(where $n$ = number of orders, $d$ = maximum deadline)*
            """
        )

    # --------------------------------------------------------------------------
    # 6. HELP PAGE
    # --------------------------------------------------------------------------
    elif st.session_state.nav == "Help":
        st.title("Help & Documentation")

        st.subheader("Problem")
        st.write(
            "A food delivery company receives orders with deadlines and profits. "
            "Each order requires exactly one delivery time slot."
        )

        st.markdown("---")
        st.subheader("Objective")
        st.write("Schedule orders to maximize total profit while respecting deadlines.")

        st.markdown("---")
        st.subheader("How It Works")
        st.markdown(
            """
            1. **Sort orders by profit in descending order.**
            2. **Consider the highest-profit order first.**
            3. **Place it in the latest available slot before its deadline.**
            4. **Continue until all orders are processed.**
            5. **Reject orders when no valid slot remains.**
            """
        )

        st.markdown("---")
        st.subheader("Assignment Example & Result")
        st.markdown(
            """
            **Input Orders:**  
            - O1: Deadline 2, Profit ₹100  
            - O2: Deadline 1, Profit ₹80  
            - O3: Deadline 2, Profit ₹60  
            - O4: Deadline 1, Profit ₹40  
            - O5: Deadline 3, Profit ₹120  

            **Sorted by Profit:**  
            O5 (₹120) &rarr; O1 (₹100) &rarr; O2 (₹80) &rarr; O3 (₹60) &rarr; O4 (₹40)  

            **Final Schedule:**  
            - Slot 1 &rarr; **O2** (₹80)  
            - Slot 2 &rarr; **O1** (₹100)  
            - Slot 3 &rarr; **O5** (₹120)  

            **Rejected:** O3, O4  
            **Maximum Profit:** ₹300  
            **Potential Profit:** ₹400  
            **Profit Utilization:** 75%
            """
        )


if __name__ == "__main__":
    main()

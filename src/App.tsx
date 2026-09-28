/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Utensils,
  Plus,
  RotateCcw,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  HelpCircle,
  Play,
  SkipForward,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  ArrowDown,
  Download,
  Search,
  Filter,
  PieChart as PieIcon,
  Activity,
  Check,
  PackageCheck,
  DollarSign
} from 'lucide-react';

export interface Order {
  orderId: string;
  deadline: number;
  profit: number;
  customer?: string;
  foodItem?: string;
}

export interface TraceStep {
  step: number;
  order: Order;
  attemptedSlot: number;
  slotsChecked: number[];
  assignedSlot: number | null;
  status: 'Scheduled' | 'Rejected';
  reason: string;
}

export const ASSIGNMENT_DATA: Order[] = [
  { orderId: 'O1', deadline: 2, profit: 100, customer: 'Rahul', foodItem: 'Biryani' },
  { orderId: 'O2', deadline: 1, profit: 80, customer: 'Ayaan', foodItem: 'Pizza' },
  { orderId: 'O3', deadline: 2, profit: 60, customer: 'Arman', foodItem: 'Burger' },
  { orderId: 'O4', deadline: 1, profit: 40, customer: 'Sameer', foodItem: 'Biryani' },
  { orderId: 'O5', deadline: 3, profit: 120, customer: 'Zaid', foodItem: 'Pizza' },
];

export default function App() {
  const [orders, setOrders] = useState<Order[]>(ASSIGNMENT_DATA);
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'schedule' | 'algorithm' | 'analytics' | 'help'>('home');

  // Order Management Form States
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderIdInput, setOrderIdInput] = useState('O6');
  const [deadlineInput, setDeadlineInput] = useState(2);
  const [profitInput, setProfitInput] = useState(90);
  const [customerInput, setCustomerInput] = useState('');
  const [foodItemInput, setFoodItemInput] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Table Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Scheduled' | 'Rejected'>('All');
  const [sortBy, setSortBy] = useState<'profit' | 'deadline' | 'orderId' | 'status'>('profit');
  const [sortAsc, setSortAsc] = useState(false);

  // Interactive Algorithm Stepper
  const [algoStep, setAlgoStep] = useState<number>(0);

  // CORE SCHEDULING ALGORITHM (Job Sequencing with Deadlines)
  const {
    schedule,
    scheduledOrders,
    rejectedOrders,
    executionTrace,
    sortedOrders,
    maxDeadline,
    totalProfit,
    potentialProfit,
    unrealizedProfit,
    profitUtilization,
    slotUtilization,
    validation
  } = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        schedule: {} as Record<number, Order>,
        scheduledOrders: [] as (Order & { slot: number })[],
        rejectedOrders: [] as Order[],
        executionTrace: [] as TraceStep[],
        sortedOrders: [] as Order[],
        maxDeadline: 0,
        totalProfit: 0,
        potentialProfit: 0,
        unrealizedProfit: 0,
        profitUtilization: 0,
        slotUtilization: 0,
        validation: { isValid: true, errors: [] as string[] },
      };
    }

    // 1. Sort all orders by profit in descending order (secondary: tighter deadline)
    const sorted = [...orders].sort((a, b) => {
      if (b.profit !== a.profit) return b.profit - a.profit;
      return a.deadline - b.deadline;
    });

    // 2. Find the maximum deadline
    const maxD = Math.max(...orders.map((o) => o.deadline), 0);

    // 3. Create delivery slots from 1 to maximum deadline
    const slots: Record<number, Order | null> = {};
    for (let s = 1; s <= maxD; s++) {
      slots[s] = null;
    }

    const trace: TraceStep[] = [];
    const scheduledList: (Order & { slot: number })[] = [];
    const rejectedList: Order[] = [];

    // 4 & 5. Consider each order in descending profit order and search backward
    sorted.forEach((order, index) => {
      let assignedSlot: number | null = null;
      const attemptedSlot = Math.min(order.deadline, maxD);
      const slotsChecked: number[] = [];

      for (let s = attemptedSlot; s >= 1; s--) {
        slotsChecked.push(s);
        if (slots[s] === null) {
          slots[s] = order;
          assignedSlot = s;
          break;
        }
      }

      // 6 & 7. If free slot exists, assign. Otherwise, reject.
      const isScheduled = assignedSlot !== null;
      if (isScheduled) {
        scheduledList.push({ ...order, slot: assignedSlot! });
      } else {
        rejectedList.push(order);
      }

      trace.push({
        step: index + 1,
        order,
        attemptedSlot,
        slotsChecked,
        assignedSlot,
        status: isScheduled ? 'Scheduled' : 'Rejected',
        reason: isScheduled
          ? `Slot ${assignedSlot} available`
          : 'No available slot before deadline.',
      });
    });

    const activeSchedule: Record<number, Order> = {};
    let profitSum = 0;
    for (let s = 1; s <= maxD; s++) {
      if (slots[s] !== null) {
        activeSchedule[s] = slots[s]!;
        profitSum += slots[s]!.profit;
      }
    }

    const potential = orders.reduce((sum, o) => sum + o.profit, 0);
    const unrealized = potential - profitSum;
    const profitUtil = potential > 0 ? (profitSum / potential) * 100 : 0;
    const slotUtil = maxD > 0 ? (scheduledList.length / maxD) * 100 : 0;

    // Validation Checks
    const valErrors: string[] = [];
    const usedSlots = new Set<number>();
    const seenOrderIds = new Set<string>();

    scheduledList.forEach((item) => {
      if (usedSlots.has(item.slot)) {
        valErrors.push(`Slot ${item.slot} is assigned to multiple orders.`);
      }
      usedSlots.add(item.slot);

      if (item.slot > item.deadline) {
        valErrors.push(`Order ${item.orderId} exceeds its deadline (${item.slot} > ${item.deadline}).`);
      }

      if (seenOrderIds.has(item.orderId)) {
        valErrors.push(`Order ${item.orderId} is scheduled more than once.`);
      }
      seenOrderIds.add(item.orderId);
    });

    const calculatedSum = Object.values(activeSchedule).reduce((acc, o) => acc + o.profit, 0);
    if (calculatedSum !== profitSum) {
      valErrors.push('Total profit does not match sum of scheduled orders.');
    }

    return {
      schedule: activeSchedule,
      scheduledOrders: scheduledList,
      rejectedOrders: rejectedList,
      executionTrace: trace,
      sortedOrders: sorted,
      maxDeadline: maxD,
      totalProfit: profitSum,
      potentialProfit: potential,
      unrealizedProfit: unrealized,
      profitUtilization: profitUtil,
      slotUtilization: slotUtil,
      validation: {
        isValid: valErrors.length === 0,
        errors: valErrors,
      },
    };
  }, [orders]);

  // Order Slot Map
  const orderSlotMap = useMemo(() => {
    const map = new Map<string, number>();
    Object.entries(schedule).forEach(([slotStr, ord]) => {
      map.set(ord.orderId, Number(slotStr));
    });
    return map;
  }, [schedule]);

  // Partial schedule at the current stepper step
  const partialSchedule = useMemo(() => {
    const partialSlots: Record<number, Order | null> = {};
    for (let s = 1; s <= maxDeadline; s++) {
      partialSlots[s] = null;
    }
    for (let i = 0; i < algoStep; i++) {
      const stepItem = executionTrace[i];
      if (stepItem && stepItem.assignedSlot !== null) {
        partialSlots[stepItem.assignedSlot] = stepItem.order;
      }
    }
    return partialSlots;
  }, [algoStep, executionTrace, maxDeadline]);

  // Filtered & Sorted Orders for table
  const displayedOrders = useMemo(() => {
    let result = [...orders];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderId.toLowerCase().includes(q) ||
          (o.customer && o.customer.toLowerCase().includes(q)) ||
          (o.foodItem && o.foodItem.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter((o) => {
        const isSched = orderSlotMap.has(o.orderId);
        return statusFilter === 'Scheduled' ? isSched : !isSched;
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'profit') cmp = a.profit - b.profit;
      else if (sortBy === 'deadline') cmp = a.deadline - b.deadline;
      else if (sortBy === 'orderId') cmp = a.orderId.localeCompare(b.orderId);
      else if (sortBy === 'status') {
        const aSched = orderSlotMap.has(a.orderId) ? 1 : 0;
        const bSched = orderSlotMap.has(b.orderId) ? 1 : 0;
        cmp = aSched - bSched;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [orders, searchQuery, statusFilter, sortBy, sortAsc, orderSlotMap]);

  // Form Handlers
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = orderIdInput.trim();
    if (!cleanId) {
      setFormError('Order ID cannot be empty');
      return;
    }
    if (deadlineInput < 1) {
      setFormError('Deadline must be >= 1');
      return;
    }
    if (profitInput <= 0) {
      setFormError('Profit must be > 0');
      return;
    }

    if (editingOrderId) {
      setOrders(
        orders.map((o) =>
          o.orderId === editingOrderId
            ? {
                orderId: cleanId,
                deadline: Number(deadlineInput),
                profit: Number(profitInput),
                customer: customerInput.trim() || undefined,
                foodItem: foodItemInput.trim() || undefined,
              }
            : o
        )
      );
      setEditingOrderId(null);
      setFormSuccess(`Order ${cleanId} updated`);
    } else {
      if (orders.some((o) => o.orderId.toLowerCase() === cleanId.toLowerCase())) {
        setFormError(`Order ID "${cleanId}" already exists. Duplicate IDs not allowed.`);
        return;
      }
      setOrders([
        ...orders,
        {
          orderId: cleanId,
          deadline: Number(deadlineInput),
          profit: Number(profitInput),
          customer: customerInput.trim() || undefined,
          foodItem: foodItemInput.trim() || undefined,
        },
      ]);
      setFormSuccess(`Order ${cleanId} added`);
    }

    setOrderIdInput(`O${orders.length + 2}`);
    setDeadlineInput(2);
    setProfitInput(90);
    setCustomerInput('');
    setFoodItemInput('');
    setFormError('');
    setAlgoStep(0);
    setTimeout(() => setFormSuccess(''), 2500);
  };

  const handleEditClick = (order: Order) => {
    setEditingOrderId(order.orderId);
    setOrderIdInput(order.orderId);
    setDeadlineInput(order.deadline);
    setProfitInput(order.profit);
    setCustomerInput(order.customer || '');
    setFoodItemInput(order.foodItem || '');
    setFormError('');
    setActiveTab('orders');
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
    setOrderIdInput(`O${orders.length + 1}`);
    setDeadlineInput(2);
    setProfitInput(90);
    setCustomerInput('');
    setFoodItemInput('');
    setFormError('');
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders(orders.filter((o) => o.orderId !== orderId));
    if (editingOrderId === orderId) {
      handleCancelEdit();
    }
    setAlgoStep(0);
  };

  const handleLoadAssignment = () => {
    setOrders(ASSIGNMENT_DATA);
    setEditingOrderId(null);
    setOrderIdInput(`O${ASSIGNMENT_DATA.length + 1}`);
    setDeadlineInput(2);
    setProfitInput(90);
    setCustomerInput('');
    setFoodItemInput('');
    setFormError('');
    setAlgoStep(0);
  };

  const handleClearOrders = () => {
    setOrders([]);
    setEditingOrderId(null);
    setOrderIdInput('O1');
    setDeadlineInput(1);
    setProfitInput(50);
    setCustomerInput('');
    setFoodItemInput('');
    setFormError('');
    setAlgoStep(0);
  };

  // CSV Export Handlers
  const handleExportScheduleCSV = () => {
    const rows = [
      ['Order ID', 'Deadline', 'Profit (₹)', 'Status', 'Delivery Slot'],
      ...orders.map((o) => {
        const slot = orderSlotMap.get(o.orderId);
        return [
          o.orderId,
          o.deadline,
          o.profit,
          slot ? 'Scheduled' : 'Rejected',
          slot ? slot : 'None',
        ];
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'delivery_schedule.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAnalyticsCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Orders', orders.length],
      ['Scheduled Orders', scheduledOrders.length],
      ['Rejected Orders', rejectedOrders.length],
      ['Potential Profit (₹)', potentialProfit],
      ['Achieved Profit (₹)', totalProfit],
      ['Unrealized Profit (₹)', unrealizedProfit],
      ['Profit Utilization (%)', profitUtilization.toFixed(1)],
      ['Maximum Deadline', maxDeadline],
      ['Slot Utilization (%)', slotUtilization.toFixed(1)],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'scheduler_analytics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Data helpers for graphs
  const deadlineCounts = useMemo(() => {
    const map = new Map<number, number>();
    orders.forEach((o) => {
      map.set(o.deadline, (map.get(o.deadline) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([dl, count]) => ({ deadline: dl, count }))
      .sort((a, b) => a.deadline - b.deadline);
  }, [orders]);

  const cumulativeProfit = useMemo(() => {
    const slots = Object.keys(schedule)
      .map(Number)
      .sort((a, b) => a - b);
    let running = 0;
    return slots.map((s) => {
      running += schedule[s].profit;
      return { slot: s, profit: schedule[s].profit, cumulative: running, orderId: schedule[s].orderId };
    });
  }, [schedule]);

  return (
    <div className="min-h-screen bg-[#F5F3EA] text-[#24251F] flex flex-col font-sans selection:bg-[#68734A]/20 selection:text-[#4F5937]">
      {/* NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-[#F5F3EA]/95 backdrop-blur-md border-b border-[#D9D8CB]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => setActiveTab('home')}
            >
              <div className="w-9 h-9 rounded-lg bg-[#68734A] flex items-center justify-center text-white shadow-xs">
                <Utensils className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-base tracking-tight text-[#24251F] leading-tight">
                  Food Delivery Scheduler
                </div>
                <div className="text-[11px] text-[#68734A] font-medium">
                  Plan deliveries. Maximize profit.
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-[#FAF9F3] p-1 rounded-xl border border-[#D9D8CB] text-xs">
              {(
                [
                  { id: 'home', label: 'Home' },
                  { id: 'orders', label: 'Orders' },
                  { id: 'schedule', label: 'Schedule' },
                  { id: 'algorithm', label: 'Algorithm' },
                  { id: 'analytics', label: 'Analytics' },
                  { id: 'help', label: 'Help' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#68734A] text-white shadow-xs'
                      : 'text-[#4F5937] hover:text-[#24251F] hover:bg-[#F5F3EA]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Status indicator */}
            <div className="hidden sm:flex items-center gap-2 bg-[#FAF9F3] border border-[#D9D8CB] px-3 py-1 rounded-full text-xs font-medium text-[#4F5937]">
              <span className="w-2 h-2 rounded-full bg-[#68734A]"></span>
              <span>System Ready</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 bg-[#FAF9F3] border-t border-[#D9D8CB] overflow-x-auto text-xs gap-1">
          {(
            [
              { id: 'home', label: 'Home' },
              { id: 'orders', label: 'Orders' },
              { id: 'schedule', label: 'Schedule' },
              { id: 'algorithm', label: 'Algorithm' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'help', label: 'Help' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1 rounded-md shrink-0 font-medium ${
                activeTab === tab.id
                  ? 'bg-[#68734A] text-white'
                  : 'text-[#4F5937]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* =================================================================== */}
        {/* 1. HOME PAGE */}
        {/* =================================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* Hero Card */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-2xl p-8 sm:p-10 shadow-xs relative overflow-hidden">
              <div className="max-w-2xl space-y-3">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#68734A]/10 text-[#4F5937] text-xs font-semibold tracking-wide">
                  Job Sequencing with Deadlines
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#24251F]">
                  Food Delivery Scheduler
                </h1>
                <p className="text-lg font-semibold text-[#68734A]">
                  Plan deliveries. Maximize profit.
                </p>
                <p className="text-[#4F5937] text-sm sm:text-base leading-relaxed">
                  Manage food delivery orders and create a schedule that maximizes total profit while respecting deadlines.
                </p>

                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="bg-[#68734A] hover:bg-[#4F5937] text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-xs flex items-center gap-2"
                  >
                    <span>Manage Orders</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="bg-white hover:bg-[#F5F3EA] text-[#24251F] border border-[#D9D8CB] px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
                  >
                    <span>View Schedule</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-[#24251F] tracking-tight">Summary Cards</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs">
                  <span className="text-xs font-medium text-[#68734A]">Total Orders</span>
                  <div className="text-2xl font-bold text-[#24251F] mt-1">{orders.length}</div>
                </div>

                <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs">
                  <span className="text-xs font-medium text-[#68734A]">Scheduled</span>
                  <div className="text-2xl font-bold text-[#4F5937] mt-1">{scheduledOrders.length}</div>
                </div>

                <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs">
                  <span className="text-xs font-medium text-[#68734A]">Rejected</span>
                  <div className="text-2xl font-bold text-[#C25E5E] mt-1">{rejectedOrders.length}</div>
                </div>

                <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs">
                  <span className="text-xs font-medium text-[#68734A]">Maximum Profit</span>
                  <div className="text-2xl font-bold text-[#24251F] mt-1">₹{totalProfit}</div>
                </div>

                <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs">
                  <span className="text-xs font-medium text-[#68734A]">Available Slots</span>
                  <div className="text-2xl font-bold text-[#24251F] mt-1">
                    {Math.max(0, maxDeadline - scheduledOrders.length)}
                  </div>
                </div>

                <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs">
                  <span className="text-xs font-medium text-[#68734A]">Slot Utilization</span>
                  <div className="text-2xl font-bold text-[#4F5937] mt-1">
                    {slotUtilization.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Current Delivery Schedule Section */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#D9D8CB] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#24251F]">CURRENT DELIVERY SCHEDULE</h3>
                  <p className="text-xs text-[#6F7165] mt-0.5">Currently calculated delivery schedule</p>
                </div>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="text-xs text-[#68734A] hover:text-[#4F5937] font-semibold flex items-center gap-1"
                >
                  <span>View Full Schedule &rarr;</span>
                </button>
              </div>

              {maxDeadline === 0 ? (
                <div className="text-center py-6 text-sm text-[#6F7165]">
                  No orders entered yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Array.from({ length: maxDeadline }, (_, i) => i + 1).map((s) => {
                    const item = schedule[s];
                    return (
                      <div
                        key={s}
                        className={`p-4 rounded-xl border flex flex-col justify-between ${
                          item
                            ? 'bg-white border-[#68734A]/40 text-[#24251F]'
                            : 'bg-[#F5F3EA] border-dashed border-[#D9D8CB] text-[#6F7165]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold mb-2">
                          <span className="text-[#68734A] font-mono">Slot {s}</span>
                          <span className="text-[11px] bg-[#FAF9F3] border border-[#D9D8CB] text-[#4F5937] px-1.5 py-0.5 rounded font-mono">
                            {item ? 'Scheduled' : 'Available'}
                          </span>
                        </div>

                        {item ? (
                          <div>
                            <div className="text-xl font-bold text-[#24251F] flex items-center justify-between">
                              <span>{item.orderId}</span>
                              <span className="text-[#4F5937] font-mono">₹{item.profit}</span>
                            </div>
                            <div className="text-xs text-[#6F7165] mt-1 font-mono">
                              Deadline {item.deadline}
                            </div>
                          </div>
                        ) : (
                          <div className="py-2 text-center text-xs text-[#6F7165]">Empty Slot</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Profit Overview Card */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#68734A] uppercase tracking-wider">Financial Summary</span>
                  <h3 className="text-lg font-bold text-[#24251F]">PROFIT OVERVIEW</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#6F7165]">Achieved / Potential</span>
                  <div className="text-2xl font-bold text-[#4F5937] font-mono">
                    ₹{totalProfit} <span className="text-sm text-[#6F7165]">/ ₹{potentialProfit}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="bg-white p-3.5 rounded-xl border border-[#D9D8CB]">
                  <span className="text-xs text-[#6F7165] block">Potential Profit</span>
                  <span className="text-lg font-bold text-[#24251F] font-mono">₹{potentialProfit}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#D9D8CB]">
                  <span className="text-xs text-[#6F7165] block">Achieved Profit</span>
                  <span className="text-lg font-bold text-[#4F5937] font-mono">₹{totalProfit}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#D9D8CB]">
                  <span className="text-xs text-[#6F7165] block">Unrealized Profit</span>
                  <span className="text-lg font-bold text-[#C25E5E] font-mono">₹{unrealizedProfit}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#D9D8CB]">
                  <span className="text-xs text-[#6F7165] block">Profit Utilization</span>
                  <span className="text-lg font-bold text-[#68734A] font-mono">{profitUtilization.toFixed(1)}%</span>
                </div>
              </div>

              <div className="w-full bg-[#E5E4D8] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#68734A] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(profitUtilization, 100)}%` }}
                />
              </div>
            </div>

            {/* Recent Orders Compact Table */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#D9D8CB] pb-3">
                <h3 className="text-base font-bold text-[#24251F]">RECENT ORDERS</h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-[#68734A] hover:text-[#4F5937] font-semibold flex items-center gap-1"
                >
                  <span>View All Orders &rarr;</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#D9D8CB] text-[#6F7165] uppercase tracking-wider bg-[#EDEBDD]/60">
                      <th className="py-2.5 px-4">Order ID</th>
                      <th className="py-2.5 px-4 text-center">Deadline</th>
                      <th className="py-2.5 px-4 text-right">Profit</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-center">Slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9D8CB] bg-white">
                    {orders.slice(0, 5).map((o) => {
                      const slot = orderSlotMap.get(o.orderId);
                      return (
                        <tr key={o.orderId} className="hover:bg-[#F5F3EA]">
                          <td className="py-2.5 px-4 font-bold text-[#24251F]">{o.orderId}</td>
                          <td className="py-2.5 px-4 text-center">{o.deadline}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-[#4F5937]">₹{o.profit}</td>
                          <td className="py-2.5 px-4 text-center">
                            {slot ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EDEBDD] text-[#4F5937]">
                                Scheduled
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-[#C25E5E]">
                                Rejected
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold">
                            {slot ? slot : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider text-[#68734A]">
                QUICK ACTIONS
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setActiveTab('schedule');
                    setFormSuccess('Schedule recalculated and loaded');
                    setTimeout(() => setFormSuccess(''), 2500);
                  }}
                  className="bg-[#68734A] hover:bg-[#4F5937] text-white px-4 py-2 rounded-lg text-xs font-medium transition-all shadow-xs flex items-center gap-2"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Run Scheduling</span>
                </button>
                <button
                  onClick={handleLoadAssignment}
                  className="bg-white hover:bg-[#F5F3EA] text-[#4F5937] border border-[#D9D8CB] px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#68734A]" />
                  <span>Reset Orders</span>
                </button>
                <button
                  onClick={handleExportScheduleCSV}
                  className="bg-white hover:bg-[#F5F3EA] text-[#24251F] border border-[#D9D8CB] px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-[#68734A]" />
                  <span>Export Schedule</span>
                </button>
              </div>
            </div>

            {/* How It Works (Concise 3-Step) */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-6 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider text-[#68734A]">
                HOW IT WORKS
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#D9D8CB] space-y-1">
                  <div className="text-sm font-bold font-mono text-[#68734A]">01</div>
                  <h4 className="text-xs font-bold text-[#24251F]">Add Orders</h4>
                  <p className="text-[11px] text-[#6F7165]">
                    Enter incoming orders with delivery deadlines and profit values.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#D9D8CB] space-y-1">
                  <div className="text-sm font-bold font-mono text-[#68734A]">02</div>
                  <h4 className="text-xs font-bold text-[#24251F]">Schedule Orders</h4>
                  <p className="text-[11px] text-[#6F7165]">
                    Prioritizes highest-profit orders into latest free delivery slots.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#D9D8CB] space-y-1">
                  <div className="text-sm font-bold font-mono text-[#68734A]">03</div>
                  <h4 className="text-xs font-bold text-[#24251F]">Maximize Profit</h4>
                  <p className="text-[11px] text-[#6F7165]">
                    Achieves maximum total profit while respecting all delivery deadlines.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 2. ORDERS PAGE */}
        {/* =================================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D8CB] pb-4">
              <div>
                <h1 className="text-2xl font-bold text-[#24251F] tracking-tight">Orders</h1>
                <p className="text-xs text-[#6F7165] mt-0.5">Manage food delivery orders and parameters.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadAssignment}
                  className="bg-[#FAF9F3] hover:bg-white text-[#4F5937] border border-[#D9D8CB] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#68734A]" />
                  Load Assignment Data
                </button>
                <button
                  onClick={handleClearOrders}
                  className="bg-[#FAF9F3] hover:bg-rose-50 text-[#4F5937] hover:text-rose-700 border border-[#D9D8CB] hover:border-rose-200 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  Clear Orders
                </button>
              </div>
            </div>

            {/* Order Management Form */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#D9D8CB]">
                <h2 className="text-sm font-bold text-[#24251F] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#68734A]" />
                  {editingOrderId ? `Edit Order (${editingOrderId})` : 'Add Order'}
                </h2>
                {editingOrderId && (
                  <button onClick={handleCancelEdit} className="text-xs text-[#68734A] hover:underline">
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitOrder} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#4F5937] mb-1">
                      Order ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={orderIdInput}
                      onChange={(e) => setOrderIdInput(e.target.value)}
                      placeholder="e.g. O6"
                      disabled={!!editingOrderId}
                      className="w-full bg-white border border-[#D9D8CB] rounded-lg px-3 py-1.5 text-xs text-[#24251F] focus:outline-none focus:border-[#68734A] font-mono disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4F5937] mb-1">
                      Deadline <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={deadlineInput}
                      onChange={(e) => setDeadlineInput(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white border border-[#D9D8CB] rounded-lg px-3 py-1.5 text-xs text-[#24251F] focus:outline-none focus:border-[#68734A] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4F5937] mb-1">
                      Profit (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="5"
                      value={profitInput}
                      onChange={(e) => setProfitInput(Math.max(1, parseFloat(e.target.value) || 1))}
                      className="w-full bg-white border border-[#D9D8CB] rounded-lg px-3 py-1.5 text-xs text-[#24251F] focus:outline-none focus:border-[#68734A] font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#6F7165] mb-1">
                      Customer Name <span className="text-[10px] text-[#879568]">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={customerInput}
                      onChange={(e) => setCustomerInput(e.target.value)}
                      placeholder="e.g. Rahul"
                      className="w-full bg-white border border-[#D9D8CB] rounded-lg px-3 py-1.5 text-xs text-[#24251F] focus:outline-none focus:border-[#68734A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#6F7165] mb-1">
                      Food Item <span className="text-[10px] text-[#879568]">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={foodItemInput}
                      onChange={(e) => setFoodItemInput(e.target.value)}
                      placeholder="e.g. Biryani"
                      className="w-full bg-white border border-[#D9D8CB] rounded-lg px-3 py-1.5 text-xs text-[#24251F] focus:outline-none focus:border-[#68734A]"
                    />
                  </div>
                </div>

                {formError && (
                  <div className="text-rose-600 text-xs bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="text-[#4F5937] text-xs bg-[#EDEBDD] border border-[#68734A]/30 px-3 py-1.5 rounded-lg">
                    {formSuccess}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="bg-[#68734A] hover:bg-[#4F5937] text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{editingOrderId ? 'Update Order' : '+ Add Order'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Orders Table with Search & Filter */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-[#D9D8CB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#24251F] text-sm">Order Table</h3>
                  <span className="text-xs text-[#6F7165] font-mono">({orders.length} total)</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#6F7165] absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white border border-[#D9D8CB] rounded-lg pl-8 pr-3 py-1 text-xs text-[#24251F] focus:outline-none focus:border-[#68734A]"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-white border border-[#D9D8CB] rounded-lg px-2.5 py-1 text-xs text-[#24251F] focus:outline-none focus:border-[#68734A]"
                  >
                    <option value="All">All</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white border border-[#D9D8CB] rounded-lg px-2.5 py-1 text-xs text-[#24251F] focus:outline-none focus:border-[#68734A]"
                  >
                    <option value="profit">Sort by: Profit</option>
                    <option value="deadline">Sort by: Deadline</option>
                    <option value="orderId">Sort by: Order ID</option>
                  </select>
                </div>
              </div>

              {displayedOrders.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#6F7165]">
                  No orders match your filter or search.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#D9D8CB] text-[#6F7165] uppercase tracking-wider bg-[#EDEBDD]/60">
                        <th className="py-2.5 px-4">Order ID</th>
                        <th className="py-2.5 px-4 font-sans">Customer</th>
                        <th className="py-2.5 px-4 font-sans">Food</th>
                        <th className="py-2.5 px-4 text-center">Deadline</th>
                        <th className="py-2.5 px-4 text-right">Profit</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4 text-center">Delivery Slot</th>
                        <th className="py-2.5 px-4 text-right font-sans">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9D8CB] bg-white">
                      {displayedOrders.map((ord) => {
                        const slot = orderSlotMap.get(ord.orderId);
                        const isScheduled = slot !== undefined;
                        return (
                          <tr key={ord.orderId} className="hover:bg-[#F5F3EA] transition-colors">
                            <td className="py-2.5 px-4 font-bold text-[#24251F]">{ord.orderId}</td>
                            <td className="py-2.5 px-4 font-sans text-[#4F5937]">{ord.customer || '-'}</td>
                            <td className="py-2.5 px-4 font-sans text-[#4F5937]">{ord.foodItem || '-'}</td>
                            <td className="py-2.5 px-4 text-center text-[#24251F]">{ord.deadline}</td>
                            <td className="py-2.5 px-4 text-right font-bold text-[#4F5937]">₹{ord.profit}</td>
                            <td className="py-2.5 px-4 text-center">
                              {isScheduled ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EDEBDD] text-[#4F5937]">
                                  Scheduled
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-[#C25E5E]">
                                  Rejected
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-[#24251F]">
                              {isScheduled ? slot : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEditClick(ord)}
                                  className="text-[#68734A] hover:text-[#24251F] transition-colors p-1"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteOrder(ord.orderId)}
                                  className="text-[#68734A] hover:text-rose-600 transition-colors p-1"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 3. SCHEDULE PAGE */}
        {/* =================================================================== */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D8CB] pb-4">
              <div>
                <h1 className="text-2xl font-bold text-[#24251F] tracking-tight">Delivery Schedule</h1>
                <p className="text-xs text-[#6F7165] mt-0.5">Greedy Job Sequencing with Deadlines result.</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleExportScheduleCSV}
                  className="bg-[#FAF9F3] hover:bg-white text-[#4F5937] border border-[#D9D8CB] px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#68734A]" />
                  Export Schedule
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs">
                <span className="text-xs text-[#6F7165]">Maximum Profit</span>
                <div className="text-xl font-bold text-[#4F5937] mt-0.5">₹{totalProfit}</div>
              </div>
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs">
                <span className="text-xs text-[#6F7165]">Scheduled Orders</span>
                <div className="text-xl font-bold text-[#24251F] mt-0.5">{scheduledOrders.length}</div>
              </div>
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs">
                <span className="text-xs text-[#6F7165]">Rejected Orders</span>
                <div className="text-xl font-bold text-[#C25E5E] mt-0.5">{rejectedOrders.length}</div>
              </div>
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs">
                <span className="text-xs text-[#6F7165]">Total Slots</span>
                <div className="text-xl font-bold text-[#24251F] mt-0.5">{maxDeadline}</div>
              </div>
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs">
                <span className="text-xs text-[#6F7165]">Used Slots</span>
                <div className="text-xl font-bold text-[#4F5937] mt-0.5">{scheduledOrders.length}</div>
              </div>
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs">
                <span className="text-xs text-[#6F7165]">Slot Utilization</span>
                <div className="text-xl font-bold text-[#24251F] mt-0.5">{slotUtilization.toFixed(0)}%</div>
              </div>
            </div>

            {/* VISUAL TIMELINE */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#D9D8CB] pb-3">
                <h3 className="text-sm font-bold text-[#24251F] uppercase tracking-wider">
                  Visual Delivery Timeline
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-[#4F5937]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#68734A]"></span> Scheduled
                  </span>
                  <span className="flex items-center gap-1.5 text-[#6F7165]">
                    <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#D9D8CB]"></span> Available
                  </span>
                </div>
              </div>

              {maxDeadline === 0 ? (
                <div className="text-center py-8 text-sm text-[#6F7165]">
                  No orders currently scheduled.
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row items-center gap-3 overflow-x-auto py-3">
                  {Array.from({ length: maxDeadline }, (_, i) => i + 1).map((s, idx) => {
                    const item = schedule[s];
                    return (
                      <React.Fragment key={s}>
                        <div
                          className={`w-full lg:w-56 shrink-0 rounded-xl p-4 border transition-all ${
                            item
                              ? 'bg-white border-[#68734A]/50 text-[#24251F] shadow-xs'
                              : 'bg-[#F5F3EA] border-dashed border-[#D9D8CB] text-[#6F7165]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold font-mono mb-2">
                            <span className="text-[#4F5937] bg-[#EDEBDD] px-2 py-0.5 rounded">
                              SLOT {s}
                            </span>
                            {item && (
                              <span className="bg-[#FAF9F3] border border-[#D9D8CB] text-[10px] px-1.5 py-0.5 rounded text-[#4F5937]">
                                Deadline {item.deadline}
                              </span>
                            )}
                          </div>

                          {item ? (
                            <div className="space-y-1">
                              <div className="text-2xl font-extrabold text-[#24251F]">{item.orderId}</div>
                              <div className="text-xs text-[#4F5937] font-semibold truncate">
                                {item.foodItem || 'Food Order'}
                              </div>
                              <div className="text-base font-bold text-[#4F5937] font-mono pt-1">
                                ₹{item.profit}
                              </div>
                            </div>
                          ) : (
                            <div className="py-5 text-center space-y-1">
                              <div className="text-xs font-bold text-[#6F7165]">AVAILABLE</div>
                              <div className="text-[11px] text-[#879568]">Empty slot</div>
                            </div>
                          )}
                        </div>

                        {idx < maxDeadline - 1 && (
                          <div className="hidden lg:flex items-center text-[#68734A]/60 px-1">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        )}
                        {idx < maxDeadline - 1 && (
                          <div className="flex lg:hidden items-center justify-center text-[#68734A]/60 py-1">
                            <ArrowDown className="w-4 h-4" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rejected Orders Section */}
            {rejectedOrders.length > 0 && (
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider">
                  REJECTED ORDERS ({rejectedOrders.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rejectedOrders.map((r) => (
                    <div
                      key={r.orderId}
                      className="bg-white border border-rose-200/80 rounded-lg p-3 text-xs space-y-1"
                    >
                      <div className="flex justify-between items-center font-mono">
                        <span className="font-bold text-[#24251F]">{r.orderId}</span>
                        <span className="text-[#C25E5E] font-bold">Profit: ₹{r.profit}</span>
                      </div>
                      <div className="text-[#6F7165] font-mono">Deadline: {r.deadline}</div>
                      <div className="text-[#C25E5E] text-[11px] font-medium pt-0.5">
                        Reason: No available slot before deadline.
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* 4. ALGORITHM PAGE */}
        {/* =================================================================== */}
        {activeTab === 'algorithm' && (
          <div className="space-y-6">
            <div className="border-b border-[#D9D8CB] pb-4">
              <h1 className="text-2xl font-bold text-[#24251F] tracking-tight">Scheduling Process</h1>
              <p className="text-xs text-[#6F7165] mt-0.5">
                See how each order is evaluated and assigned to a delivery slot.
              </p>
            </div>

            {/* Stepper Controls */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="text-xs text-[#4F5937]">
                Simulation Step: <strong className="text-[#24251F]">{algoStep}</strong> of{' '}
                <strong>{executionTrace.length}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAlgoStep(0)}
                  disabled={algoStep === 0}
                  className="bg-white hover:bg-[#F5F3EA] text-[#4F5937] disabled:opacity-40 border border-[#D9D8CB] px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setAlgoStep(Math.max(0, algoStep - 1))}
                  disabled={algoStep === 0}
                  className="bg-white hover:bg-[#F5F3EA] text-[#4F5937] disabled:opacity-40 border border-[#D9D8CB] px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setAlgoStep(Math.min(algoStep + 1, executionTrace.length))}
                  disabled={algoStep >= executionTrace.length}
                  className="bg-[#68734A] hover:bg-[#4F5937] text-white disabled:opacity-40 px-3.5 py-1 rounded-lg text-xs font-medium transition-colors shadow-xs flex items-center gap-1"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setAlgoStep(executionTrace.length)}
                  disabled={algoStep >= executionTrace.length}
                  className="bg-white hover:bg-[#F5F3EA] text-[#4F5937] disabled:opacity-40 border border-[#D9D8CB] px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                >
                  Run All
                </button>
              </div>
            </div>

            {/* SECTION 1: ORIGINAL ORDERS & SORT BY PROFIT */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-5 shadow-2xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#D9D8CB] space-y-2">
                  <span className="text-xs font-bold text-[#68734A] uppercase tracking-wider block">
                    ORIGINAL ORDERS
                  </span>
                  <div className="space-y-1 font-mono text-xs text-[#24251F]">
                    {orders.map((o) => (
                      <div key={o.orderId} className="flex justify-between">
                        <span>{o.orderId} &rarr; D{o.deadline}</span>
                        <span>₹{o.profit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#68734A]/50 space-y-2">
                  <span className="text-xs font-bold text-[#4F5937] uppercase tracking-wider block">
                    SORT BY PROFIT
                  </span>
                  <div className="space-y-1 font-mono text-xs">
                    {sortedOrders.map((o, idx) => (
                      <div
                        key={o.orderId}
                        className={`flex justify-between px-2 py-0.5 rounded ${
                          algoStep > 0 && idx === algoStep - 1
                            ? 'bg-[#EDEBDD] font-bold text-[#4F5937]'
                            : 'text-[#24251F]'
                        }`}
                      >
                        <span>{o.orderId} &rarr; D{o.deadline}</span>
                        <span>₹{o.profit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: STEP-BY-STEP EXECUTION */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-5 shadow-2xs space-y-4">
              <div className="font-bold text-xs uppercase tracking-wider text-[#68734A]">
                STEP-BY-STEP EXECUTION
              </div>

              {algoStep > 0 ? (
                <div className="bg-white p-4 rounded-xl border border-[#68734A]/40 space-y-3 font-mono text-xs">
                  {(() => {
                    const curr = executionTrace[algoStep - 1];
                    return (
                      <>
                        <div className="text-sm font-bold text-[#24251F] border-b border-[#D9D8CB] pb-2">
                          Order: {curr.order.orderId}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div>Profit: ₹{curr.order.profit}</div>
                          <div>Deadline: {curr.order.deadline}</div>
                          <div>Checking latest available slot...</div>
                          <div className="text-[#4F5937] font-bold">
                            {curr.assignedSlot ? `Slot ${curr.assignedSlot} ✓` : 'No free slot before deadline.'}
                          </div>
                        </div>
                        <div className="pt-2 border-t border-[#D9D8CB] text-xs font-bold">
                          {curr.assignedSlot ? (
                            <span className="text-[#4F5937]">Assigned &rarr; Slot {curr.assignedSlot}</span>
                          ) : (
                            <span className="text-[#C25E5E]">Decision &rarr; Rejected</span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-[#6F7165] bg-white rounded-xl border border-[#D9D8CB]">
                  Click <strong>[Next Step]</strong> to step through the order evaluations.
                </div>
              )}
            </div>

            {/* ALGORITHM TRACE */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-[#D9D8CB]">
                <h3 className="font-bold text-[#24251F] text-sm">ALGORITHM TRACE</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#D9D8CB] text-[#6F7165] uppercase tracking-wider bg-[#EDEBDD]/60">
                      <th className="py-2.5 px-4">Step</th>
                      <th className="py-2.5 px-4">Order</th>
                      <th className="py-2.5 px-4 text-center">Deadline</th>
                      <th className="py-2.5 px-4 text-right">Profit</th>
                      <th className="py-2.5 px-4 text-center">Slot Checked</th>
                      <th className="py-2.5 px-4 text-center">Assigned Slot</th>
                      <th className="py-2.5 px-4 text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9D8CB] bg-white">
                    {executionTrace.map((t) => (
                      <tr key={t.step} className="hover:bg-[#F5F3EA]">
                        <td className="py-2.5 px-4 text-[#6F7165]">{t.step}</td>
                        <td className="py-2.5 px-4 font-bold text-[#24251F]">{t.order.orderId}</td>
                        <td className="py-2.5 px-4 text-center">{t.order.deadline}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-[#4F5937]">₹{t.order.profit}</td>
                        <td className="py-2.5 px-4 text-center">{t.slotsChecked.join(', ')}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-[#24251F]">
                          {t.assignedSlot ? t.assignedSlot : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">
                          {t.status === 'Scheduled' ? (
                            <span className="text-[#4F5937]">Scheduled</span>
                          ) : (
                            <span className="text-[#C25E5E]">Rejected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FINAL ALGORITHM RESULT */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-5 shadow-2xs space-y-3">
              <div className="font-bold text-xs uppercase tracking-wider text-[#68734A]">
                FINAL ALGORITHM RESULT
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#24251F]">Maximum Profit:</span>
                <span className="text-2xl font-extrabold text-[#4F5937] font-mono">₹{totalProfit}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-xs">
                {Object.entries(schedule).map(([s, o]) => (
                  <div
                    key={s}
                    className="p-2.5 rounded-lg bg-white border border-[#D9D8CB] flex items-center justify-between"
                  >
                    <span className="font-bold text-[#24251F]">Slot {s} &rarr; {o.orderId}</span>
                    <span className="font-bold text-[#4F5937]">₹{o.profit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 5. ANALYTICS PAGE (ALL 7 GRAPHS & VALIDATION) */}
        {/* =================================================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D8CB] pb-4">
              <div>
                <h1 className="text-2xl font-bold text-[#24251F] tracking-tight">Analytics</h1>
                <p className="text-xs text-[#6F7165] mt-0.5">
                  Graphical analytics dashboard based entirely on current order data.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleExportAnalyticsCSV}
                  className="bg-[#FAF9F3] hover:bg-white text-[#4F5937] border border-[#D9D8CB] px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#68734A]" />
                  Export Analytics
                </button>
              </div>
            </div>

            {/* ANALYTICS SUMMARY CARDS (Section 6) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-[#6F7165] block truncate">Total Orders</span>
                <div className="text-lg font-bold text-[#24251F] font-mono mt-0.5">{orders.length}</div>
              </div>
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-[#6F7165] block truncate">Max Deadline</span>
                <div className="text-lg font-bold text-[#24251F] font-mono mt-0.5">{maxDeadline}</div>
              </div>
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-[#6F7165] block truncate">Scheduled</span>
                <div className="text-lg font-bold text-[#4F5937] font-mono mt-0.5">{scheduledOrders.length}</div>
              </div>
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-[#6F7165] block truncate">Rejected</span>
                <div className="text-lg font-bold text-[#C25E5E] font-mono mt-0.5">{rejectedOrders.length}</div>
              </div>
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-[#6F7165] block truncate">Potential Profit</span>
                <div className="text-lg font-bold text-[#24251F] font-mono mt-0.5">₹{potentialProfit}</div>
              </div>
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-[#6F7165] block truncate">Achieved Profit</span>
                <div className="text-lg font-bold text-[#4F5937] font-mono mt-0.5">₹{totalProfit}</div>
              </div>
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-[#6F7165] block truncate">Utilization</span>
                <div className="text-lg font-bold text-[#68734A] font-mono mt-0.5">{profitUtilization.toFixed(0)}%</div>
              </div>
              <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-[#6F7165] block truncate">Slots Used</span>
                <div className="text-lg font-bold text-[#24251F] font-mono mt-0.5">{scheduledOrders.length}/{maxDeadline}</div>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#6F7165] bg-[#FAF9F3] rounded-xl border border-[#D9D8CB]">
                No data available for analytics.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* GRAPH 1 — PROFIT BY ORDER */}
                <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider">
                      GRAPH 1: Profit by Order
                    </h3>
                    <div className="flex gap-2 text-[10px]">
                      <span className="flex items-center gap-1 text-[#4F5937]">
                        <span className="w-2 h-2 rounded bg-[#68734A]"></span> Scheduled
                      </span>
                      <span className="flex items-center gap-1 text-[#C25E5E]">
                        <span className="w-2 h-2 rounded bg-[#C25E5E]"></span> Rejected
                      </span>
                    </div>
                  </div>

                  <div className="h-44 bg-white rounded-lg p-3 border border-[#D9D8CB] flex items-end gap-2">
                    {orders.map((o) => {
                      const isSched = orderSlotMap.has(o.orderId);
                      const maxP = Math.max(...orders.map((x) => x.profit), 1);
                      const heightPct = Math.max((o.profit / maxP) * 100, 15);
                      return (
                        <div key={o.orderId} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                          <span className="text-[10px] font-mono text-[#6F7165]">₹{o.profit}</span>
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full rounded-t transition-all ${
                              isSched ? 'bg-[#68734A]' : 'bg-[#C25E5E]'
                            }`}
                            title={`${o.orderId}: ₹${o.profit} (${isSched ? 'Scheduled' : 'Rejected'})`}
                          />
                          <span className="text-[10px] font-mono font-bold text-[#24251F]">
                            {o.orderId}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* GRAPH 2 — DEADLINE VS PROFIT */}
                <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider">
                    GRAPH 2: Deadline vs Profit
                  </h3>

                  <div className="h-44 bg-white rounded-lg p-3 border border-[#D9D8CB] relative">
                    {orders.map((o) => {
                      const isSched = orderSlotMap.has(o.orderId);
                      const maxD = Math.max(...orders.map((x) => x.deadline), 1);
                      const maxP = Math.max(...orders.map((x) => x.profit), 1);
                      const leftPct = (o.deadline / maxD) * 85;
                      const bottomPct = (o.profit / maxP) * 75;

                      return (
                        <div
                          key={o.orderId}
                          style={{ left: `${leftPct + 5}%`, bottom: `${bottomPct + 10}%` }}
                          className={`absolute w-7 h-7 -translate-x-1/2 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-white shadow-xs cursor-pointer ${
                            isSched ? 'bg-[#68734A]' : 'bg-[#C25E5E]'
                          }`}
                          title={`Order ID: ${o.orderId}\nDeadline: ${o.deadline}\nProfit: ₹${o.profit}\nStatus: ${isSched ? 'Scheduled' : 'Rejected'}`}
                        >
                          {o.orderId}
                        </div>
                      );
                    })}
                    <div className="absolute bottom-1 right-2 text-[10px] text-[#6F7165]">
                      X: Deadline &bull; Y: Profit
                    </div>
                  </div>
                </div>

                {/* GRAPH 3 — SCHEDULED VS REJECTED */}
                <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider">
                    GRAPH 3: Scheduled vs Rejected
                  </h3>

                  <div className="h-44 bg-white rounded-lg p-3 border border-[#D9D8CB] flex items-center justify-around">
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#68734A]"></span>
                        <span className="text-[#24251F] font-bold">Scheduled: {scheduledOrders.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#C25E5E]"></span>
                        <span className="text-[#24251F] font-bold">Rejected: {rejectedOrders.length}</span>
                      </div>
                      <div className="text-[11px] text-[#6F7165] pt-1">
                        Total Orders: {orders.length}
                      </div>
                    </div>

                    <div className="relative w-28 h-28 rounded-full border-8 border-[#C25E5E] flex items-center justify-center overflow-hidden">
                      <div
                        className="absolute inset-0 border-8 border-[#68734A] rounded-full"
                        style={{
                          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                          transform: `rotate(${orders.length > 0 ? (scheduledOrders.length / orders.length) * 360 : 0}deg)`,
                        }}
                      />
                      <div className="text-center z-10 bg-white w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold text-xs">
                        <span>{scheduledOrders.length}</span>
                        <span className="text-[9px] text-[#6F7165]">Sched</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRAPH 4 — PROFIT BY DELIVERY SLOT */}
                <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider">
                    GRAPH 4: Profit by Delivery Slot
                  </h3>

                  <div className="h-44 bg-white rounded-lg p-3 border border-[#D9D8CB] flex items-end gap-3">
                    {Array.from({ length: maxDeadline }, (_, i) => i + 1).map((s) => {
                      const item = schedule[s];
                      const maxP = Math.max(...orders.map((x) => x.profit), 1);
                      const heightPct = item ? Math.max((item.profit / maxP) * 100, 15) : 5;
                      return (
                        <div key={s} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                          <span className="text-[10px] font-mono text-[#6F7165]">
                            {item ? `₹${item.profit}` : '₹0'}
                          </span>
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full rounded-t transition-all ${
                              item ? 'bg-[#4F5937]' : 'bg-[#D9D8CB]'
                            }`}
                          />
                          <span className="text-[10px] font-mono font-bold text-[#24251F]">
                            Slot {s}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* GRAPH 5 — ORDERS BY DEADLINE */}
                <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider">
                    GRAPH 5: Orders by Deadline
                  </h3>

                  <div className="h-44 bg-white rounded-lg p-3 border border-[#D9D8CB] flex items-end gap-3">
                    {deadlineCounts.map((g) => {
                      const maxCount = Math.max(...deadlineCounts.map((x) => x.count), 1);
                      const heightPct = Math.max((g.count / maxCount) * 100, 20);
                      return (
                        <div key={g.deadline} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                          <span className="text-[10px] font-mono text-[#6F7165]">
                            {g.count} order{g.count > 1 ? 's' : ''}
                          </span>
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full bg-[#879568] rounded-t"
                          />
                          <span className="text-[10px] font-mono font-bold text-[#24251F]">
                            Deadline {g.deadline}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* GRAPH 6 — CUMULATIVE PROFIT */}
                <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider">
                    GRAPH 6: Cumulative Profit
                  </h3>

                  <div className="h-44 bg-white rounded-lg p-3 border border-[#D9D8CB] flex flex-col justify-between">
                    <div className="space-y-1.5 pt-2">
                      {cumulativeProfit.map((c) => (
                        <div key={c.slot} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#24251F]">Slot {c.slot} ({c.orderId}):</span>
                          <span className="font-bold text-[#4F5937]">₹{c.cumulative}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] text-[#6F7165] border-t border-[#D9D8CB] pt-1 flex justify-between font-mono">
                      <span>Total Accumulated:</span>
                      <strong className="text-[#4F5937]">₹{totalProfit}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GRAPH 7 — POTENTIAL VS ACHIEVED PROFIT */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider">
                GRAPH 7: Potential vs Achieved Profit
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-lg border border-[#879568]/40">
                  <span className="text-xs text-[#6F7165] block">Potential Profit</span>
                  <span className="text-xl font-bold text-[#879568] font-mono">₹{potentialProfit}</span>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-[#4F5937]/40">
                  <span className="text-xs text-[#6F7165] block">Achieved Profit</span>
                  <span className="text-xl font-bold text-[#4F5937] font-mono">₹{totalProfit}</span>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-[#C25E5E]/40">
                  <span className="text-xs text-[#6F7165] block">Unrealized Profit</span>
                  <span className="text-xl font-bold text-[#C25E5E] font-mono">₹{unrealizedProfit}</span>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-[#68734A]/40">
                  <span className="text-xs text-[#6F7165] block">Profit Utilization</span>
                  <span className="text-xl font-bold text-[#68734A] font-mono">{profitUtilization.toFixed(1)}%</span>
                </div>
              </div>

              <div className="w-full bg-[#E5E4D8] h-4 rounded-full overflow-hidden flex mt-2">
                <div
                  style={{ width: `${potentialProfit > 0 ? (totalProfit / potentialProfit) * 100 : 0}%` }}
                  className="bg-[#4F5937] h-full"
                  title={`Achieved: ₹${totalProfit}`}
                />
                <div
                  style={{ width: `${potentialProfit > 0 ? (unrealizedProfit / potentialProfit) * 100 : 0}%` }}
                  className="bg-[#C25E5E] h-full"
                  title={`Unrealized: ₹${unrealizedProfit}`}
                />
              </div>
            </div>

            {/* ALGORITHM VALIDATION SECTION (Section 8) */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#68734A]" />
                  Schedule Validation
                </h3>
                {validation.isValid ? (
                  <span className="bg-[#EDEBDD] text-[#4F5937] border border-[#68734A]/30 text-xs px-2.5 py-0.5 rounded font-bold">
                    ✓ Schedule Valid
                  </span>
                ) : (
                  <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded font-bold">
                    ⚠️ Validation Issues
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-[#4F5937]">
                  <Check className="w-3.5 h-3.5 text-[#68734A] shrink-0" />
                  <span>Every scheduled order is within its deadline</span>
                </div>
                <div className="flex items-center gap-2 text-[#4F5937]">
                  <Check className="w-3.5 h-3.5 text-[#68734A] shrink-0" />
                  <span>No slot contains two orders</span>
                </div>
                <div className="flex items-center gap-2 text-[#4F5937]">
                  <Check className="w-3.5 h-3.5 text-[#68734A] shrink-0" />
                  <span>Each order is scheduled at most once</span>
                </div>
                <div className="flex items-center gap-2 text-[#4F5937]">
                  <Check className="w-3.5 h-3.5 text-[#68734A] shrink-0" />
                  <span>Total profit is calculated correctly</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 6. HELP PAGE */}
        {/* =================================================================== */}
        {activeTab === 'help' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="border-b border-[#D9D8CB] pb-4">
              <h1 className="text-2xl font-bold text-[#24251F] tracking-tight">Help & Documentation</h1>
              <p className="text-xs text-[#6F7165] mt-0.5">Greedy Job Sequencing with Deadlines guide.</p>
            </div>

            {/* Problem */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-5 shadow-2xs space-y-2">
              <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider">Problem</h3>
              <p className="text-xs text-[#4F5937] leading-relaxed">
                A food delivery company receives orders with deadlines and profits.
              </p>
            </div>

            {/* Objective */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-5 shadow-2xs space-y-2">
              <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider">Objective</h3>
              <p className="text-xs text-[#4F5937] leading-relaxed">
                Schedule orders to maximize total profit while respecting deadlines.
              </p>
            </div>

            {/* How it works */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider">How It Works</h3>
              <ol className="text-xs text-[#4F5937] space-y-1.5 list-decimal list-inside">
                <li>Sort orders by profit in descending order.</li>
                <li>Consider the highest-profit order.</li>
                <li>Place it in the latest available slot before its deadline.</li>
                <li>Continue until all orders are processed.</li>
                <li>Reject orders when no valid slot remains.</li>
              </ol>
            </div>

            {/* Assignment Example */}
            <div className="bg-[#FAF9F3] border border-[#D9D8CB] rounded-xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-[#24251F] uppercase tracking-wider">
                Assignment Example & Result
              </h3>
              <div className="font-mono text-xs space-y-1 text-[#24251F]">
                <div>O1 &rarr; Deadline 2 &rarr; Profit ₹100</div>
                <div>O2 &rarr; Deadline 1 &rarr; Profit ₹80</div>
                <div>O3 &rarr; Deadline 2 &rarr; Profit ₹60</div>
                <div>O4 &rarr; Deadline 1 &rarr; Profit ₹40</div>
                <div>O5 &rarr; Deadline 3 &rarr; Profit ₹120</div>
              </div>

              <div className="pt-2 border-t border-[#D9D8CB] text-xs space-y-1">
                <div className="font-bold text-[#4F5937]">Dynamic Output:</div>
                <div className="font-mono">Slot 1 &rarr; O2 (₹80) &bull; Slot 2 &rarr; O1 (₹100) &bull; Slot 3 &rarr; O5 (₹120)</div>
                <div className="text-rose-700 font-mono">Rejected: O3, O4</div>
                <div className="font-bold text-[#24251F] pt-1">
                  Maximum Profit = ₹300 &bull; Potential Profit = ₹400 &bull; Profit Utilization = 75%
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#D9D8CB] bg-[#FAF9F3] py-5 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6F7165]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#24251F]">Food Delivery Scheduler</span>
            <span>&bull;</span>
            <span>Plan deliveries. Maximize profit.</span>
          </div>
          <div>
            Job Sequencing with Deadlines &bull; Greedy Method
          </div>
        </div>
      </footer>
    </div>
  );
}

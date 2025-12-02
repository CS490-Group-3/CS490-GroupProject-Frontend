import { useState, useEffect } from "react";
import { Button } from "../../../shared/ui/button.jsx";
import { Input } from "../../../shared/ui/input.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table.jsx";
import { getPaymentHistory as getOwnerPaymentHistory } from "../../loyalty/api.js";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getOwnerPaymentHistory(
          dateFilter.start || null,
          dateFilter.end || null
        );
        if (!alive) return;
        setPayments(data);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load payment history");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [dateFilter.start, dateFilter.end]);

  const totalRevenue = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && payments.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white border rounded-2xl p-8 text-center">
          <div className="text-gray-600">Loading payment history...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Payments & Billing</h1>
        <p className="text-gray-600">View payment history and manage revenue</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-white border rounded-2xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
            <div className="text-2xl font-semibold text-gray-900">${totalRevenue.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Paid Appointments</div>
            <div className="text-2xl font-semibold text-gray-900">
              {payments.filter((p) => p.status === "paid").length}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Pending Payments</div>
            <div className="text-2xl font-semibold text-gray-900">
              {payments.filter((p) => p.status === "unpaid").length}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter by Date</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <Input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <Input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
            />
          </div>
          <Button
            onClick={() => setDateFilter({ start: "", end: "" })}
            variant="outline"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
          <Button variant="outline" size="sm">
            Export CSV
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No payments found for the selected date range
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {formatDate(payment.date)}
                  </TableCell>
                  <TableCell>{payment.customer}</TableCell>
                  <TableCell>{payment.service}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${payment.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {payment.paymentMethod ? (
                      <span className="capitalize">{payment.paymentMethod}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        payment.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {payment.status === "paid" ? "Paid" : "Unpaid"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


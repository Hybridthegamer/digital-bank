import type { Transaction } from "../types";

interface TransactionCardProps {
  transaction: Transaction;
  userAccountIds?: string[];
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    approved: "bg-green-100 text-green-800",
    pending:  "bg-yellow-100 text-yellow-800",
    flagged:  "bg-red-100 text-red-800",
    declined: "bg-gray-100 text-gray-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        classes[status] ?? "bg-gray-100 text-gray-800"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function TransactionCard({
  transaction,
  userAccountIds = [],
}: TransactionCardProps) {
  const isDebit = userAccountIds.includes(transaction.sender_account_id ?? "");
  const amount = parseFloat(transaction.amount);
  const formattedAmount = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: transaction.currency,
    minimumFractionDigits: 2,
  }).format(amount);

  const date = new Date(transaction.created_at).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center space-x-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
            isDebit ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}
        >
          {isDebit ? "D" : "C"}
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">
            {transaction.narration || transaction.transaction_type}
          </p>
          <p className="text-xs text-gray-500">{date}</p>
          {transaction.nip_reference && (
            <p className="text-xs text-gray-400 font-mono">
              {transaction.nip_reference}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right">
          <p
            className={`font-semibold ${
              isDebit ? "text-red-600" : "text-green-600"
            }`}
          >
            {isDebit ? "-" : "+"}
            {formattedAmount}
          </p>
          {transaction.fraud_score !== null &&
            transaction.fraud_score !== undefined && (
              <p className="text-xs text-gray-400">
                Risk: {(transaction.fraud_score * 100).toFixed(0)}%
              </p>
            )}
        </div>
        <StatusBadge status={transaction.status} />
      </div>
    </div>
  );
}

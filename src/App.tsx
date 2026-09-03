import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Home,
  Info,
  Pencil,
  Plus,
  ReceiptText,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import {
  centsFromInput,
  createBackup,
  daysRemaining,
  fixedTotal,
  formatMoney,
  newId,
  parseBackup,
  remainingBalance,
  startingSpendable,
  subscriptionTotal,
  variableTotal,
} from "./domain";
import { clearData, loadData, saveData } from "./storage";
import type {
  AppData,
  BudgetEntry,
  Category,
  MonthArchive,
  Transaction,
} from "./types";

type View = "home" | "transactions" | "history" | "settings";
type EditItem = BudgetEntry | Category | null;

const today = () => new Date().toISOString().slice(0, 10);
const titleMonth = (key: string) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(`${key}-02T12:00:00`),
  );

function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [view, setView] = useState<View>("home");
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [settingsEditor, setSettingsEditor] = useState<{
    type: "income" | "entry" | "category";
    item: EditItem;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedArchive, setSelectedArchive] = useState<MonthArchive | null>(
    null,
  );
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData()
      .then(setData)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load your local data.",
        ),
      );
  }, []);

  const update = (next: AppData, message?: string) => {
    setData(next);
    saveData(next).catch(() =>
      setError("Changes could not be saved. Please export a backup."),
    );
    if (message) {
      setNotice(message);
      window.setTimeout(() => setNotice(""), 2600);
    }
  };

  if (!data) {
    return (
      <main className="loading">
        <div className="spinner" />
        <p>{error || "Opening your budget…"}</p>
      </main>
    );
  }

  const saveTransaction = (transaction: Transaction) => {
    const exists = data.transactions.some((item) => item.id === transaction.id);
    update(
      {
        ...data,
        transactions: exists
          ? data.transactions.map((item) =>
              item.id === transaction.id ? transaction : item,
            )
          : [transaction, ...data.transactions],
      },
      exists ? "Purchase updated" : "Purchase added",
    );
    setTransactionOpen(false);
    setEditingTransaction(null);
  };

  const deleteTransaction = (transaction: Transaction) => {
    if (
      !window.confirm(
        `Delete ${transaction.merchant} for ${formatMoney(transaction.amountCents)}? This cannot be undone.`,
      )
    )
      return;
    update(
      {
        ...data,
        transactions: data.transactions.filter(
          (item) => item.id !== transaction.id,
        ),
      },
      "Purchase deleted",
    );
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(createBackup(data), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `monthly-money-backup-${today()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Backup exported");
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const restored = parseBackup(await file.text());
      if (
        !window.confirm(
          "Replace all current data with this backup? Your current data will be overwritten.",
        )
      )
        return;
      update(restored, "Backup restored");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The backup could not be imported.",
      );
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const reset = async () => {
    const phrase = window.prompt(
      "This permanently erases all purchases, settings, and history. Type RESET to continue.",
    );
    if (phrase !== "RESET") return;
    const fresh = await clearData();
    setData(fresh);
    setNotice("App data reset");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">MONTHLY MONEY</span>
          <h1>
            {view === "home" ? titleMonth(data.activeMonth) : navLabel(view)}
          </h1>
        </div>
        <div className="privacy-dot" title="Stored privately on this device">
          <span /> Local only
        </div>
      </header>

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={18} />
          </button>
        </div>
      )}

      <main className="main-content">
        {view === "home" && (
          <Dashboard
            data={data}
            onAdd={() => {
              setEditingTransaction(null);
              setTransactionOpen(true);
            }}
            onAll={() => setView("transactions")}
          />
        )}
        {view === "transactions" && (
          <Transactions
            data={data}
            onAdd={() => {
              setEditingTransaction(null);
              setTransactionOpen(true);
            }}
            onEdit={(item) => {
              setEditingTransaction(item);
              setTransactionOpen(true);
            }}
            onDelete={deleteTransaction}
          />
        )}
        {view === "history" && (
          <History
            data={data}
            selected={selectedArchive}
            onSelect={setSelectedArchive}
          />
        )}
        {view === "settings" && (
          <SettingsView
            data={data}
            update={update}
            onEdit={setSettingsEditor}
            exportBackup={exportBackup}
            importBackup={() => importRef.current?.click()}
            reset={reset}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        <NavButton
          active={view === "home"}
          icon={<Home />}
          label="Home"
          onClick={() => setView("home")}
        />
        <NavButton
          active={view === "transactions"}
          icon={<ReceiptText />}
          label="Purchases"
          onClick={() => setView("transactions")}
        />
        <NavButton
          active={view === "history"}
          icon={<Archive />}
          label="History"
          onClick={() => setView("history")}
        />
        <NavButton
          active={view === "settings"}
          icon={<Settings />}
          label="Settings"
          onClick={() => setView("settings")}
        />
      </nav>

      <input
        ref={importRef}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={(event) => importBackup(event.target.files?.[0])}
      />
      {transactionOpen && (
        <TransactionModal
          data={data}
          existing={editingTransaction}
          onClose={() => {
            setTransactionOpen(false);
            setEditingTransaction(null);
          }}
          onSave={saveTransaction}
        />
      )}
      {settingsEditor && (
        <SettingsModal
          data={data}
          editor={settingsEditor}
          onClose={() => setSettingsEditor(null)}
          onSave={(next, message) => {
            update(next, message);
            setSettingsEditor(null);
          }}
        />
      )}
    </div>
  );
}

function Dashboard({
  data,
  onAdd,
  onAll,
}: {
  data: AppData;
  onAdd: () => void;
  onAll: () => void;
}) {
  const remaining = remainingBalance(data);
  const start = startingSpendable(data);
  const spent = variableTotal(data.transactions);
  const ratio = start > 0 ? Math.min(spent / start, 1) : 1;
  const tone =
    remaining < 0
      ? "danger"
      : remaining < Math.max(start * 0.2, 15000)
        ? "warning"
        : "healthy";
  const categoryTotals = data.categories.map((category) => ({
    category,
    total: variableTotal(
      data.transactions.filter((item) => item.categoryId === category.id),
    ),
  }));
  const recent = [...data.transactions]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 4);
  return (
    <>
      <section className={`balance-card ${tone}`} aria-label="Monthly balance">
        <div className="balance-label">Remaining this month</div>
        <div className="balance-amount">{formatMoney(remaining)}</div>
        <div className="progress-track">
          <span style={{ width: `${ratio * 100}%` }} />
        </div>
        <div className="balance-meta">
          <span>{formatMoney(spent)} spent</span>
          <span>{daysRemaining()} days left</span>
        </div>
      </section>
      {remaining < 0 && (
        <div className="state-message danger-state">
          <Info size={20} />
          <div>
            <strong>
              You’re over budget by {formatMoney(Math.abs(remaining))}
            </strong>
            <span>
              Review recent purchases or adjust this month’s settings.
            </span>
          </div>
        </div>
      )}
      <button className="primary-action" onClick={onAdd}>
        <Plus size={22} /> Add a purchase
      </button>
      <section className="quick-stats">
        <div>
          <span>Starting spendable</span>
          <strong>{formatMoney(start)}</strong>
        </div>
        <div>
          <span>Variable spending</span>
          <strong>{formatMoney(spent)}</strong>
        </div>
      </section>
      <SectionHeader title="Spending by category" />
      <section className="category-card">
        {categoryTotals.map(({ category, total }) => (
          <div className="category-row" key={category.id}>
            <span
              className="category-dot"
              style={{ background: category.color }}
            />
            <span>{category.name}</span>
            <strong>{formatMoney(total)}</strong>
          </div>
        ))}
      </section>
      <SectionHeader
        title="Recent purchases"
        action={data.transactions.length ? "View all" : undefined}
        onAction={onAll}
      />
      {recent.length ? (
        <section className="transaction-list">
          {recent.map((item) => (
            <TransactionRow
              key={item.id}
              item={item}
              categories={data.categories}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          icon={<ReceiptText />}
          title="No purchases yet"
          text="Your full spendable balance is ready when you are."
        />
      )}
    </>
  );
}

function Transactions({
  data,
  onAdd,
  onEdit,
  onDelete,
}: {
  data: AppData;
  onAdd: () => void;
  onEdit: (item: Transaction) => void;
  onDelete: (item: Transaction) => void;
}) {
  const sorted = [...data.transactions].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
  return (
    <>
      <div className="summary-strip">
        <span>
          {data.transactions.length}{" "}
          {data.transactions.length === 1 ? "purchase" : "purchases"}
        </span>
        <strong>{formatMoney(variableTotal(data.transactions))}</strong>
      </div>
      <button className="primary-action" onClick={onAdd}>
        <Plus size={22} /> Add a purchase
      </button>
      {sorted.length ? (
        <section className="transaction-list detailed">
          {sorted.map((item) => (
            <TransactionRow
              key={item.id}
              item={item}
              categories={data.categories}
              actions={
                <>
                  <button
                    aria-label={`Edit ${item.merchant}`}
                    onClick={() => onEdit(item)}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="delete-icon"
                    aria-label={`Delete ${item.merchant}`}
                    onClick={() => onDelete(item)}
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              }
            />
          ))}
        </section>
      ) : (
        <EmptyState
          icon={<ReceiptText />}
          title="Nothing logged this month"
          text="Tap “Add a purchase” to record your first expense."
        />
      )}
    </>
  );
}

function History({
  data,
  selected,
  onSelect,
}: {
  data: AppData;
  selected: MonthArchive | null;
  onSelect: (archive: MonthArchive | null) => void;
}) {
  if (selected) {
    const spent = variableTotal(selected.transactions);
    const start =
      selected.takeHomeCents -
      selected.entries
        .filter((e) => e.enabled)
        .reduce((n, e) => n + e.amountCents, 0);
    return (
      <>
        <button
          className="text-button back-button"
          onClick={() => onSelect(null)}
        >
          ← All months
        </button>
        <section className="archive-summary">
          <span>{titleMonth(selected.month)}</span>
          <strong>{formatMoney(start - spent)} left</strong>
          <small>
            {formatMoney(spent)} of {formatMoney(start)} spent
          </small>
        </section>
        {selected.transactions.length ? (
          <section className="transaction-list">
            {[...selected.transactions]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((item) => (
                <TransactionRow
                  key={item.id}
                  item={item}
                  categories={selected.categories}
                />
              ))}
          </section>
        ) : (
          <EmptyState
            icon={<Archive />}
            title="No purchases that month"
            text="This archived month had no variable spending."
          />
        )}
      </>
    );
  }
  const archives = [...data.archives].sort((a, b) =>
    b.month.localeCompare(a.month),
  );
  return archives.length ? (
    <section className="archive-list">
      {archives.map((archive) => {
        const spent = variableTotal(archive.transactions);
        const start =
          archive.takeHomeCents -
          archive.entries
            .filter((e) => e.enabled)
            .reduce((n, e) => n + e.amountCents, 0);
        return (
          <button key={archive.month} onClick={() => onSelect(archive)}>
            <CalendarDays />
            <span>
              <strong>{titleMonth(archive.month)}</strong>
              <small>
                {archive.transactions.length} purchases · {formatMoney(spent)}{" "}
                spent
              </small>
            </span>
            <em>{formatMoney(start - spent)}</em>
            <ChevronRight size={18} />
          </button>
        );
      })}
    </section>
  ) : (
    <EmptyState
      icon={<Archive />}
      title="No history yet"
      text="Finished months will appear here automatically and stay read-only."
    />
  );
}

function SettingsView({
  data,
  update,
  onEdit,
  exportBackup,
  importBackup,
  reset,
}: {
  data: AppData;
  update: (data: AppData, message?: string) => void;
  onEdit: (editor: {
    type: "income" | "entry" | "category";
    item: EditItem;
  }) => void;
  exportBackup: () => void;
  importBackup: () => void;
  reset: () => void;
}) {
  const entries = (kind: "bill" | "subscription") =>
    data.entries.filter((item) => item.kind === kind);
  return (
    <div className="settings-page">
      <SettingsSection
        title="Monthly income"
        subtitle="Used to calculate your starting spendable amount"
      >
        <button
          className="settings-row"
          onClick={() => onEdit({ type: "income", item: null })}
        >
          <span>
            <strong>Take-home pay</strong>
            <small>Each calendar month</small>
          </span>
          <em>{formatMoney(data.takeHomeCents)}</em>
          <ChevronRight />
        </button>
      </SettingsSection>
      {(["bill", "subscription"] as const).map((kind) => (
        <SettingsSection
          key={kind}
          title={kind === "bill" ? "Fixed bills" : "Subscriptions"}
          subtitle={`${formatMoney(kind === "bill" ? fixedTotal(data) : subscriptionTotal(data))} enabled monthly`}
          action={
            <button
              onClick={() =>
                onEdit({
                  type: "entry",
                  item: {
                    id: "",
                    name: "",
                    amountCents: 0,
                    enabled: true,
                    kind,
                  },
                })
              }
            >
              <Plus size={18} /> Add
            </button>
          }
        >
          {entries(kind).map((entry) => (
            <div className="settings-row" key={entry.id}>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={() =>
                    update(
                      {
                        ...data,
                        entries: data.entries.map((item) =>
                          item.id === entry.id
                            ? { ...item, enabled: !item.enabled }
                            : item,
                        ),
                      },
                      `${entry.name} ${entry.enabled ? "disabled" : "enabled"}`,
                    )
                  }
                />
                <span />
              </label>
              <button
                className="settings-main"
                onClick={() => onEdit({ type: "entry", item: entry })}
              >
                <span>
                  <strong>{entry.name}</strong>
                  <small>
                    {entry.provisional ? "Provisional amount · " : ""}
                    {entry.enabled ? "Included" : "Not included"}
                  </small>
                </span>
                <em>{formatMoney(entry.amountCents)}</em>
                <ChevronRight />
              </button>
            </div>
          ))}
        </SettingsSection>
      ))}
      <SettingsSection
        title="Categories"
        subtitle="Purchases share one monthly balance"
        action={
          <button
            onClick={() =>
              onEdit({
                type: "category",
                item: { id: "", name: "", color: "#4f805f" },
              })
            }
          >
            <Plus size={18} /> Add
          </button>
        }
      >
        {data.categories.map((category) => (
          <button
            className="settings-row"
            key={category.id}
            onClick={() => onEdit({ type: "category", item: category })}
          >
            <span
              className="category-dot"
              style={{ background: category.color }}
            />
            <span>
              <strong>{category.name}</strong>
            </span>
            <ChevronRight />
          </button>
        ))}
      </SettingsSection>
      <SettingsSection
        title="Your data"
        subtitle="Private and stored only in this browser"
      >
        <button className="settings-row" onClick={exportBackup}>
          <ArrowDownToLine />
          <span>
            <strong>Export JSON backup</strong>
            <small>Save a copy somewhere safe</small>
          </span>
          <ChevronRight />
        </button>
        <button className="settings-row" onClick={importBackup}>
          <ArrowUpFromLine />
          <span>
            <strong>Restore from backup</strong>
            <small>Validates before replacing data</small>
          </span>
          <ChevronRight />
        </button>
      </SettingsSection>
      <div className="privacy-note">
        <Info size={20} />
        <p>
          <strong>Keep your data safe.</strong> Deleting Safari website data or
          removing browser storage can erase this app’s records. Export a backup
          regularly.
        </p>
      </div>
      <button className="danger-button" onClick={reset}>
        <Trash2 size={18} /> Reset all app data
      </button>
      <p className="version">
        Monthly Money · Local data schema v{data.schemaVersion}
      </p>
    </div>
  );
}

function TransactionModal({
  data,
  existing,
  onClose,
  onSave,
}: {
  data: AppData;
  existing: Transaction | null;
  onClose: () => void;
  onSave: (item: Transaction) => void;
}) {
  const [activeYear, activeMonthNumber] = data.activeMonth
    .split("-")
    .map(Number);
  const monthLastDay = new Date(activeYear, activeMonthNumber, 0).getDate();
  const [amount, setAmount] = useState(
    existing ? (existing.amountCents / 100).toFixed(2) : "",
  );
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? data.categories[0]?.id ?? "",
  );
  const [date, setDate] = useState(existing?.date ?? today());
  const [merchant, setMerchant] = useState(existing?.merchant ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [formError, setFormError] = useState("");
  const merchantRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    window.setTimeout(() => merchantRef.current?.focus(), 50);
  }, []);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const cents = centsFromInput(amount);
    if (!cents)
      return setFormError(
        "Enter an amount greater than $0 with no more than two decimals.",
      );
    if (!merchant.trim())
      return setFormError("Add a merchant or short description.");
    if (!categoryId || !date)
      return setFormError("Choose a category and date.");
    const now = new Date().toISOString();
    onSave({
      id: existing?.id ?? newId(),
      amountCents: cents,
      categoryId,
      date,
      merchant: merchant.trim(),
      note: note.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  };
  return (
    <Modal
      title={existing ? "Edit purchase" : "Add purchase"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-stack">
        {formError && (
          <div className="inline-error" role="alert">
            {formError}
          </div>
        )}
        <label>
          Merchant or description
          <input
            ref={merchantRef}
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="e.g. Trader Joe’s"
            maxLength={80}
          />
        </label>
        <label>
          Amount
          <div className="money-input">
            <span>$</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
            />
          </div>
        </label>
        <label>
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {data.categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input
            type="date"
            value={date}
            min={`${data.activeMonth}-01`}
            max={`${data.activeMonth}-${monthLastDay}`}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Note <span className="optional">Optional</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything worth remembering"
            maxLength={240}
          />
        </label>
        <button className="primary-action modal-submit" type="submit">
          {existing ? "Save changes" : "Add purchase"}
        </button>
      </form>
    </Modal>
  );
}

function SettingsModal({
  data,
  editor,
  onClose,
  onSave,
}: {
  data: AppData;
  editor: { type: "income" | "entry" | "category"; item: EditItem };
  onClose: () => void;
  onSave: (data: AppData, message: string) => void;
}) {
  const item = editor.item;
  const [name, setName] = useState(item && "name" in item ? item.name : "");
  const initialCents =
    editor.type === "income"
      ? data.takeHomeCents
      : item && "amountCents" in item
        ? item.amountCents
        : 0;
  const [amount, setAmount] = useState(
    initialCents ? (initialCents / 100).toFixed(2) : "",
  );
  const [color, setColor] = useState(
    item && "color" in item ? item.color : "#4f805f",
  );
  const [formError, setFormError] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (editor.type === "income") {
      const cents = centsFromInput(amount);
      if (!cents) return setFormError("Enter a valid monthly income.");
      return onSave({ ...data, takeHomeCents: cents }, "Take-home pay updated");
    }
    if (!name.trim()) return setFormError("Enter a name.");
    if (editor.type === "entry") {
      const cents = centsFromInput(amount);
      if (!cents) return setFormError("Enter a valid amount.");
      const entry = item as BudgetEntry;
      const saved: BudgetEntry = {
        ...entry,
        id: entry.id || newId(),
        name: name.trim(),
        amountCents: cents,
      };
      const exists = data.entries.some(
        (candidate) => candidate.id === saved.id,
      );
      return onSave(
        {
          ...data,
          entries: exists
            ? data.entries.map((candidate) =>
                candidate.id === saved.id ? saved : candidate,
              )
            : [...data.entries, saved],
        },
        `${saved.name} saved`,
      );
    }
    const category = item as Category;
    const saved: Category = {
      ...category,
      id: category.id || newId(),
      name: name.trim(),
      color,
    };
    const exists = data.categories.some(
      (candidate) => candidate.id === saved.id,
    );
    onSave(
      {
        ...data,
        categories: exists
          ? data.categories.map((candidate) =>
              candidate.id === saved.id ? saved : candidate,
            )
          : [...data.categories, saved],
      },
      `${saved.name} saved`,
    );
  };
  const remove = () => {
    if (!item || !("id" in item) || !item.id) return;
    if (editor.type === "entry") {
      if (!window.confirm(`Delete ${name}?`)) return;
      onSave(
        {
          ...data,
          entries: data.entries.filter((entry) => entry.id !== item.id),
        },
        `${name} deleted`,
      );
    } else if (editor.type === "category") {
      if (
        data.transactions.some(
          (transaction) => transaction.categoryId === item.id,
        )
      )
        return setFormError(
          "This category is used by purchases and cannot be deleted. Rename it instead.",
        );
      if (!window.confirm(`Delete ${name}?`)) return;
      onSave(
        {
          ...data,
          categories: data.categories.filter(
            (category) => category.id !== item.id,
          ),
        },
        `${name} deleted`,
      );
    }
  };
  const title =
    editor.type === "income"
      ? "Monthly income"
      : `${item && "id" in item && item.id ? "Edit" : "Add"} ${editor.type}`;
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="form-stack">
        {formError && (
          <div className="inline-error" role="alert">
            {formError}
          </div>
        )}
        {editor.type !== "income" && (
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={60}
            />
          </label>
        )}
        {editor.type !== "category" && (
          <label>
            Monthly amount
            <div className="money-input">
              <span>$</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </label>
        )}
        {editor.type === "category" && (
          <label>
            Color
            <input
              className="color-input"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
        )}
        <button className="primary-action modal-submit" type="submit">
          Save
        </button>
        {item && "id" in item && item.id && editor.type !== "income" && (
          <button className="danger-button" type="button" onClick={remove}>
            <Trash2 size={18} /> Delete
          </button>
        )}
      </form>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-handle" />
        <header>
          <h2 id="modal-title">{title}</h2>
          <button onClick={onClose} aria-label="Close">
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function TransactionRow({
  item,
  categories,
  actions,
}: {
  item: Transaction;
  categories: Category[];
  actions?: React.ReactNode;
}) {
  const category = categories.find(
    (candidate) => candidate.id === item.categoryId,
  );
  const displayDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${item.date}T12:00:00`));
  return (
    <article className="transaction-row">
      <span
        className="transaction-icon"
        style={{
          background: `${category?.color ?? "#777"}22`,
          color: category?.color,
        }}
      >
        <CreditCard size={19} />
      </span>
      <span className="transaction-copy">
        <strong>{item.merchant}</strong>
        <small>
          {category?.name ?? "Unknown category"} · {displayDate}
          {item.note ? ` · ${item.note}` : ""}
        </small>
      </span>
      <strong className="transaction-amount">
        −{formatMoney(item.amountCents)}
      </strong>
      {actions && <span className="row-actions">{actions}</span>}
    </article>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {action && (
        <button onClick={onAction}>
          {action} <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
function SettingsSection({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-section">
      <header>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {action}
      </header>
      <div className="settings-card">{children}</div>
    </section>
  );
}
function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactElement<{ size?: number }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "active" : ""}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
function navLabel(view: View) {
  return {
    home: "Home",
    transactions: "This month",
    history: "Monthly history",
    settings: "Settings",
  }[view];
}

export default App;

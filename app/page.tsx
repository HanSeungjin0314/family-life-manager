"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

type Role = "owner" | "admin" | "member" | "viewer";
type Notice = { type: "success" | "error" | "info"; text: string };

type LifeGroup = { id: string; owner_id: string; name: string; group_type: string; memo: string | null; created_at: string };
type GroupMember = { id: string; group_id: string; user_id: string | null; display_name: string; role: Role; member_type: string; created_at?: string };
type GroupInvite = { id: string; group_id: string; code: string; role: Role; memo: string | null; is_active: boolean; expires_at: string; created_at: string };
type Category = { id: string; group_id: string; name: string; type: string; color: string | null; sort_order: number | null };
type Account = { id: string; group_id: string; name: string; account_type: string; owner_member_id: string | null; balance: number; memo: string | null };
type Budget = { id: string; group_id: string; budget_month: string; name: string; category_id: string | null; limit_amount: number; scope: string };
type Transaction = {
  id: string;
  group_id: string;
  created_by: string | null;
  type: "income" | "expense" | "transfer";
  scope: "shared" | "personal";
  title: string;
  transaction_date: string;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  paid_by_member_id: string | null;
  settlement_required: boolean;
  split_method: string;
  memo: string | null;
};
type FixedExpense = {
  id: string;
  group_id: string;
  title: string;
  start_date: string;
  next_payment_date: string | null;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  paid_by_member_id: string | null;
  repeat_type: string;
  is_active: boolean;
  memo: string | null;
};
type Task = { id: string; group_id: string; title: string; assigned_to_member_id: string | null; due_date: string | null; repeat_type: string; is_done: boolean; memo: string | null };
type ShoppingItem = { id: string; group_id: string; item_name: string; quantity: string | null; added_by_member_id: string | null; is_done: boolean; memo: string | null };
type Goal = { id: string; group_id: string; title: string; target_amount: number; current_amount: number; target_date: string | null; memo: string | null };
type CalendarEvent = { id: string; group_id: string; title: string; event_date: string; event_time: string | null; assigned_to_member_id: string | null; event_type: string; repeat_type: string; is_done: boolean; is_important: boolean; memo: string | null };
type AnniversaryEvent = { id: string; group_id: string; title: string; anniversary_date: string; calendar_type: string; repeat_type: string; member_id: string | null; memo: string | null };
type DiaryEntry = { id: string; group_id: string; author_member_id: string | null; diary_date: string; title: string; mood: string | null; content: string; visibility: string; created_at?: string };
type SettlementRecord = { id: string; group_id: string; settlement_month: string; from_member_id: string | null; to_member_id: string | null; amount: number; status: "pending" | "completed"; memo: string | null; completed_at: string | null };

const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => today().slice(0, 7);
const monthStart = (month: string) => `${month}-01`;
const currency = (value: number | string | null | undefined) => `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
const asNumber = (value: string) => Number(String(value).replaceAll(",", "")) || 0;
const formatMoneyInput = (value: string) => {
  const onlyNumbers = String(value).replace(/[^0-9]/g, "");
  if (!onlyNumbers) return "";
  return Number(onlyNumbers).toLocaleString("ko-KR");
};
const monthLabel = (month: string) => month.replace("-", "년 ") + "월";
const randomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

const seedCategories = [
  { name: "식비", type: "expense", color: "#f97316", sort_order: 1 },
  { name: "주거비", type: "expense", color: "#6366f1", sort_order: 2 },
  { name: "교통비", type: "expense", color: "#06b6d4", sort_order: 3 },
  { name: "통신비", type: "expense", color: "#22c55e", sort_order: 4 },
  { name: "보험료", type: "expense", color: "#8b5cf6", sort_order: 5 },
  { name: "저축/투자", type: "expense", color: "#0ea5e9", sort_order: 6 },
  { name: "생활용품", type: "expense", color: "#eab308", sort_order: 7 },
  { name: "데이트/여가", type: "expense", color: "#ec4899", sort_order: 8 },
  { name: "월급", type: "income", color: "#10b981", sort_order: 9 },
  { name: "부업", type: "income", color: "#14b8a6", sort_order: 10 },
  { name: "용돈/기타수입", type: "income", color: "#84cc16", sort_order: 11 }
];

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setBooting(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooting(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured || !supabase) return <ConfigGuide />;
  if (booting) return <main className="center-screen">불러오는 중...</main>;
  if (!session) return <AuthScreen />;
  return <FamilyLifeApp session={session} />;
}

function ConfigGuide() {
  return (
    <main className="center-screen">
      <section className="auth-card wide">
        <p className="eyebrow">Together Life</p>
        <h1>Supabase 환경변수가 필요합니다.</h1>
        <p className="muted"><code>.env.example</code> 파일을 <code>.env.local</code>로 복사한 뒤 새 Supabase 프로젝트의 URL과 ANON KEY를 입력하세요.</p>
        <pre>{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}</pre>
      </section>
    </main>
  );
}

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (mode: "login" | "signup") => {
    if (!supabase) return;
    if (!email || !password) {
      setNotice({ type: "error", text: "이메일과 비밀번호를 입력하세요." });
      return;
    }
    setLoading(true);
    setNotice(null);
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message });
      return;
    }
    setNotice({ type: "success", text: mode === "login" ? "로그인되었습니다." : "회원가입이 완료되었습니다. 이메일 인증 설정이 켜져 있다면 메일을 확인하세요." });
  };

  return (
    <main className="center-screen">
      <section className="auth-card">
        <p className="eyebrow">Together Life</p>
        <h1>부부·커플·가족용 생활 관리</h1>
        <p className="muted">공동 가계부, 정산, 공유 달력, 기념일, 다이어리, 장보기, 할 일, 목표를 한 공간에서 관리합니다.</p>
        <label>이메일</label>
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" />
        <label>비밀번호</label>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="6자 이상" />
        {notice && <p className={`notice ${notice.type}`}>{notice.text}</p>}
        <div className="button-row">
          <button onClick={() => submit("login")} disabled={loading}>{loading ? "처리 중" : "로그인"}</button>
          <button className="secondary" onClick={() => submit("signup")} disabled={loading}>회원가입</button>
        </div>
      </section>
    </main>
  );
}

function FamilyLifeApp({ session }: { session: Session }) {
  const currentUserId = session.user.id;
  const [groups, setGroups] = useState<LifeGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [anniversaryEvents, setAnniversaryEvents] = useState<AnniversaryEvent[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [settlementRecords, setSettlementRecords] = useState<SettlementRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(thisMonth());
  const [activeTab, setActiveTab] = useState<"home" | "finance" | "calendar" | "diary" | "life" | "settings">("home");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);

  const [groupForm, setGroupForm] = useState({ name: "우리집", group_type: "family", display_name: "나" });
  const [joinForm, setJoinForm] = useState({ code: "", display_name: "" });
  const [memberForm, setMemberForm] = useState({ display_name: "", role: "member" as Role });
  const [inviteForm, setInviteForm] = useState({ role: "member" as Role, memo: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "", type: "expense", color: "#4f46e5" });
  const [accountForm, setAccountForm] = useState({ name: "", account_type: "bank", owner_member_id: "", balance: "0", memo: "" });
  const [budgetForm, setBudgetForm] = useState({ name: "", budget_month: `${thisMonth()}-01`, category_id: "", limit_amount: "0", scope: "shared" });
  const [transactionForm, setTransactionForm] = useState({
    title: "",
    type: "expense" as "income" | "expense" | "transfer",
    scope: "shared" as "shared" | "personal",
    transaction_date: today(),
    amount: "0",
    category_id: "",
    account_id: "",
    paid_by_member_id: "",
    settlement_required: true,
    memo: ""
  });
  const [fixedForm, setFixedForm] = useState({ title: "", start_date: today(), next_payment_date: today(), amount: "0", category_id: "", account_id: "", paid_by_member_id: "", repeat_type: "monthly", memo: "" });
  const [taskForm, setTaskForm] = useState({ title: "", assigned_to_member_id: "", due_date: today(), repeat_type: "none", memo: "" });
  const [shoppingForm, setShoppingForm] = useState({ item_name: "", quantity: "", added_by_member_id: "", memo: "" });
  const [goalForm, setGoalForm] = useState({ title: "", target_amount: "0", current_amount: "0", target_date: "", memo: "" });
  const [eventForm, setEventForm] = useState({ title: "", event_date: today(), event_time: "", assigned_to_member_id: "", event_type: "schedule", repeat_type: "none", is_important: false, memo: "" });
  const [anniversaryForm, setAnniversaryForm] = useState({ title: "", anniversary_date: today(), calendar_type: "solar", repeat_type: "yearly", member_id: "", memo: "" });
  const [diaryForm, setDiaryForm] = useState({ title: "", diary_date: today(), mood: "normal", content: "", visibility: "group", author_member_id: "" });

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;
  const currentMember = members.find((member) => member.user_id === currentUserId) ?? null;
  const currentRole: Role = selectedGroup?.owner_id === currentUserId ? "owner" : currentMember?.role ?? "viewer";
  const canAdmin = currentRole === "owner" || currentRole === "admin";
  const canEdit = canAdmin || currentRole === "member";
  const isOwner = currentRole === "owner";

  const memberName = (id: string | null) => members.find((member) => member.id === id)?.display_name ?? "-";
  const categoryName = (id: string | null) => categories.find((category) => category.id === id)?.name ?? "미분류";
  const showNotice = (nextNotice: Notice) => {
    setNotice(nextNotice);
    window.setTimeout(() => setNotice(null), 3500);
  };

  const requireEdit = () => {
    if (canEdit) return true;
    showNotice({ type: "error", text: "조회 전용 권한입니다. 저장·수정·삭제는 관리자에게 요청하세요." });
    return false;
  };
  const requireAdmin = () => {
    if (canAdmin) return true;
    showNotice({ type: "error", text: "관리자 권한이 필요합니다." });
    return false;
  };

  const fetchGroups = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("life_groups").select("*").order("created_at", { ascending: false });
    if (error) return showNotice({ type: "error", text: error.message });
    const nextGroups = (data ?? []) as LifeGroup[];
    setGroups(nextGroups);
    if (!selectedGroupId && nextGroups.length > 0) setSelectedGroupId(nextGroups[0].id);
  };

  const fetchGroupData = async (groupId: string) => {
    if (!supabase || !groupId) return;
    setLoading(true);
    const [memberRes, inviteRes, categoryRes, accountRes, budgetRes, transactionRes, fixedRes, taskRes, shoppingRes, goalRes, eventRes, anniversaryRes, diaryRes, settlementRes] = await Promise.all([
      supabase.from("group_members").select("*").eq("group_id", groupId).order("created_at", { ascending: true }),
      supabase.from("group_invites").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("group_id", groupId).order("sort_order", { ascending: true }),
      supabase.from("accounts").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
      supabase.from("budgets").select("*").eq("group_id", groupId).order("budget_month", { ascending: false }),
      supabase.from("transactions").select("*").eq("group_id", groupId).order("transaction_date", { ascending: false }).limit(200),
      supabase.from("fixed_expenses").select("*").eq("group_id", groupId).order("next_payment_date", { ascending: true }),
      supabase.from("tasks").select("*").eq("group_id", groupId).order("due_date", { ascending: true }),
      supabase.from("shopping_items").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
      supabase.from("goals").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
      supabase.from("calendar_events").select("*").eq("group_id", groupId).order("event_date", { ascending: true }),
      supabase.from("anniversary_events").select("*").eq("group_id", groupId).order("anniversary_date", { ascending: true }),
      supabase.from("diary_entries").select("*").eq("group_id", groupId).order("diary_date", { ascending: false }),
      supabase.from("settlement_records").select("*").eq("group_id", groupId).order("created_at", { ascending: false })
    ]);
    setLoading(false);
    const firstError = [memberRes, inviteRes, categoryRes, accountRes, budgetRes, transactionRes, fixedRes, taskRes, shoppingRes, goalRes, eventRes, anniversaryRes, diaryRes, settlementRes].find((res) => res.error)?.error;
    if (firstError) return showNotice({ type: "error", text: firstError.message });
    setMembers((memberRes.data ?? []) as GroupMember[]);
    setInvites((inviteRes.data ?? []) as GroupInvite[]);
    setCategories((categoryRes.data ?? []) as Category[]);
    setAccounts((accountRes.data ?? []) as Account[]);
    setBudgets((budgetRes.data ?? []) as Budget[]);
    setTransactions((transactionRes.data ?? []) as Transaction[]);
    setFixedExpenses((fixedRes.data ?? []) as FixedExpense[]);
    setTasks((taskRes.data ?? []) as Task[]);
    setShoppingItems((shoppingRes.data ?? []) as ShoppingItem[]);
    setGoals((goalRes.data ?? []) as Goal[]);
    setCalendarEvents((eventRes.data ?? []) as CalendarEvent[]);
    setAnniversaryEvents((anniversaryRes.data ?? []) as AnniversaryEvent[]);
    setDiaryEntries((diaryRes.data ?? []) as DiaryEntry[]);
    setSettlementRecords((settlementRes.data ?? []) as SettlementRecord[]);
  };

  useEffect(() => { fetchGroups(); }, []);
  useEffect(() => { if (selectedGroupId) fetchGroupData(selectedGroupId); }, [selectedGroupId]);
  useEffect(() => {
    const firstMember = members[0]?.id ?? "";
    if (firstMember) {
      setTransactionForm((prev) => prev.paid_by_member_id ? prev : { ...prev, paid_by_member_id: firstMember });
      setFixedForm((prev) => prev.paid_by_member_id ? prev : { ...prev, paid_by_member_id: firstMember });
      setTaskForm((prev) => prev.assigned_to_member_id ? prev : { ...prev, assigned_to_member_id: firstMember });
      setShoppingForm((prev) => prev.added_by_member_id ? prev : { ...prev, added_by_member_id: firstMember });
      setEventForm((prev) => prev.assigned_to_member_id ? prev : { ...prev, assigned_to_member_id: firstMember });
      setAnniversaryForm((prev) => prev.member_id ? prev : { ...prev, member_id: firstMember });
      setDiaryForm((prev) => prev.author_member_id ? prev : { ...prev, author_member_id: firstMember });
    }
  }, [members]);

  const createGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !groupForm.name.trim()) return;
    setLoading(true);
    const { data: group, error: groupError } = await supabase.from("life_groups").insert({ name: groupForm.name.trim(), group_type: groupForm.group_type, owner_id: currentUserId }).select("*").single();
    if (groupError || !group) {
      setLoading(false);
      showNotice({ type: "error", text: groupError?.message ?? "그룹 생성에 실패했습니다." });
      return;
    }
    const { error: memberError } = await supabase.from("group_members").insert({ group_id: group.id, user_id: currentUserId, display_name: groupForm.display_name.trim() || session.user.email || "나", role: "owner", member_type: "real" });
    const { error: categoryError } = await supabase.from("categories").insert(seedCategories.map((category) => ({ ...category, group_id: group.id })));
    setLoading(false);
    if (memberError || categoryError) return showNotice({ type: "error", text: memberError?.message ?? categoryError?.message ?? "초기 데이터 생성에 실패했습니다." });
    setSelectedGroupId(group.id);
    await fetchGroups();
    await fetchGroupData(group.id);
    showNotice({ type: "success", text: "새 생활 그룹을 만들었습니다." });
  };

  const acceptInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !joinForm.code.trim()) return showNotice({ type: "error", text: "초대코드를 입력하세요." });
    const { data, error } = await supabase.rpc("accept_group_invite", { invite_code: joinForm.code.trim(), member_name: joinForm.display_name.trim() || session.user.email || "구성원" });
    if (error) return showNotice({ type: "error", text: error.message });
    setJoinForm({ code: "", display_name: "" });
    await fetchGroups();
    if (data) setSelectedGroupId(String(data));
    showNotice({ type: "success", text: "초대코드로 그룹에 참여했습니다." });
  };

  const deleteSelectedGroup = async () => {
    if (!supabase || !selectedGroupId || !selectedGroup) return;
    if (!isOwner) return showNotice({ type: "error", text: "그룹 삭제는 소유자만 가능합니다." });
    if (!window.confirm(`선택한 그룹 "${selectedGroup.name}"을 삭제할까요? 모든 데이터가 함께 삭제됩니다.`)) return;
    const { error } = await supabase.from("life_groups").delete().eq("id", selectedGroupId);
    if (error) return showNotice({ type: "error", text: error.message });
    setSelectedGroupId("");
    await fetchGroups();
    showNotice({ type: "success", text: "그룹을 삭제했습니다." });
  };

  const addMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selectedGroupId || !requireAdmin()) return;
    if (!memberForm.display_name.trim()) return showNotice({ type: "error", text: "구성원 이름을 입력하세요." });
    const { error } = await supabase.from("group_members").insert({ group_id: selectedGroupId, display_name: memberForm.display_name.trim(), role: memberForm.role, member_type: "display_only" });
    if (error) return showNotice({ type: "error", text: error.message });
    setMemberForm({ display_name: "", role: "member" });
    await fetchGroupData(selectedGroupId);
  };

  const updateMemberRole = async (member: GroupMember, role: Role) => {
    if (!supabase || !selectedGroupId || !requireAdmin()) return;
    if (member.role === "owner" && !isOwner) return showNotice({ type: "error", text: "owner 권한은 소유자만 변경할 수 있습니다." });
    const { error } = await supabase.from("group_members").update({ role }).eq("id", member.id);
    if (error) return showNotice({ type: "error", text: error.message });
    await fetchGroupData(selectedGroupId);
  };

  const createInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selectedGroupId || !requireAdmin()) return;
    const code = randomCode();
    const { error } = await supabase.from("group_invites").insert({ group_id: selectedGroupId, code, role: inviteForm.role, memo: inviteForm.memo || null, created_by: currentUserId });
    if (error) return showNotice({ type: "error", text: error.message });
    setInviteForm({ role: "member", memo: "" });
    await fetchGroupData(selectedGroupId);
    showNotice({ type: "success", text: `초대코드 ${code} 생성 완료` });
  };

  const addCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selectedGroupId || !requireAdmin()) return;
    if (!categoryForm.name.trim()) return;
    const { error } = await supabase.from("categories").insert({ ...categoryForm, group_id: selectedGroupId, name: categoryForm.name.trim() });
    if (error) return showNotice({ type: "error", text: error.message });
    setCategoryForm({ name: "", type: "expense", color: "#4f46e5" });
    await fetchGroupData(selectedGroupId);
  };

  const addAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selectedGroupId || !requireAdmin()) return;
    if (!accountForm.name.trim()) return;
    const { error } = await supabase.from("accounts").insert({ group_id: selectedGroupId, name: accountForm.name.trim(), account_type: accountForm.account_type, owner_member_id: accountForm.owner_member_id || null, balance: asNumber(accountForm.balance), memo: accountForm.memo || null });
    if (error) return showNotice({ type: "error", text: error.message });
    setAccountForm({ name: "", account_type: "bank", owner_member_id: "", balance: "0", memo: "" });
    await fetchGroupData(selectedGroupId);
  };

  const addBudget = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selectedGroupId || !requireAdmin()) return;
    if (!budgetForm.name.trim()) return;
    const { error } = await supabase.from("budgets").insert({ group_id: selectedGroupId, budget_month: budgetForm.budget_month, name: budgetForm.name.trim(), category_id: budgetForm.category_id || null, limit_amount: asNumber(budgetForm.limit_amount), scope: budgetForm.scope });
    if (error) return showNotice({ type: "error", text: error.message });
    setBudgetForm({ name: "", budget_month: `${selectedMonth}-01`, category_id: "", limit_amount: "0", scope: "shared" });
    await fetchGroupData(selectedGroupId);
  };

  const addTransaction = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selectedGroupId || !requireEdit()) return;
    if (!transactionForm.title.trim()) return;
    const { error } = await supabase.from("transactions").insert({
      group_id: selectedGroupId,
      created_by: currentUserId,
      title: transactionForm.title.trim(),
      type: transactionForm.type,
      scope: transactionForm.scope,
      transaction_date: transactionForm.transaction_date,
      amount: asNumber(transactionForm.amount),
      category_id: transactionForm.category_id || null,
      account_id: transactionForm.account_id || null,
      paid_by_member_id: transactionForm.paid_by_member_id || null,
      settlement_required: transactionForm.type === "expense" && transactionForm.scope === "shared" ? transactionForm.settlement_required : false,
      split_method: transactionForm.settlement_required ? "equal" : "none",
      memo: transactionForm.memo || null
    });
    if (error) return showNotice({ type: "error", text: error.message });
    setTransactionForm((prev) => ({ ...prev, title: "", amount: "0", memo: "", transaction_date: today() }));
    await fetchGroupData(selectedGroupId);
  };

  const addFixedExpense = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selectedGroupId || !requireAdmin()) return;
    if (!fixedForm.title.trim()) return;
    const { error } = await supabase.from("fixed_expenses").insert({ group_id: selectedGroupId, title: fixedForm.title.trim(), start_date: fixedForm.start_date, next_payment_date: fixedForm.next_payment_date || null, amount: asNumber(fixedForm.amount), category_id: fixedForm.category_id || null, account_id: fixedForm.account_id || null, paid_by_member_id: fixedForm.paid_by_member_id || null, repeat_type: fixedForm.repeat_type, memo: fixedForm.memo || null });
    if (error) return showNotice({ type: "error", text: error.message });
    setFixedForm((prev) => ({ ...prev, title: "", amount: "0", memo: "" }));
    await fetchGroupData(selectedGroupId);
  };

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selectedGroupId || !requireEdit()) return;
    if (!taskForm.title.trim()) return;
    const { error } = await supabase.from("tasks").insert({ group_id: selectedGroupId, title: taskForm.title.trim(), assigned_to_member_id: taskForm.assigned_to_member_id || null, due_date: taskForm.due_date || null, repeat_type: taskForm.repeat_type, memo: taskForm.memo || null });
    if (error) return showNotice({ type: "error", text: error.message });
    setTaskForm((prev) => ({ ...prev, title: "", memo: "" }));
    await fetchGroupData(selectedGroupId);
  };

  const addShoppingItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selectedGroupId || !requireEdit()) return;
    if (!shoppingForm.item_name.trim()) return;
    const { error } = await supabase.from("shopping_items").insert({ group_id: selectedGroupId, item_name: shoppingForm.item_name.trim(), quantity: shoppingForm.quantity || null, added_by_member_id: shoppingForm.added_by_member_id || null, memo: shoppingForm.memo || null });
    if (error) return showNotice({ type: "error", text: error.message });
    setShoppingForm((prev) => ({ ...prev, item_name: "", quantity: "", memo: "" }));
    await fetchGroupData(selectedGroupId);
  };

  const addGoal = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selectedGroupId || !requireEdit()) return;
    if (!goalForm.title.trim()) return;
    const { error } = await supabase.from("goals").insert({ group_id: selectedGroupId, title: goalForm.title.trim(), target_amount: asNumber(goalForm.target_amount), current_amount: asNumber(goalForm.current_amount), target_date: goalForm.target_date || null, memo: goalForm.memo || null });
    if (error) return showNotice({ type: "error", text: error.message });
    setGoalForm({ title: "", target_amount: "0", current_amount: "0", target_date: "", memo: "" });
    await fetchGroupData(selectedGroupId);
  };

  const addCalendarEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selectedGroupId || !requireEdit()) return;
    if (!eventForm.title.trim()) return;
    const { error } = await supabase.from("calendar_events").insert({
      group_id: selectedGroupId,
      title: eventForm.title.trim(),
      event_date: eventForm.event_date,
      event_time: eventForm.event_time || null,
      assigned_to_member_id: eventForm.assigned_to_member_id || null,
      event_type: eventForm.event_type,
      repeat_type: eventForm.repeat_type,
      is_important: eventForm.is_important,
      memo: eventForm.memo || null
    });
    if (error) return showNotice({ type: "error", text: error.message });
    setEventForm((prev) => ({ ...prev, title: "", memo: "", event_type: "schedule", repeat_type: "none", is_important: false }));
    await fetchGroupData(selectedGroupId);
  };

  const addAnniversary = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selectedGroupId || !requireEdit()) return;
    if (!anniversaryForm.title.trim()) return showNotice({ type: "error", text: "기념일 이름을 입력하세요." });
    const { error } = await supabase.from("anniversary_events").insert({
      group_id: selectedGroupId,
      title: anniversaryForm.title.trim(),
      anniversary_date: anniversaryForm.anniversary_date,
      calendar_type: anniversaryForm.calendar_type,
      repeat_type: anniversaryForm.repeat_type,
      member_id: anniversaryForm.member_id || null,
      memo: anniversaryForm.memo || null
    });
    if (error) return showNotice({ type: "error", text: error.message });
    setAnniversaryForm((prev) => ({ ...prev, title: "", memo: "", repeat_type: "yearly" }));
    await fetchGroupData(selectedGroupId);
  };

  const addDiaryEntry = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selectedGroupId || !requireEdit()) return;
    if (!diaryForm.title.trim()) return showNotice({ type: "error", text: "다이어리 제목을 입력하세요." });
    if (!diaryForm.content.trim()) return showNotice({ type: "error", text: "다이어리 내용을 입력하세요." });
    const { error } = await supabase.from("diary_entries").insert({
      group_id: selectedGroupId,
      author_member_id: diaryForm.author_member_id || currentMember?.id || null,
      diary_date: diaryForm.diary_date,
      title: diaryForm.title.trim(),
      mood: diaryForm.mood,
      content: diaryForm.content.trim(),
      visibility: diaryForm.visibility
    });
    if (error) return showNotice({ type: "error", text: error.message });
    setDiaryForm((prev) => ({ ...prev, title: "", content: "", mood: "normal" }));
    await fetchGroupData(selectedGroupId);
  };

  const updateRow = async (table: string, id: string, patch: Record<string, unknown>, adminOnly = false) => {
    if (!supabase || !selectedGroupId) return;
    if (adminOnly && !requireAdmin()) return;
    if (!adminOnly && !requireEdit()) return;
    const { error } = await supabase.from(table).update(patch).eq("id", id);
    if (error) return showNotice({ type: "error", text: error.message });
    await fetchGroupData(selectedGroupId);
    showNotice({ type: "success", text: "수정했습니다." });
  };

  const askText = (label: string, current: string | null | undefined) => {
    const next = window.prompt(label, current ?? "");
    if (next === null) return null;
    const trimmed = next.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const askMoney = (label: string, current: number | string | null | undefined) => {
    const next = window.prompt(label, formatMoneyInput(String(current ?? 0)));
    if (next === null) return null;
    return asNumber(next);
  };

  const askDate = (label: string, current: string | null | undefined) => {
    const next = window.prompt(label, current ?? today());
    if (next === null) return null;
    return next.trim() || null;
  };

  const editMemberName = async (member: GroupMember) => {
    if (member.role === "owner" && !isOwner) return showNotice({ type: "error", text: "owner 이름은 소유자만 수정할 수 있습니다." });
    const displayName = askText("구성원 이름을 수정하세요.", member.display_name);
    if (!displayName) return;
    await updateRow("group_members", member.id, { display_name: displayName }, true);
  };

  const editInviteMemo = async (invite: GroupInvite) => {
    const memo = window.prompt("초대코드 메모를 수정하세요.", invite.memo ?? "");
    if (memo === null) return;
    await updateRow("group_invites", invite.id, { memo: memo.trim() || null }, true);
  };

  const editCategory = async (category: Category) => {
    const name = askText("카테고리 이름을 수정하세요.", category.name);
    if (!name) return;
    await updateRow("categories", category.id, { name }, true);
  };

  const editAccount = async (account: Account) => {
    const name = askText("계좌명을 수정하세요.", account.name);
    if (!name) return;
    const balance = askMoney("잔액을 수정하세요.", account.balance);
    if (balance === null) return;
    await updateRow("accounts", account.id, { name, balance }, true);
  };

  const editBudget = async (budget: Budget) => {
    const name = askText("예산명을 수정하세요.", budget.name);
    if (!name) return;
    const limitAmount = askMoney("예산 한도를 수정하세요.", budget.limit_amount);
    if (limitAmount === null) return;
    await updateRow("budgets", budget.id, { name, limit_amount: limitAmount }, true);
  };

  const editTransaction = async (item: Transaction) => {
    const title = askText("거래 내용을 수정하세요.", item.title);
    if (!title) return;
    const amount = askMoney("금액을 수정하세요.", item.amount);
    if (amount === null) return;
    const transactionDate = askDate("거래일을 수정하세요. 예: 2026-05-10", item.transaction_date);
    if (!transactionDate) return;
    await updateRow("transactions", item.id, { title, amount, transaction_date: transactionDate });
  };

  const editFixedExpense = async (item: FixedExpense) => {
    const title = askText("고정비 이름을 수정하세요.", item.title);
    if (!title) return;
    const amount = askMoney("금액을 수정하세요.", item.amount);
    if (amount === null) return;
    const nextPaymentDate = askDate("다음 지출일을 수정하세요. 예: 2026-05-10", item.next_payment_date ?? item.start_date);
    await updateRow("fixed_expenses", item.id, { title, amount, next_payment_date: nextPaymentDate }, true);
  };

  const editTask = async (task: Task) => {
    const title = askText("할 일을 수정하세요.", task.title);
    if (!title) return;
    const dueDate = askDate("마감일을 수정하세요. 예: 2026-05-10", task.due_date ?? today());
    await updateRow("tasks", task.id, { title, due_date: dueDate });
  };

  const editShoppingItem = async (item: ShoppingItem) => {
    const itemName = askText("장보기 품목을 수정하세요.", item.item_name);
    if (!itemName) return;
    const quantity = window.prompt("수량을 수정하세요.", item.quantity ?? "");
    if (quantity === null) return;
    await updateRow("shopping_items", item.id, { item_name: itemName, quantity: quantity.trim() || null });
  };

  const editGoal = async (goal: Goal) => {
    const title = askText("목표명을 수정하세요.", goal.title);
    if (!title) return;
    const currentAmount = askMoney("현재 금액을 수정하세요.", goal.current_amount);
    if (currentAmount === null) return;
    const targetAmount = askMoney("목표 금액을 수정하세요.", goal.target_amount);
    if (targetAmount === null) return;
    await updateRow("goals", goal.id, { title, current_amount: currentAmount, target_amount: targetAmount });
  };

  const editCalendarEvent = async (item: CalendarEvent) => {
    const title = askText("일정명을 수정하세요.", item.title);
    if (!title) return;
    const eventDate = askDate("일정 날짜를 수정하세요. 예: 2026-05-10", item.event_date);
    if (!eventDate) return;
    const eventTime = window.prompt("일정 시간을 수정하세요. 예: 18:30", item.event_time ?? "");
    if (eventTime === null) return;
    await updateRow("calendar_events", item.id, { title, event_date: eventDate, event_time: eventTime.trim() || null });
  };

  const editAnniversary = async (item: AnniversaryEvent) => {
    const title = askText("기념일명을 수정하세요.", item.title);
    if (!title) return;
    const anniversaryDate = askDate("기념일 날짜를 수정하세요. 예: 2026-05-10", item.anniversary_date);
    if (!anniversaryDate) return;
    await updateRow("anniversary_events", item.id, { title, anniversary_date: anniversaryDate });
  };

  const editDiaryEntry = async (diary: DiaryEntry) => {
    const title = askText("다이어리 제목을 수정하세요.", diary.title);
    if (!title) return;
    const content = window.prompt("다이어리 내용을 수정하세요.", diary.content ?? "");
    if (content === null || !content.trim()) return;
    await updateRow("diary_entries", diary.id, { title, content: content.trim() });
  };

  const editSettlementRecord = async (record: SettlementRecord) => {
    const amount = askMoney("정산 금액을 수정하세요.", record.amount);
    if (amount === null) return;
    await updateRow("settlement_records", record.id, { amount });
  };

  const removeRow = async (table: string, id: string, adminOnly = false) => {
    if (!supabase || !selectedGroupId) return;
    if (adminOnly && !requireAdmin()) return;
    if (!adminOnly && !requireEdit()) return;
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return showNotice({ type: "error", text: error.message });
    await fetchGroupData(selectedGroupId);
  };

  const toggleRow = async (table: "tasks" | "shopping_items" | "calendar_events", id: string, isDone: boolean) => {
    if (!supabase || !selectedGroupId || !requireEdit()) return;
    const { error } = await supabase.from(table).update({ is_done: !isDone }).eq("id", id);
    if (error) return showNotice({ type: "error", text: error.message });
    await fetchGroupData(selectedGroupId);
  };

  const updateSettlementStatus = async (id: string, status: "pending" | "completed") => {
    if (!supabase || !selectedGroupId || !requireEdit()) return;
    const { error } = await supabase.from("settlement_records").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", id);
    if (error) return showNotice({ type: "error", text: error.message });
    await fetchGroupData(selectedGroupId);
  };

  const monthTransactions = useMemo(() => transactions.filter((item) => item.transaction_date?.startsWith(selectedMonth)), [transactions, selectedMonth]);
  const monthBudgets = useMemo(() => budgets.filter((item) => item.budget_month?.startsWith(selectedMonth)), [budgets, selectedMonth]);
  const monthFixedExpenses = useMemo(() => fixedExpenses.filter((item) => item.is_active && item.next_payment_date?.startsWith(selectedMonth)), [fixedExpenses, selectedMonth]);
  const monthSettlementRecords = useMemo(() => settlementRecords.filter((item) => item.settlement_month?.startsWith(selectedMonth)), [settlementRecords, selectedMonth]);
  const upcomingEvents = useMemo(() => calendarEvents.filter((item) => item.event_date >= today()).slice(0, 8), [calendarEvents]);
  const selectedMonthEvents = useMemo(() => calendarEvents.filter((item) => item.event_date?.startsWith(selectedMonth)), [calendarEvents, selectedMonth]);
  const selectedMonthAnniversaries = useMemo(() => anniversaryEvents.filter((item) => item.anniversary_date?.slice(5, 7) === selectedMonth.slice(5, 7)), [anniversaryEvents, selectedMonth]);
  const selectedMonthDiaryEntries = useMemo(() => diaryEntries.filter((item) => item.diary_date?.startsWith(selectedMonth)).slice(0, 8), [diaryEntries, selectedMonth]);
  const upcomingAnniversaries = useMemo(() => {
    const now = new Date(`${today()}T00:00:00`);
    const currentYear = now.getFullYear();
    return anniversaryEvents
      .map((item) => {
        const monthDay = item.anniversary_date.slice(5, 10);
        let nextDate = new Date(`${currentYear}-${monthDay}T00:00:00`);
        if (nextDate < now) nextDate = new Date(`${currentYear + 1}-${monthDay}T00:00:00`);
        const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / 86400000);
        return { ...item, next_date: nextDate.toISOString().slice(0, 10), diffDays };
      })
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 8);
  }, [anniversaryEvents]);
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(`${selectedMonth}-01T00:00:00`);
    const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
    const blanks = firstDay.getDay();
    const cells: Array<{ date: string | null; day: number | null; events: CalendarEvent[]; anniversaries: AnniversaryEvent[]; diaries: DiaryEntry[] }> = [];
    for (let i = 0; i < blanks; i += 1) cells.push({ date: null, day: null, events: [], anniversaries: [], diaries: [] });
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum += 1) {
      const date = `${selectedMonth}-${String(dayNum).padStart(2, "0")}`;
      cells.push({
        date,
        day: dayNum,
        events: selectedMonthEvents.filter((item) => item.event_date === date),
        anniversaries: selectedMonthAnniversaries.filter((item) => item.anniversary_date.slice(5, 10) === date.slice(5, 10)),
        diaries: diaryEntries.filter((item) => item.diary_date === date)
      });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null, events: [], anniversaries: [], diaries: [] });
    return cells;
  }, [selectedMonth, selectedMonthEvents, selectedMonthAnniversaries, diaryEntries]);

  const summary = useMemo(() => {
    const income = monthTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
    const variableExpense = monthTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
    const fixedExpense = monthFixedExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const sharedExpense = monthTransactions.filter((item) => item.type === "expense" && item.scope === "shared").reduce((sum, item) => sum + Number(item.amount), 0);
    const personalExpense = monthTransactions.filter((item) => item.type === "expense" && item.scope === "personal").reduce((sum, item) => sum + Number(item.amount), 0);
    return { income, variableExpense, fixedExpense, totalExpense: variableExpense + fixedExpense, balance: income - variableExpense - fixedExpense, sharedExpense, personalExpense };
  }, [monthTransactions, monthFixedExpenses]);

  const settlementBalances = useMemo(() => {
    const balances = new Map<string, number>();
    members.forEach((member) => balances.set(member.id, 0));
    const activeMembers = members;
    monthTransactions
      .filter((item) => item.type === "expense" && item.scope === "shared" && item.settlement_required && item.paid_by_member_id)
      .forEach((item) => {
        const amount = Number(item.amount);
        const share = activeMembers.length > 0 ? amount / activeMembers.length : 0;
        balances.set(item.paid_by_member_id as string, (balances.get(item.paid_by_member_id as string) ?? 0) + amount);
        activeMembers.forEach((member) => balances.set(member.id, (balances.get(member.id) ?? 0) - share));
      });
    monthSettlementRecords
      .filter((record) => record.status === "completed" && record.from_member_id && record.to_member_id)
      .forEach((record) => {
        balances.set(record.from_member_id as string, (balances.get(record.from_member_id as string) ?? 0) + Number(record.amount));
        balances.set(record.to_member_id as string, (balances.get(record.to_member_id as string) ?? 0) - Number(record.amount));
      });
    return members.map((member) => ({ member, balance: Math.round(balances.get(member.id) ?? 0) }));
  }, [members, monthTransactions, monthSettlementRecords]);

  const settlementSuggestions = useMemo(() => {
    const creditors = settlementBalances.filter((row) => row.balance > 0).map((row) => ({ ...row }));
    const debtors = settlementBalances.filter((row) => row.balance < 0).map((row) => ({ ...row, balance: Math.abs(row.balance) }));
    const suggestions: Array<{ from: GroupMember; to: GroupMember; amount: number }> = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].balance, creditors[j].balance);
      if (amount > 0) suggestions.push({ from: debtors[i].member, to: creditors[j].member, amount });
      debtors[i].balance -= amount;
      creditors[j].balance -= amount;
      if (debtors[i].balance <= 0) i += 1;
      if (creditors[j].balance <= 0) j += 1;
    }
    return suggestions;
  }, [settlementBalances]);

  const createSettlementSuggestions = async () => {
    if (!supabase || !selectedGroupId || !requireEdit()) return;
    if (settlementSuggestions.length === 0) return showNotice({ type: "info", text: "생성할 정산 기록이 없습니다." });
    if (monthSettlementRecords.some((record) => record.status === "pending") && !window.confirm("이미 대기 중인 정산 기록이 있습니다. 추가로 생성할까요?")) return;
    const rows = settlementSuggestions.map((row) => ({ group_id: selectedGroupId, settlement_month: monthStart(selectedMonth), from_member_id: row.from.id, to_member_id: row.to.id, amount: row.amount, status: "pending", memo: `${selectedMonth} 자동 정산` }));
    const { error } = await supabase.from("settlement_records").insert(rows);
    if (error) return showNotice({ type: "error", text: error.message });
    await fetchGroupData(selectedGroupId);
    showNotice({ type: "success", text: "이번 달 정산 기록을 생성했습니다." });
  };

  const categoryStats = useMemo(() => {
    const expenseTotal = monthTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
    return categories
      .filter((category) => category.type === "expense")
      .map((category) => {
        const total = monthTransactions.filter((item) => item.type === "expense" && item.category_id === category.id).reduce((sum, item) => sum + Number(item.amount), 0);
        return { category, total, percent: expenseTotal > 0 ? Math.round((total / expenseTotal) * 100) : 0 };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [categories, monthTransactions]);

  const monthlyChart = useMemo(() => {
    const now = new Date(`${selectedMonth}-01T00:00:00`);
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now);
      date.setMonth(now.getMonth() - (5 - index));
      return date.toISOString().slice(0, 7);
    });
    const rows = months.map((month) => {
      const total = transactions.filter((item) => item.transaction_date?.startsWith(month) && item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
      return { month, total };
    });
    const max = Math.max(...rows.map((row) => row.total), 1);
    return rows.map((row) => ({ ...row, percent: Math.max(4, Math.round((row.total / max) * 100)) }));
  }, [transactions, selectedMonth]);

  if (groups.length === 0) {
    return (
      <main className="app-shell single">
        <section className="hero-card wide">
          <p className="eyebrow">Together Life</p>
          <h1>생활 그룹을 만들거나 초대코드로 참여하세요.</h1>
          <p className="muted">공유 일정, 기념일, 다이어리까지 함께 관리할 수 있습니다.</p>
          {notice && <p className={`notice ${notice.type}`}>{notice.text}</p>}
          <div className="grid two">
            <Card title="새 그룹 만들기"><GroupForm groupForm={groupForm} setGroupForm={setGroupForm} createGroup={createGroup} loading={loading} /></Card>
            <Card title="초대코드로 참여"><JoinInviteForm joinForm={joinForm} setJoinForm={setJoinForm} acceptInvite={acceptInvite} /></Card>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar simple-sidebar">
        <div>
          <p className="eyebrow">Together Life</p>
          <h1>우리 생활 관리</h1>
          <p className="muted small">부부가 함께 쓰는 공유 공간</p>
        </div>

        <label>생활 그룹</label>
        <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>

        <div className="role-box">
          <span>내 권한</span>
          <strong>{roleLabel(currentRole)}</strong>
          <small>{canAdmin ? "관리 기능 사용 가능" : canEdit ? "생활 입력 가능" : "조회 전용"}</small>
        </div>

        <div className="sidebar-note">
          필요한 기능만 위쪽 탭에서 나눠서 확인하세요.
        </div>

        <button className="danger" onClick={() => supabase?.auth.signOut()}>로그아웃</button>
      </aside>

      <section className="content">
        <div className="topbar">
          <div>
            <h2>{selectedGroup?.name ?? "생활 그룹"}</h2>
            <p className="muted">한 페이지에 모두 보여주지 않고, 필요한 기능만 탭으로 나눠서 사용합니다.</p>
          </div>
          <div className="month-control">
            <label>기준 월</label>
            <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
          </div>
        </div>

        {notice && <p className={`notice ${notice.type}`}>{notice.text}</p>}
        {loading && <p className="notice info">데이터를 처리 중입니다.</p>}

        <div className="tab-bar">
          <button type="button" className={`tab-button ${activeTab === "home" ? "active" : ""}`} onClick={() => setActiveTab("home")}>홈</button>
          <button type="button" className={`tab-button ${activeTab === "finance" ? "active" : ""}`} onClick={() => setActiveTab("finance")}>가계부</button>
          <button type="button" className={`tab-button ${activeTab === "calendar" ? "active" : ""}`} onClick={() => setActiveTab("calendar")}>달력 · 기념일</button>
          <button type="button" className={`tab-button ${activeTab === "diary" ? "active" : ""}`} onClick={() => setActiveTab("diary")}>다이어리</button>
          <button type="button" className={`tab-button ${activeTab === "life" ? "active" : ""}`} onClick={() => setActiveTab("life")}>생활</button>
          <button type="button" className={`tab-button ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>설정</button>
        </div>

        {activeTab === "home" && (
          <>
            <section className="summary-grid">
              <SummaryCard title="수입" value={currency(summary.income)} tone="green" />
              <SummaryCard title="변동 지출" value={currency(summary.variableExpense)} tone="red" />
              <SummaryCard title="고정비" value={currency(summary.fixedExpense)} tone="orange" />
              <SummaryCard title="공동 지출" value={currency(summary.sharedExpense)} tone="blue" />
              <SummaryCard title="개인 지출" value={currency(summary.personalExpense)} tone="purple" />
              <SummaryCard title="남은 금액" value={currency(summary.balance)} tone="gray" />
              <SummaryCard title="이번 달 일정" value={`${selectedMonthEvents.length}건`} tone="blue" />
              <SummaryCard title="이번 달 다이어리" value={`${selectedMonthDiaryEntries.length}건`} tone="purple" />
            </section>

            <section className="grid two">
              <Card title={`${monthLabel(selectedMonth)} 공유 달력`} description="일정, 기념일, 다이어리 작성일을 함께 봅니다.">
                <div className="calendar-weekdays"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
                <div className="calendar-grid">
                  {calendarGrid.map((cell, index) => (
                    <div key={`${cell.date ?? "blank"}-${index}`} className={`calendar-cell ${cell.date === today() ? "today" : ""} ${!cell.date ? "blank" : ""}`}>
                      {cell.day && <strong>{cell.day}</strong>}
                      {cell.anniversaries.slice(0, 2).map((anniversary) => <small className="cal-pill anniversary" key={anniversary.id}>🎉 {anniversary.title}</small>)}
                      {cell.events.slice(0, 2).map((event) => <small className="cal-pill event" key={event.id}>{event.is_important ? "⭐" : "📌"} {event.title}</small>)}
                      {cell.diaries.slice(0, 1).map((diary) => <small className="cal-pill diary" key={diary.id}>📓 {diary.title}</small>)}
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="다가오는 일정·기념일" description="이번 달에 바로 확인하면 되는 내용만 모아봤어요.">
                <div className="mini-section"><h4>다가오는 일정</h4><List compact>{upcomingEvents.length === 0 && <li><span>등록된 일정이 없습니다.</span></li>}{upcomingEvents.map((event) => <li key={event.id}><span>{event.event_date} {event.event_time ?? ""} · {event.is_important ? "⭐ " : ""}{event.title}</span><div className="inline-actions"><button className="text-button" onClick={() => editCalendarEvent(event)} disabled={!canEdit}>수정</button><button className="text-button danger-text" onClick={() => removeRow("calendar_events", event.id)} disabled={!canEdit}>삭제</button></div></li>)}</List></div>
                <div className="mini-section"><h4>다가오는 기념일</h4><List compact>{upcomingAnniversaries.length === 0 && <li><span>등록된 기념일이 없습니다.</span></li>}{upcomingAnniversaries.map((anniversary) => <li key={anniversary.id}><span>{anniversary.next_date} · D-{anniversary.diffDays} · {anniversary.title}</span><div className="inline-actions"><button className="text-button" onClick={() => editAnniversary(anniversary)} disabled={!canEdit}>수정</button><button className="text-button danger-text" onClick={() => removeRow("anniversary_events", anniversary.id)} disabled={!canEdit}>삭제</button></div></li>)}</List></div>
                <div className="mini-section"><h4>이번 달 다이어리</h4><List compact>{selectedMonthDiaryEntries.length === 0 && <li><span>이번 달 다이어리가 없습니다.</span></li>}{selectedMonthDiaryEntries.slice(0, 5).map((diary) => <li key={diary.id}><span>{diary.diary_date} · {diary.title}</span><div className="inline-actions"><button className="text-button" onClick={() => editDiaryEntry(diary)} disabled={!canEdit}>수정</button><button className="text-button danger-text" onClick={() => removeRow("diary_entries", diary.id)} disabled={!canEdit}>삭제</button></div></li>)}</List></div>
              </Card>
            </section>
          </>
        )}

        {activeTab === "finance" && (
          <>
            <section className="summary-grid">
              <SummaryCard title="수입" value={currency(summary.income)} tone="green" />
              <SummaryCard title="변동 지출" value={currency(summary.variableExpense)} tone="red" />
              <SummaryCard title="고정비" value={currency(summary.fixedExpense)} tone="orange" />
              <SummaryCard title="공동 지출" value={currency(summary.sharedExpense)} tone="blue" />
              <SummaryCard title="개인 지출" value={currency(summary.personalExpense)} tone="purple" />
              <SummaryCard title="남은 금액" value={currency(summary.balance)} tone="gray" />
            </section>

            <section className="grid three">
              <Card title="공동 가계부" description="수입, 지출, 이체를 등록합니다.">
                <form className="stack-form" onSubmit={addTransaction}>
                  <input value={transactionForm.title} onChange={(event) => setTransactionForm({ ...transactionForm, title: event.target.value })} placeholder="내용" disabled={!canEdit} />
                  <div className="form-row">
                    <select value={transactionForm.type} onChange={(event) => setTransactionForm({ ...transactionForm, type: event.target.value as Transaction["type"] })} disabled={!canEdit}><option value="expense">지출</option><option value="income">수입</option><option value="transfer">이체</option></select>
                    <select value={transactionForm.scope} onChange={(event) => setTransactionForm({ ...transactionForm, scope: event.target.value as Transaction["scope"] })} disabled={!canEdit}><option value="shared">공동</option><option value="personal">개인</option></select>
                  </div>
                  <div className="form-row"><input type="date" value={transactionForm.transaction_date} onChange={(event) => setTransactionForm({ ...transactionForm, transaction_date: event.target.value })} disabled={!canEdit} /><input value={transactionForm.amount} onChange={(event) => setTransactionForm({ ...transactionForm, amount: formatMoneyInput(event.target.value) })} placeholder="금액" disabled={!canEdit} /></div>
                  <select value={transactionForm.category_id} onChange={(event) => setTransactionForm({ ...transactionForm, category_id: event.target.value })} disabled={!canEdit}><option value="">카테고리</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                  <select value={transactionForm.paid_by_member_id} onChange={(event) => setTransactionForm({ ...transactionForm, paid_by_member_id: event.target.value })} disabled={!canEdit}><option value="">결제자</option>{members.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select>
                  <label className="check-line"><input type="checkbox" checked={transactionForm.settlement_required} onChange={(event) => setTransactionForm({ ...transactionForm, settlement_required: event.target.checked })} disabled={!canEdit} /> 공동 지출 정산 대상</label>
                  <button disabled={!canEdit}>거래 저장</button>
                </form>
              </Card>

              <Card title="고정비" description="보험, 통신비, 구독료처럼 반복되는 지출입니다.">
                <form className="stack-form" onSubmit={addFixedExpense}>
                  <input value={fixedForm.title} onChange={(event) => setFixedForm({ ...fixedForm, title: event.target.value })} placeholder="고정비 이름" disabled={!canAdmin} />
                  <div className="form-row"><input type="date" value={fixedForm.next_payment_date} onChange={(event) => setFixedForm({ ...fixedForm, next_payment_date: event.target.value })} disabled={!canAdmin} /><input value={fixedForm.amount} onChange={(event) => setFixedForm({ ...fixedForm, amount: formatMoneyInput(event.target.value) })} placeholder="금액" disabled={!canAdmin} /></div>
                  <select value={fixedForm.category_id} onChange={(event) => setFixedForm({ ...fixedForm, category_id: event.target.value })} disabled={!canAdmin}><option value="">카테고리</option>{categories.filter((category) => category.type === "expense").map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                  <button disabled={!canAdmin}>고정비 저장</button>
                </form>
                <List compact>{fixedExpenses.slice(0, 6).map((item) => <li key={item.id}><span>{item.title} · {currency(item.amount)}</span><div className="inline-actions"><button className="text-button" onClick={() => editFixedExpense(item)} disabled={!canAdmin}>수정</button><button className="text-button danger-text" onClick={() => removeRow("fixed_expenses", item.id, true)} disabled={!canAdmin}>삭제</button></div></li>)}</List>
              </Card>

              <Card title="계좌·카테고리" description="가계부 기본 설정입니다.">
                <form className="stack-form" onSubmit={addAccount}>
                  <input value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} placeholder="계좌명" disabled={!canAdmin} />
                  <div className="form-row"><select value={accountForm.account_type} onChange={(event) => setAccountForm({ ...accountForm, account_type: event.target.value })} disabled={!canAdmin}><option value="bank">입출금</option><option value="cash">현금</option><option value="credit_card">신용카드</option><option value="saving">저축</option></select><input value={accountForm.balance} onChange={(event) => setAccountForm({ ...accountForm, balance: formatMoneyInput(event.target.value) })} placeholder="잔액" disabled={!canAdmin} /></div>
                  <button className="secondary" disabled={!canAdmin}>계좌 추가</button>
                </form>
                <List compact>{accounts.slice(0, 4).map((account) => <li key={account.id}><span>{account.name} · {currency(account.balance)}</span><div className="inline-actions"><button className="text-button" onClick={() => editAccount(account)} disabled={!canAdmin}>수정</button><button className="text-button danger-text" onClick={() => removeRow("accounts", account.id, true)} disabled={!canAdmin}>삭제</button></div></li>)}</List>
                <hr />
                <form className="inline-form" onSubmit={addCategory}>
                  <input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="카테고리" disabled={!canAdmin} />
                  <select value={categoryForm.type} onChange={(event) => setCategoryForm({ ...categoryForm, type: event.target.value })} disabled={!canAdmin}><option value="expense">지출</option><option value="income">수입</option></select>
                  <button className="secondary" disabled={!canAdmin}>추가</button>
                </form>
                <List compact>{categories.slice(0, 8).map((category) => <li key={category.id}><span>{category.name} · {category.type === "income" ? "수입" : "지출"}</span><div className="inline-actions"><button className="text-button" onClick={() => editCategory(category)} disabled={!canAdmin}>수정</button><button className="text-button danger-text" onClick={() => removeRow("categories", category.id, true)} disabled={!canAdmin}>삭제</button></div></li>)}</List>
              </Card>
            </section>

            <section className="grid two">
              <Card title="정산 관리" description="공동 지출을 1/N 기준으로 계산하고 완료 처리합니다.">
                <div className="settlement-list">
                  {settlementBalances.map(({ member, balance }) => <div className="settlement-row" key={member.id}><span>{member.display_name}</span><strong className={balance > 0 ? "positive" : balance < 0 ? "negative" : ""}>{balance > 0 ? `받을 금액 ${currency(balance)}` : balance < 0 ? `보낼 금액 ${currency(Math.abs(balance))}` : "정산 완료"}</strong></div>)}
                </div>
                <button className="secondary full gap-top" onClick={createSettlementSuggestions} disabled={!canEdit}>이번 달 정산 기록 생성</button>
                <List>
                  {monthSettlementRecords.slice(0, 8).map((record) => <li key={record.id}><span>{memberName(record.from_member_id)} → {memberName(record.to_member_id)} · {currency(record.amount)} · {record.status === "completed" ? "완료" : "대기"}</span><div className="inline-actions">{record.status !== "completed" && <button className="text-button" onClick={() => updateSettlementStatus(record.id, "completed")} disabled={!canEdit}>완료</button>}<button className="text-button" onClick={() => editSettlementRecord(record)} disabled={!canEdit}>수정</button><button className="text-button danger-text" onClick={() => removeRow("settlement_records", record.id)} disabled={!canEdit}>삭제</button></div></li>)}
                </List>
              </Card>

              <Card title="이번 달 예산" description="월별 예산과 고정비를 관리합니다.">
                <form className="stack-form" onSubmit={addBudget}>
                  <input value={budgetForm.name} onChange={(event) => setBudgetForm({ ...budgetForm, name: event.target.value })} placeholder="예산명" disabled={!canAdmin} />
                  <div className="form-row"><input type="date" value={budgetForm.budget_month} onChange={(event) => setBudgetForm({ ...budgetForm, budget_month: event.target.value })} disabled={!canAdmin} /><input value={budgetForm.limit_amount} onChange={(event) => setBudgetForm({ ...budgetForm, limit_amount: formatMoneyInput(event.target.value) })} placeholder="한도" disabled={!canAdmin} /></div>
                  <button className="secondary" disabled={!canAdmin}>예산 추가</button>
                </form>
                <List>{monthBudgets.map((budget) => <li key={budget.id}><span>{budget.name} · {currency(budget.limit_amount)}</span><div className="inline-actions"><button className="text-button" onClick={() => editBudget(budget)} disabled={!canAdmin}>수정</button><button className="text-button danger-text" onClick={() => removeRow("budgets", budget.id, true)} disabled={!canAdmin}>삭제</button></div></li>)}</List>
              </Card>
            </section>

            <section className="grid two">
              <Card title={`${monthLabel(selectedMonth)} 지출 차트`} description="최근 6개월 지출 추이입니다.">
                <div className="bar-chart">{monthlyChart.map((row) => <div className="bar-row" key={row.month}><span>{row.month.slice(5)}월</span><div><i style={{ width: `${row.percent}%` }} /></div><strong>{currency(row.total)}</strong></div>)}</div>
              </Card>
              <Card title="카테고리별 지출" description="이번 달 지출 비율입니다.">
                <div className="category-list">{categoryStats.length === 0 && <p className="muted">아직 지출 내역이 없습니다.</p>}{categoryStats.map(({ category, total, percent }) => <div className="category-item" key={category.id}><div className="between"><strong>{category.name}</strong><span>{currency(total)} · {percent}%</span></div><div className="progress"><span style={{ width: `${percent}%`, background: category.color ?? "#4f46e5" }} /></div></div>)}</div>
              </Card>
            </section>

            <section className="grid two">
              <Card title="최근 거래내역" description="수입·지출·이체 내역입니다.">
                <div className="table-wrap"><table><thead><tr><th>날짜</th><th>구분</th><th>내용</th><th>결제자</th><th>카테고리</th><th>금액</th><th></th></tr></thead><tbody>{transactions.slice(0, 30).map((item) => <tr key={item.id}><td>{item.transaction_date}</td><td>{item.type === "income" ? "수입" : item.type === "expense" ? "지출" : "이체"} · {item.scope === "shared" ? "공동" : "개인"}</td><td>{item.title}</td><td>{memberName(item.paid_by_member_id)}</td><td>{categoryName(item.category_id)}</td><td className="right">{currency(item.amount)}</td><td><button className="text-button" onClick={() => editTransaction(item)} disabled={!canEdit}>수정</button><button className="text-button danger-text" onClick={() => removeRow("transactions", item.id)} disabled={!canEdit}>삭제</button></td></tr>)}</tbody></table></div>
              </Card>
              <Card title="공동 목표" description="여행, 이사, 결혼, 비상금 등 목표를 관리합니다.">
                <form className="stack-form" onSubmit={addGoal}>
                  <input value={goalForm.title} onChange={(event) => setGoalForm({ ...goalForm, title: event.target.value })} placeholder="목표명" disabled={!canEdit} />
                  <div className="form-row"><input value={goalForm.current_amount} onChange={(event) => setGoalForm({ ...goalForm, current_amount: formatMoneyInput(event.target.value) })} placeholder="현재금액" disabled={!canEdit} /><input value={goalForm.target_amount} onChange={(event) => setGoalForm({ ...goalForm, target_amount: formatMoneyInput(event.target.value) })} placeholder="목표금액" disabled={!canEdit} /></div>
                  <button disabled={!canEdit}>목표 추가</button>
                </form>
                <div className="goal-list">
                  {goals.slice(0, 5).map((goal) => {
                    const percent = goal.target_amount > 0 ? Math.min(100, Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100)) : 0;
                    return <div className="goal-item" key={goal.id}><div className="between"><strong>{goal.title}</strong><div className="inline-actions"><button className="text-button" onClick={() => editGoal(goal)} disabled={!canEdit}>수정</button><button className="text-button danger-text" onClick={() => removeRow("goals", goal.id)} disabled={!canEdit}>삭제</button></div></div><div className="progress"><span style={{ width: `${percent}%` }} /></div><small>{currency(goal.current_amount)} / {currency(goal.target_amount)} · {percent}%</small></div>;
                  })}
                </div>
              </Card>
            </section>
          </>
        )}

        {activeTab === "calendar" && (
          <>
            <section className="grid two">
              <Card title={`${monthLabel(selectedMonth)} 공유 달력`} description="일정, 기념일, 다이어리 작성일을 월간 달력으로 함께 봅니다.">
                <div className="calendar-weekdays"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
                <div className="calendar-grid">
                  {calendarGrid.map((cell, index) => (
                    <div key={`${cell.date ?? "blank"}-${index}`} className={`calendar-cell ${cell.date === today() ? "today" : ""} ${!cell.date ? "blank" : ""}`}>
                      {cell.day && <strong>{cell.day}</strong>}
                      {cell.anniversaries.slice(0, 2).map((anniversary) => <small className="cal-pill anniversary" key={anniversary.id}>🎉 {anniversary.title}</small>)}
                      {cell.events.slice(0, 2).map((event) => <small className="cal-pill event" key={event.id}>{event.is_important ? "⭐" : "📌"} {event.title}</small>)}
                      {cell.diaries.slice(0, 1).map((diary) => <small className="cal-pill diary" key={diary.id}>📓 {diary.title}</small>)}
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="다가오는 일정·기념일" description="가까운 일정과 반복 기념일을 빠르게 확인합니다.">
                <div className="mini-section"><h4>다가오는 일정</h4><List compact>{upcomingEvents.length === 0 && <li><span>등록된 일정이 없습니다.</span></li>}{upcomingEvents.map((event) => <li key={event.id}><span>{event.event_date} {event.event_time ?? ""} · {event.is_important ? "⭐ " : ""}{event.title}</span><div className="inline-actions"><button className="text-button" onClick={() => editCalendarEvent(event)} disabled={!canEdit}>수정</button><button className="text-button danger-text" onClick={() => removeRow("calendar_events", event.id)} disabled={!canEdit}>삭제</button></div></li>)}</List></div>
                <div className="mini-section"><h4>다가오는 기념일</h4><List compact>{upcomingAnniversaries.length === 0 && <li><span>등록된 기념일이 없습니다.</span></li>}{upcomingAnniversaries.map((anniversary) => <li key={anniversary.id}><span>{anniversary.next_date} · D-{anniversary.diffDays} · {anniversary.title}</span><div className="inline-actions"><button className="text-button" onClick={() => editAnniversary(anniversary)} disabled={!canEdit}>수정</button><button className="text-button danger-text" onClick={() => removeRow("anniversary_events", anniversary.id)} disabled={!canEdit}>삭제</button></div></li>)}</List></div>
              </Card>
            </section>

            <section className="grid two">
              <Card title="일정 등록" description="병원, 납부일, 가족 일정, 데이트 약속을 공유합니다.">
                <form className="stack-form" onSubmit={addCalendarEvent}>
                  <input value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} placeholder="일정명" disabled={!canEdit} />
                  <div className="form-row"><input type="date" value={eventForm.event_date} onChange={(event) => setEventForm({ ...eventForm, event_date: event.target.value })} disabled={!canEdit} /><input type="time" value={eventForm.event_time} onChange={(event) => setEventForm({ ...eventForm, event_time: event.target.value })} disabled={!canEdit} /></div>
                  <div className="form-row"><select value={eventForm.event_type} onChange={(event) => setEventForm({ ...eventForm, event_type: event.target.value })} disabled={!canEdit}><option value="schedule">일반 일정</option><option value="hospital">병원/건강</option><option value="payment">납부일</option><option value="date">데이트/외출</option><option value="family">가족행사</option></select><select value={eventForm.repeat_type} onChange={(event) => setEventForm({ ...eventForm, repeat_type: event.target.value })} disabled={!canEdit}><option value="none">반복 없음</option><option value="daily">매일</option><option value="weekly">매주</option><option value="monthly">매월</option><option value="yearly">매년</option></select></div>
                  <select value={eventForm.assigned_to_member_id} onChange={(event) => setEventForm({ ...eventForm, assigned_to_member_id: event.target.value })} disabled={!canEdit}><option value="">담당자</option>{members.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select>
                  <textarea rows={3} value={eventForm.memo} onChange={(event) => setEventForm({ ...eventForm, memo: event.target.value })} placeholder="메모" disabled={!canEdit} />
                  <label className="check-line"><input type="checkbox" checked={eventForm.is_important} onChange={(event) => setEventForm({ ...eventForm, is_important: event.target.checked })} disabled={!canEdit} /> 중요 일정</label>
                  <button disabled={!canEdit}>일정 추가</button>
                </form>
              </Card>

              <Card title="기념일" description="만난 날, 결혼기념일, 생일을 관리합니다.">
                <form className="stack-form" onSubmit={addAnniversary}>
                  <input value={anniversaryForm.title} onChange={(event) => setAnniversaryForm({ ...anniversaryForm, title: event.target.value })} placeholder="기념일명" disabled={!canEdit} />
                  <div className="form-row"><input type="date" value={anniversaryForm.anniversary_date} onChange={(event) => setAnniversaryForm({ ...anniversaryForm, anniversary_date: event.target.value })} disabled={!canEdit} /><select value={anniversaryForm.calendar_type} onChange={(event) => setAnniversaryForm({ ...anniversaryForm, calendar_type: event.target.value })} disabled={!canEdit}><option value="solar">양력</option><option value="lunar">음력 메모</option></select></div>
                  <div className="form-row"><select value={anniversaryForm.repeat_type} onChange={(event) => setAnniversaryForm({ ...anniversaryForm, repeat_type: event.target.value })} disabled={!canEdit}><option value="yearly">매년 반복</option><option value="once">한 번만</option></select><select value={anniversaryForm.member_id} onChange={(event) => setAnniversaryForm({ ...anniversaryForm, member_id: event.target.value })} disabled={!canEdit}><option value="">관련 구성원</option>{members.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></div>
                  <textarea rows={3} value={anniversaryForm.memo} onChange={(event) => setAnniversaryForm({ ...anniversaryForm, memo: event.target.value })} placeholder="선물 아이디어, 장소, 메모" disabled={!canEdit} />
                  <button disabled={!canEdit}>기념일 추가</button>
                </form>
                <List compact>{anniversaryEvents.slice(0, 6).map((item) => <li key={item.id}><span>{item.anniversary_date.slice(5)} · {item.title} · {item.calendar_type === "lunar" ? "음력메모" : "양력"}</span><div className="inline-actions"><button className="text-button" onClick={() => editAnniversary(item)} disabled={!canEdit}>수정</button><button className="text-button danger-text" onClick={() => removeRow("anniversary_events", item.id)} disabled={!canEdit}>삭제</button></div></li>)}</List>
              </Card>
            </section>
          </>
        )}

        {activeTab === "diary" && (
          <section className="grid two">
            <Card title="다이어리 작성" description="오늘 있었던 일이나 함께 기억하고 싶은 내용을 기록합니다.">
              <form className="stack-form" onSubmit={addDiaryEntry}>
                <input value={diaryForm.title} onChange={(event) => setDiaryForm({ ...diaryForm, title: event.target.value })} placeholder="제목" disabled={!canEdit} />
                <div className="form-row"><input type="date" value={diaryForm.diary_date} onChange={(event) => setDiaryForm({ ...diaryForm, diary_date: event.target.value })} disabled={!canEdit} /><select value={diaryForm.mood} onChange={(event) => setDiaryForm({ ...diaryForm, mood: event.target.value })} disabled={!canEdit}><option value="happy">😊 좋음</option><option value="normal">🙂 보통</option><option value="tired">😵 피곤</option><option value="sad">😢 슬픔</option><option value="thankful">🙏 감사</option></select></div>
                <div className="form-row"><select value={diaryForm.author_member_id} onChange={(event) => setDiaryForm({ ...diaryForm, author_member_id: event.target.value })} disabled={!canEdit}><option value="">작성자</option>{members.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select><select value={diaryForm.visibility} onChange={(event) => setDiaryForm({ ...diaryForm, visibility: event.target.value })} disabled={!canEdit}><option value="group">공유</option><option value="private">개인 메모</option></select></div>
                <textarea rows={8} value={diaryForm.content} onChange={(event) => setDiaryForm({ ...diaryForm, content: event.target.value })} placeholder="오늘 있었던 일, 고마웠던 일, 함께 기억하고 싶은 내용을 적어보세요." disabled={!canEdit} />
                <button disabled={!canEdit}>다이어리 저장</button>
              </form>
            </Card>

            <Card title="이번 달 다이어리" description="최근 작성한 기록을 모아봅니다.">
              <List>{selectedMonthDiaryEntries.length === 0 && <li><span>이번 달 다이어리가 없습니다.</span></li>}{selectedMonthDiaryEntries.map((diary) => <li key={diary.id}><span>{diary.diary_date} · {moodLabel(diary.mood)} · {diary.title} · {memberName(diary.author_member_id)}</span><div className="inline-actions"><button className="text-button" onClick={() => editDiaryEntry(diary)} disabled={!canEdit}>수정</button><button className="text-button danger-text" onClick={() => removeRow("diary_entries", diary.id)} disabled={!canEdit}>삭제</button></div></li>)}</List>
            </Card>
          </section>
        )}

        {activeTab === "life" && (
          <>
            <section className="grid two">
              <Card title="장보기" description="공동으로 필요한 물건을 체크합니다.">
                <form className="inline-form" onSubmit={addShoppingItem}>
                  <input value={shoppingForm.item_name} onChange={(event) => setShoppingForm({ ...shoppingForm, item_name: event.target.value })} placeholder="품목" disabled={!canEdit} />
                  <input value={shoppingForm.quantity} onChange={(event) => setShoppingForm({ ...shoppingForm, quantity: event.target.value })} placeholder="수량" disabled={!canEdit} />
                  <button disabled={!canEdit}>추가</button>
                </form>
                <List>{shoppingItems.slice(0, 8).map((item) => <li key={item.id}><button className="text-button" onClick={() => toggleRow("shopping_items", item.id, item.is_done)} disabled={!canEdit}>{item.is_done ? "✅" : "⬜"}</button><span className={item.is_done ? "done" : ""}>{item.item_name} {item.quantity ? `· ${item.quantity}` : ""}</span><div className="inline-actions"><button className="text-button" onClick={() => editShoppingItem(item)} disabled={!canEdit}>수정</button><button className="text-button danger-text" onClick={() => removeRow("shopping_items", item.id)} disabled={!canEdit}>삭제</button></div></li>)}</List>
              </Card>

              <Card title="할 일" description="집안일, 납부, 예약 등을 담당자와 함께 관리합니다.">
                <form className="stack-form" onSubmit={addTask}>
                  <input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} placeholder="할 일" disabled={!canEdit} />
                  <div className="form-row"><select value={taskForm.assigned_to_member_id} onChange={(event) => setTaskForm({ ...taskForm, assigned_to_member_id: event.target.value })} disabled={!canEdit}><option value="">담당자</option>{members.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select><input type="date" value={taskForm.due_date} onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })} disabled={!canEdit} /></div>
                  <button disabled={!canEdit}>할 일 추가</button>
                </form>
                <List>{tasks.slice(0, 8).map((task) => <li key={task.id}><button className="text-button" onClick={() => toggleRow("tasks", task.id, task.is_done)} disabled={!canEdit}>{task.is_done ? "✅" : "⬜"}</button><span className={task.is_done ? "done" : ""}>{task.title} · {memberName(task.assigned_to_member_id)}</span><div className="inline-actions"><button className="text-button" onClick={() => editTask(task)} disabled={!canEdit}>수정</button><button className="text-button danger-text" onClick={() => removeRow("tasks", task.id)} disabled={!canEdit}>삭제</button></div></li>)}</List>
              </Card>
            </section>

            <section className="grid two">
              <Card title="공동 목표" description="여행, 집, 비상금 등 목표를 관리합니다.">
                <form className="stack-form" onSubmit={addGoal}>
                  <input value={goalForm.title} onChange={(event) => setGoalForm({ ...goalForm, title: event.target.value })} placeholder="목표명" disabled={!canEdit} />
                  <div className="form-row"><input value={goalForm.current_amount} onChange={(event) => setGoalForm({ ...goalForm, current_amount: formatMoneyInput(event.target.value) })} placeholder="현재금액" disabled={!canEdit} /><input value={goalForm.target_amount} onChange={(event) => setGoalForm({ ...goalForm, target_amount: formatMoneyInput(event.target.value) })} placeholder="목표금액" disabled={!canEdit} /></div>
                  <button disabled={!canEdit}>목표 추가</button>
                </form>
                <div className="goal-list">
                  {goals.slice(0, 5).map((goal) => {
                    const percent = goal.target_amount > 0 ? Math.min(100, Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100)) : 0;
                    return <div className="goal-item" key={goal.id}><div className="between"><strong>{goal.title}</strong><div className="inline-actions"><button className="text-button" onClick={() => editGoal(goal)} disabled={!canEdit}>수정</button><button className="text-button danger-text" onClick={() => removeRow("goals", goal.id)} disabled={!canEdit}>삭제</button></div></div><div className="progress"><span style={{ width: `${percent}%` }} /></div><small>{currency(goal.current_amount)} / {currency(goal.target_amount)} · {percent}%</small></div>;
                  })}
                </div>
              </Card>
            </section>
          </>
        )}

        {activeTab === "settings" && (
          <>
            <section className="grid two">
              <Card title="그룹 관리" description="그룹 생성, 참여, 삭제를 이곳에서 관리합니다.">
                <div className="stack-form">
                  <button type="button" className="danger full" onClick={deleteSelectedGroup} disabled={!isOwner}>선택 그룹 삭제</button>
                  <hr />
                  <form className="stack-form" onSubmit={createGroup}>
                    <strong>새 그룹 만들기</strong>
                    <input value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} placeholder="우리집" />
                    <select value={groupForm.group_type} onChange={(event) => setGroupForm({ ...groupForm, group_type: event.target.value })}>
                      <option value="couple">커플</option><option value="married">부부</option><option value="family">가족</option><option value="roommates">룸메이트</option>
                    </select>
                    <input value={groupForm.display_name} onChange={(event) => setGroupForm({ ...groupForm, display_name: event.target.value })} placeholder="내 표시 이름" />
                    <button className="secondary" disabled={loading}>새 그룹 추가</button>
                  </form>
                  <hr />
                  <form className="stack-form" onSubmit={acceptInvite}>
                    <strong>초대코드 참여</strong>
                    <input value={joinForm.code} onChange={(event) => setJoinForm({ ...joinForm, code: event.target.value.toUpperCase() })} placeholder="초대코드" />
                    <input value={joinForm.display_name} onChange={(event) => setJoinForm({ ...joinForm, display_name: event.target.value })} placeholder="내 표시 이름" />
                    <button className="secondary">참여</button>
                  </form>
                </div>
              </Card>

              <Card title="구성원·권한 관리" description="둘이 사용하는 앱이라도 권한과 표시 이름을 정리할 수 있습니다.">
                <form className="inline-form role-form" onSubmit={addMember}>
                  <input value={memberForm.display_name} onChange={(event) => setMemberForm({ ...memberForm, display_name: event.target.value })} placeholder="표시용 구성원" disabled={!canAdmin} />
                  <select value={memberForm.role} onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value as Role })} disabled={!canAdmin}>
                    <RoleOptions allowOwner={false} />
                  </select>
                  <button disabled={!canAdmin}>추가</button>
                </form>
                <List>
                  {members.map((member) => (
                    <li key={member.id}>
                      <span>{member.display_name} · {member.member_type === "real" ? "실계정" : "표시용"}</span>
                      <div className="inline-actions">
                        <select value={member.role} onChange={(event) => updateMemberRole(member, event.target.value as Role)} disabled={!canAdmin || member.role === "owner"}>
                          <RoleOptions allowOwner />
                        </select>
                        <button className="text-button" onClick={() => editMemberName(member)} disabled={!canAdmin || member.role === "owner"}>이름수정</button><button className="text-button danger-text" onClick={() => removeRow("group_members", member.id, true)} disabled={!canAdmin || member.role === "owner"}>삭제</button>
                      </div>
                    </li>
                  ))}
                </List>
              </Card>
            </section>

            <section className="grid two">
              <Card title="초대코드" description="상대방이 회원가입 후 초대코드를 입력하면 같은 그룹에 들어옵니다.">
                <form className="inline-form role-form" onSubmit={createInvite}>
                  <select value={inviteForm.role} onChange={(event) => setInviteForm({ ...inviteForm, role: event.target.value as Role })} disabled={!canAdmin}>
                    <RoleOptions allowOwner={false} />
                  </select>
                  <input value={inviteForm.memo} onChange={(event) => setInviteForm({ ...inviteForm, memo: event.target.value })} placeholder="메모" disabled={!canAdmin} />
                  <button disabled={!canAdmin}>코드 생성</button>
                </form>
                <List>
                  {invites.slice(0, 8).map((invite) => (
                    <li key={invite.id}>
                      <span><strong>{invite.code}</strong> · {roleLabel(invite.role)} · {invite.is_active ? "사용 가능" : "중지"}</span>
                      <div className="inline-actions"><button className="text-button" onClick={() => editInviteMemo(invite)} disabled={!canAdmin}>수정</button><button className="text-button danger-text" onClick={() => removeRow("group_invites", invite.id, true)} disabled={!canAdmin}>삭제</button></div>
                    </li>
                  ))}
                </List>
              </Card>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function GroupForm({ groupForm, setGroupForm, createGroup, loading }: { groupForm: { name: string; group_type: string; display_name: string }; setGroupForm: (value: { name: string; group_type: string; display_name: string }) => void; createGroup: (event: FormEvent) => void; loading: boolean }) {
  return (
    <form className="stack-form" onSubmit={createGroup}>
      <label>그룹 이름</label>
      <input value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} placeholder="예: 우리집, 데이트 통장" />
      <label>그룹 유형</label>
      <select value={groupForm.group_type} onChange={(event) => setGroupForm({ ...groupForm, group_type: event.target.value })}>
        <option value="couple">커플</option><option value="married">부부</option><option value="family">가족</option><option value="roommates">룸메이트</option>
      </select>
      <label>내 표시 이름</label>
      <input value={groupForm.display_name} onChange={(event) => setGroupForm({ ...groupForm, display_name: event.target.value })} placeholder="예: 나, 남편, 아내" />
      <button disabled={loading}>{loading ? "생성 중" : "생활 그룹 만들기"}</button>
    </form>
  );
}

function JoinInviteForm({ joinForm, setJoinForm, acceptInvite }: { joinForm: { code: string; display_name: string }; setJoinForm: (value: { code: string; display_name: string }) => void; acceptInvite: (event: FormEvent) => void }) {
  return (
    <form className="stack-form" onSubmit={acceptInvite}>
      <label>초대코드</label>
      <input value={joinForm.code} onChange={(event) => setJoinForm({ ...joinForm, code: event.target.value.toUpperCase() })} placeholder="예: ABC123" />
      <label>내 표시 이름</label>
      <input value={joinForm.display_name} onChange={(event) => setJoinForm({ ...joinForm, display_name: event.target.value })} placeholder="예: 배우자, 가족" />
      <button>초대코드로 참여</button>
    </form>
  );
}

function RoleOptions({ allowOwner }: { allowOwner: boolean }) {
  return (
    <>
      {allowOwner && <option value="owner">소유자</option>}
      <option value="admin">관리자</option>
      <option value="member">멤버</option>
      <option value="viewer">조회전용</option>
    </>
  );
}

function roleLabel(role: Role) {
  if (role === "owner") return "소유자";
  if (role === "admin") return "관리자";
  if (role === "member") return "멤버";
  return "조회전용";
}

function moodLabel(mood: string | null | undefined) {
  if (mood === "happy") return "😊 좋음";
  if (mood === "tired") return "😵 피곤";
  if (mood === "sad") return "😢 슬픔";
  if (mood === "thankful") return "🙏 감사";
  return "🙂 보통";
}

function SummaryCard({ title, value, tone }: { title: string; value: string; tone: string }) {
  return <article className={`summary-card ${tone}`}><span>{title}</span><strong>{value}</strong></article>;
}

function Card({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return <section className="card"><div className="card-head"><h3>{title}</h3>{description && <p>{description}</p>}</div>{children}</section>;
}

function List({ children, compact = false }: { children?: ReactNode; compact?: boolean }) {
  return <ul className={`simple-list ${compact ? "compact" : ""}`}>{children}</ul>;
}

/**
 * pages/admin/AdminSubscriptionPage.jsx
 *
 * Subscription Plans Management Dashboard.
 * Displays subscription metrics cards, plans data sheets, discount tags,
 * coupon lists, and custom feature tags.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit3, Trash2, Shield, DollarSign, Check, X,
  FileText, Award, Calendar, Percent, Loader2, Sparkles, LayoutGrid, CheckCircle
} from 'lucide-react';
import {
  getAdminPlans, getAdminPlanStats, createAdminPlan, updateAdminPlan, deleteAdminPlan
} from '@/services/admin.service';
import toast from 'react-hot-toast';

// ─── Plan Form Modal ──────────────────────────────────────────────
function PlanFormModal({ plan, onSave, onClose }) {
  const [form, setForm] = useState({
    name:           plan?.name || '',
    price:          plan?.price || 0,
    durationDays:   plan?.durationDays || 30,
    credits:        plan?.credits || 10,
    directDiscount: plan?.directDiscount || 0,
    isPublished:    plan?.isPublished !== undefined ? plan.isPublished : true,
  });

  // Local feature list management
  const [features, setFeatures] = useState(plan?.features || []);
  const [newFeature, setNewFeature] = useState('');

  // Local coupons list management
  const [coupons, setCoupons] = useState(plan?.coupons || []);
  const [couponCode, setCouponCode] = useState('');
  const [couponPct, setCouponPct] = useState(10);

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.price < 0) return toast.error('Price cannot be negative.');
    if (form.directDiscount > form.price) return toast.error('Discount cannot exceed the price.');

    setSaving(true);
    try {
      const payload = {
        ...form,
        features,
        coupons,
      };

      if (plan?._id) {
        await updateAdminPlan(plan._id, payload);
      } else {
        await createAdminPlan(payload);
      }
      toast.success('Subscription plan specifications saved.');
      onSave();
      onClose();
    } catch {
      toast.error('Error saving subscription plan details.');
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    const f = newFeature.trim();
    if (f && !features.includes(f)) {
      setFeatures(p => [...p, f]);
      setNewFeature('');
    }
  };

  const removeFeature = (f) => {
    setFeatures(p => p.filter(x => x !== f));
  };

  const addCoupon = () => {
    const code = couponCode.toUpperCase().trim();
    const pct  = parseInt(couponPct) || 10;
    if (code && !coupons.some(c => c.code === code)) {
      setCoupons(p => [...p, { code, discountPercent: pct, isActive: true }]);
      setCouponCode('');
      setCouponPct(10);
    }
  };

  const removeCoupon = (code) => {
    setCoupons(p => p.filter(c => c.code !== code));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto scrollbar-thin">
        <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-2">
          {plan ? 'Edit Billing Plan' : 'Create Billing Plan'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="form-label">Plan Name*</label>
            <input
              className="form-input"
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Executive Pro Package"
              required
            />
          </div>

          {/* Normal Price */}
          <div>
            <label className="form-label">Normal Price ($)*</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              value={form.price}
              onChange={(e) => setForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
              required
            />
          </div>

          {/* Flat Discount */}
          <div>
            <label className="form-label">Flat Direct Discount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              value={form.directDiscount}
              onChange={(e) => setForm(p => ({ ...p, directDiscount: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          {/* Duration Days */}
          <div>
            <label className="form-label">Validity (Days)*</label>
            <input
              type="number"
              min="1"
              className="form-input"
              value={form.durationDays}
              onChange={(e) => setForm(p => ({ ...p, durationDays: parseInt(e.target.value) || 30 }))}
              required
            />
          </div>

          {/* Credits */}
          <div>
            <label className="form-label">Credits Count Added*</label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={form.credits}
              onChange={(e) => setForm(p => ({ ...p, credits: parseInt(e.target.value) || 10 }))}
              required
            />
          </div>

          {/* Publish Checkbox */}
          <div className="flex items-center pt-2 sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm(p => ({ ...p, isPublished: e.target.checked }))}
                className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-slate-300 text-xs font-semibold">Publish immediately (Visible to candidates)</span>
            </label>
          </div>
        </div>

        {/* Features tag section */}
        <div className="pt-2 border-t border-white/[0.04] space-y-2">
          <label className="form-label">Included Features List</label>
          <div className="flex gap-2">
            <input
              className="form-input text-xs"
              placeholder="e.g. 5 Detailed Resume Feedbacks"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
            />
            <button type="button" onClick={addFeature} className="px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex-shrink-0">
              Add Feature
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {features.map(f => (
              <span key={f} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                {f}
                <button type="button" onClick={() => removeFeature(f)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Coupon codes list section */}
        <div className="pt-2 border-t border-white/[0.04] space-y-2">
          <label className="form-label">Active Promotion Codes</label>
          <div className="flex gap-2">
            <input
              className="form-input text-xs uppercase"
              placeholder="e.g. SUMMER50"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <input
              type="number"
              min="1"
              max="100"
              className="form-input text-xs w-20 flex-shrink-0"
              placeholder="10%"
              value={couponPct}
              onChange={(e) => setCouponPct(e.target.value)}
            />
            <button type="button" onClick={addCoupon} className="px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex-shrink-0">
              Add Coupon
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {coupons.map(c => (
              <span key={c.code} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                <strong>{c.code}</strong> (-{c.discountPercent}%)
                <button type="button" onClick={() => removeCoupon(c.code)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-3 border-t border-white/10">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Publish Billing Plan'}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────
export default function AdminSubscriptionPage() {
  const [plans, setPlans]           = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);

  // Pagination / Filter states
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalItems, setTotalItems]   = useState(0);

  // Modal control states
  const [formOpen, setFormOpen]       = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [deletePlanId, setDeletePlanId] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getAdminPlanStats();
      setStats(data);
    } catch {
      toast.error('Failed to load subscription statistics.');
    }
  }, []);

  const fetchPlansList = useCallback(async () => {
    try {
      const res = await getAdminPlans({ page, limit: 10 });
      setPlans(res.plans || []);
      setTotalItems(res.total || 0);
      setTotalPages(res.pages || 1);
    } catch {
      toast.error('Failed to load subscription plans.');
    }
  }, [page]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchPlansList()]);
    setLoading(false);
  }, [fetchStats, fetchPlansList]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id) => {
    try {
      await deleteAdminPlan(id);
      toast.success('Billing plan archived. No longer visible to new buyers.');
      setDeletePlanId(null);
      loadData();
    } catch {
      toast.error('Plan archive deletion failed.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8 relative">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Subscription Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Configure monetization levels, adjust credit packaging values, and update promotional discounts</p>
        </div>
        
        <button
          onClick={() => { setSelectedPlan(null); setFormOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-500 font-semibold text-xs transition-colors self-start sm:self-auto flex-shrink-0"
        >
          <Plus size={13} />
          Create Plan
        </button>
      </div>

      {/* ── Statistics Grid widgets ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total plans */}
        <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold">Total Plan Configurations</span>
            <p className="text-2xl font-bold text-white leading-none mt-1">
              {stats?.totalPlans ?? 0}
            </p>
            <p className="text-[10px] text-slate-500">Includes direct updates history</p>
          </div>
          <div className="p-3 bg-brand-500/10 rounded-2xl text-brand-400">
            <LayoutGrid size={20} />
          </div>
        </div>

        {/* Active plans */}
        <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold">Active Selling Plans</span>
            <p className="text-2xl font-bold text-white leading-none mt-1">
              {stats?.activePlans ?? 0}
            </p>
            <p className="text-[10px] text-emerald-400">Currently visible in portal</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
            <CheckCircle size={20} />
          </div>
        </div>

        {/* Premium subscribers */}
        <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold">Premium Candidates</span>
            <p className="text-2xl font-bold text-white leading-none mt-1">
              {stats?.premiumUsers ?? 0}
            </p>
            <p className="text-[10px] text-slate-500">Active monthly subscriptions</p>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
            <Shield size={20} />
          </div>
        </div>

        {/* Credits pool */}
        <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold">Credits Pool Registry</span>
            <p className="text-2xl font-bold text-white leading-none mt-1">
              {stats?.totalUserCredits ?? 0}
            </p>
            <p className="text-[10px] text-slate-500">Available mock tokens held</p>
          </div>
          <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-400">
            <Award size={20} />
          </div>
        </div>

      </div>

      {/* ── Subscription Plans Table ────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="text-left text-slate-400 font-medium px-4 py-3">Plan Name</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Regular Price</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Direct Discount</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Final Selling Price</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Token Credits</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Validity Duration</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Promotion Codes</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
                <th className="text-right text-slate-400 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-white/5 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500 text-xs">No active billing plans configured.</td>
                </tr>
              ) : (
                plans.map(p => {
                  const finalPrice = Math.max(0, p.price - (p.directDiscount || 0));
                  return (
                    <tr key={p._id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
                      <td className="px-4 py-3 text-slate-400">${p.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-red-400">
                        {p.directDiscount > 0 ? `-$${p.directDiscount.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-400">${finalPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-200 font-semibold">{p.credits}</td>
                      <td className="px-4 py-3 text-slate-300">{p.durationDays} days</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {p.coupons?.length > 0 ? (
                            p.coupons.map(c => (
                              <span key={c.code} className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px]">
                                {c.code}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.isPublished ? (
                          <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Published</span>
                        ) : (
                          <span className="badge bg-slate-500/10 text-slate-400 border border-slate-500/20">Draft</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setSelectedPlan(p); setFormOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Edit Plan"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => setDeletePlanId(p._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Archive Plan"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
            <p className="text-slate-500 text-xs">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all">
                <Calendar size={15} />
              </button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all">
                <Calendar size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reusable Form overlays */}
      {formOpen && (
        <PlanFormModal
          plan={selectedPlan}
          onSave={loadData}
          onClose={() => { setFormOpen(false); setSelectedPlan(null); }}
        />
      )}

      {/* Delete confirmation modal */}
      {deletePlanId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <Trash2 className="text-red-500" size={18} />
              Archive Plan Layout?
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Are you sure you want to archive this subscription plan? Candidates currently paying for this plan will keep active access, but new buyers will no longer see this package option listed in the portal.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => handleDelete(deletePlanId)} className="btn-danger flex-1">Archive Plan</button>
              <button onClick={() => setDeletePlanId(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

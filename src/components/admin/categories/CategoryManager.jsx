"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/admin/shared/Button";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import { Field, TextInput, Toggle, Select } from "@/components/admin/shared/Form";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconChevronRight,
  IconChevronDown,
  IconGrip,
  IconArrowUp,
  IconArrowDown,
  IconEye,
  IconEyeOff,
  IconCalendar,
} from "@/components/admin/shared/Icons";
import { repairCall } from "@/lib/repairAuthedApi";
import { revalidateStorefrontCategories } from "@/lib/categoryActions";

// Bust the cached storefront category nav after a category change so the
// storefront reflects it on the next refresh. Best-effort — never blocks or
// surfaces an error to the admin (the admin tree itself uses the uncached
// client transport and is already fresh).
function bustStorefrontNav() {
  Promise.resolve(revalidateStorefrontCategories()).catch(() => {});
}

const blankMajor = { id: null, name: "", visible: true, comingSoon: false };
const blankSub = { id: null, majorId: null, name: "", visible: true, comingSoon: false };

const MAJOR_ACCENT_COLORS = ["#1d4ed8", "#7c3aed", "#059669", "#d97706", "#0891b2", "#db2777"];

const ROW_BTN_COLORS = {
  default: "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151]",
  blue:    "text-[#1d4ed8] hover:bg-[#eff6ff]",
  indigo:  "text-[#4f46e5] hover:bg-[#eef2ff]",
  amber:   "text-[#d97706] hover:bg-[#fef3c7]",
  danger:  "text-[#dc2626] hover:bg-[#fef2f2]",
};

function normalize(tree) {
  const majors = [];
  const subs = [];
  (tree || []).forEach((m) => {
    const mid = Number(m.id);
    majors.push({
      id: mid,
      name: m.name,
      visible: m.is_visible,
      comingSoon: m.coming_soon === true,
      productCount: m.product_count ?? 0,
      order: m.sort_order ?? 0,
    });
    (m.sub_categories || []).forEach((s) => {
      subs.push({
        id: Number(s.id),
        majorId: mid,
        name: s.name,
        visible: s.is_visible,
        comingSoon: s.coming_soon === true,
        productCount: s.product_count ?? 0,
        order: s.sort_order ?? 0,
      });
    });
  });
  return { majors, subs };
}

export default function CategoryManager() {
  const [majors, setMajors] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);

  const fetchTree = useCallback(async () => {
    setError(null);
    try {
      const tree = await repairCall("myAppListCategoriesTree", { includeHidden: true }, { isQuery: true });
      const { majors: m, subs: s } = normalize(tree);
      setMajors(m);
      setSubs(s);
      setExpanded((prev) => (prev.size === 0 && m.length > 0 ? new Set([m[0].id]) : prev));
    } catch (err) {
      setError(err?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const subsByMajor = useMemo(() => {
    const map = new Map();
    subs.forEach((s) => {
      if (!map.has(s.majorId)) map.set(s.majorId, []);
      map.get(s.majorId).push(s);
    });
    map.forEach((arr) => arr.sort((a, b) => a.order - b.order));
    return map;
  }, [subs]);

  const sortedMajors = useMemo(() => [...majors].sort((a, b) => a.order - b.order), [majors]);

  function toggleExpand(id) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function reorderList(list, fromId, toId, pos) {
    const ids = list.map((x) => x.id);
    if (fromId === toId) return ids;
    const fromIdx = ids.indexOf(fromId);
    let toIdx = ids.indexOf(toId);
    if (fromIdx < 0 || toIdx < 0) return ids;
    const [moved] = ids.splice(fromIdx, 1);
    toIdx = ids.indexOf(toId);
    const insertAt = pos === "after" ? toIdx + 1 : toIdx;
    ids.splice(insertAt, 0, moved);
    return ids;
  }

  async function persistReorder(scope, orderedIds) {
    try {
      await repairCall("myAppAdminReorderCategories", { scope, orderedIds }, { isQuery: false });
      bustStorefrontNav();
      await fetchTree();
    } catch (err) {
      setError(err?.message || "Failed to reorder");
      await fetchTree();
    }
  }

  function moveMajor(id, dir) {
    const sorted = [...majors].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((m) => m.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const ids = sorted.map((m) => m.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const orderMap = new Map(ids.map((x, k) => [x, k]));
    setMajors((prev) => prev.map((m) => ({ ...m, order: orderMap.get(m.id) ?? m.order })));
    persistReorder("major", ids);
  }

  function moveSub(id, dir) {
    const target = subs.find((s) => s.id === id);
    if (!target) return;
    const siblings = subs.filter((s) => s.majorId === target.majorId).sort((a, b) => a.order - b.order);
    const i = siblings.findIndex((s) => s.id === id);
    const j = i + dir;
    if (j < 0 || j >= siblings.length) return;
    const ids = siblings.map((s) => s.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const orderMap = new Map(ids.map((x, k) => [x, k]));
    setSubs((prev) =>
      prev.map((s) => (s.majorId === target.majorId ? { ...s, order: orderMap.get(s.id) ?? s.order } : s))
    );
    persistReorder("sub", ids);
  }

  function findDropTarget(clientX, clientY, kind, majorId) {
    const selector =
      kind === "major"
        ? '[data-drop-kind="major"]'
        : `[data-drop-kind="sub"][data-major-id="${majorId}"]`;
    const nodes = document.querySelectorAll(selector);
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right) continue;
      if (clientY < rect.top || clientY > rect.bottom) continue;
      const pos = clientY < rect.top + rect.height / 2 ? "before" : "after";
      return { id: Number(node.getAttribute("data-row-id")), pos };
    }
    return null;
  }

  function onGripPointerDown(e, kind, id, majorId) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    dragRef.current = { kind, id, majorId, pointerId: e.pointerId, handle: e.currentTarget };
    setDrag({ kind, id, majorId, overId: id, overPos: "before" });
  }

  function onGripPointerMove(e) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const target = findDropTarget(e.clientX, e.clientY, d.kind, d.majorId);
    if (target) {
      setDrag((prev) =>
        prev && (prev.overId !== target.id || prev.overPos !== target.pos)
          ? { ...prev, overId: target.id, overPos: target.pos }
          : prev
      );
    }
  }

  function onGripPointerUp(e) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    try { d.handle?.releasePointerCapture(d.pointerId); } catch {}
    const target = findDropTarget(e.clientX, e.clientY, d.kind, d.majorId);
    if (target && target.id !== d.id) {
      if (d.kind === "major") {
        const sorted = [...majors].sort((a, b) => a.order - b.order);
        const orderedIds = reorderList(sorted, d.id, target.id, target.pos);
        const orderMap = new Map(orderedIds.map((x, i) => [x, i]));
        setMajors((prev) => prev.map((m) => ({ ...m, order: orderMap.get(m.id) ?? m.order })));
        persistReorder("major", orderedIds);
      } else {
        const siblings = subs.filter((s) => s.majorId === d.majorId).sort((a, b) => a.order - b.order);
        const orderedIds = reorderList(siblings, d.id, target.id, target.pos);
        const orderMap = new Map(orderedIds.map((x, i) => [x, i]));
        setSubs((prev) =>
          prev.map((s) => (s.majorId === d.majorId ? { ...s, order: orderMap.get(s.id) ?? s.order } : s))
        );
        persistReorder("sub", orderedIds);
      }
    }
    dragRef.current = null;
    setDrag(null);
  }

  function onGripPointerCancel(e) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    setDrag(null);
  }

  async function toggleVisibility(kind, id) {
    const current = kind === "major" ? majors.find((m) => m.id === id) : subs.find((s) => s.id === id);
    if (!current) return;
    const newVis = !current.visible;
    if (kind === "major") {
      setMajors((prev) => prev.map((m) => (m.id === id ? { ...m, visible: newVis } : m)));
      try {
        await repairCall("myAppAdminUpdateMajorCategory", { id: Number(id), is_visible: newVis }, { isQuery: false });
        bustStorefrontNav();
      } catch (err) {
        setMajors((prev) => prev.map((m) => (m.id === id ? { ...m, visible: !newVis } : m)));
        setError(err?.message || "Failed to update visibility");
      }
    } else {
      setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, visible: newVis } : s)));
      try {
        await repairCall("myAppAdminUpdateSubCategory", { id: Number(id), is_visible: newVis }, { isQuery: false });
        bustStorefrontNav();
      } catch (err) {
        setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, visible: !newVis } : s)));
        setError(err?.message || "Failed to update visibility");
      }
    }
  }

  async function toggleComingSoon(kind, id) {
    const current = kind === "major" ? majors.find((m) => m.id === id) : subs.find((s) => s.id === id);
    if (!current) return;
    const next = !current.comingSoon;
    const op = kind === "major" ? "myAppAdminUpdateMajorCategory" : "myAppAdminUpdateSubCategory";
    const setList = kind === "major" ? setMajors : setSubs;
    setList((prev) => prev.map((r) => (r.id === id ? { ...r, comingSoon: next } : r)));
    try {
      await repairCall(op, { id: Number(id), coming_soon: next }, { isQuery: false });
      bustStorefrontNav();
    } catch (err) {
      setList((prev) => prev.map((r) => (r.id === id ? { ...r, comingSoon: !next } : r)));
      setError(err?.message || "Failed to update coming-soon flag");
    }
  }

  async function saveEditing(values) {
    if (!editing) return;
    try {
      if (editing.kind === "major") {
        if (values.id) {
          await repairCall("myAppAdminUpdateMajorCategory", {
            id: Number(values.id), name: values.name, is_visible: values.visible, coming_soon: !!values.comingSoon,
          }, { isQuery: false });
        } else {
          await repairCall("myAppAdminCreateMajorCategory", {
            name: values.name, is_visible: values.visible, coming_soon: !!values.comingSoon, sort_order: majors.length,
          }, { isQuery: false });
        }
      } else {
        if (values.id) {
          await repairCall("myAppAdminUpdateSubCategory", {
            id: Number(values.id), major_category_id: Number(values.majorId), name: values.name, is_visible: values.visible, coming_soon: !!values.comingSoon,
          }, { isQuery: false });
        } else {
          const siblings = subs.filter((s) => s.majorId === values.majorId);
          await repairCall("myAppAdminCreateSubCategory", {
            major_category_id: Number(values.majorId), name: values.name, is_visible: values.visible, coming_soon: !!values.comingSoon, sort_order: siblings.length,
          }, { isQuery: false });
        }
      }
      setEditing(null);
      bustStorefrontNav();
      await fetchTree();
    } catch (err) {
      throw err;
    }
  }

  async function removeRow(kind, id) {
    try {
      if (kind === "major") {
        await repairCall("myAppAdminDeleteMajorCategory", { id: Number(id) }, { isQuery: false });
      } else {
        await repairCall("myAppAdminDeleteSubCategory", { id: Number(id) }, { isQuery: false });
      }
      setConfirm(null);
      bustStorefrontNav();
      await fetchTree();
    } catch (err) {
      setConfirm(null);
      setError(err?.message || "Failed to delete");
    }
  }

  const dragHandlers = {
    onPointerMove: onGripPointerMove,
    onPointerUp: onGripPointerUp,
    onPointerCancel: onGripPointerCancel,
  };

  if (loading) {
    return (
      <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-16">
        <div className="flex items-center gap-3">
          <div className="size-5 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
          <p className="font-body text-[13px] text-[#6b7280]">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <p className="font-body text-[13px] text-[#dc2626]">{error}</p>
        </div>
      )}

      <div className="rounded-[4px] border border-[#e5e7eb] bg-white" style={{ borderTop: "3px solid #1d4ed8" }}>
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3">
          <div>
            <p className="font-display text-[13px] font-bold uppercase tracking-[1.2px] text-[#11191f]">
              Category tree
            </p>
            <p className="font-body text-[11px] text-[#6b7280]">
              Drag the grip handle to reorder (mouse or touch), or use the arrows. Toggle visibility to hide a category from the storefront.
            </p>
          </div>
          <Button icon={<IconPlus />} onClick={() => setEditing({ kind: "major", row: blankMajor })}>
            New major
          </Button>
        </div>

        <ul>
          {sortedMajors.map((m, idx) => {
            const accentColor = MAJOR_ACCENT_COLORS[idx % MAJOR_ACCENT_COLORS.length];
            const open = expanded.has(m.id);
            const subList = subsByMajor.get(m.id) || [];
            const isDragging = drag?.kind === "major" && drag?.id === m.id;
            const showBefore =
              drag?.kind === "major" && drag?.overId === m.id && drag?.overPos === "before" && drag?.id !== m.id;
            const showAfter =
              drag?.kind === "major" && drag?.overId === m.id && drag?.overPos === "after" && drag?.id !== m.id;
            return (
              <li
                key={m.id}
                data-drop-kind="major"
                data-row-id={m.id}
                className="relative border-b border-[#f3f4f6] last:border-b-0"
                style={{ borderLeft: `4px solid ${accentColor}` }}
              >
                {showBefore ? (
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[#1d4ed8]" />
                ) : null}
                {showAfter ? (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[#1d4ed8]" />
                ) : null}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                  onClick={() => toggleExpand(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(m.id);
                    }
                  }}
                  className={
                    "flex cursor-pointer items-center gap-2 px-4 py-3 hover:bg-[#fafafa] " +
                    (isDragging ? "opacity-50" : "")
                  }
                >
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => onGripPointerDown(e, "major", m.id, null)}
                    {...dragHandlers}
                    className="grid size-5 cursor-grab touch-none place-items-center text-[#9ca3af] active:cursor-grabbing"
                  >
                    <IconGrip />
                  </span>
                  <span aria-hidden className="grid size-6 place-items-center">
                    <span className="grid size-4 place-items-center" style={{ color: accentColor }}>
                      {open ? <IconChevronDown /> : <IconChevronRight />}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[13px] font-semibold uppercase tracking-[1px] text-[#11191f]">
                        {m.name}
                      </span>
                      {!m.visible ? (
                        <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-[0.6px] text-[#92400e]">
                          Inactive
                        </span>
                      ) : m.comingSoon ? (
                        <span className="rounded-full bg-[#e0e7ff] px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-[0.6px] text-[#3730a3]">
                          Coming soon
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className="rounded-full px-2 py-0.5 font-body text-[10px] font-medium"
                        style={{ backgroundColor: accentColor + "18", color: accentColor }}
                      >
                        {m.productCount} products
                      </span>
                      <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 font-body text-[10px] font-medium text-[#6b7280]">
                        {subList.length} sub{subList.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <RowIconBtn variant="indigo" label="Move up" disabled={idx === 0} onClick={() => moveMajor(m.id, -1)}>
                      <IconArrowUp />
                    </RowIconBtn>
                    <RowIconBtn variant="indigo" label="Move down" disabled={idx === sortedMajors.length - 1} onClick={() => moveMajor(m.id, 1)}>
                      <IconArrowDown />
                    </RowIconBtn>
                    <RowIconBtn variant="amber" label={m.visible ? "Deactivate" : "Activate"} onClick={() => toggleVisibility("major", m.id)}>
                      {m.visible ? <IconEye /> : <IconEyeOff />}
                    </RowIconBtn>
                    <RowIconBtn
                      variant={m.comingSoon ? "indigo" : "default"}
                      label={m.comingSoon ? "Clear coming soon" : "Mark coming soon"}
                      onClick={() => toggleComingSoon("major", m.id)}
                    >
                      <IconCalendar />
                    </RowIconBtn>
                    <RowIconBtn variant="blue" label="Edit" onClick={() => setEditing({ kind: "major", row: m })}>
                      <IconEdit />
                    </RowIconBtn>
                    <RowIconBtn variant="danger" label="Delete" onClick={() => setConfirm({ kind: "major", id: m.id, name: m.name, subCount: subList.length })}>
                      <IconTrash />
                    </RowIconBtn>
                  </div>
                </div>

                {open ? (
                  <div className="bg-[#fafafa] px-4 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-body text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: accentColor }}>
                        Sub-categories
                      </p>
                      <Button size="sm" variant="accent" icon={<IconPlus />} onClick={() => setEditing({ kind: "sub", row: { ...blankSub, majorId: m.id } })}>
                        New sub
                      </Button>
                    </div>
                    {subList.length === 0 ? (
                      <p
                        className="rounded-[2px] border border-dashed bg-white px-3 py-4 text-center font-body text-[12px]"
                        style={{ borderColor: accentColor + "50", color: accentColor + "99" }}
                      >
                        No sub-categories yet.
                      </p>
                    ) : (
                      <ul className="overflow-hidden rounded-[2px] border border-[#e5e7eb] bg-white">
                        {subList.map((s, j) => {
                          const isSubDragging = drag?.kind === "sub" && drag?.id === s.id;
                          const subShowBefore =
                            drag?.kind === "sub" && drag?.majorId === m.id && drag?.overId === s.id && drag?.overPos === "before" && drag?.id !== s.id;
                          const subShowAfter =
                            drag?.kind === "sub" && drag?.majorId === m.id && drag?.overId === s.id && drag?.overPos === "after" && drag?.id !== s.id;
                          return (
                            <li
                              key={s.id}
                              data-drop-kind="sub"
                              data-row-id={s.id}
                              data-major-id={m.id}
                              className={
                                "relative flex items-center gap-2 border-b border-[#f3f4f6] px-3 py-2.5 last:border-b-0 hover:bg-[#fafafa] " +
                                (isSubDragging ? "opacity-50" : "")
                              }
                            >
                              {subShowBefore ? <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[#1d4ed8]" /> : null}
                              {subShowAfter ? <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[#1d4ed8]" /> : null}
                              <span
                                role="button"
                                tabIndex={-1}
                                aria-label="Drag to reorder"
                                title="Drag to reorder"
                                onPointerDown={(e) => onGripPointerDown(e, "sub", s.id, m.id)}
                                {...dragHandlers}
                                className="grid size-4 cursor-grab touch-none place-items-center text-[#9ca3af] active:cursor-grabbing"
                              >
                                <IconGrip />
                              </span>
                              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-body text-[13px] font-medium text-[#11191f]">{s.name}</span>
                                  {!s.visible ? (
                                    <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-[0.6px] text-[#92400e]">
                                      Inactive
                                    </span>
                                  ) : s.comingSoon ? (
                                    <span className="rounded-full bg-[#e0e7ff] px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-[0.6px] text-[#3730a3]">
                                      Coming soon
                                    </span>
                                  ) : null}
                                </div>
                                <span
                                  className="mt-0.5 inline-block rounded-full px-2 py-0.5 font-body text-[10px] font-medium"
                                  style={{ backgroundColor: accentColor + "12", color: accentColor }}
                                >
                                  {s.productCount} products
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <RowIconBtn variant="indigo" label="Move up" disabled={j === 0} onClick={() => moveSub(s.id, -1)}>
                                  <IconArrowUp />
                                </RowIconBtn>
                                <RowIconBtn variant="indigo" label="Move down" disabled={j === subList.length - 1} onClick={() => moveSub(s.id, 1)}>
                                  <IconArrowDown />
                                </RowIconBtn>
                                <RowIconBtn variant="amber" label={s.visible ? "Deactivate" : "Activate"} onClick={() => toggleVisibility("sub", s.id)}>
                                  {s.visible ? <IconEye /> : <IconEyeOff />}
                                </RowIconBtn>
                                <RowIconBtn
                                  variant={s.comingSoon ? "indigo" : "default"}
                                  label={s.comingSoon ? "Clear coming soon" : "Mark coming soon"}
                                  onClick={() => toggleComingSoon("sub", s.id)}
                                >
                                  <IconCalendar />
                                </RowIconBtn>
                                <RowIconBtn variant="blue" label="Edit" onClick={() => setEditing({ kind: "sub", row: s })}>
                                  <IconEdit />
                                </RowIconBtn>
                                <RowIconBtn variant="danger" label="Delete" onClick={() => setConfirm({ kind: "sub", id: s.id, name: s.name, subCount: 0 })}>
                                  <IconTrash />
                                </RowIconBtn>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <CategoryDrawer
        editing={editing}
        majors={majors}
        onClose={() => setEditing(null)}
        onSave={saveEditing}
      />

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete category"
        width={440}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="dangerSolid"
              onClick={() => {
                if (!confirm) return;
                removeRow(confirm.kind, confirm.id);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        {confirm ? (
          <div className="flex flex-col gap-2">
            <p className="font-body text-[13px] text-[#11191f]">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{confirm?.name}</span>?
              {confirm?.kind === "major" && confirm?.subCount > 0 ? (
                <span className="text-[#dc2626]">
                  {" "}
                  This will also remove {confirm.subCount} sub-categor{confirm.subCount === 1 ? "y" : "ies"}.
                </span>
              ) : null}
            </p>
            <p className="font-body text-[11px] text-[#6b7280]">This action cannot be undone.</p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function RowIconBtn({ label, children, onClick, disabled = false, variant = "default" }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={
        "grid size-8 place-items-center rounded-[2px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed " +
        (ROW_BTN_COLORS[variant] ?? ROW_BTN_COLORS.default)
      }
    >
      <span className="grid size-4 place-items-center">{children}</span>
    </button>
  );
}

function validateDraft(draft, kind) {
  const errs = {};
  if (!draft.name?.trim()) errs.name = "Name is required.";
  if (kind === "sub" && !draft.majorId) errs.majorId = "Parent major is required.";
  return errs;
}

function CategoryDrawer({ editing, majors, onClose, onSave }) {
  const open = !!editing;
  const [draft, setDraft] = useState({});
  const [errors, setErrors] = useState({});
  const [drawerError, setDrawerError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setDraft({ ...editing.row });
      setErrors({});
      setDrawerError(null);
    }
  }, [editing]);

  async function handleSave() {
    const errs = validateDraft(draft, editing?.kind);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    setDrawerError(null);
    try {
      await onSave(draft);
    } catch (err) {
      setDrawerError(err?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? (editing?.row?.id ? "Edit category" : "New category") : ""}
      subtitle={editing?.kind === "major" ? "Major category" : "Sub-category"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      {open && editing ? (
        <div className="flex flex-col gap-4">
          {drawerError && (
            <div className="rounded-[2px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2">
              <p className="font-body text-[12px] text-[#dc2626]">{drawerError}</p>
            </div>
          )}
          {editing?.kind === "sub" ? (
            <Field label="Parent major" required>
              <Select
                value={draft.majorId}
                onChange={(v) => {
                  setDraft((d) => ({ ...d, majorId: v }));
                  setErrors((e) => ({ ...e, majorId: "" }));
                }}
                placeholder="Select a major category"
                options={majors.map((m) => ({ value: m.id, label: m.name }))}
              />
              {errors.majorId ? (
                <span className="font-body text-[11px] text-[#dc2626]">{errors.majorId}</span>
              ) : null}
            </Field>
          ) : null}
          <Field label="Name" required>
            <TextInput
              value={draft.name || ""}
              onChange={(e) => {
                setDraft((d) => ({ ...d, name: e.target.value }));
                setErrors((e) => ({ ...e, name: "" }));
              }}
              placeholder="e.g. Hoodies"
              className={errors.name ? "border-[#dc2626] focus:border-[#dc2626]" : ""}
            />
            {errors.name ? (
              <span className="font-body text-[11px] text-[#dc2626]">{errors.name}</span>
            ) : null}
          </Field>
          <div className="flex items-center justify-between rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3">
            <div>
              <p className="font-body text-[13px] font-medium text-[#11191f]">
                Active
              </p>
              <p className="font-body text-[11px] text-[#6b7280]">
                When off, this category is hidden from the customer-facing site entirely.
              </p>
            </div>
            <Toggle
              checked={!!draft.visible}
              onChange={(v) => setDraft((d) => ({ ...d, visible: v }))}
            />
          </div>
          <div
            className="flex items-center justify-between rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3"
            style={{ opacity: draft.visible ? 1 : 0.5 }}
          >
            <div>
              <p className="font-body text-[13px] font-medium text-[#11191f]">
                Coming soon
              </p>
              <p className="font-body text-[11px] text-[#6b7280]">
                Active, but shown on the storefront as a &ldquo;coming soon&rdquo; teaser
                (not shoppable). Has no effect while inactive.
              </p>
            </div>
            <Toggle
              checked={!!draft.comingSoon}
              onChange={(v) => setDraft((d) => ({ ...d, comingSoon: v }))}
            />
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

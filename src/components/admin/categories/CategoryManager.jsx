"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
} from "@/components/admin/shared/Icons";
import { MAJOR_CATEGORIES, SUB_CATEGORIES } from "@/lib/mockAdmin";

const blankMajor = { id: null, name: "", visible: true };
const blankSub = { id: null, majorId: null, name: "", visible: true };

const MAJOR_ACCENT_COLORS = ["#1d4ed8", "#7c3aed", "#059669", "#d97706", "#0891b2", "#db2777"];

const ROW_BTN_COLORS = {
  default: "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151]",
  blue:    "text-[#1d4ed8] hover:bg-[#eff6ff]",
  indigo:  "text-[#4f46e5] hover:bg-[#eef2ff]",
  amber:   "text-[#d97706] hover:bg-[#fef3c7]",
  danger:  "text-[#dc2626] hover:bg-[#fef2f2]",
};

export default function CategoryManager() {
  const [majors, setMajors] = useState(MAJOR_CATEGORIES);
  const [subs, setSubs] = useState(SUB_CATEGORIES);
  const [expanded, setExpanded] = useState(() => new Set([MAJOR_CATEGORIES[0]?.id]));
  const [editing, setEditing] = useState(null); // { kind: "major"|"sub", row }
  const [confirm, setConfirm] = useState(null); // { kind: "major"|"sub", id, name, subCount }
  // Drag state: { kind: "major"|"sub", id, majorId?, overId, overPos: "before"|"after" }
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);

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
    if (fromId === toId) return list;
    const ids = list.map((x) => x.id);
    const fromIdx = ids.indexOf(fromId);
    let toIdx = ids.indexOf(toId);
    if (fromIdx < 0 || toIdx < 0) return list;
    const [moved] = ids.splice(fromIdx, 1);
    toIdx = ids.indexOf(toId);
    const insertAt = pos === "after" ? toIdx + 1 : toIdx;
    ids.splice(insertAt, 0, moved);
    const orderMap = new Map(ids.map((id, i) => [id, i + 1]));
    return list.map((x) => ({ ...x, order: orderMap.get(x.id) ?? x.order }));
  }

  function moveMajor(id, dir) {
    setMajors((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((m) => m.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return prev;
      const a = sorted[i];
      const b = sorted[j];
      return prev.map((m) => {
        if (m.id === a.id) return { ...m, order: b.order };
        if (m.id === b.id) return { ...m, order: a.order };
        return m;
      });
    });
  }

  function moveSub(id, dir) {
    setSubs((prev) => {
      const target = prev.find((s) => s.id === id);
      if (!target) return prev;
      const siblings = prev.filter((s) => s.majorId === target.majorId).sort((a, b) => a.order - b.order);
      const i = siblings.findIndex((s) => s.id === id);
      const j = i + dir;
      if (j < 0 || j >= siblings.length) return prev;
      const a = siblings[i];
      const b = siblings[j];
      return prev.map((s) => {
        if (s.id === a.id) return { ...s, order: b.order };
        if (s.id === b.id) return { ...s, order: a.order };
        return s;
      });
    });
  }

  // Pointer-based drag-and-drop (mouse + touch + pen)
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
      return { id: node.getAttribute("data-row-id"), pos };
    }
    return null;
  }

  function onGripPointerDown(e, kind, id, majorId) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
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
    try {
      d.handle?.releasePointerCapture(d.pointerId);
    } catch {}
    const target = findDropTarget(e.clientX, e.clientY, d.kind, d.majorId);
    if (target && target.id !== d.id) {
      if (d.kind === "major") {
        setMajors((prev) => {
          const sorted = [...prev].sort((a, b) => a.order - b.order);
          const reordered = reorderList(sorted, d.id, target.id, target.pos);
          const orderById = new Map(reordered.map((x) => [x.id, x.order]));
          return prev.map((m) => ({ ...m, order: orderById.get(m.id) ?? m.order }));
        });
      } else {
        setSubs((prev) => {
          const siblings = prev
            .filter((s) => s.majorId === d.majorId)
            .sort((a, b) => a.order - b.order);
          const reordered = reorderList(siblings, d.id, target.id, target.pos);
          const orderById = new Map(reordered.map((x) => [x.id, x.order]));
          return prev.map((s) =>
            s.majorId === d.majorId ? { ...s, order: orderById.get(s.id) ?? s.order } : s
          );
        });
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

  function toggleVisibility(kind, id) {
    if (kind === "major") {
      setMajors((prev) => prev.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m)));
    } else {
      setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
    }
  }

  function saveEditing(values) {
    if (!editing) return;
    if (editing.kind === "major") {
      if (values.id) {
        setMajors((prev) => prev.map((m) => (m.id === values.id ? { ...m, ...values } : m)));
      } else {
        const id = `mc-${Date.now()}`;
        setMajors((prev) => [
          ...prev,
          { ...values, id, productCount: 0, order: prev.length + 1 },
        ]);
      }
    } else {
      if (values.id) {
        setSubs((prev) => prev.map((s) => (s.id === values.id ? { ...s, ...values } : s)));
      } else {
        const id = `sc-${Date.now()}`;
        const siblings = subs.filter((s) => s.majorId === values.majorId);
        setSubs((prev) => [
          ...prev,
          { ...values, id, productCount: 0, order: siblings.length + 1 },
        ]);
      }
    }
    setEditing(null);
  }

  function removeRow(kind, id) {
    if (kind === "major") {
      setMajors((prev) => prev.filter((m) => m.id !== id));
      setSubs((prev) => prev.filter((s) => s.majorId !== id));
    } else {
      setSubs((prev) => prev.filter((s) => s.id !== id));
    }
  }

  const dragHandlers = {
    onPointerMove: onGripPointerMove,
    onPointerUp: onGripPointerUp,
    onPointerCancel: onGripPointerCancel,
  };

  return (
    <>
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
                  <span
                    aria-hidden
                    className="grid size-6 place-items-center"
                  >
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
                          Hidden
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
                    <RowIconBtn
                      variant="indigo"
                      label="Move down"
                      disabled={idx === sortedMajors.length - 1}
                      onClick={() => moveMajor(m.id, 1)}
                    >
                      <IconArrowDown />
                    </RowIconBtn>
                    <RowIconBtn
                      variant="amber"
                      label={m.visible ? "Hide" : "Show"}
                      onClick={() => toggleVisibility("major", m.id)}
                    >
                      {m.visible ? <IconEye /> : <IconEyeOff />}
                    </RowIconBtn>
                    <RowIconBtn variant="blue" label="Edit" onClick={() => setEditing({ kind: "major", row: m })}>
                      <IconEdit />
                    </RowIconBtn>
                    <RowIconBtn
                      variant="danger"
                      label="Delete"
                      onClick={() =>
                        setConfirm({ kind: "major", id: m.id, name: m.name, subCount: subList.length })
                      }
                    >
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
                      <Button
                        size="sm"
                        variant="accent"
                        icon={<IconPlus />}
                        onClick={() =>
                          setEditing({ kind: "sub", row: { ...blankSub, majorId: m.id } })
                        }
                      >
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
                            drag?.kind === "sub" &&
                            drag?.majorId === m.id &&
                            drag?.overId === s.id &&
                            drag?.overPos === "before" &&
                            drag?.id !== s.id;
                          const subShowAfter =
                            drag?.kind === "sub" &&
                            drag?.majorId === m.id &&
                            drag?.overId === s.id &&
                            drag?.overPos === "after" &&
                            drag?.id !== s.id;
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
                              {subShowBefore ? (
                                <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[#1d4ed8]" />
                              ) : null}
                              {subShowAfter ? (
                                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[#1d4ed8]" />
                              ) : null}
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
                              <span
                                aria-hidden
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: accentColor }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-body text-[13px] font-medium text-[#11191f]">
                                    {s.name}
                                  </span>
                                  {!s.visible ? (
                                    <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-[0.6px] text-[#92400e]">
                                      Hidden
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
                                <RowIconBtn
                                  variant="indigo"
                                  label="Move down"
                                  disabled={j === subList.length - 1}
                                  onClick={() => moveSub(s.id, 1)}
                                >
                                  <IconArrowDown />
                                </RowIconBtn>
                                <RowIconBtn
                                  variant="amber"
                                  label={s.visible ? "Hide" : "Show"}
                                  onClick={() => toggleVisibility("sub", s.id)}
                                >
                                  {s.visible ? <IconEye /> : <IconEyeOff />}
                                </RowIconBtn>
                                <RowIconBtn
                                  variant="blue"
                                  label="Edit"
                                  onClick={() => setEditing({ kind: "sub", row: s })}
                                >
                                  <IconEdit />
                                </RowIconBtn>
                                <RowIconBtn
                                  variant="danger"
                                  label="Delete"
                                  onClick={() =>
                                    setConfirm({ kind: "sub", id: s.id, name: s.name, subCount: 0 })
                                  }
                                >
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
                setConfirm(null);
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

  useEffect(() => {
    if (editing) {
      setDraft({ ...editing.row });
      setErrors({});
    }
  }, [editing]);

  function handleSave() {
    const errs = validateDraft(draft, editing?.kind);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSave(draft);
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
          <Button onClick={handleSave}>Save</Button>
        </>
      }
    >
      {open && editing ? (
        <div className="flex flex-col gap-4">
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
                Visible on storefront
              </p>
              <p className="font-body text-[11px] text-[#6b7280]">
                When off, this category is hidden from the customer-facing site.
              </p>
            </div>
            <Toggle
              checked={!!draft.visible}
              onChange={(v) => setDraft((d) => ({ ...d, visible: v }))}
            />
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

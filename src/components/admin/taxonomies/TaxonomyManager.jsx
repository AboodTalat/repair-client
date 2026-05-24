"use client";

import Link from "next/link";
import { useState } from "react";
import Button, { IconButton } from "@/components/admin/shared/Button";
import { TextInput } from "@/components/admin/shared/Form";
import { IconPlus, IconEdit, IconTrash, IconCheck, IconClose } from "@/components/admin/shared/Icons";
import { MATERIALS, SUB_CATEGORIES, MAJOR_CATEGORIES } from "@/lib/mockAdmin";

// Generic two-column "list of named tags" editor — used for Materials.
// Product Type is intentionally NOT a separate list anymore; it's the
// product's sub-category (see the read-only panel below).
function TaxonomyList({ title, description, initial, idPrefix }) {
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [error, setError] = useState("");

  function add() {
    const name = adding.trim();
    if (!name) {
      setError("Enter a name.");
      return;
    }
    if (items.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      setError("Already exists.");
      return;
    }
    setItems((arr) => [...arr, { id: `${idPrefix}-${Date.now()}`, name }]);
    setAdding("");
    setError("");
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditingValue(item.name);
    setError("");
  }

  function commitEdit() {
    const name = editingValue.trim();
    if (!name) {
      setError("Name can't be empty.");
      return;
    }
    setItems((arr) => arr.map((i) => (i.id === editingId ? { ...i, name } : i)));
    setEditingId(null);
    setEditingValue("");
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingValue("");
    setError("");
  }

  function remove(id) {
    setItems((arr) => arr.filter((i) => i.id !== id));
  }

  return (
    <section className="rounded-[4px] border border-[#e5e7eb] bg-white p-5">
      <p className="font-display text-[14px] font-bold uppercase tracking-[1px] text-[#11191f]">
        {title}
      </p>
      <p className="mt-1 font-body text-[12px] text-[#6b7280]">{description}</p>

      <div className="mt-4 flex flex-col gap-2">
        {items.map((item) => {
          const isEditing = editingId === item.id;
          return (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-[2px] border border-[#f3f4f6] bg-[#fafafa] px-3 py-2"
            >
              {isEditing ? (
                <>
                  <TextInput
                    value={editingValue}
                    autoFocus
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="!h-8"
                  />
                  <IconButton label="Save" onClick={commitEdit}>
                    <IconCheck />
                  </IconButton>
                  <IconButton label="Cancel" onClick={cancelEdit}>
                    <IconClose />
                  </IconButton>
                </>
              ) : (
                <>
                  <span className="flex-1 font-body text-[13px] text-[#11191f]">
                    {item.name}
                  </span>
                  <IconButton label="Edit" onClick={() => startEdit(item)}>
                    <IconEdit />
                  </IconButton>
                  <IconButton label="Delete" onClick={() => remove(item.id)}>
                    <IconTrash />
                  </IconButton>
                </>
              )}
            </div>
          );
        })}
        {items.length === 0 ? (
          <p className="font-body text-[12px] text-[#6b7280]">
            No entries yet — add one below.
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-[#f3f4f6] pt-4">
        <TextInput
          value={adding}
          onChange={(e) => { setAdding(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder={`Add a new ${title.toLowerCase().replace(/s$/, "")}…`}
          className="!h-9"
        />
        <Button size="sm" onClick={add} icon={<IconPlus />}>
          Add
        </Button>
      </div>
      {error ? (
        <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
      ) : null}
    </section>
  );
}

// Read-only panel listing the sub-categories — they act as the product
// "type" facet on the storefront. Editing happens in Categories.
function SubCategoryTypesPanel() {
  // Group sub-categories by major-category name for readability.
  const byMajor = new Map();
  for (const m of MAJOR_CATEGORIES) byMajor.set(m.id, { major: m, subs: [] });
  for (const s of SUB_CATEGORIES) {
    const bucket = byMajor.get(s.majorId);
    if (bucket) bucket.subs.push(s);
  }

  return (
    <section className="rounded-[4px] border border-[#e5e7eb] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[14px] font-bold uppercase tracking-[1px] text-[#11191f]">
            Product Types
          </p>
          <p className="mt-1 font-body text-[12px] text-[#6b7280]">
            Customer-facing &ldquo;type&rdquo; is the product&rsquo;s sub-category — manage them on the Categories page so they stay in sync with the navigation tree.
          </p>
        </div>
        <Link
          href="/r3pr-console/categories"
          className="inline-flex h-9 items-center justify-center rounded-[2px] border border-[#e5e7eb] bg-white px-3 font-display text-[12px] font-semibold uppercase tracking-[1px] text-[#11191f] hover:bg-[#f3f4f6]"
        >
          Edit in Categories
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {[...byMajor.values()].map(({ major, subs }) => (
          <div key={major.id} className="rounded-[2px] border border-[#f3f4f6] bg-[#fafafa] p-3">
            <p className="mb-2 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#11191f]">
              {major.name}
            </p>
            {subs.length === 0 ? (
              <p className="font-body text-[11px] text-[#6b7280]">No sub-categories yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {subs.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex h-6 items-center rounded-full border border-[#e5e7eb] bg-white px-2.5 font-body text-[12px] text-[#11191f]"
                    style={{ opacity: s.visible === false ? 0.5 : 1 }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function TaxonomyManager() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <TaxonomyList
        title="Materials"
        description="Fabric materials customers can filter by on /shop. Tag each product with one or more on the product Details tab."
        initial={MATERIALS}
        idPrefix="mat"
      />
      <SubCategoryTypesPanel />
    </div>
  );
}

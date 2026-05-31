"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Button, { IconButton } from "@/components/admin/shared/Button";
import { TextInput } from "@/components/admin/shared/Form";
import { IconPlus, IconEdit, IconTrash, IconCheck, IconClose } from "@/components/admin/shared/Icons";
import { repairCall } from "@/lib/repairAuthedApi";

function MaterialsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [error, setError] = useState("");

  const fetchMaterials = useCallback(async () => {
    try {
      const data = await repairCall("myAppListMaterials", {}, { isQuery: true });
      setItems((data.items || []).map((m) => ({ id: Number(m.id), name: m.name })));
    } catch (err) {
      setError(err?.message || "Failed to load materials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  async function add() {
    const name = adding.trim();
    if (!name) { setError("Enter a name."); return; }
    setError("");
    try {
      await repairCall("myAppAdminCreateMaterial", { name, sort_order: items.length }, { isQuery: false });
      setAdding("");
      await fetchMaterials();
    } catch (err) {
      const msg = err?.message || "";
      setError(msg.toLowerCase().includes("already exists") ? "This material already exists." : msg || "Failed to add material.");
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditingValue(item.name);
    setError("");
  }

  async function commitEdit() {
    const name = editingValue.trim();
    if (!name) { setError("Name can't be empty."); return; }
    setError("");
    try {
      await repairCall("myAppAdminUpdateMaterial", { id: editingId, name }, { isQuery: false });
      setEditingId(null);
      setEditingValue("");
      await fetchMaterials();
    } catch (err) {
      const msg = err?.message || "";
      setError(msg.toLowerCase().includes("already exists") ? "This material already exists." : msg || "Failed to update material.");
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingValue("");
    setError("");
  }

  async function remove(id) {
    setError("");
    try {
      await repairCall("myAppAdminDeleteMaterial", { id }, { isQuery: false });
      await fetchMaterials();
    } catch (err) {
      setError(err?.message || "Failed to delete material.");
    }
  }

  return (
    <section className="rounded-[4px] border border-[#e5e7eb] bg-white p-5">
      <p className="font-display text-[14px] font-bold uppercase tracking-[1px] text-[#11191f]">
        Materials
      </p>
      <p className="mt-1 font-body text-[12px] text-[#6b7280]">
        Fabric materials customers can filter by on /shop. Tag each product with one or more on the product Details tab.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <div className="size-4 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
            <span className="font-body text-[12px] text-[#6b7280]">Loading...</span>
          </div>
        ) : items.length === 0 ? (
          <p className="font-body text-[12px] text-[#6b7280]">
            No entries yet — add one below.
          </p>
        ) : (
          items.map((item) => {
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
          })
        )}
      </div>

      {!loading && (
        <div className="mt-4 flex items-center gap-2 border-t border-[#f3f4f6] pt-4">
          <TextInput
            value={adding}
            onChange={(e) => { setAdding(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder="Add a new material…"
            className="!h-9"
          />
          <Button size="sm" onClick={add} icon={<IconPlus />}>
            Add
          </Button>
        </div>
      )}
      {error ? (
        <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
      ) : null}
    </section>
  );
}

function SubCategoryTypesPanel() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await repairCall("myAppListCategoriesTree", { includeHidden: true }, { isQuery: true });
        setTree(
          (data || []).map((m) => ({
            id: Number(m.id),
            name: m.name,
            subs: (m.sub_categories || []).map((s) => ({
              id: Number(s.id),
              name: s.name,
              visible: s.is_visible,
            })),
          }))
        );
      } catch (err) {
        setError(err?.message || "Failed to load categories");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <div className="size-4 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
            <span className="font-body text-[12px] text-[#6b7280]">Loading...</span>
          </div>
        ) : error ? (
          <p className="font-body text-[12px] text-[#dc2626]">{error}</p>
        ) : tree.length === 0 ? (
          <p className="font-body text-[12px] text-[#6b7280]">No categories yet.</p>
        ) : (
          tree.map(({ id, name, subs }) => (
            <div key={id} className="rounded-[2px] border border-[#f3f4f6] bg-[#fafafa] p-3">
              <p className="mb-2 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#11191f]">
                {name}
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
          ))
        )}
      </div>
    </section>
  );
}

export default function TaxonomyManager() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <MaterialsList />
      <SubCategoryTypesPanel />
    </div>
  );
}

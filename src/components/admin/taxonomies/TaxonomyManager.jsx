"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Button, { IconButton } from "@/components/admin/shared/Button";
import { TextInput } from "@/components/admin/shared/Form";
import { IconPlus, IconEdit, IconTrash, IconCheck, IconClose } from "@/components/admin/shared/Icons";
import { repairCall } from "@/lib/repairAuthedApi";
import { revalidateStorefrontProducts } from "@/lib/productActions";

// Materials are a storefront filter-drawer facet (`myAppListMaterials` is part
// of the cached `fetchShopFacets()` bundle), so an add / rename / delete here
// has to bust the storefront cache — otherwise the drawer keeps showing the old
// material list for the rest of the ISR window no matter how often the shopper
// refreshes. Best-effort; never blocks or surfaces an error to the admin.
// Same helper the admin Products page uses.
function bustStorefrontFacets() {
  Promise.resolve(revalidateStorefrontProducts()).catch(() => {});
}

// repairCall throws with a message shaped like "repairClientApi <op>: <server
// message>". Strip the prefix so the admin sees the server's human-readable
// reason. Mirrors cleanErr() in CategoryManager.jsx / ProductManager.jsx.
function cleanErr(e, fallback) {
  const m = (e?.message || "").replace(/^repairClientApi \S+:\s*/, "");
  return m || fallback;
}

// Mirrors TAXONOMY_NAME_MAX in the backend taxonomies.ts (and the
// materials.name VARCHAR(100) column).
const MATERIAL_NAME_MAX = 100;

function MaterialsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [error, setError] = useState("");
  // A material still attached to a product cannot be deleted (the FK would
  // CASCADE and silently untag every one of them). The server enforces it; this
  // holds the pending target so the modal can refuse before the round-trip.
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // `?.` deliberately — the React Compiler can evaluate this while the state is
  // still null (see the ternary note in repair/CLAUDE.md).
  const blockedByUsage = (confirmDelete?.productCount ?? 0) > 0;

  const fetchMaterials = useCallback(async () => {
    try {
      // includeUsage is admin-gated server-side and drives the "used by N
      // products" line in the delete confirmation. Public callers (the /shop
      // filter drawer) don't pass it and don't pay for the count.
      const data = await repairCall("myAppListMaterials", { includeUsage: true }, { isQuery: true });
      setItems(
        (data.items || []).map((m) => ({
          id: Number(m.id),
          name: m.name,
          productCount: Number(m.product_count) || 0,
        }))
      );
    } catch (err) {
      setError(cleanErr(err, "Failed to load materials"));
    } finally {
      setLoading(false);
    }
  }, []);

  // Inlined as an async IIFE rather than calling fetchMaterials() directly:
  // the lint rule traces setState calls through a named function reference and
  // flags them as synchronous-in-effect. Matches the SubCategoryTypesPanel
  // effect below, which lints clean for the same reason. Deliberately NO
  // run-once ref guard — pairing one with a `cancelled` flag deadlocks under
  // Strict Mode (see the convention note in repair/CLAUDE.md).
  useEffect(() => {
    (async () => {
      await fetchMaterials();
    })();
  }, [fetchMaterials]);

  async function add() {
    const name = adding.trim();
    if (!name) { setError("Enter a name."); return; }
    // Mirrors the server rule: a comma would be split by the storefront's CSV
    // filter parser, so the material could never be selected on /shop.
    if (name.includes(",")) {
      setError("A material name can't contain a comma — the storefront filter uses commas to separate values.");
      return;
    }
    setError("");
    try {
      await repairCall("myAppAdminCreateMaterial", { name, sort_order: items.length }, { isQuery: false });
      setAdding("");
      bustStorefrontFacets();
      await fetchMaterials();
    } catch (err) {
      const msg = cleanErr(err, "Failed to add material.");
      setError(msg.toLowerCase().includes("already exists") ? "This material already exists." : msg);
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
    if (name.includes(",")) {
      setError("A material name can't contain a comma — the storefront filter uses commas to separate values.");
      return;
    }
    setError("");
    try {
      await repairCall("myAppAdminUpdateMaterial", { id: editingId, name }, { isQuery: false });
      setEditingId(null);
      setEditingValue("");
      bustStorefrontFacets();
      await fetchMaterials();
    } catch (err) {
      const msg = cleanErr(err, "Failed to update material.");
      setError(msg.toLowerCase().includes("already exists") ? "This material already exists." : msg);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingValue("");
    setError("");
  }

  async function confirmRemove() {
    if (!confirmDelete) return;
    setError("");
    setDeleting(true);
    try {
      await repairCall("myAppAdminDeleteMaterial", { id: confirmDelete.id }, { isQuery: false });
      setConfirmDelete(null);
      bustStorefrontFacets();
      await fetchMaterials();
    } catch (err) {
      setError(cleanErr(err, "Failed to delete material."));
    } finally {
      setDeleting(false);
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
                      maxLength={MATERIAL_NAME_MAX}
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
                    {/* Usage is shown inline so the cost of a delete is
                        visible before the admin reaches for the bin icon. */}
                    <span className="shrink-0 font-body text-[11px] text-[#6b7280]">
                      {item.productCount === 1
                        ? "1 product"
                        : `${item.productCount} products`}
                    </span>
                    <IconButton label="Edit" onClick={() => startEdit(item)}>
                      <IconEdit />
                    </IconButton>
                    <IconButton label="Delete" onClick={() => setConfirmDelete(item)}>
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
            maxLength={MATERIAL_NAME_MAX}
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

      {/* Delete confirmation. This action cascades through product_materials
          and cannot be undone, so it states the blast radius explicitly rather
          than asking a generic "are you sure?". */}
      {confirmDelete ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-material-title"
          onClick={() => { if (!deleting) setConfirmDelete(null); }}
        >
          <div
            className="w-full max-w-[420px] rounded-[4px] border border-[#e5e7eb] bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="delete-material-title"
              className="font-display text-[14px] font-bold uppercase tracking-[1px] text-[#11191f]"
            >
              Delete “{confirmDelete?.name}”?
            </p>
            {/* `?.` on EVERY access, not just the guard: the React Compiler can
                pre-evaluate both ternary branches, so a "clearly guarded"
                access still throws when the state is null. Same bite that hit
                CategoryManager on initial render — see repair/CLAUDE.md. */}
            {blockedByUsage ? (
              // Refused up front. The server enforces this too — this branch
              // just avoids making the admin click Delete to be told no.
              <p className="mt-2 font-body text-[13px] text-[#6b7280]">
                <span className="font-medium text-[#11191f]">
                  {confirmDelete?.productCount}{" "}
                  {confirmDelete?.productCount === 1 ? "product uses" : "products use"}
                </span>{" "}
                this material, so it can&rsquo;t be deleted. Remove it from{" "}
                {confirmDelete?.productCount === 1 ? "that product" : "those products"}{" "}
                first — open the product editor, Details tab, Materials.
              </p>
            ) : (
              <p className="mt-2 font-body text-[13px] text-[#6b7280]">
                No products use this material. It will be removed from the /shop
                filter drawer. This can&rsquo;t be undone.
              </p>
            )}
            {/* A failed delete leaves the modal open, and the section's error
                line renders BEHIND this backdrop — so it has to be repeated
                here or the modal just looks unresponsive. */}
            {error ? (
              <p className="mt-3 font-body text-[12px] text-[#dc2626]">{error}</p>
            ) : null}
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                {blockedByUsage ? "Close" : "Cancel"}
              </Button>
              {blockedByUsage ? null : (
                <Button
                  size="sm"
                  variant="dangerSolid"
                  onClick={confirmRemove}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete material"}
                </Button>
              )}
            </div>
          </div>
        </div>
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

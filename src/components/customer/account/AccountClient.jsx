"use client";

import { useEffect, useState } from "react";
import {
  MobilePersonalInformationCard,
  DesktopPersonalInformationCard,
} from "./PersonalInformationCard";
import {
  MobilePaymentMethodsCard,
  DesktopPaymentMethodsCard,
} from "./PaymentMethodsCard";
import {
  MobileAddressInformationCard,
  DesktopAddressInformationCard,
} from "./AddressInformationCard";
import AddCardDrawer from "./AddCardDrawer";
import AddAddressDrawer from "./AddAddressDrawer";
import EditProfileDrawer from "./EditProfileDrawer";
import AddressAddedBanner from "./AddressAddedBanner";
import AddressDeletedBanner from "./AddressDeletedBanner";
import CardAddedBanner from "./CardAddedBanner";
import CardDeletedBanner from "./CardDeletedBanner";
import CannotDeleteDefaultBanner from "./CannotDeleteDefaultBanner";
import DeleteCardDrawer from "./DeleteCardDrawer";
import DeleteAddressDrawer from "./DeleteAddressDrawer";
import { useAddresses } from "@/lib/useAddresses";
import { repairCall } from "@/lib/repairAuthedApi";
import { useRepairStore, selectUser, selectPaymentCards } from "@/lib/useRepairStore";

// /account hub — wired to the repair sub-server:
//   • Personal Information — read-only, from myAppGetMyProfile (email + phone;
//     there is no self-service profile-edit resolver and no DOB column, so the
//     card is display-only and DOB shows "—").
//   • Addresses — full CRUD against addresses.ts via the useAddresses hook
//     (myAppGetMyAddresses / Add / Update / Delete; default toggle = partial
//     myAppUpdateAddress { is_default }). Single-default invariant is enforced
//     server-side.
//   • Payment Methods — the client-side `paymentCards` store slice (the SAME
//     cards the /checkout/payment page uses). There is no payment-methods
//     backend yet (Stripe-managed vs. local PCI table is an open decision), so
//     these persist client-side only — never a full PAN / CVC.

export default function AccountClient() {
  const storeUser = useRepairStore(selectUser);
  const cards = useRepairStore(selectPaymentCards);
  const {
    addresses,
    loading: addressesLoading,
    error: addressLoadError,
    saveAddress,
    deleteAddress,
    setDefault,
  } = useAddresses();

  // Profile (email + phone). RoleGuard(requireAuth) already waited for store
  // hydration before this mounts, so we can fetch immediately. setState lives in
  // the async callback (not the effect body), so no set-state-in-effect.
  const [profileData, setProfileData] = useState(null);
  useEffect(() => {
    let active = true;
    repairCall("myAppGetMyProfile", {}, { isQuery: true })
      .then((d) => {
        if (active) setProfileData(d?.profile ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Raw profile values — the card derives the display (splits the dial code out
  // of the E.164 phone, formats the birth date). Phone + DOB are editable via
  // the EditProfileDrawer → myAppUpdateMyProfile; email stays read-only.
  const profile = {
    email: profileData?.email || storeUser?.email || "",
    phone: profileData?.phone ?? null,
    dateOfBirth: profileData?.date_of_birth ?? null,
  };

  // Drawer / toast state.
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileSavedVisible, setProfileSavedVisible] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [addAddressOpen, setAddAddressOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeleteAddressId, setPendingDeleteAddressId] = useState(null);
  // `cannotDeleteKind` doubles as visibility — null hides; "card"/"address"
  // swap the banner copy and force a fresh slide-in.
  const [cannotDeleteKind, setCannotDeleteKind] = useState(null);
  const [cardAddedVisible, setCardAddedVisible] = useState(false);
  const [cardDeletedVisible, setCardDeletedVisible] = useState(false);
  const [addressAddedVisible, setAddressAddedVisible] = useState(false);
  const [addressDeletedVisible, setAddressDeletedVisible] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Auto-dismiss the "profile updated" toast.
  useEffect(() => {
    if (!profileSavedVisible) return undefined;
    const t = setTimeout(() => setProfileSavedVisible(false), 3000);
    return () => clearTimeout(t);
  }, [profileSavedVisible]);

  // ── Profile (server-backed: phone + date of birth) ─────────────────────────
  async function handleSaveProfile(fields) {
    setEditProfileOpen(false);
    try {
      const res = await repairCall("myAppUpdateMyProfile", fields, { isQuery: false });
      if (res?.profile) setProfileData(res.profile);
      setProfileSavedVisible(false);
      requestAnimationFrame(() => setProfileSavedVisible(true));
    } catch (e) {
      showError(e, "Couldn't update your profile.");
    }
  }

  // ── Payment methods (client-side store slice) ──────────────────────────────
  function addPaymentMethod(card) {
    useRepairStore.getState().addPaymentCard(card);
    setCardAddedVisible(false);
    requestAnimationFrame(() => setCardAddedVisible(true));
  }

  function requestDeletePayment(id) {
    const row = cards.find((r) => r.id === id);
    if (!row) return;
    if (row.isDefault) {
      setCannotDeleteKind(null);
      requestAnimationFrame(() => setCannotDeleteKind("card"));
      return;
    }
    setPendingDeleteId(id);
  }

  function removePaymentMethod(id) {
    useRepairStore.getState().removePaymentCard(id);
    setCardDeletedVisible(false);
    requestAnimationFrame(() => setCardDeletedVisible(true));
  }

  function togglePaymentDefault(id) {
    useRepairStore.getState().setDefaultPaymentCard(id);
  }

  // ── Addresses (server-backed) ──────────────────────────────────────────────
  async function handleSaveAddress(fields) {
    const isEdit = editingAddressId != null;
    const editId = editingAddressId;
    // The drawer closes itself on submit; reset our open state too.
    setAddAddressOpen(false);
    setEditingAddressId(null);
    try {
      await saveAddress(fields, isEdit ? { id: editId } : {});
      if (!isEdit) {
        setAddressAddedVisible(false);
        requestAnimationFrame(() => setAddressAddedVisible(true));
      }
    } catch (e) {
      showError(e, "Couldn't save the address.");
    }
  }

  function requestDeleteAddress(id) {
    const row = addresses.find((r) => r.id === id);
    if (!row) return;
    if (row.isDefault) {
      setCannotDeleteKind(null);
      requestAnimationFrame(() => setCannotDeleteKind("address"));
      return;
    }
    setPendingDeleteAddressId(id);
  }

  async function removeAddress(id) {
    setPendingDeleteAddressId(null);
    try {
      await deleteAddress(id);
      setAddressDeletedVisible(false);
      requestAnimationFrame(() => setAddressDeletedVisible(true));
    } catch (e) {
      showError(e, "Couldn't delete the address.");
    }
  }

  async function toggleAddressDefault(id) {
    const row = addresses.find((r) => r.id === id);
    try {
      await setDefault(id, !row?.isDefault);
    } catch (e) {
      showError(e, "Couldn't update the default address.");
    }
  }

  function showError(e, fallback) {
    const msg = String(e?.message || "").replace(/^repairClientApi \S+:\s*/, "");
    setActionError(msg || fallback);
  }

  const pendingDeleteAddress =
    pendingDeleteAddressId != null
      ? addresses.find((a) => a.id === pendingDeleteAddressId) ?? null
      : null;
  const pendingDeleteMethod =
    pendingDeleteId != null ? cards.find((m) => m.id === pendingDeleteId) ?? null : null;
  const editingAddress =
    editingAddressId != null ? addresses.find((a) => a.id === editingAddressId) ?? null : null;

  return (
    <>
      {/* Mobile */}
      <div className="flex w-full flex-col gap-4 md:hidden">
        <MobilePersonalInformationCard profile={profile} onEdit={() => setEditProfileOpen(true)} />
        <MobilePaymentMethodsCard
          methods={cards}
          onToggleDefault={togglePaymentDefault}
          onAdd={() => setAddCardOpen(true)}
          onDelete={requestDeletePayment}
        />
        <MobileAddressInformationCard
          addresses={addresses}
          onToggleDefault={toggleAddressDefault}
          onAdd={() => setAddAddressOpen(true)}
          onEdit={(id) => setEditingAddressId(id)}
          onDelete={requestDeleteAddress}
        />
      </div>

      {/* Desktop */}
      <div className="hidden w-full flex-col gap-8 md:flex">
        <DesktopPersonalInformationCard profile={profile} onEdit={() => setEditProfileOpen(true)} />
        <DesktopPaymentMethodsCard
          methods={cards}
          onToggleDefault={togglePaymentDefault}
          onAdd={() => setAddCardOpen(true)}
          onDelete={requestDeletePayment}
        />
        <DesktopAddressInformationCard
          addresses={addresses}
          onToggleDefault={toggleAddressDefault}
          onAdd={() => setAddAddressOpen(true)}
          onEdit={(id) => setEditingAddressId(id)}
          onDelete={requestDeleteAddress}
        />
      </div>

      {/* Address load error (non-blocking) */}
      {addressLoadError && !addressesLoading ? (
        <p className="mt-4 font-body text-[13px] text-[#b91c1c]">{addressLoadError}</p>
      ) : null}

      <EditProfileDrawer
        open={editProfileOpen}
        email={profile.email}
        initialPhone={profile.phone || ""}
        initialDob={profile.dateOfBirth || ""}
        onClose={() => setEditProfileOpen(false)}
        onSubmit={handleSaveProfile}
      />

      <AddCardDrawer
        open={addCardOpen}
        onClose={() => setAddCardOpen(false)}
        onSubmit={addPaymentMethod}
      />

      <AddAddressDrawer
        open={addAddressOpen || editingAddressId != null}
        initial={editingAddress}
        onClose={() => {
          setAddAddressOpen(false);
          setEditingAddressId(null);
        }}
        onSubmit={handleSaveAddress}
      />

      <CardAddedBanner visible={cardAddedVisible} onDismiss={() => setCardAddedVisible(false)} />
      <AddressAddedBanner visible={addressAddedVisible} onDismiss={() => setAddressAddedVisible(false)} />
      <AddressDeletedBanner visible={addressDeletedVisible} onDismiss={() => setAddressDeletedVisible(false)} />
      <CannotDeleteDefaultBanner
        visible={cannotDeleteKind != null}
        kind={cannotDeleteKind ?? "card"}
        onDismiss={() => setCannotDeleteKind(null)}
      />
      <CardDeletedBanner visible={cardDeletedVisible} onDismiss={() => setCardDeletedVisible(false)} />

      {/* Profile-updated success toast */}
      {profileSavedVisible ? (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-center gap-2 rounded-[4px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 shadow-lg md:left-auto md:right-6 md:mx-0"
        >
          <span className="font-body text-[13px] font-semibold text-[#166534]">
            Profile updated
          </span>
        </div>
      ) : null}

      {/* Mutation error toast (address ops) */}
      {actionError ? (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start justify-between gap-3 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 shadow-lg md:left-auto md:right-6 md:mx-0"
        >
          <span className="font-body text-[13px] text-[#991b1b]">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="font-body text-[13px] font-semibold text-[#991b1b]"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ) : null}

      <DeleteCardDrawer
        open={pendingDeleteId != null}
        method={pendingDeleteMethod}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={removePaymentMethod}
      />

      <DeleteAddressDrawer
        open={pendingDeleteAddressId != null}
        address={pendingDeleteAddress}
        onClose={() => setPendingDeleteAddressId(null)}
        onConfirm={removeAddress}
      />
    </>
  );
}

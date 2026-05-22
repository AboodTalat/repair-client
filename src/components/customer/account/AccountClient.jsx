"use client";

import { useState } from "react";
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
import AddressAddedBanner from "./AddressAddedBanner";
import AddressDeletedBanner from "./AddressDeletedBanner";
import CardAddedBanner from "./CardAddedBanner";
import CardDeletedBanner from "./CardDeletedBanner";
import CannotDeleteDefaultBanner from "./CannotDeleteDefaultBanner";
import DeleteCardDrawer from "./DeleteCardDrawer";
import DeleteAddressDrawer from "./DeleteAddressDrawer";

// Owns the mutable account state for the /account hub: the toggleable
// `isDefault` flag for payment methods + addresses (radio behavior — see the
// feedback-repair-default-toggle memory) and the open/close state for the
// Add New Card drawer. Pure local state until the customer-scoped resolvers
// land — then swap the setters for repairQuery mutations.

export default function AccountClient({ profile, methods, addresses }) {
  const [paymentMethods, setPaymentMethods] = useState(methods);
  const [addressList, setAddressList] = useState(addresses);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [addAddressOpen, setAddAddressOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [cardAddedVisible, setCardAddedVisible] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeleteAddressId, setPendingDeleteAddressId] = useState(null);
  // `cannotDeleteKind` doubles as visibility — null means hidden; "card" /
  // "address" both swap the banner copy and force a fresh slide-in.
  const [cannotDeleteKind, setCannotDeleteKind] = useState(null);
  const [cardDeletedVisible, setCardDeletedVisible] = useState(false);
  const [addressAddedVisible, setAddressAddedVisible] = useState(false);
  const [addressDeletedVisible, setAddressDeletedVisible] = useState(false);

  // Default cards are protected from deletion — show an error toast instead
  // of opening the confirm drawer. Source of truth is the row's current
  // `isDefault` flag (which the user can flip via the star toggle).
  function requestDeletePayment(id) {
    const row = paymentMethods.find((r) => r.id === id);
    if (!row) return;
    if (row.isDefault) {
      // Retrigger the slide-in animation even if a previous toast is still up.
      setCannotDeleteKind(null);
      requestAnimationFrame(() => setCannotDeleteKind("card"));
      return;
    }
    setPendingDeleteId(id);
  }

  function requestDeleteAddress(id) {
    const row = addressList.find((r) => r.id === id);
    if (!row) return;
    if (row.isDefault) {
      setCannotDeleteKind(null);
      requestAnimationFrame(() => setCannotDeleteKind("address"));
      return;
    }
    setPendingDeleteAddressId(id);
  }

  function removeAddress(id) {
    setAddressList((rows) => rows.filter((r) => r.id !== id));
    // Retrigger the slide-in even if a previous toast is still showing.
    setAddressDeletedVisible(false);
    requestAnimationFrame(() => setAddressDeletedVisible(true));
  }

  const pendingDeleteAddress =
    pendingDeleteAddressId != null
      ? addressList.find((a) => a.id === pendingDeleteAddressId) ?? null
      : null;

  const pendingDeleteMethod =
    pendingDeleteId != null
      ? paymentMethods.find((m) => m.id === pendingDeleteId) ?? null
      : null;

  function removePaymentMethod(id) {
    setPaymentMethods((rows) => rows.filter((r) => r.id !== id));
    // Retrigger the slide-in even if a previous toast is still showing.
    setCardDeletedVisible(false);
    requestAnimationFrame(() => setCardDeletedVisible(true));
  }

  function togglePaymentDefault(id) {
    setPaymentMethods((rows) => setSoleDefault(rows, id));
  }

  function toggleAddressDefault(id) {
    setAddressList((rows) => setSoleDefault(rows, id));
  }

  // Single-line composition mirrors the existing addresses in mockAccount.js
  // (e.g. "Abu Dhabi - Alraha Beach, Al Reem Tower, 3rd Floor, 310"). The form
  // has no kind/label/phone fields yet — preserve those on edit, default for
  // new rows. Swap for the customer-scoped address resolvers once they land.
  function composeLine({ country, city, neighborhood, street, building, apartment }) {
    const parts = [
      country,
      city,
      neighborhood,
      street,
      apartment ? `${building} - Apt ${apartment}` : building,
    ].filter(Boolean);
    return parts.join(", ");
  }

  function saveAddress(fields) {
    if (editingAddressId != null) {
      const id = editingAddressId;
      setAddressList((rows) =>
        rows.map((r) => (r.id === id ? { ...r, ...fields, line: composeLine(fields) } : r))
      );
      return;
    }
    setAddressList((rows) => [
      ...rows,
      {
        id: `addr-${Date.now()}`,
        phone: "",
        isDefault: false,
        ...fields,
        line: composeLine(fields),
      },
    ]);
    // Retrigger the slide-in even if a previous toast is still showing.
    setAddressAddedVisible(false);
    requestAnimationFrame(() => setAddressAddedVisible(true));
  }

  const editingAddress =
    editingAddressId != null
      ? addressList.find((a) => a.id === editingAddressId) ?? null
      : null;

  function addPaymentMethod({ brand, last4, expiry }) {
    setPaymentMethods((rows) => [
      ...rows,
      {
        id: `pm-${brand}-${last4}-${Date.now()}`,
        brand,
        last4,
        expiry,
        // New cards never auto-promote — keeps the at-most-one invariant
        // intact without surprising the user.
        isDefault: false,
      },
    ]);
    // Retrigger the banner even if it's still showing from a previous add.
    setCardAddedVisible(false);
    requestAnimationFrame(() => setCardAddedVisible(true));
  }

  return (
    <>
      {/* Mobile */}
      <div className="flex w-full flex-col gap-4 md:hidden">
        <MobilePersonalInformationCard profile={profile} />
        <MobilePaymentMethodsCard
          methods={paymentMethods}
          onToggleDefault={togglePaymentDefault}
          onAdd={() => setAddCardOpen(true)}
          onDelete={requestDeletePayment}
        />
        <MobileAddressInformationCard
          addresses={addressList}
          onToggleDefault={toggleAddressDefault}
          onAdd={() => setAddAddressOpen(true)}
          onEdit={(id) => setEditingAddressId(id)}
          onDelete={requestDeleteAddress}
        />
      </div>

      {/* Desktop */}
      <div className="hidden w-full flex-col gap-8 md:flex">
        <DesktopPersonalInformationCard profile={profile} />
        <DesktopPaymentMethodsCard
          methods={paymentMethods}
          onToggleDefault={togglePaymentDefault}
          onAdd={() => setAddCardOpen(true)}
          onDelete={requestDeletePayment}
        />
        <DesktopAddressInformationCard
          addresses={addressList}
          onToggleDefault={toggleAddressDefault}
          onAdd={() => setAddAddressOpen(true)}
          onEdit={(id) => setEditingAddressId(id)}
          onDelete={requestDeleteAddress}
        />
      </div>

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
        onSubmit={saveAddress}
      />

      <CardAddedBanner
        visible={cardAddedVisible}
        onDismiss={() => setCardAddedVisible(false)}
      />

      <AddressAddedBanner
        visible={addressAddedVisible}
        onDismiss={() => setAddressAddedVisible(false)}
      />

      <AddressDeletedBanner
        visible={addressDeletedVisible}
        onDismiss={() => setAddressDeletedVisible(false)}
      />

      <CannotDeleteDefaultBanner
        visible={cannotDeleteKind != null}
        kind={cannotDeleteKind ?? "card"}
        onDismiss={() => setCannotDeleteKind(null)}
      />

      <CardDeletedBanner
        visible={cardDeletedVisible}
        onDismiss={() => setCardDeletedVisible(false)}
      />

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

function setSoleDefault(rows, id) {
  const target = rows.find((r) => r.id === id);
  const turningOff = !!target?.isDefault;
  return rows.map((r) => ({
    ...r,
    isDefault: turningOff ? false : r.id === id,
  }));
}

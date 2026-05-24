import { fetchCategories } from "@/lib/storeNav";
import Header from "./Header";

// Async server shell that pulls the live category tree (shared with
// (customer)/layout.js) and hands plain props to the client Header.

export default async function HeaderShell() {
  const categories = await fetchCategories();
  return <Header categories={categories} />;
}

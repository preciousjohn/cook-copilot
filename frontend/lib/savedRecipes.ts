import type { ChefResponse } from "./types";

export type SavedRecipe = {
  id: string;
  name: string;
  profileName: string;
  prompt: string;
  savedAt: string; // ISO string
  chefOutput: ChefResponse;
};

const KEY = "cc_saved_recipes";

export function getSavedRecipes(): SavedRecipe[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveRecipe(recipe: Omit<SavedRecipe, "id" | "savedAt">): SavedRecipe {
  const all = getSavedRecipes();
  const entry: SavedRecipe = {
    ...recipe,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify([entry, ...all]));
  return entry;
}

export function deleteSavedRecipe(id: string): void {
  const all = getSavedRecipes().filter((r) => r.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function isRecipeSaved(name: string, profileName: string): boolean {
  return getSavedRecipes().some((r) => r.name === name && r.profileName === profileName);
}

export function unsaveRecipe(name: string, profileName: string): void {
  const all = getSavedRecipes().filter(
    (r) => !(r.name === name && r.profileName === profileName)
  );
  localStorage.setItem(KEY, JSON.stringify(all));
}

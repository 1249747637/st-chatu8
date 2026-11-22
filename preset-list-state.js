/**
 * Added 2026-11-22 by Toastoast (GitHub: 1249747637).
 * Purpose: shared preset ordering and favorites without changing preset data.
 * Part of the st-chatu8 maintained fork; AFPL v9, see LICENSE.
 */
export const PRESET_SORT_OPTIONS = Object.freeze([
  Object.freeze({ value: 'newest', label: '最近新增' }),
  Object.freeze({ value: 'oldest', label: '较早新增' }),
  Object.freeze({ value: 'name_asc', label: '名称升序' }),
  Object.freeze({ value: 'name_desc', label: '名称降序' })
]);
const SORT_MODES = new Set(PRESET_SORT_OPTIONS.map(option => option.value));
const nameCollator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'variant' });

function compareNames(a, b) {
  return nameCollator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function ownData(record, key) {
  if (!isRecord(record)) return undefined;
  return Object.getOwnPropertyDescriptor(record, key)?.value;
}

function presetNames(settings) {
  if (!isRecord(settings)) throw new TypeError('settings must be a non-array object');
  const dictionary = ownData(settings, 'yushe');
  return isRecord(dictionary) ? Object.keys(dictionary) : [];
}

function cleanNames(value, liveNames) {
  const result = [];
  const seen = new Set();
  if (!Array.isArray(value)) return result;
  for (let index = 0; index < value.length; index++) {
    const name = Object.getOwnPropertyDescriptor(value, String(index))?.value;
    if (typeof name === 'string' && (!liveNames || liveNames.has(name)) && !seen.has(name)) {
      result.push(name);
      seen.add(name);
    }
  }
  return result;
}

/**
 * Normalize and return settings.presetListState. Only this property is written.
 * Returned metadata/array identities are not guaranteed across calls.
 * Legacy reverse own-key order is a compatibility order, not a creation date.
 */
export function ensurePresetListState(settings) {
  const names = presetNames(settings);
  const liveNames = new Set(names);
  const previous = ownData(settings, 'presetListState');
  const recentOrder = cleanNames(ownData(previous, 'recentOrder'), liveNames);
  const known = new Set(recentOrder);
  recentOrder.push(...names.reverse().filter(name => !known.has(name)));
  const mode = ownData(previous, 'sortMode');
  const state = {
    version: 1,
    sortMode: SORT_MODES.has(mode) ? mode : 'newest',
    recentOrder,
    favorites: cleanNames(ownData(previous, 'favorites'), liveNames),
    favoritesOnly: ownData(previous, 'favoritesOnly') === true
  };
  settings.presetListState = state;
  return state;
}

/**
 * Return a detached sorted list. Omitted/undefined favoritesOnly uses stored
 * state; an explicit boolean is a one-call override. Other values throw.
 */
export function getOrderedPresetNames(settings, { favoritesOnly } = {}) {
  if (favoritesOnly !== undefined && typeof favoritesOnly !== 'boolean') {
    throw new TypeError('favoritesOnly override must be a boolean');
  }
  const state = ensurePresetListState(settings);
  let names = [...state.recentOrder];
  if (state.sortMode === 'oldest') names.reverse();
  if (state.sortMode === 'name_asc') names.sort(compareNames);
  if (state.sortMode === 'name_desc') names.sort((a, b) => compareNames(b, a));
  if (favoritesOnly ?? state.favoritesOnly) {
    const favorites = new Set(state.favorites);
    names = names.filter(name => favorites.has(name));
  }
  return names;
}

/** Return the effective sort-mode string; invalid modes leave it unchanged. */
export function setPresetSortMode(settings, mode) {
  const state = ensurePresetListState(settings);
  if (SORT_MODES.has(mode)) state.sortMode = mode;
  return state.sortMode;
}

/** Return the new favorite boolean; invalid/nonexistent names return false. */
export function togglePresetFavorite(settings, name) {
  const state = ensurePresetListState(settings);
  if (typeof name !== 'string' || !state.recentOrder.includes(name)) return false;
  const index = state.favorites.indexOf(name);
  if (index >= 0) {
    state.favorites.splice(index, 1);
    return false;
  }
  state.favorites.push(name);
  return true;
}

/** Return whether the exact live name is favorited; never trim/coerce names. */
export function isPresetFavorite(settings, name) {
  return ensurePresetListState(settings).favorites.includes(name);
}

/** Return the stored boolean. Non-boolean input leaves it unchanged. */
export function setPresetFavoritesOnly(settings, bool) {
  const state = ensurePresetListState(settings);
  if (typeof bool === 'boolean') state.favoritesOnly = bool;
  return state.favoritesOnly;
}

/**
 * Return accepted, unique live names in supplied order and prepend that block.
 * With at least one accepted name, select newest and leave favorites-only.
 * Empty/invalid lists normalize metadata but otherwise do not change options.
 * PRECONDITION: caller computes truly NEW names before writing yushe and calls
 * this after insertion. Overwrites and renames MUST NOT be supplied here.
 * A post-write dictionary alone cannot prove whether a key previously existed.
 */
export function registerPresetAdditions(settings, names) {
  const state = ensurePresetListState(settings);
  const additions = cleanNames(names, new Set(state.recentOrder));
  if (additions.length === 0) return [];
  const added = new Set(additions);
  state.recentOrder = [...additions, ...state.recentOrder.filter(name => !added.has(name))];
  state.sortMode = 'newest';
  state.favoritesOnly = false;
  return additions;
}

/**
 * After caller moves the dictionary key, replace old metadata references at
 * their existing positions. Initialize metadata before the dictionary move,
 * then call this immediately BEFORE any other getter/normalizer can drop old.
 * Return true if an old order/favorite reference was transferred, else false.
 * Invalid, same-name, missing-target or still-live-source requests are no-ops
 * except ordinary metadata normalization. This never renames the preset data.
 */
export function renamePresetListEntry(settings, oldName, newName) {
  const live = new Set(presetNames(settings));
  if (typeof oldName !== 'string' || typeof newName !== 'string' || oldName === newName || !live.has(newName) || live.has(oldName)) {
    ensurePresetListState(settings);
    return false;
  }
  const previous = ownData(settings, 'presetListState');
  const allowed = new Set([...live, oldName]);
  const recentOrder = cleanNames(ownData(previous, 'recentOrder'), allowed);
  const favorites = cleanNames(ownData(previous, 'favorites'), allowed);
  const changed = recentOrder.includes(oldName) || favorites.includes(oldName);
  const replace = list => list.includes(oldName)
    ? list.filter(name => name !== newName).map(name => name === oldName ? newName : name)
    : list;
  settings.presetListState = {
    version: 1,
    sortMode: ownData(previous, 'sortMode'),
    recentOrder: replace(recentOrder),
    favorites: replace(favorites),
    favoritesOnly: ownData(previous, 'favoritesOnly')
  };
  ensurePresetListState(settings);
  return changed;
}

/**
 * Call after caller deletes dictionary keys. Return unique requested names,
 * in request order, whose old order/favorite records were removed. Live keys
 * are ignored. Normalization also clears other stale metadata, but such names
 * are not included in the return value. This never deletes preset/image data.
 */
export function removePresetListEntries(settings, names) {
  const live = new Set(presetNames(settings));
  const previous = ownData(settings, 'presetListState');
  const tracked = new Set([
    ...cleanNames(ownData(previous, 'recentOrder')),
    ...cleanNames(ownData(previous, 'favorites'))
  ]);
  const removed = cleanNames(names).filter(name => !live.has(name) && tracked.has(name));
  ensurePresetListState(settings);
  return removed;
}

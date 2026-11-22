/**
 * Added 2026-11-22 by Toastoast (GitHub: 1249747637).
 * Purpose: per-style model snapshots, compatible migration and API isolation.
 * Part of the st-chatu8 maintained fork; AFPL v9, see LICENSE.
 */
/** Model settings belong to prompt presets; connection credentials never do. */
export const STYLE_MODEL_FIELDS = Object.freeze([
    'novelaimode', 'novelai_seed', 'novelai_sampler', 'Schedule',
    'novelai_v5_schedule', 'nai3Scale', 'cfg_rescale', 'novelai_steps',
    'novelai_width', 'novelai_height', 'novelai_size', 'AQT_novelai',
    'UCP_novelai', 'novelai_straight_alpha', 'novelai_v5_effort',
    'addFurryDataset', 'AI_use_coords', 'sm', 'dyn', 'nai3Variety', 'nai3Deceisp',
]);

// Same cache whitelist as the legacy NOVELAI_MODEL_PARAM_KEYS (no selector or seed).
const MODEL_PARAM_FIELDS = STYLE_MODEL_FIELDS.filter(key => key !== 'novelaimode' && key !== 'novelai_seed');

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isSettingValue = value => typeof value === 'string' || typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value));

function pickFields(settings, defaults = {}, fields = STYLE_MODEL_FIELDS) {
    const result = {};
    for (const key of fields) {
        const value = isRecord(settings) && hasOwn(settings, key) ? settings[key] : undefined;
        const fallback = isRecord(defaults) && hasOwn(defaults, key) ? defaults[key] : undefined;
        if (isSettingValue(value)) result[key] = value;
        else if (isSettingValue(fallback)) result[key] = fallback;
    }
    return result;
}

function cloneModelConfigs(configs) {
    const result = {};
    if (!isRecord(configs)) return result;
    for (const model of Object.keys(configs)) {
        if (!isRecord(configs[model])) continue;
        const entry = pickFields(configs[model], {}, MODEL_PARAM_FIELDS);
        Object.defineProperty(result, model, {
            value: entry, enumerable: true, writable: true, configurable: true,
        });
    }
    return result;
}

/** Read only allowed scalar values, preserving false, zero and existing types. */
export function captureStyleModelSettings(settings, defaults = {}) {
    const result = pickFields(settings, defaults);
    const validModel = value => typeof value === 'string' && value.trim() !== '';
    if (!validModel(result.novelaimode)) {
        result.novelaimode = validModel(defaults?.novelaimode)
            ? defaults.novelaimode : 'nai-diffusion-4-5-full';
    }
    const configs = isRecord(settings) && isRecord(settings.novelai_model_configs)
        ? settings.novelai_model_configs : defaults?.novelai_model_configs;
    result.novelai_model_configs = cloneModelConfigs(configs);
    const activeModel = result.novelaimode;
    if (typeof activeModel === 'string' && activeModel !== '') {
        const active = hasOwn(result.novelai_model_configs, activeModel)
            ? result.novelai_model_configs[activeModel] : {};
        // Flat values win over defaults, which win over safe cached fallbacks.
        for (const key of MODEL_PARAM_FIELDS) {
            if (hasOwn(result, key)) active[key] = result[key];
            else if (hasOwn(active, key)) result[key] = active[key];
        }
        Object.defineProperty(result.novelai_model_configs, activeModel, {
            value: active, enumerable: true, writable: true, configurable: true,
        });
    }
    return result;
}

/** Fill missing snapshots, including later imports; never overwrite configured presets.
 * Returns true only when persistent settings changed.
 */
export function ensureStyleModelPresets(settings, defaults = {}) {
    if (!isRecord(settings) || !isRecord(settings.yushe)) return false;
    let changed = false;
    for (const preset of Object.values(settings.yushe)) {
        if (!isRecord(preset) || isRecord(preset.modelSettings)) continue;
        preset.modelSettings = captureStyleModelSettings(settings, defaults);
        changed = true;
    }
    if (settings.styleModelPresetSchemaVersion !== 1) {
        settings.styleModelPresetSchemaVersion = 1;
        changed = true;
    }
    return changed;
}

function requirePreset(settings, presetName) {
    if (!isRecord(settings)) throw new TypeError('Settings must be an object');
    if (typeof presetName !== 'string' || presetName.trim() === '' ||
        !isRecord(settings.yushe) || !hasOwn(settings.yushe, presetName) ||
        !isRecord(settings.yushe[presetName])) {
        throw new RangeError('A named, existing object preset is required');
    }
    return settings.yushe[presetName];
}

/** Return a detached snapshot. Reading a legacy preset does not migrate settings. */
export function getStyleModelSettings(settings, presetName, defaults = {}) {
    const preset = requirePreset(settings, presetName);
    const fallback = { ...(isRecord(defaults) ? defaults : {}) };
    if (typeof fallback.novelaimode !== 'string' || fallback.novelaimode.trim() === '') {
        fallback.novelaimode = settings.novelaimode;
    }
    return captureStyleModelSettings(isRecord(preset.modelSettings)
        ? preset.modelSettings : settings, fallback);
}

/** Explicitly save current flat controls to an existing preset, preserving prompt/media fields. */
export function saveStyleModelPreset(settings, presetName, defaults = {}) {
    const preset = requirePreset(settings, presetName);
    preset.modelSettings = captureStyleModelSettings(settings, defaults);
    return captureStyleModelSettings(preset.modelSettings);
}

function writeModelSettings(target, snapshot) {
    for (const key of STYLE_MODEL_FIELDS) {
        if (hasOwn(snapshot, key)) target[key] = snapshot[key];
        else delete target[key]; // Do not leak an absent field from the previously open preset.
    }
    target.novelai_model_configs = cloneModelConfigs(snapshot.novelai_model_configs);
}

/** Update only legacy flat model fields/cache; never touch API, Vibe or preset selection. */
export function applyStyleModelPreset(settings, presetName, defaults = {}) {
    const snapshot = getStyleModelSettings(settings, presetName, defaults);
    writeModelSettings(settings, snapshot);
    return snapshot;
}

/** A request-local model/prompt snapshot; large non-model/Vibe payloads remain shared. */
export function buildStyleModelRuntime(settings, presetName, defaults = {}) {
    const preset = requirePreset(settings, presetName);
    const snapshot = getStyleModelSettings(settings, presetName, defaults);
    const runtime = { ...settings, yusheid_novelai: presetName, yushe: { ...settings.yushe } };
    Object.defineProperty(runtime.yushe, presetName, {
        value: { ...preset, modelSettings: captureStyleModelSettings(snapshot) },
        enumerable: true, writable: true, configurable: true,
    });
    writeModelSettings(runtime, snapshot);
    return runtime;
}

export const NOVELAI_API_PROFILE_FIELDS = Object.freeze([
    'novelaiApi', 'novelaisite', 'novelaiOtherSite', 'enableCloudQueue',
    'cloudQueueUrl', 'cloudQueueGreeting', 'cloudQueueTimeout', 'showQueueGreeting',
]);

/** No DOM reads, model cache refreshes, trimming or legacy profile rewrites. */
export function collectNovelAIApiSettings(settings) {
    const result = {};
    if (!isRecord(settings)) return result;
    for (const key of NOVELAI_API_PROFILE_FIELDS) {
        if (hasOwn(settings, key) && isSettingValue(settings[key])) result[key] = settings[key];
    }
    return result;
}

/** Apply only supplied API scalars. Return a { field: newValue } DOM-update map.
 * Saved profile objects (including legacy fields) and all model/cache data remain untouched.
 */
export function applyNovelAIApiSettings(settings, profile) {
    if (!isRecord(settings)) throw new TypeError('Settings must be an object');
    const changed = {};
    if (!isRecord(profile)) return changed;
    for (const key of NOVELAI_API_PROFILE_FIELDS) {
        if (!hasOwn(profile, key) || !isSettingValue(profile[key])) continue;
        const value = profile[key];
        if (!hasOwn(settings, key) || !Object.is(settings[key], value)) {
            settings[key] = value;
            changed[key] = value;
        }
    }
    return changed;
}

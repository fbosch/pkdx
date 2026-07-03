import { match, P } from "ts-pattern";
import {
  findExactSpecies,
  findSpeciesByIdentityOrAlias,
  getSpeciesByDexDelta,
  moveSearchSelection as moveSearchResultSelection,
  searchSelection,
  type SpeciesIndexEntry,
} from "./search";
import type {
  PokemonDetail,
  PokemonEvolution,
  PokemonForm,
  PokemonFormIntent,
} from "./pokemon-detail";
import {
  hasPokemonEvolutionChain,
  pokemonEvolutionShortcutTargets,
  pokemonFormCarryoverIntent,
  pokemonFormIntent,
  pokemonFormTargetKey,
} from "./pokemon-detail";

export type AppState = SearchState | DetailState;

export type SearchState = {
  screen: "search";
  query: string;
  selectedIndex: number;
  shouldExit: boolean;
};

export type DetailState = {
  screen: "detail";
  previousQuery: string;
  previousSelectedIndex: number;
  detailOverlay: DetailOverlay | undefined;
  descriptionIndex: number;
  form: PokemonFormIntent | undefined;
  retryToken: number;
  shiny: boolean;
  species: SpeciesIndexEntry;
  shouldExit: boolean;
};

export type LoadedDetail = {
  detail: PokemonDetail;
  form: PokemonForm;
  species: SpeciesIndexEntry;
};

export type DetailOverlay =
  | "abilities"
  | "abilities-loading"
  | "evolutions"
  | { kind: "forms"; selectedIndex: number };

export type AppKey = {
  name: string;
  ctrl?: boolean;
  shift?: boolean;
  sequence?: string;
};

export type DetailNavigationDelta = -1 | 1;

export type DetailLoadStatus = "loading" | "ready" | "error";

export type AppKeyContext = {
  detail?: LoadedDetail | undefined;
  detailStatus?: DetailLoadStatus | undefined;
};

type AppEvent =
  | { context: AppKeyContext; key: AppKey; type: "key" }
  | {
      detail?: LoadedDetail | undefined;
      species: SpeciesIndexEntry;
      type: "detail.loadSpecies";
    }
  | { type: "detail.abilitiesLoaded" }
  | { type: "detail.abilitiesLoadFailed" };

type SearchKeyHandler = (state: SearchState) => AppState;
type SearchStateNode = {
  transition: (state: SearchState, event: AppEvent) => AppState;
};
type DetailStateNode = {
  transition: (state: DetailState, event: AppEvent) => DetailState | AppState;
};
type AppStateMachine = {
  initial: (query?: string) => AppState;
  transition: (state: AppState, event: AppEvent) => AppState;
};

const searchKeyHandlers: Record<string, SearchKeyHandler> = {
  backspace: (state) => updateSearchQuery(state, state.query.slice(0, -1)),
  down: (state) => moveSearchSelection(state, 1),
  enter: openSelectedSpecies,
  "ctrl+j": (state) => moveSearchSelection(state, 1),
  "ctrl+k": (state) => moveSearchSelection(state, -1),
  "ctrl+u": (state) => updateSearchQuery(state, ""),
  return: openSelectedSpecies,
  up: (state) => moveSearchSelection(state, -1),
};

const searchControlKeyAliases: Record<string, string> = {
  "C-j": "ctrl+j",
  "C-k": "ctrl+k",
  "enter:\n": "ctrl+j",
  "return:\n": "ctrl+j",
  "ctrl+j": "ctrl+j",
  "ctrl+k": "ctrl+k",
  "j:\n": "ctrl+j",
  "k:\v": "ctrl+k",
  "sequence:\n": "ctrl+j",
  "sequence:\v": "ctrl+k",
};
const searchCtrlKeyAliases: Record<string, string> = {
  enter: "ctrl+j",
  j: "ctrl+j",
  k: "ctrl+k",
  return: "ctrl+j",
};
const carryoverEligibleFormKeys = new Set([
  "alola",
  "galar",
  "hisui",
  "paldea",
]);

export function createInitialAppState(query = ""): AppState {
  return appStateMachine.initial(query);
}

function transitionAppState(state: AppState, event: AppEvent): AppState {
  return appStateMachine.transition(state, event);
}

export function applyAppKey(
  state: AppState,
  key: AppKey,
  context: AppKeyContext = {},
): AppState {
  return transitionAppState(state, { context, key, type: "key" });
}

const appStateMachine: AppStateMachine = {
  initial: createInitialState,
  transition: (state, event) => {
    if (event.type === "key" && shouldExitFromState(state, event.key)) {
      return {
        ...state,
        shouldExit: true,
      };
    }

    if (state.screen === "detail") {
      return detailStateNode.transition(state, event);
    }

    return searchStateNode.transition(state, event);
  },
};

const searchStateNode: SearchStateNode = {
  transition: (state, event) => {
    if (event.type !== "key") {
      return state;
    }

    return applySearchKey(state, event.key);
  },
};

const detailStateNode: DetailStateNode = {
  transition: (state, event) =>
    match(event)
      .returnType<DetailState | AppState>()
      .with({ type: "detail.loadSpecies" }, ({ detail, species }) =>
        loadDetailSpeciesState(state, species, detail),
      )
      .with({ type: "detail.abilitiesLoaded" }, () =>
        openLoadedAbilityOverlay(state),
      )
      .with({ type: "detail.abilitiesLoadFailed" }, () =>
        closeDetailOverlay(state),
      )
      .with({ type: "key" }, ({ context, key }) =>
        applyDetailKey(state, key, context),
      )
      .exhaustive(),
};

function createInitialState(query = ""): AppState {
  const exactSpecies = findExactSpecies(query);
  if (exactSpecies !== undefined) {
    return {
      screen: "detail",
      detailOverlay: undefined,
      descriptionIndex: 0,
      form: undefined,
      previousQuery: "",
      previousSelectedIndex: 0,
      retryToken: 0,
      shiny: false,
      species: exactSpecies,
      shouldExit: false,
    };
  }

  return {
    screen: "search",
    query,
    selectedIndex: 0,
    shouldExit: false,
  };
}

function shouldExitFromState(state: AppState, key: AppKey): boolean {
  if (
    state.screen === "detail" &&
    state.detailOverlay !== undefined &&
    key.name === "escape"
  ) {
    return false;
  }

  if (state.screen === "search" && key.name === "q") {
    return false;
  }

  return isExitKey(key);
}

function applyDetailKey(
  state: DetailState,
  key: AppKey,
  context: AppKeyContext,
): AppState {
  if (state.detailOverlay !== undefined && key.name === "escape") {
    return closeDetailOverlay(state);
  }

  if (state.detailOverlay !== undefined) {
    return applyDetailOverlayKey(state, key, context.detail);
  }

  if (key.name === "/") {
    return {
      screen: "search",
      query: "",
      selectedIndex: 0,
      shouldExit: false,
    };
  }

  return applyDetailActionKey(state, key, context);
}

function applyDetailActionKey(
  state: DetailState,
  key: AppKey,
  context: AppKeyContext,
): AppState {
  const detailOverlay = getDetailOverlayAction(key, context.detail);
  if (detailOverlay !== undefined) {
    return openDetailOverlay(state, detailOverlay);
  }

  if (canCycleDetailDescription(context.detail, key)) {
    return cycleDetailDescription(
      state,
      context.detail,
      key.shift === true ? -1 : 1,
    );
  }

  if (key.name === "r" && context.detailStatus === "error") {
    return retryDetailLoad(state);
  }

  if (key.name === "s") {
    return toggleDetailShiny(state);
  }

  if (canToggleSingleAlternateForm(context.detail, key)) {
    return toggleSingleAlternateForm(state, context.detail);
  }

  const navigationDelta = getDetailNavigationDelta(key);
  if (navigationDelta !== undefined) {
    return loadAdjacentDetailSpecies(state, navigationDelta, context.detail);
  }

  return state;
}

function getDetailOverlayAction(
  key: AppKey,
  detail: LoadedDetail | undefined,
): DetailState["detailOverlay"] {
  if (key.name === "a" && detail !== undefined) {
    return "abilities-loading";
  }

  if (
    key.name === "e" &&
    detail !== undefined &&
    hasPokemonEvolutionChain(detail.detail.evolutionChain)
  ) {
    return "evolutions";
  }

  if (canOpenFormSelector(detail, key)) {
    return {
      kind: "forms",
      selectedIndex: getCurrentPokemonFormIndex(detail),
    };
  }

  return undefined;
}

function getDetailNavigationDelta(
  key: AppKey,
): DetailNavigationDelta | undefined {
  if (key.name === "h" || key.name === "left") {
    return -1;
  }

  if (key.name === "l" || key.name === "right") {
    return 1;
  }

  return undefined;
}

function canOpenFormSelector(
  detail: LoadedDetail | undefined,
  key: AppKey,
): boolean {
  return (
    key.name === "f" &&
    detail !== undefined &&
    getAlternatePokemonForms(detail.detail).length > 1
  );
}

function canToggleSingleAlternateForm(
  detail: LoadedDetail | undefined,
  key: AppKey,
): boolean {
  return (
    key.name === "f" &&
    detail !== undefined &&
    getAlternatePokemonForms(detail.detail).length === 1
  );
}

function canCycleDetailDescription(
  detail: LoadedDetail | undefined,
  key: AppKey,
): boolean {
  return key.name === "d" && detail !== undefined;
}

function applyDetailOverlayKey(
  state: DetailState,
  key: AppKey,
  detail: LoadedDetail | undefined,
): AppState {
  if (state.detailOverlay === "abilities") {
    return applyAbilityOverlayKey(state, key);
  }

  if (state.detailOverlay === "abilities-loading") {
    return applyAbilityLoadingOverlayKey(state, key);
  }

  if (state.detailOverlay === "evolutions") {
    return applyEvolutionOverlayKey(state, key, detail);
  }

  return applyFormOverlayKey(state, key, detail);
}

function applyAbilityOverlayKey(state: DetailState, key: AppKey): AppState {
  if (key.name === "a") {
    return closeDetailOverlay(state);
  }

  return state;
}

function applyAbilityLoadingOverlayKey(
  state: DetailState,
  key: AppKey,
): AppState {
  if (key.name === "a") {
    return closeDetailOverlay(state);
  }

  return state;
}

function applyEvolutionOverlayKey(
  state: DetailState,
  key: AppKey,
  detail: LoadedDetail | undefined,
): AppState {
  if (key.name === "e") {
    return closeDetailOverlay(state);
  }

  const selectedSpecies = evolutionShortcutSpecies(detail, key);
  if (selectedSpecies !== undefined) {
    return loadDetailSpecies(state, selectedSpecies, detail);
  }

  return state;
}

function evolutionShortcutSpecies(
  detail: LoadedDetail | undefined,
  key: AppKey,
): SpeciesIndexEntry | undefined {
  if (detail === undefined || /^[1-9]$/.test(key.name) === false) {
    return undefined;
  }

  const shortcutIndex = Number.parseInt(key.name, 10) - 1;
  const target = pokemonEvolutionShortcutTargets(
    detail.detail.evolutionChain,
  ).at(shortcutIndex);
  if (target === undefined) {
    return undefined;
  }

  return findSpeciesByIdentityOrAlias(target.targetName);
}

function applyFormOverlayKey(
  state: DetailState,
  key: AppKey,
  detail: LoadedDetail | undefined,
): AppState {
  if (key.name === "f") {
    return closeDetailOverlay(state);
  }

  if (key.name === "enter" || key.name === "return") {
    return loadSelectedDetailForm(state, detail);
  }

  if (key.name === "j" || key.name === "down") {
    return moveDetailFormSelection(state, detail, 1);
  }

  if (key.name === "k" || key.name === "up") {
    return moveDetailFormSelection(state, detail, -1);
  }

  return state;
}

function moveDetailFormSelection(
  state: DetailState,
  detail: LoadedDetail | undefined,
  delta: number,
): DetailState {
  if (
    detail === undefined ||
    typeof state.detailOverlay !== "object" ||
    state.detailOverlay.kind !== "forms"
  ) {
    return state;
  }

  const maxIndex = Math.max(0, detail.detail.forms.length - 1);

  return {
    ...state,
    detailOverlay: {
      ...state.detailOverlay,
      selectedIndex: Math.min(
        maxIndex,
        Math.max(0, state.detailOverlay.selectedIndex + delta),
      ),
    },
  };
}

function loadSelectedDetailForm(
  state: DetailState,
  detail: LoadedDetail | undefined,
): DetailState {
  if (
    detail === undefined ||
    typeof state.detailOverlay !== "object" ||
    state.detailOverlay.kind !== "forms"
  ) {
    return state;
  }

  const form = detail.detail.forms[state.detailOverlay.selectedIndex];
  if (form === undefined) {
    return state;
  }

  if (pokemonFormTargetKey(detail.form) === pokemonFormTargetKey(form)) {
    return closeDetailOverlay(state);
  }

  return loadDetailForm(state, form);
}

function toggleSingleAlternateForm(
  state: DetailState,
  loadedDetail: LoadedDetail | undefined,
): DetailState {
  if (loadedDetail === undefined) {
    return state;
  }

  const detail = loadedDetail.detail;
  const alternateForm = getAlternatePokemonForms(detail)[0];
  const defaultForm = detail.forms.find((form) => form.isDefault);
  const targetForm = detail.form.isDefault ? alternateForm : defaultForm;
  if (targetForm === undefined) {
    return state;
  }

  return loadDetailForm(state, targetForm);
}

function toggleDetailShiny(state: DetailState): DetailState {
  return {
    ...state,
    shiny: state.shiny === false,
  };
}

function cycleDetailDescription(
  state: DetailState,
  detail: LoadedDetail | undefined,
  delta: number,
): DetailState {
  const count = detail?.detail.flavorTexts.length ?? 0;
  if (count <= 1) {
    return state;
  }

  return {
    ...state,
    descriptionIndex: wrapIndex(state.descriptionIndex + delta, count),
  };
}

function openDetailOverlay(
  state: DetailState,
  detailOverlay: DetailState["detailOverlay"],
): DetailState {
  return {
    ...state,
    detailOverlay,
  };
}

function closeDetailOverlay(state: DetailState): DetailState {
  return {
    ...state,
    detailOverlay: undefined,
  };
}

export function loadDetailSpecies(
  state: DetailState,
  species: SpeciesIndexEntry,
  detail?: LoadedDetail,
): DetailState {
  return transitionDetailState(state, {
    detail,
    species,
    type: "detail.loadSpecies",
  });
}

export function loadAdjacentDetailSpecies(
  state: DetailState,
  delta: DetailNavigationDelta,
  detail?: LoadedDetail,
): DetailState {
  const species = getSpeciesByDexDelta(state.species, delta);
  if (species === undefined) {
    return state;
  }

  return loadDetailSpecies(state, species, detail);
}

function loadDetailForm(state: DetailState, form: PokemonForm): DetailState {
  return {
    ...state,
    detailOverlay: undefined,
    descriptionIndex: 0,
    form: pokemonFormIntent(form),
    retryToken: 0,
  };
}

export function detailAbilitiesLoaded(state: DetailState): DetailState {
  return transitionDetailState(state, { type: "detail.abilitiesLoaded" });
}

export function detailAbilitiesLoadFailed(state: DetailState): DetailState {
  return transitionDetailState(state, { type: "detail.abilitiesLoadFailed" });
}

function transitionDetailState(
  state: DetailState,
  event: AppEvent,
): DetailState {
  const next = detailStateNode.transition(state, event);
  return next.screen === "detail" ? next : state;
}

function loadDetailSpeciesState(
  state: DetailState,
  species: SpeciesIndexEntry,
  detail?: LoadedDetail,
): DetailState {
  return {
    ...state,
    descriptionIndex: 0,
    detailOverlay: undefined,
    form: carryOverDetailForm(state, species, detail),
    retryToken: 0,
    species,
  };
}

function openLoadedAbilityOverlay(state: DetailState): DetailState {
  if (state.detailOverlay !== "abilities-loading") {
    return state;
  }

  return {
    ...state,
    detailOverlay: "abilities",
  };
}

function carryOverDetailForm(
  state: DetailState,
  species: SpeciesIndexEntry,
  detail: LoadedDetail | undefined,
): PokemonFormIntent | undefined {
  if (detail === undefined) {
    return undefined;
  }

  const form = detail?.form;
  if (form === undefined || isCarryoverEligiblePokemonForm(form) === false) {
    return undefined;
  }

  return isDirectEvolutionSpecies(state, species, detail)
    ? pokemonFormCarryoverIntent(form)
    : undefined;
}

function isCarryoverEligiblePokemonForm(form: PokemonForm): boolean {
  return (
    form.isDefault === false &&
    carryoverEligibleFormKeys.has(form.spriteFormKey)
  );
}

function isDirectEvolutionSpecies(
  state: DetailState,
  species: SpeciesIndexEntry,
  detail: LoadedDetail,
): boolean {
  const current = state.species.name;
  return evolutionChainIncludesDirectRelationship(
    detail.detail.evolutionChain.root,
    current,
    species.name,
  );
}

function evolutionChainIncludesDirectRelationship(
  evolution: PokemonEvolution,
  currentSpeciesName: string,
  speciesName: string,
): boolean {
  const currentName = evolution.speciesName ?? evolution.name;
  const childNames = evolution.evolvesTo.map(
    (child) => child.speciesName ?? child.name,
  );

  if (currentName === currentSpeciesName && childNames.includes(speciesName)) {
    return true;
  }

  if (currentName === speciesName && childNames.includes(currentSpeciesName)) {
    return true;
  }

  return evolution.evolvesTo.some((child) =>
    evolutionChainIncludesDirectRelationship(
      child,
      currentSpeciesName,
      speciesName,
    ),
  );
}

export function pokemonFormsMatch(
  requested: PokemonFormIntent | undefined,
  loaded: PokemonForm | PokemonFormIntent | undefined,
  { allowDefaultFallback }: { allowDefaultFallback: boolean },
): boolean {
  return match([requested, loaded, allowDefaultFallback])
    .returnType<boolean>()
    .with(
      [P._, P._, P._],
      ([requestedForm, loadedForm]) =>
        pokemonFormTargetKey(requestedForm) ===
        pokemonFormTargetKey(loadedForm),
      () => true,
    )
    .with([P.nullish, P._, P._], () => false)
    .with([P._, P.nullish, P._], () => false)
    .with(
      [P.nonNullable, { isDefault: false }, P._],
      ([requestedForm, loadedForm]) =>
        pokemonFormsShareAlternateKey(requestedForm, loadedForm),
    )
    .with(
      [P.when(isUnresolvedCarryoverFormIntent), { isDefault: true }, true],
      () => true,
    )
    .otherwise(() => false);
}

export function detailTargetsMatch(
  state: DetailState,
  target: { form: PokemonFormIntent | undefined; species: SpeciesIndexEntry },
): boolean {
  return (
    target.species.slug === state.species.slug &&
    pokemonFormsMatch(target.form, state.form, { allowDefaultFallback: true })
  );
}

function isUnresolvedCarryoverFormIntent(
  form: PokemonFormIntent | undefined,
): form is PokemonFormIntent {
  return form !== undefined && form.pokemonName === undefined;
}

function pokemonFormsShareAlternateKey(
  requested: PokemonFormIntent,
  loaded: PokemonForm | PokemonFormIntent,
): boolean {
  if (!("isDefault" in loaded) || loaded.isDefault) {
    return false;
  }

  return (
    requested.spriteFormKey === loaded.spriteFormKey &&
    loaded.pokemonName.endsWith(`-${requested.spriteFormKey}`)
  );
}

function retryDetailLoad(state: DetailState): DetailState {
  return {
    ...state,
    retryToken: state.retryToken + 1,
  };
}

function applySearchKey(state: SearchState, key: AppKey): AppState {
  const handler = searchKeyHandlers[searchKeyName(key)];

  if (handler !== undefined) {
    return handler(state);
  }

  return applySearchTextInput(state, key);
}

function searchKeyName(key: AppKey): string {
  const alias = getSearchKeyAlias(key);

  if (alias !== undefined) {
    return alias;
  }

  if (key.shift === true && key.name.length === 1) {
    return key.name.toUpperCase();
  }

  return key.name;
}

function getSearchKeyAlias(key: AppKey): string | undefined {
  if (key.ctrl === true) {
    return getSearchCtrlKeyAlias(key);
  }

  return (
    searchControlKeyAliases[`sequence:${key.sequence ?? ""}`] ??
    searchControlKeyAliases[`${key.name}:${key.sequence ?? ""}`] ??
    searchControlKeyAliases[key.name]
  );
}

function getSearchCtrlKeyAlias(key: AppKey): string {
  return (
    searchCtrlKeyAliases[key.name] ??
    searchControlKeyAliases[key.name] ??
    (key.name.length === 1 ? `ctrl+${key.name}` : key.name)
  );
}

function applySearchTextInput(state: SearchState, key: AppKey): SearchState {
  if (key.ctrl === true || isPrintableInputSequence(key.sequence) === false) {
    return state;
  }

  return updateSearchQuery(state, `${state.query}${key.sequence}`);
}

function isPrintableInputSequence(
  sequence: string | undefined,
): sequence is string {
  return sequence !== undefined && sequence.length === 1 && sequence >= " ";
}

function moveSearchSelection(state: SearchState, delta: number): SearchState {
  const selection = moveSearchResultSelection(
    state.query,
    state.selectedIndex,
    delta,
  );

  return {
    ...state,
    selectedIndex: selection.selectedIndex,
  };
}

function openSelectedSpecies(state: SearchState): AppState {
  const { species } = searchSelection(state.query, state.selectedIndex);
  if (species === undefined) {
    return state;
  }

  return {
    screen: "detail",
    detailOverlay: undefined,
    descriptionIndex: 0,
    form: undefined,
    previousQuery: state.query,
    previousSelectedIndex: state.selectedIndex,
    retryToken: 0,
    shiny: false,
    species,
    shouldExit: false,
  };
}

function getCurrentPokemonFormIndex(detail: LoadedDetail | undefined): number {
  if (detail === undefined) {
    return 0;
  }

  const currentFormKey = pokemonFormTargetKey(detail.form);
  const index = detail.detail.forms.findIndex(
    (form) => pokemonFormTargetKey(form) === currentFormKey,
  );

  return Math.max(0, index);
}

function getAlternatePokemonForms(detail: PokemonDetail): PokemonForm[] {
  return detail.forms.filter((form) => form.isDefault === false);
}

function updateSearchQuery(state: SearchState, query: string): SearchState {
  return {
    ...state,
    query,
    selectedIndex: 0,
  };
}

function wrapIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}

function isExitKey(key: AppKey): boolean {
  return (
    (key.name === "c" && key.ctrl === true) ||
    key.name === "escape" ||
    key.name === "q"
  );
}

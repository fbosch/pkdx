import {
  findExactSpecies,
  getSpeciesByDexDelta,
  getSpeciesBySelection,
  searchSpecies,
  type SpeciesIndexEntry,
} from "./search";
import type {
  PokemonDetail,
  PokemonEvolution,
  PokemonForm,
} from "./pokemon-detail";
import { pokemonFormTargetKey } from "./pokemon-detail";

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
  detail: LoadedDetail | undefined;
  detailOverlay: DetailOverlay | undefined;
  descriptionIndex: number;
  errorMessage: string | undefined;
  form: PokemonForm | undefined;
  retryToken: number;
  shiny: boolean;
  species: SpeciesIndexEntry;
  status: "loading" | "ready" | "error";
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

type AppEvent =
  | { key: AppKey; type: "key" }
  | { species: SpeciesIndexEntry; type: "detail.loadSpecies" }
  | {
      detail: PokemonDetail;
      species: SpeciesIndexEntry;
      type: "detail.loadSucceeded";
    }
  | {
      error: unknown;
      form?: PokemonForm;
      species: SpeciesIndexEntry;
      type: "detail.loadFailed";
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

export function createInitialAppState(query = ""): AppState {
  return appStateMachine.initial(query);
}

function transitionAppState(state: AppState, event: AppEvent): AppState {
  return appStateMachine.transition(state, event);
}

export function applyAppKey(state: AppState, key: AppKey): AppState {
  return transitionAppState(state, { key, type: "key" });
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
  transition: (state, event) => {
    if (event.type === "detail.loadSpecies") {
      return loadDetailSpeciesState(state, event.species);
    }

    if (event.type === "detail.loadSucceeded") {
      return detailLoadSucceededState(state, event.species, event.detail);
    }

    if (event.type === "detail.loadFailed") {
      return detailLoadFailedState(
        state,
        event.species,
        event.error,
        event.form,
      );
    }

    if (event.type === "detail.abilitiesLoaded") {
      return openLoadedAbilityOverlay(state);
    }

    if (event.type === "detail.abilitiesLoadFailed") {
      return closeDetailOverlay(state);
    }

    return applyDetailKey(state, event.key);
  },
};

function createInitialState(query = ""): AppState {
  const exactSpecies = findExactSpecies(query);
  if (exactSpecies !== undefined) {
    return {
      screen: "detail",
      detail: undefined,
      detailOverlay: undefined,
      descriptionIndex: 0,
      errorMessage: undefined,
      form: undefined,
      previousQuery: "",
      previousSelectedIndex: 0,
      retryToken: 0,
      shiny: false,
      species: exactSpecies,
      status: "loading",
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

  return isExitKey(key);
}

function applyDetailKey(state: DetailState, key: AppKey): AppState {
  if (state.detailOverlay !== undefined && key.name === "escape") {
    return closeDetailOverlay(state);
  }

  if (state.detailOverlay !== undefined) {
    return applyDetailOverlayKey(state, key);
  }

  if (key.name === "/") {
    return {
      screen: "search",
      query: state.previousQuery,
      selectedIndex: state.previousSelectedIndex,
      shouldExit: false,
    };
  }

  return applyDetailActionKey(state, key);
}

function applyDetailActionKey(state: DetailState, key: AppKey): AppState {
  const detailOverlay = getDetailOverlayAction(state, key);
  if (detailOverlay !== undefined) {
    return openDetailOverlay(state, detailOverlay);
  }

  if (canCycleDetailDescription(state, key)) {
    return cycleDetailDescription(state, key.shift === true ? -1 : 1);
  }

  if (key.name === "r" && state.status === "error") {
    return retryDetailLoad(state);
  }

  if (key.name === "s") {
    return toggleDetailShiny(state);
  }

  if (canToggleSingleAlternateForm(state, key)) {
    return toggleSingleAlternateForm(state);
  }

  const navigationDelta = getDetailNavigationDelta(key);
  if (navigationDelta !== undefined) {
    return loadAdjacentDetailSpecies(state, navigationDelta);
  }

  return state;
}

function getDetailOverlayAction(
  state: DetailState,
  key: AppKey,
): DetailState["detailOverlay"] {
  if (key.name === "a" && state.detail !== undefined) {
    return "abilities-loading";
  }

  if (key.name === "e" && state.detail !== undefined) {
    return "evolutions";
  }

  if (canOpenFormSelector(state, key)) {
    return {
      kind: "forms",
      selectedIndex: getCurrentPokemonFormIndex(state),
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

function canOpenFormSelector(state: DetailState, key: AppKey): boolean {
  return (
    key.name === "f" &&
    state.detail !== undefined &&
    getAlternatePokemonForms(state.detail.detail).length > 1
  );
}

function canToggleSingleAlternateForm(
  state: DetailState,
  key: AppKey,
): boolean {
  return (
    key.name === "f" &&
    state.detail !== undefined &&
    getAlternatePokemonForms(state.detail.detail).length === 1
  );
}

function canCycleDetailDescription(state: DetailState, key: AppKey): boolean {
  return key.name === "d" && state.detail !== undefined;
}

function applyDetailOverlayKey(state: DetailState, key: AppKey): AppState {
  if (state.detailOverlay === "abilities") {
    return applyAbilityOverlayKey(state, key);
  }

  if (state.detailOverlay === "abilities-loading") {
    return applyAbilityLoadingOverlayKey(state, key);
  }

  if (state.detailOverlay === "evolutions") {
    return applyEvolutionOverlayKey(state, key);
  }

  return applyFormOverlayKey(state, key);
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

function applyEvolutionOverlayKey(state: DetailState, key: AppKey): AppState {
  if (key.name === "e") {
    return closeDetailOverlay(state);
  }

  return state;
}

function applyFormOverlayKey(state: DetailState, key: AppKey): AppState {
  if (key.name === "f") {
    return closeDetailOverlay(state);
  }

  if (key.name === "enter" || key.name === "return") {
    return loadSelectedDetailForm(state);
  }

  if (key.name === "j" || key.name === "down") {
    return moveDetailFormSelection(state, 1);
  }

  if (key.name === "k" || key.name === "up") {
    return moveDetailFormSelection(state, -1);
  }

  return state;
}

function moveDetailFormSelection(
  state: DetailState,
  delta: number,
): DetailState {
  if (
    state.detail === undefined ||
    typeof state.detailOverlay !== "object" ||
    state.detailOverlay.kind !== "forms"
  ) {
    return state;
  }

  const maxIndex = Math.max(0, state.detail.detail.forms.length - 1);

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

function loadSelectedDetailForm(state: DetailState): DetailState {
  if (
    state.detail === undefined ||
    typeof state.detailOverlay !== "object" ||
    state.detailOverlay.kind !== "forms"
  ) {
    return state;
  }

  const form = state.detail.detail.forms[state.detailOverlay.selectedIndex];
  if (form === undefined) {
    return state;
  }

  if (pokemonFormTargetKey(state.detail.form) === pokemonFormTargetKey(form)) {
    return closeDetailOverlay(state);
  }

  return loadDetailForm(state, form);
}

function toggleSingleAlternateForm(state: DetailState): DetailState {
  const detail = state.detail?.detail;
  if (detail === undefined) {
    return state;
  }

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
  delta: number,
): DetailState {
  const count = state.detail?.detail.flavorTexts.length ?? 0;
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
): DetailState {
  return transitionDetailState(state, { species, type: "detail.loadSpecies" });
}

export function loadAdjacentDetailSpecies(
  state: DetailState,
  delta: DetailNavigationDelta,
): DetailState {
  const species = getSpeciesByDexDelta(state.species, delta);
  if (species === undefined) {
    return state;
  }

  return loadDetailSpecies(state, species);
}

function loadDetailForm(state: DetailState, form: PokemonForm): DetailState {
  return {
    ...state,
    detailOverlay: undefined,
    descriptionIndex: 0,
    errorMessage: undefined,
    form,
    retryToken: 0,
    status: "loading",
  };
}

export function detailLoadSucceeded(
  state: DetailState,
  species: SpeciesIndexEntry,
  detail: PokemonDetail,
): DetailState {
  return transitionDetailState(state, {
    detail,
    species,
    type: "detail.loadSucceeded",
  });
}

export function detailLoadFailed(
  state: DetailState,
  species: SpeciesIndexEntry,
  error: unknown,
  form?: PokemonForm,
): DetailState {
  const event: AppEvent = {
    error,
    species,
    type: "detail.loadFailed",
    ...(form === undefined ? {} : { form }),
  };

  return transitionDetailState(state, event);
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
): DetailState {
  return {
    ...state,
    descriptionIndex: 0,
    errorMessage: undefined,
    detailOverlay: undefined,
    form: carryOverDetailForm(state, species),
    retryToken: 0,
    species,
    status: "loading",
  };
}

function detailLoadSucceededState(
  state: DetailState,
  species: SpeciesIndexEntry,
  detail: PokemonDetail,
): DetailState {
  if (
    state.species.slug !== species.slug ||
    !pokemonFormsMatch(state.form, detail.form, { allowDefaultFallback: true })
  ) {
    return state;
  }

  return {
    ...state,
    descriptionIndex: Math.min(
      state.descriptionIndex,
      Math.max(0, detail.flavorTexts.length - 1),
    ),
    detail: { detail, form: detail.form, species },
    detailOverlay: undefined,
    errorMessage: undefined,
    form: detail.form,
    status: "ready",
  };
}

function detailLoadFailedState(
  state: DetailState,
  species: SpeciesIndexEntry,
  error: unknown,
  form?: PokemonForm,
): DetailState {
  if (
    state.species.slug !== species.slug ||
    !pokemonFormsMatch(state.form, form, { allowDefaultFallback: false })
  ) {
    return state;
  }

  return {
    ...state,
    errorMessage: getDetailErrorMessage(error),
    status: "error",
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
): PokemonForm | undefined {
  const form = state.detail?.form ?? state.form;
  if (form === undefined || form.isDefault) {
    return undefined;
  }

  return isSpeciesInLoadedEvolutionChain(state, species) ? form : undefined;
}

function isSpeciesInLoadedEvolutionChain(
  state: DetailState,
  species: SpeciesIndexEntry,
): boolean {
  const root = state.detail?.detail.evolutionChain.root;
  if (root === undefined) {
    return false;
  }

  return evolutionChainIncludesSpecies(root, species.name);
}

function evolutionChainIncludesSpecies(
  evolution: PokemonEvolution,
  speciesName: string,
): boolean {
  if (evolution.name === speciesName) {
    return true;
  }

  return evolution.evolvesTo.some((child) =>
    evolutionChainIncludesSpecies(child, speciesName),
  );
}

function pokemonFormsMatch(
  requested: PokemonForm | undefined,
  loaded: PokemonForm | undefined,
  { allowDefaultFallback }: { allowDefaultFallback: boolean },
): boolean {
  if (pokemonFormTargetKey(requested) === pokemonFormTargetKey(loaded)) {
    return true;
  }

  if (requested === undefined || loaded === undefined) {
    return false;
  }

  if (pokemonFormsShareAlternateKey(requested, loaded)) {
    return true;
  }

  return (
    allowDefaultFallback && requested.isDefault === false && loaded.isDefault
  );
}

function pokemonFormsShareAlternateKey(
  requested: PokemonForm,
  loaded: PokemonForm,
): boolean {
  return (
    requested.isDefault === false &&
    loaded.isDefault === false &&
    requested.spriteFormKey === loaded.spriteFormKey &&
    loaded.pokemonName.endsWith(`-${requested.spriteFormKey}`)
  );
}

function retryDetailLoad(state: DetailState): DetailState {
  return {
    ...state,
    errorMessage: undefined,
    retryToken: state.retryToken + 1,
    status: "loading",
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
  const maxIndex = Math.max(0, searchSpecies(state.query).length - 1);

  return {
    ...state,
    selectedIndex: Math.min(maxIndex, Math.max(0, state.selectedIndex + delta)),
  };
}

function openSelectedSpecies(state: SearchState): AppState {
  const species = getSpeciesBySelection(state.query, state.selectedIndex);
  if (species === undefined) {
    return state;
  }

  return {
    screen: "detail",
    detail: undefined,
    detailOverlay: undefined,
    descriptionIndex: 0,
    errorMessage: undefined,
    form: undefined,
    previousQuery: state.query,
    previousSelectedIndex: state.selectedIndex,
    retryToken: 0,
    shiny: false,
    species,
    status: "loading",
    shouldExit: false,
  };
}

function getCurrentPokemonFormIndex(state: DetailState): number {
  if (state.detail === undefined) {
    return 0;
  }

  const currentFormKey = pokemonFormTargetKey(state.detail.form);
  const index = state.detail.detail.forms.findIndex(
    (form) => pokemonFormTargetKey(form) === currentFormKey,
  );

  return Math.max(0, index);
}

function getAlternatePokemonForms(detail: PokemonDetail): PokemonForm[] {
  return detail.forms.filter((form) => form.isDefault === false);
}

function getDetailErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "Detail data is unavailable. If offline, this species is not cached yet.";
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
    key.name === "q" ||
    key.name === "escape" ||
    (key.name === "c" && key.ctrl === true)
  );
}

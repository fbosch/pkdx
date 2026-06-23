import {
  findExactSpecies,
  getSpeciesBySelection,
  searchSpecies,
  type SpeciesIndexEntry,
} from "./search";
import type { PokemonDetail, PokemonForm } from "./pokemon-detail";
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
  detail: LoadedDetail | undefined;
  detailOverlay: DetailOverlay | undefined;
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
  | { kind: "forms"; selectedIndex: number };

export type AppKey = {
  name: string;
  ctrl?: boolean;
  shift?: boolean;
  sequence?: string;
};

type SearchKeyHandler = (state: SearchState) => AppState;

const searchKeyHandlers: Record<string, SearchKeyHandler> = {
  backspace: (state) => updateSearchQuery(state, state.query.slice(0, -1)),
  down: (state) => moveSearchSelection(state, 1),
  enter: openSelectedSpecies,
  "ctrl+j": (state) => moveSearchSelection(state, 1),
  "ctrl+k": (state) => moveSearchSelection(state, -1),
  return: openSelectedSpecies,
  up: (state) => moveSearchSelection(state, -1),
};

export function createInitialAppState(query = ""): AppState {
  const exactSpecies = findExactSpecies(query);
  if (exactSpecies !== undefined) {
    return {
      screen: "detail",
      detail: undefined,
      detailOverlay: undefined,
      errorMessage: undefined,
      form: undefined,
      previousQuery: "",
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

export function applyAppKey(state: AppState, key: AppKey): AppState {
  if (
    state.screen === "detail" &&
    state.detailOverlay !== undefined &&
    key.name === "escape"
  ) {
    return closeDetailOverlay(state);
  }

  if (isExitKey(key)) {
    return {
      ...state,
      shouldExit: true,
    };
  }

  if (state.screen === "detail") {
    return applyDetailKey(state, key);
  }

  return applySearchKey(state, key);
}

function applyDetailKey(state: DetailState, key: AppKey): AppState {
  if (state.detailOverlay !== undefined) {
    return applyDetailOverlayKey(state, key);
  }

  if (key.name === "/") {
    return {
      screen: "search",
      query: state.previousQuery,
      selectedIndex: 0,
      shouldExit: false,
    };
  }

  return applyDetailActionKey(state, key);
}

function applyDetailActionKey(state: DetailState, key: AppKey): AppState {
  if (key.name === "a" && state.detail !== undefined) {
    return openDetailOverlay(state, "abilities");
  }

  if (
    key.name === "f" &&
    state.detail !== undefined &&
    hasAlternatePokemonForms(state.detail.detail)
  ) {
    return openDetailOverlay(state, {
      kind: "forms",
      selectedIndex: getCurrentPokemonFormIndex(state),
    });
  }

  if (key.name === "r" && state.status === "error") {
    return retryDetailLoad(state);
  }

  if (key.name === "s") {
    return toggleDetailShiny(state);
  }

  return state;
}

function applyDetailOverlayKey(state: DetailState, key: AppKey): AppState {
  if (state.detailOverlay === "abilities") {
    return applyAbilityOverlayKey(state, key);
  }

  return applyFormOverlayKey(state, key);
}

function applyAbilityOverlayKey(state: DetailState, key: AppKey): AppState {
  if (key.name === "a") {
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
  if (state.detail === undefined || state.detailOverlay === undefined) {
    return state;
  }

  if (state.detailOverlay === "abilities") {
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
    state.detailOverlay === undefined ||
    state.detailOverlay === "abilities"
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

function toggleDetailShiny(state: DetailState): DetailState {
  return {
    ...state,
    shiny: state.shiny === false,
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
  return {
    ...state,
    errorMessage: undefined,
    detailOverlay: undefined,
    form: undefined,
    retryToken: 0,
    species,
    status: "loading",
  };
}

function loadDetailForm(state: DetailState, form: PokemonForm): DetailState {
  return {
    ...state,
    detailOverlay: undefined,
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
  if (
    state.species.slug !== species.slug ||
    pokemonFormTargetKey(state.form) !== pokemonFormTargetKey(detail.form)
  ) {
    return state;
  }

  return {
    ...state,
    detail: { detail, form: detail.form, species },
    detailOverlay: undefined,
    errorMessage: undefined,
    status: "ready",
  };
}

export function detailLoadFailed(
  state: DetailState,
  species: SpeciesIndexEntry,
  error: unknown,
  form?: PokemonForm,
): DetailState {
  if (
    state.species.slug !== species.slug ||
    pokemonFormTargetKey(state.form) !== pokemonFormTargetKey(form)
  ) {
    return state;
  }

  return {
    ...state,
    errorMessage: getDetailErrorMessage(error),
    status: "error",
  };
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
  if (key.ctrl === true && key.name.length === 1) {
    return `ctrl+${key.name}`;
  }

  if (key.shift === true && key.name.length === 1) {
    return key.name.toUpperCase();
  }

  return key.name;
}

function applySearchTextInput(state: SearchState, key: AppKey): SearchState {
  if (
    key.ctrl === true ||
    key.sequence === undefined ||
    key.sequence.length !== 1
  ) {
    return state;
  }

  return updateSearchQuery(state, `${state.query}${key.sequence}`);
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
    errorMessage: undefined,
    form: undefined,
    previousQuery: state.query,
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

function hasAlternatePokemonForms(detail: PokemonDetail): boolean {
  return detail.forms.length > 1;
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

function isExitKey(key: AppKey): boolean {
  return (
    key.name === "q" ||
    key.name === "escape" ||
    (key.name === "c" && key.ctrl === true)
  );
}

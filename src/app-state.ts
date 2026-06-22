import {
  findExactSpecies,
  getSpeciesBySelection,
  searchSpecies,
  type SpeciesIndexEntry,
} from "./search";

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
  species: SpeciesIndexEntry;
  shouldExit: boolean;
};

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
  J: (state) => moveSearchSelection(state, 1),
  K: (state) => moveSearchSelection(state, -1),
  return: openSelectedSpecies,
  up: (state) => moveSearchSelection(state, -1),
};

export function createInitialAppState(query = ""): AppState {
  const exactSpecies = findExactSpecies(query);
  if (exactSpecies !== undefined) {
    return {
      screen: "detail",
      previousQuery: "",
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

export function applyAppKey(state: AppState, key: AppKey): AppState {
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
  if (key.name === "/") {
    return {
      screen: "search",
      query: state.previousQuery,
      selectedIndex: 0,
      shouldExit: false,
    };
  }

  return state;
}

function applySearchKey(state: SearchState, key: AppKey): AppState {
  const handler = searchKeyHandlers[searchKeyName(key)];

  if (handler !== undefined) {
    return handler(state);
  }

  return applySearchTextInput(state, key);
}

function searchKeyName(key: AppKey): string {
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
    previousQuery: state.query,
    species,
    shouldExit: false,
  };
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

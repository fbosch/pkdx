export type AppState = {
  screen: "search";
  query: string;
  shouldExit: boolean;
};

export type AppKey = {
  name: string;
  ctrl?: boolean;
};

export function createInitialAppState(query = ""): AppState {
  return {
    screen: "search",
    query,
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

  return state;
}

function isExitKey(key: AppKey): boolean {
  return (
    key.name === "q" ||
    key.name === "escape" ||
    (key.name === "c" && key.ctrl === true)
  );
}

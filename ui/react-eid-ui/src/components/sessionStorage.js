export const sessionLoad = (key) => {
  try {
    const serialized = sessionStorage.getItem(key);
    if (serialized === null) {
      return undefined;
    }
    return JSON.parse(serialized);
  } catch (err) {
    return undefined;
  }
};

export const sessionSave = (key, value) => {
  try {
    const serialized = JSON.stringify(value);
    sessionStorage.setItem(key, serialized);
  } catch (err) {
    // Ignore write errors.
  }
};

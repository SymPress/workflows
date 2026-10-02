function disabled() {
  throw new Error('This SymPress workflow supports GitHub releases and metadata updates; npm publication requires a separate reviewed workflow.');
}
export const verifyConditions = disabled;
export const prepare = disabled;
export const publish = disabled;
export const addChannel = disabled;

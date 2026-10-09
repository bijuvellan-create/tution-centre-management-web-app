/** Turns an API error's `errors` array into a { field: message } map. */
export function fieldErrors(err) {
  const map = {};
  for (const item of err?.errors || []) {
    if (item?.field && !map[item.field]) map[item.field] = item.message;
  }
  return map;
}

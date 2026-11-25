/** Cheap probe: can this browser create a WebGL context at all? */
export function detectWebGLSupport(
  createElement: Document["createElement"] = typeof document !== "undefined"
    ? document.createElement.bind(document)
    : () => {
        throw new Error("document unavailable");
      },
): boolean {
  try {
    const canvas = createElement("canvas");
    if (!("getContext" in canvas)) return false;
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return gl !== null;
  } catch {
    return false;
  }
}

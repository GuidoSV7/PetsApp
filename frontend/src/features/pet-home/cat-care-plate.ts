import { BoxGeometry, Color, Float32BufferAttribute, type BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * One geometry + one vertex-color material: bottom, rims and food do not create
 * separate render groups. Dimensions are model units, with the base at y=0.
 */
export function buildCarePlateGeometry(): BufferGeometry {
  const pieces = [
    { size: [.42, .035, .30], at: [0, .0175, 0], color: "#eee2ce" },
    { size: [.035, .055, .30], at: [-.1925, .05, 0], color: "#d5b99a" },
    { size: [.035, .055, .30], at: [.1925, .05, 0], color: "#d5b99a" },
    { size: [.35, .055, .035], at: [0, .05, -.1325], color: "#d5b99a" },
    { size: [.35, .055, .035], at: [0, .05, .1325], color: "#d5b99a" },
    { size: [.18, .045, .13], at: [0, .0575, 0], color: "#9b6548" },
  ];
  const geometries = pieces.map(piece => {
    const geometry = new BoxGeometry(...piece.size as [number, number, number]);
    geometry.translate(...piece.at as [number, number, number]);
    const rgb = new Color(piece.color);
    const colors: number[] = [];
    for (let i = 0; i < geometry.getAttribute("position").count; i++) {
      colors.push(rgb.r, rgb.g, rgb.b);
    }
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    return geometry;
  });
  const merged = mergeGeometries(geometries, false);
  geometries.forEach(geometry => geometry.dispose());
  if (!merged) throw new Error("Care plate geometry could not be merged");
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

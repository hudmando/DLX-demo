// Shared view-layer constants. Keeping these in one place so the renderer (sceneView) and the
// editor geometry (campGeometry) agree on the same numbers.

// The spacing a spanning connector bridges between two mating faces. ESTIMATE pending the DLX
// spacing-strap spec (overview verify-list #3); matches render workflow §7.1 default of ~2 ft.
export const CONNECTOR_GAP_FT = 2;

// Local shelter length runs along +z (shelterGeom). Preset/world convention is rotation 0 =
// footprint length along x (overview §3), so every unit's world yaw is this base turn + its rotation.
export const LENGTH_ALONG_X = -Math.PI / 2;

// Plan-view interior: fallback cot density when a shelter record carries no `cots` field. ESTIMATE,
// reverse-engineered from the DLX X-40 reference drawing (20 cots in 860 ft^2 ~= 43 ft^2/cot).
export const COT_AREA_FT2 = 43;

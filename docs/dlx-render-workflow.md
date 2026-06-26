# DLX Render Workflow — Photo → 3D Asset (v4-ft)

> **This is the photoreal Render Workflow** — one of the project's two workstreams, the
> companion to the schematic Field Planner. See `dlx-project-overview.md` §1 for how they fit.
> A repeatable method to turn a reference photo into a clean, scalable Three.js model in a
> consistent **~90–94% photoreal, simplified-essence** look.
>
> **Changes from the original (v4 → v4-ft):**
> - **Units converted to FEET** to match the project (`1 unit = 1 ft`). Real-world dimensions
>   defer to `dlx-spec-sheet.md`; detail-level literals were scaled ×3.28 from the original
>   metric values and are tuning *starting points*, not gospel.
> - **Connector taxonomy (§7.4) is governed by `dlx-project-overview.md` §4.2** — the canonical
>   roster. Status: X-Series Connector ✅ verified, ASAP-to-X-Series Connector ✅ verified,
>   ASAP Connector ⚠️ assumed (see overview verify-list #1).
> - **Note:** the reference `.html` files and source photos this doc cites are not currently in
>   the project — re-add them before reusing those builds.
>
> Validated on: a single frame tent, a symmetric X-Hub complex, and an **asymmetric
> multi-shelter camp**. v4 replaced the generic "overlap" docking model with the DLX-true
> connection system (spacing-gap + spanning connector, real connector anatomy, the connector
> taxonomy, rigid-endpoint connections to trailers/containers/ISU units).

> **Dimensions note:** shelter/connector sizes, spacing-strap gaps, and schematics live in
> **`dlx-spec-sheet.md`** (the project's "dimensions file"), in feet. This doc covers connection
> *method, topology, and geometry-by-construction* — where a real number is needed, pull it from
> the spec sheet (defensible placeholder + "state it" if unspecified).

---

## 0. Scope — what this is good for

**Best fit:** symmetric or modular subjects — tents, shelters, containers, simple structures,
and **assemblies of those** (even irregular ones, if the layout is authored explicitly — §7).
**Poor fit:** organic / asymmetric high-detail *surfaces* (complex vehicles, people). For those,
**use Option E** (§11).

Aesthetic target is deliberately **~6–10% short of photoreal**: believable materials + lighting,
no micro-hardware, dirt, or scan-level texture.

---

## 1. The pipeline (4 steps)

1. **Read the photo** — proportions, layout, color, silhouette, module counts, connection topology.
2. **Infer unseen sides by symmetry** — mirror walls/ends, symmetric roofs, repeat/rotate
   identical modules. **Symmetry fills a module's unseen sides — it does NOT supply an asymmetric
   layout.** An irregular arrangement must be **read or specified**; a single oblique photo yields
   an *interpretation, not a survey*.
3. **Rebuild parametrically** at true real-world scale (feet) from primitives + swept/extruded profiles.
4. **Apply the aesthetic in the render** — style = lighting + materials, not an image filter.

**Ask before building when the layout is ambiguous.** For asymmetric assemblies, resolve up
front: (a) *faithfulness* — match the exact cluster as read, or a representative one in the
style? (b) *topology* — hub-and-spoke, direct module-to-module connectors, or a mix? Don't
silently guess these.

---

## 2. World conventions (always)

- **1 unit = 1 ft.** +Y up, −Z forward. Origin at base footprint centre, on y = 0.
- **Named groups** per real piece; **per-module builder functions** returning a `Group`.
- **No external asset files.** Geometry procedural; textures generated on a `<canvas>`.
  three.js (0.161)+addons via `importmap`.
- **Pull real product dimensions from `dlx-spec-sheet.md`**, author true scale, cite the source;
  else defensible estimate + state it. (e.g. X-HUB = **21.5 ft square × 10.25 ft tall** per the
  spec sheet. The original render doc estimated 3.8 m ≈ 12.5 ft tall — superseded by the spec
  sheet's 10.25 ft; both remain DLX-unverified for the HUB.)

---

## 3. The Studio look (locked render preset — reuse unchanged)

- **Renderer:** `WebGLRenderer({antialias:true})`, sRGB, `AgX` tone mapping (fallback
  ACESFilmic) exposure **~1.0**, `PCFSoftShadowMap`.
- **Environment:** `RoomEnvironment` via `PMREMGenerator` → `scene.environment`.
- **Daylight rig:** `HemisphereLight(#bcd2ec / #b6a47a, 0.55)` + **sun** `DirectionalLight(#fff0d8, ~2.7)`
  low angle, `shadow.mapSize 4096`, `radius 3`, `bias −0.0003`, `normalBias 0.02` + **cool fill**
  `DirectionalLight(#cdd9ec, 0.5)`, no shadow.
- **Background:** faint sky→pale gradient (canvas texture).
- **Ground:** invisible `ShadowMaterial` catcher, opacity ~0.3.
- **Camera:** FOV **35**, 3/4 view echoing the photo (raise it for aerial subjects),
  `OrbitControls` + slow auto-rotate. Frame distance ≈ largest extent × 1.0–1.3.

> Shadow play comes from proud seam/frame geometry + a low, tight sun — not SSAO.

---

## 4. Material library (values)

> Color/roughness/sheen values are unitless — unchanged from the original. Geometry sizes are
> in **feet** (converted ×3.28); treat them as starting points and tune to the photo.

| Material | Type / key values |
|---|---|
| **canvas — single tone** | `MeshPhysicalMaterial` · procedural albedo (`#c3a570` base + tonal blobs + faint weave) + weave bump `bumpScale ~0.06` · `roughness 0.94` · `sheen 0.22 / 0.85` · `envMapIntensity 0.5` · `DoubleSide`. **Author UVs in feet** (retune weave frequency for the ft UV scale). |
| **canvas — two-tone** | Same material, **two albedo textures**: roof `#cdb88f` (light), walls `#a3855a` (darker). Build roof and walls as **separate swept meshes** so the tone split is clean. Parameterise the albedo base color. |
| **connector vinyl (tunnel / boot / endwall)** | `MeshPhysicalMaterial`, dark Mil-Spec-FR look `#1b1b1d` **default**, `roughness 0.82`, `sheen 0.25 / 0.7`, `envMapIntensity 0.5`, `DoubleSide`. **Parameterise the tone** — set to the shelter canvas color when the photo shows a tone-matched connector. Used for tunnel walls/roof, door boots, rain flies, adapter endwalls. |
| **V-gutter (ASAP overhead strip)** | same connector vinyl, **shallow V-channel** swept along the tunnel ridge (two angled facets meeting in a valley). Sits proud above the tunnel roof; catches a hard shadow line — the signature of an ASAP↔ASAP joint. |
| **floor trip guard** | `MeshStandardMaterial` dark rubber `#161618`, `roughness 0.9`. Low weighted strip across the threshold, `BoxGeometry(~faceW × 0.4 × 0.26 ft)` on `y≈0.13 ft`. Always present at a floor-level connection. |
| **hook-and-loop seam** | thin proud band (`r≈0.05 ft` swept welt or `~0.33 ft` flap) where the connector laps onto each shelter face — connectors attach by **hook & loop**, so model a small overlap flap, never a butt edge. Tone: connector vinyl, slightly darker. |
| **seam / binding** | `MeshStandardMaterial` `#84693c–#90794d`, `roughness 0.92`. Thin welt cylinders (`r ≈ 0.066 ft`) on eave/ridge/bows/perimeters. |
| **screen / window (BLACK)** | `#060607`, `roughness 0.62`, `envMapIntensity 0.1`, faint mesh bump. **Must sit proud — §6.** |
| **doorway (dark opening)** | `#121315`, `roughness 0.7`, `DoubleSide`. |
| **ballast bag (orange PVC)** | `MeshPhysicalMaterial` `#e5661a`, `roughness 0.5`, `clearcoat 0.25 / 0.4`, `envMapIntensity 0.7`. **Rectangular** `BoxGeometry(~2.56 × 1.12 × 1.64 ft)` on the ground. |
| **strap (orange webbing)** | `#ea6e1f`, `roughness 0.7`, eave→bag cylinder. |
| **zipper (black)** | `#0c0c0e`, `roughness 0.45`, `metalness 0.45`, thin. |
| **sign (blue placard)** | `#2f6cae`. **HVAC/gen box:** `#2a2c2f`, `metalness 0.4`. |

---

## 5. Detail rules — the "simplified essence" line

**Include:** panel **seams** (eave/ridge/bows/perimeters); **windows = proud black screens**
(+ frames + mesh bump); **simplified zippers** (tone, no teeth/pull); rigging (poles, guy lines,
**orange ballast + straps**); gentle ridge/eave **sag**; subtle weave + tonal variation; blue
placards; HVAC boxes for scene context; **connector parts** — V-gutter/awning/rain-fly over the
top, floor trip guard at the threshold, door boot at door-to-door joints, hook-and-loop overlap
flap at every connector-to-shelter seam, optional spacing straps.

**Exclude (the deliberate ~6–10%):** buckles, grommets, stitch thread, modeled zipper teeth/pull,
dirt/fade, wrinkles, real screen transparency, interiors; **on connectors:** actual hook-and-loop
nap, gutter weld beads, individual strap buckles, insulation-liner inner layer (interior — not
visible in an exterior demo).

---

## 6. Cutouts & windows — the proud-screen rule (don't skip)

An opaque wall **occludes anything behind it**, so an inset screen renders as wall color. Either:
1. **Proud screen (default):** dark panel **just outside** the wall (`±(halfWidth + 0.04 ft)`),
   frame prouder (`+0.1 ft`) for the recess.
2. **True hole:** `ShapeGeometry` + hole `Path`, backed by a dark doorway panel — use for
   **doorways/connection openings**.

Never inset a screen *behind* the wall.

---

## 7. Multi-module assemblies & connectors (DLX-true)

**Every module is its own complete shelter** (own walls, roof, openings), built by its own
function returning a `Group`. Connection geometry is driven by **shared parameters** (face width,
doorway `DW×DH`, eave/ridge), so both sides agree.

### 7.1 The connection model — spacing gap + spanning connector (NOT overlap)

> **v4 correction.** Earlier guidance docked modules by shrinking one to fit *inside* the host
> wall and overlapping ~1.0–1.3 ft. **That is not how DLX connects, and it reads as fake for a
> product demo.** Real shelters are held **apart** at a fixed spacing (the X-Series kit ships
> **two shelter spacing straps**) and a **dedicated connector product spans the gap**. Model the
> connector as its own authored piece, not as interpenetrating tents.

The connection is its own object: two shelters at a **gap**, a **connector tunnel** bridging them,
attached to each face by **hook & loop** (a small overlap flap — never a butt edge). The gap
distance is a real spec (spec sheet / spacing straps); if unspecified, use a defensible parameter
(e.g. `gap ≈ 2 ft`) and state it.

**Profile-mismatch rule (the key to "true").** Whenever the two faces have **different
cross-sections** — ASAP (16 ft) vs X-Series (21.5 ft) frame, or tent vs box (trailer/container) —
the connector must *visibly absorb* the mismatch with an awning / boot / flange. **Never fake a
flush butt seam between mismatched profiles.** A clean butt is the tell that it's not real.

### 7.2 Connector anatomy (build at the simplified-essence line)

A connector decomposes into the same small part set every time. Build the subset the connector
type calls for (§7.4):

| Part | Geometry | Material (§4) |
|---|---|---|
| **Tunnel walls + roof** | swept profile spanning the gap; profile matches the **smaller** shelter's cross-section | connector vinyl |
| **Overhead joining strip** | proud band over the tunnel ridge. ASAP = welded **"V" gutter** (shallow V-channel); X-Series = oversized **rain fly** draped over the top | V-gutter / connector vinyl |
| **Floor trip guard** | low weighted strip across the threshold on the ground | floor trip guard |
| **Endwall interface** | flat panel lapped onto the shelter face; **open aperture** (open-end) or **door** (door-to-door) | connector vinyl + hook-and-loop seam |
| **Door boot** | fabric boot bridging two doorways (door-to-door only); oversized swept band ≈ **3.5 ft** | connector vinyl |
| **Spacing straps** | optional thin webbing holding the gap | strap webbing |
| **Hook-and-loop flap** | small overlap where connector meets each face | hook-and-loop seam |

### 7.3 The shelter face at a connection

The shelter's own endwall at a joint becomes one of two apertures — use the §6 **true-hole**
method (`ShapeGeometry` + hole `Path`, backed dark), not a proud screen:

- **Open-end:** the endwall is a full open passage; the tunnel is a clear walk-through.
  Kit parts: overhead / insulation / floor connectors, *open-end* set.
- **Door-to-door:** each shelter keeps its **door**; a **door boot** bridges the two doorways.
  Kit parts: door boot + *door-to-door* floor / insulation connectors.

The X-Series connector carries **both** part sets — author config as an `'open' | 'door'` flag.

### 7.4 Connector taxonomy — what docks to what

> Governed by `dlx-project-overview.md` §4.2. The three core same/cross-family connectors map to
> the spec sheet ids `asap-connector`, `x-connector`, `asap-x-connector`. The rigid-endpoint rows
> (trailer/container/ISU/WSS) are **render-only** — out of scope for the Field Planner v1.

| Pair | Connector (spec id) | Status | Signature geometry to model |
|---|---|---|---|
| **ASAP ↔ ASAP** | ASAP Connector (`asap-connector`) | ⚠️ assumed | welded **V-gutter** top + weighted rubber **floor strip** |
| **X-Series ↔ X-Series** | X-Series Connector (`x-connector`) | ✅ verified | **rain fly** + **trip guard**; `open`/`door`; spacing straps |
| **ASAP ↔ X-Series** | ASAP-to-X-Series Connector (`asap-x-connector`) | ✅ verified | **outer awnings** absorbing the frame-profile mismatch |
| **ASAP/X ↔ Gatekeeper-style** | DLX-WSS | render-only | **overlapping** adapter endwalls (outer + insulation) |
| **Shelter ↔ ISU 90 Type EO** | ISU 90 Connector | render-only | **press-fit frame** attach; door + floor connector |
| **ASAP/X ↔ DLX trailer** | DLX Trailer Connector | render-only | **ramp arch frame** transition + connector **flanges** + endwalls |
| **X-Series ↔ ISO container / X-Can** | Container Connector | render-only | **zip-in adapter endwall** + connection **flange** (~0.33 ft lip) |

### 7.5 Rigid endpoints — trailers, ISO containers, ISU units *(render-only; planner v1 out of scope)*

These endpoints are **box-shaped rigid modules** (author as a true-scale box; dims from the spec
sheet). The tent's **arched** endwall can't butt a **rectangular** opening — bridge it:

- **Trailer:** a **ramp arch frame** rises from ground to the trailer's rear opening; the connector
  skins over it. Model the arch as a swept frame + vinyl skin; the floor trip guard becomes the
  ramp threshold.
- **Container / X-Can:** a **connection flange** (~0.33 ft rectangular lip) frames the container
  door; a **zip-in adapter endwall** transitions from the tent profile to the rectangular flange.

This is the profile-mismatch rule (§7.1) applied to round-to-rectangular — the transition piece is
mandatory, not decorative.

### 7.6 Layouts

- **Symmetric / radial:** instance identical modules with `rotation.y = k·π/2` (or mirrored).
- **Hub-and-spoke:** the **hub is a square module with four flat connectable faces** (ASAP-HUB /
  X-HUB). Spokes dock at 90° increments via a connector on each used face — the hub is the topology
  anchor for TOC / field-hospital / command-center clusters. **A hub face accepts either family**
  (overview §4.3); a cross-family spoke uses `asap-x-connector`.
- **Asymmetric / irregular:** the arrangement **can't be inferred** — author it as an explicit
  declarative list (below) and state it's an *interpretation*.

### 7.7 Declarative floor-plan schema

```js
// Each module names its type so connectors can be auto-selected (§7.4)
// Dimensions (W, L, eave, ridge) in FEET, from dlx-spec-sheet.md
MODULES = [
  { id, builder, type:'asap'|'xseries'|'hub'|'trailer'|'container'|'isu',
    W, L, eave, ridge, x, z, rotDeg }
];

// Each connector references the two modules it joins; type + config drive its parts
CONNECTORS = [
  { a:id, b:id,
    type:'asap'|'xseries'|'asap-x'|'wss'|'isu'|'trailer'|'container', // §7.4
    config:'open'|'door',   // §7.3 (X-Series supports both)
    gap, x, z, rotDeg }     // gap in feet, from spacing straps / spec sheet
];
```

Keep modules axis-aligned for clean docking unless angled docking is explicitly needed (angled
connectors must follow the tent axis — more math). The connector `type` should match the `type`
pair of `a` and `b`; mismatched pairs (`asap`+`xseries`) select `asap-x`. This list is the
deliverable's "floor plan" — rearrangement is a one-line edit. **It is the same topology the Field
Planner's graph produces** — a planner layout can be exported straight into this schema.

---

## 8. Per-photo checklist

1. **Subject + true dimensions** (pull from spec sheet; else defensible estimate + state).
2. **Read** counts, spacing, colors, silhouette, rigging, **and connection topology**.
3. **Symmetry / layout:** per-module symmetry → "known vs inferred"; for assemblies, **ask
   faithfulness + topology** (§1), then author the **declarative module/connector list** (§7.7),
   selecting each connector's **type + config** from the taxonomy (§7.4).
4. Build each **module independently**; windows **proud** (§6); two-tone via separate roof/wall
   meshes (§4). Connection faces use the **true-hole** aperture (§7.3), never a proud screen.
5. Apply the **connection model** (§7.1) + **Studio preset** (§3) + **materials** (§4) unchanged.
6. Procedural textures; **UVs in feet**.
7. **Validate** (§9); **tune** tone/sun/color to the photo.

---

## 9. Build & validation (do both — syntax check is not enough)

1. **Syntax:** `node --check` on the extracted module script.
2. **Headless execution (required):** run the actual builders with **real three.js** + stub
   materials; assert no runtime throw, **0 NaN**, bounds ≈ targets (in feet). Catches what
   `node --check` can't.

**Strict-mode gotcha:** ES modules are strict; `Object3D.position / rotation / scale / quaternion`
are **read-only accessors**. Never `Object.assign(mesh,{position:…})` or reassign them — it throws
`TypeError` and blanks the page. Use `.position.set(...)` / `.copy(...)`. (Writing
`shadow.camera.near/far/left` etc. is fine — plain numbers.)

---

## 10. Tuning levers

- **More real:** seam stitch lines, visible zipper pull, faint base dirt, wrinkles at poles, real
  screen transparency.
- **Less real / more essence:** thin/drop seam welts, flatten lighting, reduce bump.
- **Match the photo:** canvas tone(s), seam color, ballast orange, **connector tone** (dark vs
  tone-matched), **V-gutter vs rain-fly** top, **gap distance**, sun angle, exposure — one-line nudges.
- **Connector realism:** add the floor trip guard + hook-and-loop overlap flap for a true DLX read;
  drop them (plain tunnel) for a quicker, more abstract joint.

---

## 11. Escape hatch — Option E (glTF studio loader)

Organic / asymmetric *surface* subject → don't model procedurally. Source a licensed `.glb`
(Sketchfab / CGTrader / TurboSquid; convert FBX/OBJ via Blender → glTF 2.0), drop it into the
**studio loader** (§3 lighting applied to any model, drag-and-drop). Keep the model's own
materials; let the rig style it.

---

### Reference files *(not currently in the project — re-add before reuse)*
- `tent_final.html` — single frame tent (apply §6 proud-window fix if reused).
- `tent_complex3.html` — symmetric X-Hub: independent modules + seamless docking (§7).
- `xhub_camp.html` — **asymmetric camp**: declarative module/connector layout, two-tone canvas, black tunnels (§7).
- `studio_loader.html` — Option-E glTF loader (§11).

### Connection source (for §7)
- DLX Shelter Connectors line (deployedlogix.com) — connector products, kit part lists, V-gutter /
  rain-fly / trip-guard / door-boot / hook-and-loop details, hub four-way topology. Connector
  **dimensions/schematics** belong in `dlx-spec-sheet.md`, not here. Canonical connector roster +
  verification status: `dlx-project-overview.md` §4.

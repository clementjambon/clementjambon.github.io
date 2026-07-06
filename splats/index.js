import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

const VIEWER_HEIGHT = 500;

// Camera framing carried over from the previous viewer (Y-up, right-handed).
const CAMERA_POSITION = new THREE.Vector3(1.4369, 0.1748, 0.4673);
const CAMERA_TARGET = new THREE.Vector3(0.0723, 0.1963, -0.1578);
const CAMERA_FOV = 50;

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("splatViewer");
    if (!container) return; // mobile falls back to a static image

    const getWidth = () => container.clientWidth || container.offsetWidth;

    // Swap the whole viewer out for a static profile photo. Used when the
    // splat can't render on this device (context loss, load/init failure).
    let fellBack = false;
    const fallbackToImage = (reason) => {
        if (fellBack) return;
        fellBack = true;
        console.warn("Splat viewer falling back to image:", reason);
        if (typeof window.getRandomImage === "function") {
            window.getRandomImage();
        }
    };

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        CAMERA_FOV,
        getWidth() / VIEWER_HEIGHT,
        0.01,
        1000
    );
    camera.position.copy(CAMERA_POSITION);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    // Cap the pixel ratio: phones report 3x, which would render ~9x the
    // pixels and can stall or crash on mobile GPUs.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(getWidth(), VIEWER_HEIGHT);
    renderer.setClearColor(0x000000, 0); // transparent, blends with the page
    container.appendChild(renderer.domElement);

    // A lost GL context (common when a mobile GPU runs out of memory) won't
    // recover on its own here — drop back to a static photo.
    renderer.domElement.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        renderer.setAnimationLoop(null);
        fallbackToImage("webglcontextlost");
    });

    const spark = new SparkRenderer({ renderer });
    scene.add(spark);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.copy(CAMERA_TARGET);
    controls.update();

    const splat = new SplatMesh({ url: "./splats/scene.compressed.ply" });
    splat.rotation.z = Math.PI; // matches the old "0 0 180" flip
    scene.add(splat);

    // "Drag to rotate" hint: nudge the visitor on a gentle repeating cadence
    // (visible, then a pause, then again) until they interact with the scene,
    // after which it stays hidden for good.
    const hint = document.getElementById("splatHint");
    const HINT_SHOW_MS = 4000; // how long the hint stays up each time
    const HINT_HIDE_MS = 9000; // pause between nudges
    let interacted = false;
    let hintTimer = null;

    const nudgeCycle = () => {
        if (interacted) return;
        hint?.classList.add("visible");
        hintTimer = setTimeout(() => {
            hint?.classList.remove("visible");
            if (interacted) return;
            hintTimer = setTimeout(nudgeCycle, HINT_HIDE_MS);
        }, HINT_SHOW_MS);
    };

    const stopHint = () => {
        if (interacted) return;
        interacted = true;
        if (hintTimer) clearTimeout(hintTimer);
        hint?.classList.remove("visible");
    };

    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", () => {
        canvas.classList.add("grabbing");
        stopHint();
    });
    const releaseGrab = () => canvas.classList.remove("grabbing");
    canvas.addEventListener("pointerup", releaseGrab);
    canvas.addEventListener("pointerleave", releaseGrab);

    splat.initialized
        .then(() => {
            document.getElementById("loadingIndicator")?.classList.add("hidden");
            nudgeCycle();
        })
        .catch((err) => {
            console.error("Failed to load splat scene:", err);
            renderer.setAnimationLoop(null);
            fallbackToImage(err);
        });

    renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
    });

    window.addEventListener("resize", () => {
        const width = getWidth();
        camera.aspect = width / VIEWER_HEIGHT;
        camera.updateProjectionMatrix();
        renderer.setSize(width, VIEWER_HEIGHT);
    });
});

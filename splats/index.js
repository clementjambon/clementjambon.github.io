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

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        CAMERA_FOV,
        getWidth() / VIEWER_HEIGHT,
        0.01,
        1000
    );
    camera.position.copy(CAMERA_POSITION);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(getWidth(), VIEWER_HEIGHT);
    renderer.setClearColor(0x000000, 0); // transparent, blends with the page
    container.appendChild(renderer.domElement);

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

    splat.initialized
        .then(() => {
            document.getElementById("loadingIndicator")?.classList.add("hidden");
        })
        .catch((err) => {
            console.error("Failed to load splat scene:", err);
            const label = container.querySelector(".loadingLabel");
            if (label) label.textContent = "Failed to load";
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

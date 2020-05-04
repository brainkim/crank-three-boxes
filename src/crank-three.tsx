/** @jsx createElement */
import {
	Context,
	createElement,
	Fragment,
	HostContext,
	Portal,
	Raw,
	Renderer as CrankRenderer,
} from "@bikeshaving/crank";
import * as THREE from "three";

function updateChildren(
	obj: THREE.Object3D,
	children: Set<THREENode>,
	newChildren: Set<THREENode>,
): void {
	for (const child of newChildren) {
		if (children.has(child)) {
			children.delete(child);
		} else if (child instanceof THREE.Object3D) {
			obj.add(child);
		}
	}

	// TODO: delete old children
	for (const child of children) {
		if (child instanceof THREE.Object3D) {
			obj.remove(child);
		}
	}
}

type THREENode = THREE.Object3D | THREE.BufferGeometry | THREE.Material;

class CrankThreeRenderer extends CrankRenderer<THREENode> {
	constructor() {
		super();
		// TODO: I think we could expose the actual renderer instance onto hostcontext so we don’t need to use this closure.

		// TODO: any further investigation of a three renderer should probably use
		// a more robust form of a links system like this. Borrows from svg defs
		// and use and allows us to declaratively render scene graphs which share
		// materials/geometries while still being able to use element trees. The
		// following is a poor man’s implementation of id/url(#id) references and I
		// would need to do a little more thinking about how to implement this more
		// robustly.
		const links: Record<string, THREENode> = {};
		function link(href: string): THREENode | undefined {
			// mimics the convention from svg url(#path);
			const match = href.match(/url\(#(.*)\)/);
			if (match == null || match[1] == null) {
				return;
			}

			return links[match[1]];
		}

		this.extend({
			*mesh(this: HostContext, {geometry, material}: any) {
				let geometry1 =
					typeof geometry === "string" ? link(geometry) : geometry;
				let material1 =
					typeof material === "string" ? link(material) : material;

				const mesh = new THREE.Mesh(geometry1, material1);
				for (const {geometry: newGeometry, material: newMaterial} of this) {
					if (geometry !== newGeometry) {
						geometry = newGeometry;
						geometry1 =
							typeof geometry === "string" ? link(geometry) : geometry;
						mesh.geometry = geometry1;
					}

					if (material !== newMaterial) {
						material = newMaterial;
						material1 =
							typeof material1 === "string" ? link(material) : material;
						mesh.material = material1;
					}

					yield mesh;
				}
			},
			*boxBufferGeometry(this: HostContext, {width, height, depth, id}: any) {
				let geometry = new THREE.BoxBufferGeometry(width, height, depth);
				if (id !== undefined) {
					links[id] = geometry;
				}

				try {
					for (const newProps of this) {
						if (
							width !== newProps.width ||
							height !== newProps.height ||
							depth !== newProps.depth
						) {
							geometry.dispose();
							width = newProps.width;
							height = newProps.height;
							depth = newProps.depth;
							geometry = new THREE.BoxBufferGeometry(width, height, depth);
						}

						if (id !== newProps.id) {
							delete links[id];
							if (newProps.id) {
								links[newProps.id] = geometry;
							}

							id = newProps.id;
						}

						yield geometry;
					}
				} finally {
					geometry.dispose();
				}
			},
			*meshNormalMaterial(this: HostContext, {id}: any) {
				const material = new THREE.MeshNormalMaterial();
				if (id !== undefined) {
					links[id] = material;
				}

				try {
					for (const newProps of this) {
						if (id !== newProps.id) {
							delete links[id];
							if (newProps.id) {
								links[newProps.id] = material;
							}

							id = newProps.id;
						}

						yield material;
					}
				} finally {
					material.dispose();
				}
			},
			*[Portal](this: HostContext, {root: renderer}) {
				// TODO: un-hard-code all of this. We need to figure out:
				// 1. What is the root object by which the scene graph is keyed?
				// 2. Where do we call renderer.render?
				// 3. Should cameras exist in the element tree or somewhere else?
				// 4. What about orbit controls and such?
				// 5. What about resize stuff?
				// 6. How do we allow DOM Renderers to add properties to the raw canvas?
				renderer.setClearColor(0xffffff);
				const camera = new THREE.PerspectiveCamera(
					50,
					window.innerWidth / window.innerHeight,
					1,
					1000,
				);
				const onresize = () => {
					renderer.setSize(window.innerWidth, window.innerHeight);
					camera.aspect = window.innerWidth / window.innerHeight;
					camera.updateProjectionMatrix();
				};
				onresize();
				window.addEventListener("resize", onresize);
				camera.position.z = 4;
				let children: Set<THREENode> = new Set();
				const scene = new THREE.Scene();
				try {
					for (const {children: newChildren} of this) {
						const newChildrenSet = new Set(newChildren);
						updateChildren(scene, children, newChildrenSet);
						renderer.render(scene, camera);
						yield scene;
						children = newChildrenSet;
					}
				} finally {
					window.removeEventListener("resize", onresize);
				}
			},
		});
	}
}

export function* Canvas(this: Context) {
	const threeRenderer = new THREE.WebGLRenderer();
	const crankRenderer = new CrankThreeRenderer();
	for (const {children} of this) {
		crankRenderer.render(
			// TODO: allow first arg to renderer.render to be Children;
			<Fragment>{children}</Fragment>,
			threeRenderer,
		);
		yield <Raw value={threeRenderer.domElement} />;
	}
}
